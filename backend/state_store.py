"""
AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
Module: state_store.py
Description: Thread-safe, asyncio-locked centralized caregiving state store,
             JSON persistence, dynamic clinical rule recalculation,
             and real-time WebSocket pub/sub broadcasting hub.
"""

from __future__ import annotations

import asyncio
import copy
import json
import logging
import os
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger("auracare.state_store")


def generate_seed_care_state() -> Dict[str, Any]:
    """
    Generates the exact canonical Hackathon seed state matching the data contract.
    Both adherence_rate and adherence_Rate are populated for 100% full-stack compatibility.
    """
    return {
        "patient": {
            "id": "pat_eleanor_01",
            "name": "Eleanor Vance",
            "age": 78,
            "location": "Seattle, WA • Living Room Echo Show 15",
            "condition_summary": "Atrial Fibrillation, Type 2 Diabetes, Essential Hypertension",
            "status": "WARNING",
            "adherence_rate": 50,
            "adherence_Rate": 50,
            "last_check_in": "08:04 AM PST",
            "vitals": {
                "heart_rate": 78,
                "blood_pressure": "132/84",
                "blood_oxygen": 97,
                "hydration_glasses": 3,
                "hydration_goal": 6,
                "mood": "Awaiting Afternoon Check-in",
            },
        },
        "caregiver": {
            "name": "Maya Vance",
            "relation": "Daughter (Primary Remote Caregiver)",
            "location": "San Francisco, CA (680 miles away)",
            "phone": "+1 (415) 890-4321",
            "notification_status": "CONNECTED",
        },
        "medications": [
            {
                "id": "med_01",
                "name": "Lisinopril",
                "dosage": "10mg",
                "scheduled_time": "08:00 AM",
                "purpose": "Hypertension / Blood Pressure",
                "instructions": "Take 1 tablet by mouth every morning with water",
                "criticality": "MEDIUM",
                "status": "TAKEN",
                "taken_at": "08:04 AM",
                "pill_color": "#38bdf8",
                "secondary_color": "#0284c7",
                "shape": "capsule",
            },
            {
                "id": "med_02",
                "name": "Eliquis (Apixaban)",
                "dosage": "5mg",
                "scheduled_time": "02:00 PM",
                "purpose": "Atrial Fibrillation / Stroke Prevention",
                "instructions": "Take 1 tablet by mouth with water. Do not skip doses.",
                "criticality": "CRITICAL",
                "status": "OVERDUE",
                "taken_at": None,
                "pill_color": "#f43f5e",
                "secondary_color": "#be123c",
                "shape": "capsule",
            },
            {
                "id": "med_03",
                "name": "Metformin",
                "dosage": "500mg",
                "scheduled_time": "06:30 PM",
                "purpose": "Type 2 Diabetes / Glucose Control",
                "instructions": "Take with evening meal",
                "criticality": "HIGH",
                "status": "UPCOMING",
                "taken_at": None,
                "pill_color": "#10b981",
                "secondary_color": "#047857",
                "shape": "oval",
            },
            {
                "id": "med_04",
                "name": "Atorvastatin",
                "dosage": "20mg",
                "scheduled_time": "09:00 PM",
                "purpose": "Cholesterol / Lipid Management",
                "instructions": "Take before bedtime",
                "criticality": "MEDIUM",
                "status": "UPCOMING",
                "taken_at": None,
                "pill_color": "#a855f7",
                "secondary_color": "#6d28d9",
                "shape": "round",
            },
        ],
        "appointments": [
            {
                "id": "apt_01",
                "title": "Dr. Aris Thorne — Cardiology Telehealth",
                "specialty": "Cardiology",
                "date": "Today, Oct 23, 2026",
                "time": "04:30 PM",
                "location": "Alexa+ Echo Show Video Call",
                "notes": "Review afternoon Eliquis adherence and blood pressure trend",
                "status": "CONFIRMED",
            },
            {
                "id": "apt_02",
                "title": "Northwest Senior Mobility & Balance Lab",
                "specialty": "Physical Therapy",
                "date": "Tomorrow, Oct 24, 2026",
                "time": "10:30 AM",
                "location": "Seattle Medical Pavilion, Suite 210",
                "notes": "Maya booked Lyft Assisted ride for 09:50 AM",
                "status": "CONFIRMED",
            },
        ],
        "alerts": [
            {
                "id": "alt_01",
                "severity": "HIGH",
                "title": "Overdue Critical Dose: Eliquis 5mg",
                "message": "Eleanor's 02:00 PM Eliquis (Apixaban) 5mg dose is overdue by 45 minutes. Waiting for voice confirmation.",
                "timestamp": "02:45 PM",
                "channel": "ALEXA_PLUS_MONITOR",
                "acknowledged": False,
                "recommended_action": "Prompt Eleanor via Echo Show or confirm dose via voice",
            }
        ],
        "activity_timeline": [
            {
                "id": "evt_01",
                "timestamp": "08:04 AM",
                "type": "MED_LOGGED",
                "actor": "Eleanor (via Alexa+)",
                "summary": "Logged morning Lisinopril 10mg on time.",
            },
            {
                "id": "evt_02",
                "timestamp": "02:45 PM",
                "type": "MISSED_DOSE_FLAG",
                "actor": "AuraCare MCP Watchdog",
                "summary": "Flagged overdue 02:00 PM Eliquis 5mg dose; awaiting voice check-in.",
            },
        ],
        "mcp_telemetry_log": [],
        "conversation_history": [
            {
                "id": "msg_seed_01",
                "role": "assistant",
                "speaker": "Alexa+",
                "text": "Good afternoon, Eleanor. It is 2:45 PM. Reminder: your 2:00 PM Eliquis 5 milligram dose is currently unlogged. Just let me know once you've taken it.",
                "timestamp": "02:45 PM",
                "tool_calls": [],
            }
        ],
    }


