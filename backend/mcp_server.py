"""
AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
Module: mcp_server.py
Description: Full Model Context Protocol (MCP) Spec 2025-11-25 Streamable HTTP Server,
             JSON-RPC 2.0 Router, Session Manager, and 5 Core Clinical Caregiving Tools.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Set, Union

from state_store import CareStateStore, state_store

logger = logging.getLogger("auracare.mcp_server")

# Official MCP Specification Version for Alexa+ Hackathon Compliance
MCP_SPEC_VERSION = "2025-11-25"
SERVER_NAME = "auracare-alexa-plus-mcp"
SERVER_VERSION = "2.5.0"

# JSON-RPC 2.0 Error Codes
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

# -----------------------------------------------------------------------------
# Tool JSON Schemas (Spec 2025-11-25)
# -----------------------------------------------------------------------------

TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "log_medication_taken",
        "description": (
            "Logs that the senior has taken a scheduled medication dose. "
            "Supports fuzzy names (e.g. 'blood thinner', 'afternoon pill', 'Eliquis', 'Metformin'). "
            "Updates vitals hydration count, clears overdue flags, recalculates adherence percentage, "
            "and broadcasts state to the remote caregiver dashboard in real time."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "medication_name": {
                    "type": "string",
                    "description": "Name or common description of the medication (e.g., 'Eliquis', 'blood thinner', 'Metformin', 'Lisinopril').",
                },
                "taken_time": {
                    "type": "string",
                    "description": "Time the medication was consumed (e.g., 'now', '02:50 PM'). Defaults to current time.",
                    "default": "now",
                },
                "hydration_glass_added": {
                    "type": "boolean",
                    "description": "Whether the patient took the medication with a full glass of water.",
                    "default": True,
                },
                "notes": {
                    "type": "string",
                    "description": "Contextual notes from senior voice interaction.",
                    "default": "",
                },
            },
            "required": ["medication_name"],
        },
    },
    {
        "name": "get_today_schedule",
        "description": (
            "Retrieves the patient's daily schedule including all scheduled medications, "
            "medical appointments, current hydration progress, and a spoken-friendly summary "
            "tailored for Alexa+ senior voice delivery."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "filter_status": {
                    "type": "string",
                    "enum": ["ALL", "PENDING_ONLY", "OVERDUE_ONLY"],
                    "description": "Filter medication items by adherence status.",
                    "default": "ALL",
                },
                "include_appointments": {
                    "type": "boolean",
                    "description": "Whether to include telehealth and clinic visits in the returned schedule.",
                    "default": True,
                },
            },
        },
    },
    {
        "name": "add_appointment",
        "description": (
            "Schedules a doctor visit or medical appointment in the patient's care calendar. "
            "Records appointment details, checks for calendar conflicts, and logs an activity timeline entry."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Doctor name and appointment purpose (e.g., 'Dr. Priya Patel — Ophthalmology & Retina Check').",
                },
                "specialty": {
                    "type": "string",
                    "description": "Medical specialty (e.g., 'Cardiology', 'Ophthalmology', 'Physical Therapy').",
                    "default": "General Medicine",
                },
                "date": {
                    "type": "string",
                    "description": "Date of the appointment (e.g., 'Tomorrow, Oct 24, 2026').",
                },
                "time": {
                    "type": "string",
                    "description": "Time of the appointment (e.g., '02:00 PM').",
                },
                "location": {
                    "type": "string",
                    "description": "Facility name or telehealth link.",
                    "default": "Seattle Medical Center",
                },
                "notes": {
                    "type": "string",
                    "description": "Additional transportation or clinical preparation notes.",
                    "default": "Scheduled via Alexa+ Voice Assistant",
                },
            },
            "required": ["title", "date", "time"],
        },
    },
    {
        "name": "check_in_status",
        "description": (
            "Evaluates Eleanor's voice check-in response during routine or missed-dose wellness pings. "
            "If unresponsive or reporting discomfort, immediately escalates patient health status to CRITICAL "
            "and flags urgent caregiver notification requirements."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "check_in_type": {
                    "type": "string",
                    "enum": [
                        "PROACTIVE_WELLNESS_PING",
                        "MISSED_DOSE_VERIFICATION",
                        "PATIENT_INITIATED",
                    ],
                    "description": "Context of the wellness verification chime.",
                },
                "patient_response": {
                    "type": "string",
                    "enum": [
                        "RESPONSIVE_OK",
                        "NO_RESPONSE",
                        "REPORTED_DISCOMFORT",
                        "CONFUSED",
                    ],
                    "description": "Senior's voice response or status.",
                },
                "reported_mood": {
                    "type": "string",
                    "description": "Optional mood assessment (e.g., 'Calm', 'Drowsy', 'Awaiting doctor call').",
                    "default": "Unchanged",
                },
                "symptom_notes": {
                    "type": "string",
                    "description": "Any noted physical symptoms, pain reports, or environmental context.",
                    "default": "",
                },
            },
            "required": ["check_in_type", "patient_response"],
        },
    },
    {
        "name": "notify_caregiver",
        "description": (
            "Dispatches an urgent alert to Maya Vance's smartphone and caregiver dashboard. "
            "Triggers an audible and visual banner on the remote family bridge."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "urgency": {
                    "type": "string",
                    "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    "description": "Urgency classification of the caregiver alert.",
                },
                "subject": {
                    "type": "string",
                    "description": "Short headline summary for push notification.",
                },
                "message": {
                    "type": "string",
                    "description": "Detailed clinical and care context.",
                },
                "recommended_action": {
                    "type": "string",
                    "description": "Suggested caregiver next steps (e.g. 'Initiate Drop-In', 'Call pharmacy').",
                    "default": "Review dashboard timeline",
                },
                "channel": {
                    "type": "string",
                    "description": "Alert dispatch channel.",
                    "default": "ALEXA_APP_AND_SMS",
                },
            },
            "required": ["urgency", "subject", "message"],
        },
    },
]

# -----------------------------------------------------------------------------
# MCP Resources & Prompts Specifications
# -----------------------------------------------------------------------------

RESOURCE_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "uri": "care://patient/eleanor/state",
        "name": "Eleanor Vance Full Care State",
        "description": "Complete real-time health profile, vitals, alerts, and caregiver contacts.",
        "mimeType": "application/json",
    },
    {
        "uri": "care://patient/eleanor/medications",
        "name": "Active Medication Regimen",
        "description": "Detailed prescription list, timing, dosage, criticality, and daily adherence records.",
        "mimeType": "application/json",
    },
]

PROMPT_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "morning_briefing",
        "description": "Generates a warm, cheerful morning check-in for Eleanor with medication and appointment reminders.",
        "arguments": [],
    },
    {
        "name": "overdue_dose_checkin",
        "description": "Gentle, non-alarming voice inquiry regarding a delayed anticoagulant dose.",
        "arguments": [
            {
                "name": "medication_name",
                "description": "Name of the overdue medication (e.g. Eliquis)",
                "required": True,
            }
        ],
    },
    {
        "name": "caregiver_escalation_summary",
        "description": "Structured clinical SBAR summary for family caregiver Maya Vance.",
        "arguments": [],
    },
]


class McpServer:
    """
    Production-grade Model Context Protocol (Spec 2025-11-25) Streamable HTTP Server.
    Provides session tracking, JSON-RPC 2.0 dispatch, SSE streaming,
    and direct ASGI integration for AWS Bedrock agent workflows.
    """

    def __init__(self, store: CareStateStore):
        self.store = store
        self.active_sessions: Set[str] = set()
        self.notification_queues: Dict[str, asyncio.Queue] = {}
        self._lock = asyncio.Lock()

    def get_or_create_session(self, session_id: Optional[str]) -> str:
        """Validates or generates an Mcp-Session-Id."""
        if not session_id or session_id not in self.active_sessions:
            new_id = session_id or f"mcp_sess_{uuid.uuid4().hex[:12]}"
            self.active_sessions.add(new_id)
            if new_id not in self.notification_queues:
                self.notification_queues[new_id] = asyncio.Queue()
            return new_id
        return session_id

    # -------------------------------------------------------------------------
    # Core JSON-RPC 2.0 Request Router
    # -------------------------------------------------------------------------

    async def handle_jsonrpc_request(
        self,
        request_dict: Dict[str, Any],
        session_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Dispatches a single JSON-RPC 2.0 request or notification.
        Returns a response dictionary for requests, or None for notifications.
        """
        if not isinstance(request_dict, dict):
            return self._build_error_response(
                None, INVALID_REQUEST, "Invalid Request: Payload must be a JSON object"
            )

        jsonrpc_ver = request_dict.get("jsonrpc")
        req_id = request_dict.get("id")
        method = request_dict.get("method")
        params = request_dict.get("params", {})

        if jsonrpc_ver != "2.0" or not method or not isinstance(method, str):
            return self._build_error_response(
                req_id, INVALID_REQUEST, "Invalid Request: jsonrpc must be '2.0' and method required"
            )

        # Ensure active session
        sess_id = self.get_or_create_session(session_id)

        try:
            # MCP Handshake & LifeCycle
            if method == "initialize":
                return self._handle_initialize(req_id, params)

            elif method == "notifications/initialized":
                logger.info("MCP client acknowledged initialization for session %s", sess_id)
                return None  # Notifications do not return a JSON-RPC response

            elif method == "ping":
                return {"jsonrpc": "2.0", "id": req_id, "result": {}}

            # Tools
            elif method == "tools/list":
                return self._handle_tools_list(req_id)

            elif method == "tools/call":
                return await self._handle_tools_call(req_id, params, sess_id, request_dict)

            # Resources
            elif method == "resources/list":
                return self._handle_resources_list(req_id)

            elif method == "resources/read":
                return await self._handle_resources_read(req_id, params)

            # Prompts
            elif method == "prompts/list":
                return self._handle_prompts_list(req_id)

            elif method == "prompts/get":
                return await self._handle_prompts_get(req_id, params)

            else:
                return self._build_error_response(
                    req_id, METHOD_NOT_FOUND, f"Method '{method}' not found on MCP Server"
                )

        except Exception as exc:
            logger.exception("Unexpected error processing MCP method %s: %s", method, exc)
            return self._build_error_response(
                req_id, INTERNAL_ERROR, f"Internal MCP server error: {str(exc)}"
            )

    # -------------------------------------------------------------------------
    # Method Handlers
    # -------------------------------------------------------------------------

    def _handle_initialize(self, req_id: Any, params: Dict[str, Any]) -> Dict[str, Any]:
        """Spec 2025-11-25 initialize handshake."""
        requested_version = params.get("protocolVersion", MCP_SPEC_VERSION)
        logger.info("Initializing MCP connection with client version %s", requested_version)

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": MCP_SPEC_VERSION,
                "capabilities": {
                    "tools": {"listChanged": True},
                    "resources": {"subscribe": True, "listChanged": True},
                    "prompts": {"listChanged": True},
                    "logging": {},
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION,
                },
            },
        }

    def _handle_tools_list(self, req_id: Any) -> Dict[str, Any]:
        """Returns the 5 caregiving tool schemas."""
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": TOOL_DEFINITIONS,
            },
        }

    async def _handle_tools_call(
        self,
        req_id: Any,
        params: Dict[str, Any],
        session_id: str,
        raw_request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Executes a caregiving tool, measures execution latency,
        emits telemetry frames, updates state, and returns MCP result.
        """
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if not tool_name or not isinstance(arguments, dict):
            return self._build_error_response(
                req_id, INVALID_PARAMS, "Invalid params: 'name' and 'arguments' object required"
            )

        start_time = time.perf_counter()
        tool_output: Any = None
        is_error = False
        error_msg = ""

        try:
            if tool_name == "log_medication_taken":
                med_name = arguments.get("medication_name") or arguments.get("medication_id", "")
                if not med_name:
                    raise ValueError("medication_name or medication_id is required")
                tool_output = await self.store.log_medication(
                    medication_name=med_name,
                    taken_time=arguments.get("taken_time", "now"),
                    hydration_glass_added=bool(arguments.get("hydration_glass_added", True)),
                    notes=arguments.get("notes", ""),
                )

            elif tool_name == "get_today_schedule":
                tool_output = await self.store.get_schedule(
                    filter_status=arguments.get("filter_status", "ALL"),
                    include_appointments=bool(arguments.get("include_appointments", True)),
                )

            elif tool_name == "add_appointment":
                title = arguments.get("title") or "Doctor Follow-up"
                date = arguments.get("date") or "Tomorrow"
                time_val = arguments.get("time") or "10:00 AM"
                tool_output = await self.store.add_appointment(
                    title=title,
                    date=date,
                    time=time_val,
                    specialty=arguments.get("specialty", "General Medicine"),
                    location=arguments.get("location", "Seattle Medical Center"),
                    notes=arguments.get("notes", "Scheduled via Alexa+ Voice Assistant"),
                )

            elif tool_name == "check_in_status":
                check_in_type = arguments.get("check_in_type") or arguments.get("type") or "WELLNESS_ROUTINE"
                patient_response = arguments.get("patient_response") or (
                    "NO_RESPONSE" if arguments.get("distress_level") in ("HIGH", "CRITICAL") else "RESPONSIVE_OK"
                )
                tool_output = await self.store.check_in_status(
                    check_in_type=check_in_type,
                    patient_response=patient_response,
                    reported_mood=arguments.get("reported_mood", "Unchanged"),
                    symptom_notes=arguments.get("symptom_notes") or arguments.get("note", ""),
                )

            elif tool_name == "notify_caregiver":
                urgency = arguments.get("urgency", "HIGH")
                subject = arguments.get("subject") or f"Caregiver Notification ({urgency})"
                message = arguments.get("message") or "Proactive caregiver notification dispatched."
                tool_output = await self.store.notify_caregiver(
                    urgency=urgency,
                    subject=subject,
                    message=message,
                    recommended_action=arguments.get("recommended_action", "Review dashboard timeline"),
                    channel=arguments.get("channel", "ALEXA_APP_AND_SMS"),
                )

            else:
                return self._build_error_response(
                    req_id, METHOD_NOT_FOUND, f"Unknown tool: '{tool_name}'"
                )

        except Exception as exc:
            is_error = True
            error_msg = str(exc)
            tool_output = {"error": error_msg}
            logger.error("Error executing MCP tool %s: %s", tool_name, exc)

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Standard MCP Response Payload
        response_payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(tool_output, ensure_ascii=False),
                    }
                ],
                "structuredContent": tool_output,
                "isError": is_error,
            },
        }

        # Telemetry logging & broadcasting
        telemetry_frame = {
            "id": f"rpc_{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "protocol_version": MCP_SPEC_VERSION,
            "transport": "Streamable HTTP (POST /mcp)",
            "session_id": session_id,
            "tool_name": tool_name,
            "jsonrpc_request": raw_request,
            "jsonrpc_response": response_payload,
            "raw_rpc_request": raw_request,
            "raw_rpc_response": response_payload,
            "arguments": arguments,
            "latency_ms": latency_ms,
            "status": "ERROR" if is_error else "SUCCESS",
            "summary": (
                f"Executed {tool_name} in {latency_ms}ms"
                if not is_error
                else f"Failed {tool_name}: {error_msg}"
            ),
        }
        await self.store.log_telemetry(telemetry_frame)

        return response_payload

    def _handle_resources_list(self, req_id: Any) -> Dict[str, Any]:
        """Exposes caregiving resources."""
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "resources": RESOURCE_DEFINITIONS,
            },
        }

    async def _handle_resources_read(self, req_id: Any, params: Dict[str, Any]) -> Dict[str, Any]:
        """Reads patient resource state."""
        uri = params.get("uri")
        state = await self.store.get_state()

        if uri == "care://patient/eleanor/state":
            content_text = json.dumps(state, indent=2, ensure_ascii=False)
            mime = "application/json"
        elif uri == "care://patient/eleanor/medications":
            content_text = json.dumps(state.get("medications", []), indent=2, ensure_ascii=False)
            mime = "application/json"
        else:
            return self._build_error_response(
                req_id, INVALID_PARAMS, f"Resource URI '{uri}' not recognized"
            )

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": mime,
                        "text": content_text,
                    }
                ]
            },
        }

    def _handle_prompts_list(self, req_id: Any) -> Dict[str, Any]:
        """Lists available clinical prompts."""
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "prompts": PROMPT_DEFINITIONS,
            },
        }

    async def _handle_prompts_get(self, req_id: Any, params: Dict[str, Any]) -> Dict[str, Any]:
        """Renders prompt templates."""
        prompt_name = params.get("name")
        args = params.get("arguments", {})
        state = await self.store.get_state()
        patient = state["patient"]

        if prompt_name == "morning_briefing":
            text = (
                f"Good morning, {patient['name']}. Your vitals are looking steady with blood pressure at "
                f"{patient['vitals']['blood_pressure']}. You have taken your morning Lisinopril. "
                "Let's remember your Eliquis dose at 2:00 PM and your Dr. Thorne telehealth visit at 4:30 PM."
            )
        elif prompt_name == "overdue_dose_checkin":
            med = args.get("medication_name", "Eliquis")
            text = (
                f"Hello {patient['name']}, this is Alexa. I noticed it's past 2:00 PM and I want to gently check "
                f"if you've had a chance to take your {med} with water yet?"
            )
        elif prompt_name == "caregiver_escalation_summary":
            text = (
                f"SBAR Clinical Alert for {state['caregiver']['name']}:\n"
                f"Situation: Eleanor Vance is marked {patient['status']}.\n"
                f"Background: Diagnosed with {patient['condition_summary']}.\n"
                f"Assessment: Adherence is at {patient['adherence_Rate']}%. Recent alert: "
                f"{state['alerts'][0]['title'] if state['alerts'] else 'None'}.\n"
                f"Recommendation: Review live Echo Show stream or verify telephone contact."
            )
        else:
            return self._build_error_response(
                req_id, INVALID_PARAMS, f"Prompt '{prompt_name}' not recognized"
            )

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "description": f"Template rendered for {prompt_name}",
                "messages": [
                    {
                        "role": "assistant",
                        "content": {"type": "text", "text": text},
                    }
                ],
            },
        }

    # -------------------------------------------------------------------------
    # Server-Sent Events (SSE) Streamable HTTP Notification Generator
    # -------------------------------------------------------------------------

    async def sse_stream_generator(self, session_id: str) -> AsyncGenerator[str, None]:
        """
        Yields Server-Sent Events (SSE) for Streamable HTTP compliance.
        Pushes initial handshake and server-initiated MCP notifications.
        """
        sess_id = self.get_or_create_session(session_id)
        queue = self.notification_queues[sess_id]

        # Initial connection handshake event
        init_event = {
            "jsonrpc": "2.0",
            "method": "notifications/message",
            "params": {
                "level": "info",
                "logger": "mcp.streamable_http",
                "data": f"Connected to AuraCare MCP Spec {MCP_SPEC_VERSION} stream. Session: {sess_id}",
            },
        }
        yield f"event: message\ndata: {json.dumps(init_event)}\n\n"

        try:
            while True:
                # Wait for notifications or send heartbeat
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: message\ndata: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Ping heartbeat comment to keep SSE connection alive
                    yield ": ping-heartbeat\n\n"
        except asyncio.CancelledError:
            logger.info("SSE Stream closed for session %s", sess_id)
        finally:
            if sess_id in self.notification_queues:
                del self.notification_queues[sess_id]
            self.active_sessions.discard(sess_id)

    def _build_error_response(
        self, req_id: Any, code: int, message: str, data: Any = None
    ) -> Dict[str, Any]:
        """Builds a spec-compliant JSON-RPC 2.0 error object."""
        err: Dict[str, Any] = {"code": code, "message": message}
        if data is not None:
            err["data"] = data
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": err,
        }


# Global MCP Server instance
mcp_server = McpServer(store=state_store)
