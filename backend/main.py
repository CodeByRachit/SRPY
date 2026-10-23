"""
AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
Module: main.py
Description: Production FastAPI Server (:8000), Permissive CORS, Spec 2025-11-25
             Streamable HTTP /mcp endpoints, REST API, and /ws/dashboard WebSocket Hub.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Load environment configuration
load_dotenv()

from bedrock_agent import bedrock_agent
from mcp_server import MCP_SPEC_VERSION, mcp_server
from state_store import state_store

# Configure structured logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("auracare.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for clean startup and resource cleanup."""
    logger.info("================================================================")
    logger.info("Starting AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge")
    logger.info("Model Context Protocol (MCP) Specification: %s (Streamable HTTP)", MCP_SPEC_VERSION)
    logger.info("AWS Bedrock Engine Status: %s", "ACTIVE" if bedrock_agent.bedrock_client else "FALLBACK_READY")
    logger.info("Demo Mode: %s", bedrock_agent.demo_mode)
    logger.info("================================================================")
    yield
    logger.info("Shutting down AuraCare backend service...")


app = FastAPI(
    title="AuraCare: Alexa+ MCP Caregiving Backend",
    description="Backend API for Alexa+ Voice Assistant and Remote Caregiver Family Bridge.",
    version="2.5.0",
    lifespan=lifespan,
)

# Permissive CORS for local Vite frontend (http://localhost:5173) and cloud dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id", "Content-Type"],
)

# -----------------------------------------------------------------------------
# Request & Response Models
# -----------------------------------------------------------------------------

class AgentChatRequest(BaseModel):
    prompt: str = Field(..., description="Voice transcript or text input from senior/caregiver.")
    scenario_id: Optional[str] = Field(None, description="Flagship demo scenario identifier.")
    session_id: Optional[str] = Field(None, description="Optional MCP session tracking ID.")


class DirectMcpToolRequest(BaseModel):
    tool_name: str = Field(..., description="Exact MCP tool name.")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool execution arguments.")
    session_id: Optional[str] = Field(None, description="Optional MCP session ID.")


# -----------------------------------------------------------------------------
# MCP Spec 2025-11-25 Streamable HTTP Endpoints
# -----------------------------------------------------------------------------