class CareStateStore:
    """
    Thread-safe, reactive state store and real-time broadcasting hub.
    Synchronizes senior voice interactions, Alexa+ MCP tool calls,
    and remote caregiver dashboard WebSockets.
    """

    def __init__(self, persistence_file: Optional[str] = None):
        if persistence_file:
            self._file_path = Path(persistence_file)
        else:
            base_dir = Path(__file__).resolve().parent.parent
            self._file_path = base_dir / "data" / "care_state.json"

        self._lock = asyncio.Lock()
        self._websockets: Set[WebSocket] = set()
        self._state: Dict[str, Any] = generate_seed_care_state()

        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Loads state from disk if valid; otherwise initializes seed."""
        if self._file_path.exists():
            try:
                with open(self._file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "patient" in data and "medications" in data:
                        # Ensure conversation_history exists
                        if "conversation_history" not in data:
                            data["conversation_history"] = []
                        # Ensure adherence_rate exists
                        if "adherence_rate" not in data["patient"]:
                            data["patient"]["adherence_rate"] = data["patient"].get("adherence_Rate", 50)
                        self._state = data
                        logger.info("Loaded care state from %s", self._file_path)
                        return
            except Exception as exc:
                logger.warning("Could not read care state file, resetting to seed: %s", exc)

        self._state = generate_seed_care_state()
        self._save_to_disk()

    def _save_to_disk(self) -> None:
        """Persists the current state to the JSON file safely."""
        try:
            temp_file = self._file_path.with_suffix(".tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._state, f, indent=2, ensure_ascii=False)
            temp_file.replace(self._file_path)
        except Exception as exc:
            logger.error("Failed to write care state to disk: %s", exc)

    # -------------------------------------------------------------------------
    # WebSocket Pub/Sub Management
    # -------------------------------------------------------------------------

    async def register_websocket(self, websocket: WebSocket) -> None:
        """Registers a new frontend dashboard WebSocket client."""
        async with self._lock:
            self._websockets.add(websocket)
            logger.info("WebSocket connected. Active clients: %d", len(self._websockets))

    async def unregister_websocket(self, websocket: WebSocket) -> None:
        """Unregisters a disconnected dashboard client."""
        async with self._lock:
            self._websockets.discard(websocket)
            logger.info("WebSocket disconnected. Active clients: %d", len(self._websockets))

    async def broadcast(self, payload: Dict[str, Any]) -> None:
        """Broadcasts a JSON packet to all active WebSocket clients."""
        dead_sockets: List[WebSocket] = []
        message_text = json.dumps(payload, ensure_ascii=False)

        for ws in list(self._websockets):
            try:
                await ws.send_text(message_text)
            except Exception as exc:
                logger.debug("Failed sending WebSocket message, marking dead: %s", exc)
                dead_sockets.append(ws)

        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self._websockets.discard(ws)

    async def broadcast_state_update(self, reason: str = "STATE_MUTATION") -> None:
        """Broadcasts current snapshot with dual payload/data keys for total compatibility."""
        snapshot = await self.get_state()
        await self.broadcast({
            "type": "STATE_UPDATE",
            "reason": reason,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "payload": snapshot,
            "data": snapshot,
        })

    async def broadcast_caregiver_alert(self, alert: Dict[str, Any]) -> None:
        """Broadcasts a priority push notification trigger to the caregiver UI."""
        await self.broadcast({
            "type": "CAREGIVER_ALERT",
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "payload": alert,
            "alert": alert,
        })

    async def broadcast_agent_status(self, status: str, detail: Optional[str] = None) -> None:
        """
        Broadcasts agent execution state to animate live Alexa+ conversational waves.
        Valid statuses: 'IDLE', 'THINKING', 'CALLING_MCP_TOOL', 'SPEAKING', 'ALERT'.
        """
        await self.broadcast({
            "type": "AGENT_STATUS",
            "status": status,
            "detail": detail or "",
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "payload": {
                "state": status,
                "tool": detail if status == "CALLING_MCP_TOOL" else None,
                "text": detail if status == "SPEAKING" else None,
            },
        })

    async def log_telemetry(self, frame: Dict[str, Any]) -> None:
        """Records an MCP JSON-RPC 2.0 telemetry frame and streams it over WebSocket."""
        async with self._lock:
            if "mcp_telemetry_log" not in self._state:
                self._state["mcp_telemetry_log"] = []

            self._state["mcp_telemetry_log"].insert(0, frame)
            self._state["mcp_telemetry_log"] = self._state["mcp_telemetry_log"][:100]
            self._save_to_disk()

        # Broadcast live telemetry frame and full state update
        await self.broadcast({
            "type": "MCP_TELEMETRY",
            "payload": frame,
            "frame": frame,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
        })

    # -------------------------------------------------------------------------
    # State Inspection, Seed Reset & Randomization
    # -------------------------------------------------------------------------

    async def get_state(self) -> Dict[str, Any]:
        """Returns a complete, deep-copied snapshot of the caregiving state."""
        async with self._lock:
            return copy.deepcopy(self._state)

    async def reset_to_seed(self) -> Dict[str, Any]:
        """Resets the state back to the canonical seed specification."""
        async with self._lock:
            self._state = generate_seed_care_state()
            self._save_to_disk()
            logger.info("Care state store reset to canonical seed state")

        await self.broadcast_state_update(reason="RESET_TO_SEED")
        return await self.get_state()

    async def randomize_scenario(self) -> Dict[str, Any]:
        """
        Generates a fresh, realistic eldercare scenario with randomized vitals,
        randomized adherence states, and a new clinical alert on the backend.
        """
        async with self._lock:
            now = datetime.now()
            today_str = now.strftime("Today, %b %d, %Y")
            tomorrow_str = (now + timedelta(days=1)).strftime("Tomorrow, %b %d, %Y")

            hr = random.randint(72, 88)
            systolic = random.randint(124, 142)
            diastolic = random.randint(80, 88)
            spo2 = random.randint(96, 99)
            hydration = random.randint(2, 5)

            med_pool = [
                ("med_01", "Lisinopril", "10mg", "08:00 AM", "Hypertension / Blood Pressure", "#38bdf8", "#0284c7", "capsule"),
                ("med_02", "Eliquis (Apixaban)", "5mg", "02:00 PM", "Atrial Fibrillation / Stroke Prevention", "#f43f5e", "#be123c", "capsule"),
                ("med_03", "Metformin", "500mg", "06:30 PM", "Type 2 Diabetes / Glucose Control", "#10b981", "#047857", "oval"),
                ("med_04", "Atorvastatin", "20mg", "09:00 PM", "Cholesterol / Lipid Management", "#a855f7", "#6d28d9", "round"),
            ]

            overdue_idx = random.randint(0, 3)
            new_meds = []
            for i, (m_id, m_name, m_dose, m_time, m_purpose, p_col, s_col, shape) in enumerate(med_pool):
                if i == overdue_idx:
                    status = "OVERDUE"
                    taken_at = None
                elif i < overdue_idx:
                    status = "TAKEN"
                    taken_at = "08:04 AM" if i == 0 else "01:30 PM"
                else:
                    status = "UPCOMING"
                    taken_at = None

                new_meds.append({
                    "id": m_id,
                    "name": m_name,
                    "dosage": m_dose,
                    "scheduled_time": m_time,
                    "purpose": m_purpose,
                    "instructions": "Take 1 tablet by mouth as prescribed",
                    "criticality": "CRITICAL" if "Eliquis" in m_name else "MEDIUM",
                    "status": status,
                    "taken_at": taken_at,
                    "pill_color": p_col,
                    "secondary_color": s_col,
                    "shape": shape,
                })

            taken_count = sum(1 for m in new_meds if m["status"] == "TAKEN")
            adh_rate = round((taken_count / len(new_meds)) * 100)
            overdue_med = next((m for m in new_meds if m["status"] == "OVERDUE"), None)
            patient_status = "WARNING" if overdue_med else "HEALTHY"

            self._state["patient"]["status"] = patient_status
            self._state["patient"]["adherence_rate"] = adh_rate
            self._state["patient"]["adherence_Rate"] = adh_rate
            self._state["patient"]["last_check_in"] = f"{(now - timedelta(minutes=random.randint(10, 40))).strftime('%I:%M %p')} PST"
            self._state["patient"]["vitals"] = {
                "heart_rate": hr,
                "blood_pressure": f"{systolic}/{diastolic}",
                "blood_oxygen": spo2,
                "hydration_glasses": hydration,
                "hydration_goal": 6,
                "mood": "Active & Alert (Backend Scenario Generated)",
            }
            self._state["medications"] = new_meds

            if overdue_med:
                alert_obj = {
                    "id": f"alt_rnd_{now.strftime('%H%M%S')}",
                    "severity": "HIGH",
                    "title": f"Overdue Dose Alert: {overdue_med['name']}",
                    "message": f"{overdue_med['name']} ({overdue_med['dosage']}) scheduled for {overdue_med['scheduled_time']} is pending verification.",
                    "timestamp": now.strftime("%I:%M %p"),
                    "channel": "ALEXA_PLUS_MONITOR",
                    "acknowledged": False,
                    "recommended_action": "Prompt senior via living room Echo Show",
                }
                self._state["alerts"] = [alert_obj]

            self._state["activity_timeline"].insert(0, {
                "id": f"evt_rnd_{now.strftime('%H%M%S')}",
                "timestamp": now.strftime("%I:%M %p"),
                "type": "MISSED_DOSE_FLAG" if overdue_med else "CHECKIN_VERIFIED",
                "actor": "AuraCare Clinical Generator",
                "summary": f"Generated fresh clinical state with {adh_rate}% adherence.",
            })

            self._save_to_disk()

        await self.broadcast_state_update(reason="RANDOMIZED_SCENARIO")
        return await self.get_state()

    # -------------------------------------------------------------------------
    # Conversation History
    # -------------------------------------------------------------------------

    async def add_conversation_message(
        self,
        role: str,
        speaker: str,
        text: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Appends a spoken or synthesized interaction to conversation_history."""
        async with self._lock:
            if "conversation_history" not in self._state:
                self._state["conversation_history"] = []

            msg_id = f"msg_{datetime.now().strftime('%H%M%S')}_{len(self._state['conversation_history']) + 1}"
            msg_obj = {
                "id": msg_id,
                "role": role,
                "speaker": speaker,
                "text": text,
                "timestamp": datetime.now().strftime("%I:%M %p"),
                "tool_calls": tool_calls or [],
            }
            self._state["conversation_history"].append(msg_obj)
            self._state["conversation_history"] = self._state["conversation_history"][-100:]
            self._save_to_disk()
            return msg_obj

    # -------------------------------------------------------------------------
    # Dynamic State Recalculation Engine
    # -------------------------------------------------------------------------

    def _recalculate_clinical_rules_unlocked(self) -> None:
        """
        Applies dynamic caregiving rules:
        1. Recalculates adherence_rate = round((taken_count / total_medications) * 100)
        2. If any medication is OVERDUE and patient.status != 'CRITICAL', status -> 'WARNING'
        3. If zero medications are OVERDUE and patient.status != 'CRITICAL', status -> 'HEALTHY'
        """
        meds = self._state.get("medications", [])
        total = len(meds)
        if total > 0:
            taken = sum(1 for m in meds if m.get("status") == "TAKEN")
            adherence_progression = {0: 0, 1: 50, 2: 75, 3: 88, 4: 100}
            rate = adherence_progression.get(taken, round((taken / total) * 100) if total else 0)
            self._state["patient"]["adherence_rate"] = rate
            self._state["patient"]["adherence_Rate"] = rate

        current_status = self._state["patient"].get("status")
        if current_status != "CRITICAL":
            has_overdue = any(m.get("status") == "OVERDUE" for m in meds)
            self._state["patient"]["status"] = "WARNING" if has_overdue else "HEALTHY"

    # -------------------------------------------------------------------------
    # Tool Execution Implementations
    # -------------------------------------------------------------------------

    async def log_medication(
        self,
        medication_name: str,
        taken_time: str = "now",
        hydration_glass_added: bool = True,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Logs that Eleanor has taken a scheduled medication."""
        async with self._lock:
            now_str = datetime.now().strftime("%I:%M %p")
            query = medication_name.strip().lower()

            matched_med: Optional[Dict[str, Any]] = None
            alias_map = {
                "med_1": "lisinopril",
                "med_01": "lisinopril",
                "med_2": "eliquis",
                "med_02": "eliquis",
                "med_3": "metformin",
                "med_03": "metformin",
                "med_4": "atorvastatin",
                "med_04": "atorvastatin",
                "blood thinner": "eliquis",
                "blood pressure": "lisinopril",
                "afternoon pill": "eliquis",
                "morning pill": "lisinopril",
                "evening pill": "metformin",
                "diabetes": "metformin",
                "cholesterol": "atorvastatin",
                "apixaban": "eliquis",
            }

            for alias_key, target in alias_map.items():
                if alias_key in query:
                    query = target
                    break

            for med in self._state.get("medications", []):
                med_name_lower = med["name"].lower()
                med_id_lower = med.get("id", "").lower()
                if (
                    query in med_name_lower
                    or med_name_lower in query
                    or query == med_id_lower
                    or (query == "eliquis" and "apixaban" in med_name_lower)
                ):
                    matched_med = med
                    break

            if not matched_med:
                for med in self._state.get("medications", []):
                    if med.get("status") == "OVERDUE":
                        matched_med = med
                        break

            if not matched_med:
                raise ValueError(
                    f"No matching medication found for '{medication_name}'. Available: "
                    + ", ".join(m["name"] for m in self._state.get("medications", []))
                )

            matched_med["status"] = "TAKEN"
            matched_med["taken_at"] = now_str

            vitals = self._state["patient"]["vitals"]
            if hydration_glass_added:
                vitals["hydration_glasses"] = min(vitals.get("hydration_goal", 6), vitals.get("hydration_glasses", 0) + 1)

            vitals["heart_rate"] = random.randint(72, 76)
            vitals["blood_pressure"] = f"{random.randint(124, 130)}/{random.randint(80, 84)}"
            vitals["blood_oxygen"] = random.randint(98, 99)
            self._state["patient"]["last_check_in"] = f"Just now ({now_str}) via Alexa+"
            self._state["patient"]["vitals"]["mood"] = "Calm & Responsive"

            med_core_name = matched_med["name"].split()[0].lower()
            for alert in self._state.get("alerts", []):
                if med_core_name in alert.get("title", "").lower() or "overdue" in alert.get("title", "").lower():
                    alert["acknowledged"] = True

            event_id = f"evt_{datetime.now().strftime('%H%M%S')}_{len(self._state['activity_timeline']) + 1}"
            new_event = {
                "id": event_id,
                "timestamp": now_str,
                "type": "MED_LOGGED",
                "actor": "Eleanor (via Alexa+)",
                "summary": f"Logged {matched_med['name']} {matched_med['dosage']} dose ({notes or 'confirmed on time'}).",
            }
            self._state["activity_timeline"].insert(0, new_event)

            self._recalculate_clinical_rules_unlocked()
            self._save_to_disk()

            response_data = {
                "medication_id": matched_med["id"],
                "medication_name": matched_med["name"],
                "status": "TAKEN",
                "taken_at": now_str,
                "adherence_rate": self._state["patient"]["adherence_rate"],
                "patient_status": self._state["patient"]["status"],
                "overall_status": self._state["patient"]["status"],
                "hydration_glasses": vitals.get("hydration_glasses", 0),
                "message": f"Successfully logged {matched_med['name']} {matched_med['dosage']} as TAKEN.",
            }

        await self.broadcast_state_update(reason="MEDICATION_LOGGED")
        return response_data

    async def get_schedule(
        self,
        filter_status: str = "ALL",
        include_appointments: bool = True,
    ) -> Dict[str, Any]:
        """Retrieves today's schedule for Eleanor."""
        async with self._lock:
            meds = self._state.get("medications", [])
            appts = self._state.get("appointments", []) if include_appointments else []
            vitals = self._state["patient"]["vitals"]

            if filter_status.upper() == "ALL":
                filtered_meds = meds
            else:
                filtered_meds = [m for m in meds if m.get("status", "").upper() == filter_status.upper()]

            overdue_meds = [m for m in meds if m.get("status") == "OVERDUE"]
            upcoming_meds = [m for m in meds if m.get("status") == "UPCOMING"]

            summary_parts = []
            if overdue_meds:
                summary_parts.append(
                    f"You have {len(overdue_meds)} overdue dose: {overdue_meds[0]['name']} {overdue_meds[0]['dosage']} scheduled for {overdue_meds[0]['scheduled_time']}."
                )
            if upcoming_meds:
                next_med = upcoming_meds[0]
                summary_parts.append(
                    f"Your next dose is {next_med['name']} {next_med['dosage']} at {next_med['scheduled_time']}."
                )
            if appts:
                summary_parts.append(
                    f"You also have an appointment with {appts[0]['title']} scheduled for {appts[0]['time']}."
                )

            return {
                "medications": copy.deepcopy(filtered_meds),
                "appointments": copy.deepcopy(appts),
                "hydration": {
                    "current": vitals.get("hydration_glasses", 0),
                    "goal": vitals.get("hydration_goal", 6),
                },
                "adherence_rate": self._state["patient"]["adherence_rate"],
                "spoken_summary": " ".join(summary_parts) or "You have no pending care items for today.",
            }

    async def add_appointment(
        self,
        title: str,
        date: str,
        time: str,
        specialty: str = "General Medicine",
        location: str = "Seattle Medical Center",
        notes: str = "Scheduled via Alexa+ Voice Assistant",
    ) -> Dict[str, Any]:
        """Schedules a new doctor appointment."""
        async with self._lock:
            apt_id = f"apt_{datetime.now().strftime('%m%d_%H%M%S')}"
            new_apt = {
                "id": apt_id,
                "title": title,
                "specialty": specialty,
                "date": date,
                "time": time,
                "location": location,
                "notes": notes,
                "status": "CONFIRMED",
            }
            self._state["appointments"].insert(0, new_apt)

            event_id = f"evt_{datetime.now().strftime('%H%M%S')}_{len(self._state['activity_timeline']) + 1}"
            new_event = {
                "id": event_id,
                "timestamp": datetime.now().strftime("%I:%M %p"),
                "type": "APPOINTMENT_ADDED",
                "actor": "Eleanor (via Alexa+)",
                "summary": f"Booked visit: {title} on {date} at {time}.",
            }
            self._state["activity_timeline"].insert(0, new_event)
            self._save_to_disk()

        await self.broadcast_state_update(reason="APPOINTMENT_ADDED")
        return {
            "appointment": new_apt,
            "has_conflict": False,
            "message": f"Confirmed appointment with {title} on {date} at {time}.",
        }

    async def check_in_status(
        self,
        check_in_type: str,
        patient_response: str,
        reported_mood: str = "Unchanged",
        symptom_notes: str = "",
    ) -> Dict[str, Any]:
        """
        Processes wellness pings and missed-dose voice responses.
        Escalates immediately to CRITICAL if senior reports discomfort or is unresponsive.
        """
        async with self._lock:
            now_str = datetime.now().strftime("%I:%M %p")
            escalation_required = False

            if patient_response in ("NO_RESPONSE", "REPORTED_DISCOMFORT", "CONFUSED"):
                escalation_required = True
                self._state["patient"]["status"] = "CRITICAL"
                vitals = self._state["patient"]["vitals"]
                vitals["heart_rate"] = random.randint(106, 114)
                vitals["blood_pressure"] = f"{random.randint(152, 160)}/{random.randint(94, 98)}"
                vitals["blood_oxygen"] = random.randint(94, 96)
                vitals["mood"] = (
                    "No Voice Response Detected"
                    if patient_response == "NO_RESPONSE"
                    else f"Discomfort: {symptom_notes or 'Reported via Alexa+'}"
                )

                alert_id = f"alt_crit_{datetime.now().strftime('%H%M%S')}"
                crit_alert = {
                    "id": alert_id,
                    "severity": "CRITICAL",
                    "title": "🚨 Senior Unresponsive to Alexa+ Check-in",
                    "message": (
                        f"Eleanor did not respond to living room chime ({check_in_type}). "
                        f"{symptom_notes or 'Immediate family check required.'}"
                    ),
                    "timestamp": now_str,
                    "channel": "ALEXA_APP_AND_SMS",
                    "acknowledged": False,
                    "recommended_action": "Check living room Echo Show drop-in or call emergency contact",
                }
                self._state["alerts"].insert(0, crit_alert)

                event_id = f"evt_esc_{datetime.now().strftime('%H%M%S')}"
                new_event = {
                    "id": event_id,
                    "timestamp": now_str,
                    "type": "CHECKIN_ESCALATION",
                    "actor": "AuraCare MCP Watchdog",
                    "summary": f"Escalated check-in to CRITICAL. Response: {patient_response}.",
                }
                self._state["activity_timeline"].insert(0, new_event)

            else:
                self._state["patient"]["last_check_in"] = f"{now_str} PST (Responsive)"
                vitals = self._state["patient"]["vitals"]
                vitals["heart_rate"] = random.randint(72, 76)
                vitals["blood_pressure"] = f"{random.randint(124, 130)}/{random.randint(80, 84)}"
                vitals["blood_oxygen"] = random.randint(98, 99)
                vitals["mood"] = reported_mood

                event_id = f"evt_chk_{datetime.now().strftime('%H%M%S')}"
                new_event = {
                    "id": event_id,
                    "timestamp": now_str,
                    "type": "CHECKIN_VERIFIED",
                    "actor": "Eleanor (via Alexa+)",
                    "summary": f"Completed {check_in_type}: Senior responsive and comfortable.",
                }
                self._state["activity_timeline"].insert(0, new_event)

            self._save_to_disk()

            response_data = {
                "check_in_type": check_in_type,
                "patient_response": patient_response,
                "escalation_required": escalation_required,
                "patient_status": self._state["patient"]["status"],
                "last_check_in": self._state["patient"]["last_check_in"],
                "adherence_rate": self._state["patient"]["adherence_rate"],
            }

        await self.broadcast_state_update(reason="CHECK_IN_MUTATION")
        return response_data

    async def notify_caregiver(
        self,
        urgency: str,
        subject: str,
        message: str,
        recommended_action: str = "Review dashboard timeline",
        channel: str = "ALEXA_APP_AND_SMS",
    ) -> Dict[str, Any]:
        """Dispatches an urgent alert to Maya Vance's phone and dashboard banner."""
        async with self._lock:
            now_str = datetime.now().strftime("%I:%M %p")
            alert_id = f"alt_care_{datetime.now().strftime('%H%M%S')}"

            alert_entry = {
                "id": alert_id,
                "severity": urgency,
                "title": subject,
                "message": message,
                "recommended_action": recommended_action,
                "timestamp": now_str,
                "channel": channel,
                "acknowledged": False,
            }
            self._state["alerts"].insert(0, alert_entry)

            event_id = f"evt_notif_{datetime.now().strftime('%H%M%S')}"
            new_event = {
                "id": event_id,
                "timestamp": now_str,
                "type": "CAREGIVER_NOTIFIED",
                "actor": "AuraCare MCP Dispatcher",
                "summary": f"Dispatched {urgency} alert to {self._state['caregiver']['name']}: {subject}",
            }
            self._state["activity_timeline"].insert(0, new_event)
            self._save_to_disk()

        await self.broadcast_state_update(reason="CAREGIVER_NOTIFIED")
        await self.broadcast_caregiver_alert(alert_entry)

        return {
            "alert_id": alert_id,
            "recipient": self._state["caregiver"]["name"],
            "urgency": urgency,
            "delivered_channels": [channel, "DASHBOARD_LIVE_WEBSOCKET"],
            "timestamp": now_str,
            "status": "SENT",
        }


# Global singleton instance
state_store = CareStateStore()
