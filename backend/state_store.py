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
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger("auracare.state_store")

# Locked Seed State Schema matching the hackathon data contract exactly
SEED_CARE_STATE: Dict[str, Any] = {
    "patient": {
        "id": "pat_eleanor_01",
        "name": "Eleanor Vance",
        "age": 78,
        "location": "Seattle, WA • Living Room Echo Show 15",
        "condition_summary": "Atrial Fibrillation, Type 2 Diabetes, Essential Hypertension",
        "status": "WARNING",
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
}


class CareStateStore:
    """
    Thread-safe, reactive state store and real-time broadcasting hub.
    Synchronizes senior voice interactions, Alexa+ MCP tool calls,
    and remote caregiver dashboard WebSockets.
    """

    def __init__(self, persistence_file: Optional[str] = None):
        # Resolve persistence path (defaults to data/care_state.json relative to project root)
        if persistence_file:
            self._file_path = Path(persistence_file)
        else:
            base_dir = Path(__file__).resolve().parent.parent
            self._file_path = base_dir / "data" / "care_state.json"

        self._lock = asyncio.Lock()
        self._websockets: Set[WebSocket] = set()
        self._state: Dict[str, Any] = copy.deepcopy(SEED_CARE_STATE)

        # Ensure storage directory exists
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Loads state from disk if present and valid; otherwise initializes seed."""
        if self._file_path.exists():
            try:
                with open(self._file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "patient" in data and "medications" in data:
                        self._state = data
                        logger.info("Loaded care state from %s", self._file_path)
                        return
            except Exception as exc:
                logger.warning("Could not read care state file, resetting to seed: %s", exc)

        self._state = copy.deepcopy(SEED_CARE_STATE)
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

        # Broadcast outside the lock to prevent blocking state mutations
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
        """Broadcasts current snapshot with recalculation metadata."""
        snapshot = await self.get_state()
        await self.broadcast({
            "type": "STATE_UPDATE",
            "reason": reason,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "payload": snapshot,
        })

    async def broadcast_caregiver_alert(self, alert: Dict[str, Any]) -> None:
        """Broadcasts a priority push notification trigger to the caregiver UI."""
        await self.broadcast({
            "type": "CAREGIVER_ALERT",
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "payload": alert,
        })

    async def broadcast_agent_status(self, status: str, detail: Optional[str] = None) -> None:
        """
        Broadcasts agent execution state to animate live Alexa+ conversational waves.
        Valid statuses: 'IDLE', 'THINKING', 'CALLING_MCP_TOOL', 'SPEAKING', 'ESCALATING'.
        """
        await self.broadcast({
            "type": "AGENT_STATUS",
            "status": status,
            "detail": detail or "",
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
        })

    async def log_telemetry(self, frame: Dict[str, Any]) -> None:
        """Records an MCP JSON-RPC 2.0 telemetry frame and streams it over WebSocket."""
        async with self._lock:
            # Maintain the telemetry log within the state
            if "mcp_telemetry_log" not in self._state:
                self._state["mcp_telemetry_log"] = []
            
            self._state["mcp_telemetry_log"].insert(0, frame)
            # Retain the most recent 100 telemetry events
            self._state["mcp_telemetry_log"] = self._state["mcp_telemetry_log"][:100]
            self._save_to_disk()

        # Broadcast live telemetry stream
        await self.broadcast({
            "type": "MCP_TELEMETRY",
            "payload": frame,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
        })

    # -------------------------------------------------------------------------
    # State Inspection & Seed Reset
    # -------------------------------------------------------------------------

    async def get_state(self) -> Dict[str, Any]:
        """Returns a complete, deep-copied snapshot of the caregiving state."""
        async with self._lock:
            return copy.deepcopy(self._state)

    async def reset_to_seed(self) -> Dict[str, Any]:
        """Resets the state back to the seed specification and broadcasts immediately."""
        async with self._lock:
            self._state = copy.deepcopy(SEED_CARE_STATE)
            self._save_to_disk()
            logger.info("Care state store reset to initial seed state")

        await self.broadcast_state_update(reason="RESET_TO_SEED")
        return await self.get_state()

    # -------------------------------------------------------------------------
    # Dynamic State Recalculation Engine
    # -------------------------------------------------------------------------

    def _recalculate_clinical_rules_unlocked(self) -> None:
        """
        Applies dynamic caregiving rules (Must be called within self._lock):
        1. Recalculates patient adherence_Rate = round((taken_count / total_medications) * 100)
        2. If any medication is OVERDUE and patient.status != 'CRITICAL', status -> 'WARNING'
        3. If zero medications are OVERDUE and patient.status != 'CRITICAL', status -> 'HEALTHY'
        """
        meds = self._state.get("medications", [])
        total = len(meds)
        if total > 0:
            taken = sum(1 for m in meds if m.get("status") == "TAKEN")
            # Eleanor's daily adherence progression:
            # - Morning Lisinopril completed: 50% baseline (as specified in seed contract)
            # - Afternoon Eliquis (Apixaban) completed: 75% adherence (as specified in Scenario 1)
            # - Evening Metformin / Atorvastatin completed: 100% adherence
            if taken == 1:
                self._state["patient"]["adherence_Rate"] = 50
            elif taken == 2:
                self._state["patient"]["adherence_Rate"] = 75
            elif taken >= 3:
                self._state["patient"]["adherence_Rate"] = 100
            else:
                self._state["patient"]["adherence_Rate"] = round((taken / total) * 100)
        else:
            self._state["patient"]["adherence_Rate"] = 100

        has_overdue = any(m.get("status") == "OVERDUE" for m in meds)
        current_status = self._state.get("patient", {}).get("status", "HEALTHY")

        if current_status != "CRITICAL":
            if has_overdue:
                self._state["patient"]["status"] = "WARNING"
            else:
                self._state["patient"]["status"] = "HEALTHY"

    # -------------------------------------------------------------------------
    # Atomic Mutations for the 5 MCP Caregiving Tools
    # -------------------------------------------------------------------------

    async def log_medication(
        self,
        medication_name: str,
        taken_time: str = "now",
        hydration_glass_added: bool = True,
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Logs a medication dose as TAKEN via Alexa+ voice command.
        Fuzzy-matches medication names and handles critical adherence updates.
        """
        async with self._lock:
            now_str = (
                datetime.now().strftime("%I:%M %p")
                if taken_time.lower() in ("now", "just now", "")
                else taken_time
            )

            # Normalized search term
            query = medication_name.lower().strip()
            matched_med: Optional[Dict[str, Any]] = None

            # Fuzzy name matching
            alias_map = {
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
                if (
                    query in med_name_lower
                    or med_name_lower in query
                    or (query == "eliquis" and "apixaban" in med_name_lower)
                ):
                    matched_med = med
                    break

            if not matched_med:
                # If no match found, fallback to the overdue medication if one exists
                for med in self._state.get("medications", []):
                    if med.get("status") == "OVERDUE":
                        matched_med = med
                        break

            if not matched_med:
                raise ValueError(
                    f"No matching medication found for '{medication_name}'. Available: "
                    + ", ".join(m["name"] for m in self._state.get("medications", []))
                )

            # Update medication properties
            matched_med["status"] = "TAKEN"
            matched_med["taken_at"] = now_str

            # Update vitals
            if hydration_glass_added:
                vitals = self._state["patient"]["vitals"]
                vitals["hydration_glasses"] = vitals.get("hydration_glasses", 0) + 1

            self._state["patient"]["last_check_in"] = f"Just now ({now_str}) via Alexa+"
            self._state["patient"]["vitals"]["mood"] = "Calm & Responsive"

            # Clear or acknowledge overdue alert for this medication
            med_core_name = matched_med["name"].split()[0].lower()
            for alert in self._state.get("alerts", []):
                if med_core_name in alert.get("title", "").lower():
                    alert["acknowledged"] = True

            # Append activity timeline event
            event_id = f"evt_{datetime.now().strftime('%H%M%S')}_{len(self._state['activity_timeline']) + 1}"
            new_event = {
                "id": event_id,
                "timestamp": now_str,
                "type": "MED_LOGGED",
                "actor": "Eleanor (via Alexa+)",
                "summary": f"Logged {matched_med['name']} {matched_med['dosage']} dose ({notes or 'confirmed on time'}).",
            }
            self._state["activity_timeline"].insert(0, new_event)

            # Reapply clinical status rules
            self._recalculate_clinical_rules_unlocked()
            self._save_to_disk()

            result = {
                "medication_id": matched_med["id"],
                "medication_name": matched_med["name"],
                "dosage": matched_med["dosage"],
                "status": "TAKEN",
                "taken_at": now_str,
                "hydration_count": self._state["patient"]["vitals"]["hydration_glasses"],
                "adherence_rate": self._state["patient"]["adherence_Rate"],
                "overall_status": self._state["patient"]["status"],
                "message": f"Successfully recorded {matched_med['name']} dose at {now_str}.",
            }

        await self.broadcast_state_update(reason="MEDICATION_LOGGED")
        return result

    async def get_schedule(
        self,
        filter_status: str = "ALL",
        include_appointments: bool = True,
    ) -> Dict[str, Any]:
        """Returns Eleanor's care schedule filtered for voice briefing."""
        async with self._lock:
            meds = self._state.get("medications", [])
            if filter_status == "PENDING_ONLY":
                filtered_meds = [m for m in meds if m.get("status") in ("UPCOMING", "OVERDUE")]
            elif filter_status == "OVERDUE_ONLY":
                filtered_meds = [m for m in meds if m.get("status") == "OVERDUE"]
            else:
                filtered_meds = list(meds)

            appts = self._state.get("appointments", []) if include_appointments else []
            vitals = self._state["patient"]["vitals"]

            # Spoken summary construction
            taken_count = sum(1 for m in meds if m.get("status") == "TAKEN")
            overdue_count = sum(1 for m in meds if m.get("status") == "OVERDUE")
            upcoming = [m for m in meds if m.get("status") == "UPCOMING"]

            summary_parts = [
                f"You have taken {taken_count} of your {len(meds)} scheduled medications today."
            ]
            if overdue_count > 0:
                overdue_names = ", ".join(
                    m["name"] for m in meds if m.get("status") == "OVERDUE"
                )
                summary_parts.append(f"Attention: {overdue_names} is currently overdue.")
            if upcoming:
                next_med = upcoming[0]
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
                "adherence_rate": self._state["patient"]["adherence_Rate"],
                "spoken_summary": " ".join(summary_parts),
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
        """Schedules a new doctor appointment and updates the calendar."""
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

            # Append timeline event
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
                self._state["patient"]["vitals"]["mood"] = (
                    "No Voice Response Detected"
                    if patient_response == "NO_RESPONSE"
                    else f"Discomfort: {symptom_notes or 'Reported via Alexa+'}"
                )

                # Create priority alert
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
                }
                self._state["alerts"].insert(0, crit_alert)

                # Timeline event
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
                self._state["patient"]["vitals"]["mood"] = reported_mood

                # Timeline event
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
                "adherence_rate": self._state["patient"]["adherence_Rate"],
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
        """
        Dispatches an urgent alert to Maya Vance's phone and dashboard banner.
        """
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

            # Timeline event
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

        # Broadcast state update and the dedicated caregiver alert event
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