@app.post("/mcp", summary="MCP Spec 2025-11-25 Streamable HTTP POST")
async def mcp_post_endpoint(
    request: Request,
    mcp_session_id: Optional[str] = Header(None, alias="Mcp-Session-Id"),
    accept: Optional[str] = Header(None, alias="Accept"),
    stream: bool = Query(False, description="Request Server-Sent Events streaming response"),
):
    """
    Handles MCP Spec 2025-11-25 Streamable HTTP requests.
    Supports single JSON-RPC 2.0 requests, batch arrays, and SSE streaming responses.
    """
    try:
        body_bytes = await request.body()
        if not body_bytes:
            raise HTTPException(status_code=400, detail="Empty request body")

        body_json = json.loads(body_bytes.decode("utf-8"))
    except Exception as exc:
        logger.warning("MCP POST JSON parse error: %s", exc)
        return JSONResponse(
            status_code=400,
            content={
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error: Invalid JSON"},
            },
        )

    # Resolve or create session ID
    session_id = mcp_server.get_or_create_session(mcp_session_id)

    # 1. Batch JSON-RPC Request Handling
    if isinstance(body_json, list):
        batch_responses = []
        for req in body_json:
            resp = await mcp_server.handle_jsonrpc_request(req, session_id=session_id)
            if resp is not None:
                batch_responses.append(resp)

        return JSONResponse(
            content=batch_responses,
            headers={"Mcp-Session-Id": session_id, "Content-Type": "application/json"},
        )

    # 2. Single JSON-RPC Request Handling
    single_response = await mcp_server.handle_jsonrpc_request(body_json, session_id=session_id)

    # If the request was a notification (no ID), MCP spec allows 204 No Content
    if single_response is None:
        return Response(status_code=204, headers={"Mcp-Session-Id": session_id})

    # Check for SSE stream preference
    wants_sse = stream or (accept and "text/event-stream" in accept)
    if wants_sse:
        async def single_event_generator():
            yield f"event: message\ndata: {json.dumps(single_response, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            single_event_generator(),
            media_type="text/event-stream",
            headers={
                "Mcp-Session-Id": session_id,
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    return JSONResponse(
        content=single_response,
        headers={"Mcp-Session-Id": session_id, "Content-Type": "application/json"},
    )


@app.get("/mcp", summary="MCP Spec 2025-11-25 Streamable HTTP GET (SSE Notifications)")
async def mcp_get_endpoint(
    mcp_session_id: Optional[str] = Header(None, alias="Mcp-Session-Id"),
):
    """
    Opens a persistent Server-Sent Events (SSE) notification stream for
    server-initiated MCP notifications (Spec 2025-11-25).
    """
    session_id = mcp_server.get_or_create_session(mcp_session_id)
    return StreamingResponse(
        mcp_server.sse_stream_generator(session_id),
        media_type="text/event-stream",
        headers={
            "Mcp-Session-Id": session_id,
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# -----------------------------------------------------------------------------
# REST API Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health", summary="Service Health & Architecture Status")
async def health_check():
    """Returns runtime health, MCP spec version, and active AI engine details."""
    engine_name = "AWS_BEDROCK" if (bedrock_agent.bedrock_client and not bedrock_agent.demo_mode) else "MCP_DETERMINISTIC_ENGINE"
    return {
        "status": "ok",
        "service": "AuraCare Alexa+ Backend",
        "mcp_spec": MCP_SPEC_VERSION,
        "transport": "Streamable HTTP (2025-11-25)",
        "bedrock_mode": engine_name,
        "bedrock_model": bedrock_agent.model_id,
        "demo_mode": bedrock_agent.demo_mode,
        "active_mcp_sessions": len(mcp_server.active_sessions),
    }


@app.get("/api/state", summary="Fetch Complete Care State & Telemetry Log")
async def get_current_state():
    """Returns the locked care state snapshot including real-time vitals and MCP logs."""
    return await state_store.get_state()


@app.post("/api/agent/chat", summary="Alexa+ Voice & Intent Interaction")
async def agent_chat_endpoint(payload: AgentChatRequest):
    """
    Processes voice utterance or triggers one of the 5 flagship caregiving scenarios.
    Executes MCP tools via in-code JSON-RPC 2.0 dispatch and streams telemetry frames.
    """
    if not payload.prompt.strip() and not payload.scenario_id:
        raise HTTPException(status_code=400, detail="prompt or scenario_id required")

    result = await bedrock_agent.chat(
        prompt=payload.prompt,
        scenario_id=payload.scenario_id,
        session_id=payload.session_id,
    )
    return result


@app.post("/api/mcp/direct", summary="Direct Dashboard MCP Tool Execution")
async def direct_mcp_execution(payload: DirectMcpToolRequest):
    """
    Allows the Caregiver Dashboard UI to trigger any of the 5 MCP tools directly
    through the genuine MCP JSON-RPC 2.0 execution pipeline.
    """
    tool_result = await bedrock_agent.execute_mcp_tool_rpc(
        tool_name=payload.tool_name,
        tool_args=payload.arguments,
        session_id=payload.session_id,
    )
    state = await state_store.get_state()
    return {
        "status": "ok",
        "tool_name": payload.tool_name,
        "result": tool_result,
        "state": state,
    }


@app.post("/api/state/reset", summary="Instant Reset to Seed State")
async def reset_care_state():
    """
    Resets the caregiving database to the initial seed state and broadcasts
    the fresh state to all active dashboard WebSockets for instant demo resets.
    """
    new_state = await state_store.reset_to_seed()
    return {
        "status": "reset_successful",
        "message": "Care state successfully restored to initial seed specification.",
        "state": new_state,
    }


# -----------------------------------------------------------------------------
# Real-Time WebSocket Hub
# -----------------------------------------------------------------------------

@app.websocket("/ws/dashboard")
async def dashboard_websocket_endpoint(websocket: WebSocket):
    """
    Full-duplex WebSocket hub connecting remote family dashboards.
    Pushes INITIAL_STATE, STATE_UPDATE, MCP_TELEMETRY, CAREGIVER_ALERT,
    and AGENT_STATUS events in real time.
    """
    await websocket.accept()
    await state_store.register_websocket(websocket)

    # Immediately push current initial state upon connection
    initial_state = await state_store.get_state()
    await websocket.send_text(
        json.dumps({
            "type": "INITIAL_STATE",
            "payload": initial_state,
        }, ensure_ascii=False)
    )

    try:
        while True:
            # Keep socket alive and receive any client ping or commands
            message_text = await websocket.receive_text()
            try:
                msg = json.loads(message_text)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        await state_store.unregister_websocket(websocket)
    except Exception as exc:
        logger.debug("WebSocket error: %s", exc)
        await state_store.unregister_websocket(websocket)


# -----------------------------------------------------------------------------
# Standalone CLI Entrypoint
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
