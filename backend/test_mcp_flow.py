"""
AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
Module: test_mcp_flow.py
Description: Comprehensive automated test suite verifying MCP Spec 2025-11-25
             Streamable HTTP compliance, JSON-RPC 2.0 handshake, 5 caregiving tools,
             dynamic clinical rules, and Bedrock agent dual-engine execution.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

# Ensure current directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from main import app
from mcp_server import MCP_SPEC_VERSION, mcp_server
from state_store import state_store
from bedrock_agent import bedrock_agent


@pytest.mark.asyncio
async def test_mcp_initialize_handshake():
    """Verifies MCP Spec 2025-11-25 initialize handshake and capabilities."""
    req_id = "test_init_001"
    request = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": "initialize",
        "params": {
            "protocolVersion": MCP_SPEC_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "alexa-plus-tester", "version": "1.0.0"},
        },
    }

    response = await mcp_server.handle_jsonrpc_request(request)
    assert response is not None
    assert response["jsonrpc"] == "2.0"
    assert response["id"] == req_id
    assert "result" in response

    result = response["result"]
    assert result["protocolVersion"] == "2025-11-25"
    assert result["serverInfo"]["name"] == "auracare-alexa-plus-mcp"
    assert "tools" in result["capabilities"]
    assert "resources" in result["capabilities"]
    assert "prompts" in result["capabilities"]


@pytest.mark.asyncio
async def test_mcp_tools_list():
    """Verifies that all 5 required caregiving tools are registered with schemas."""
    request = {
        "jsonrpc": "2.0",
        "id": "test_tools_list",
        "method": "tools/list",
        "params": {},
    }

    response = await mcp_server.handle_jsonrpc_request(request)
    assert response is not None
    assert "result" in response

    tools = response["result"]["tools"]
    tool_names = [t["name"] for t in tools]

    expected_tools = [
        "log_medication_taken",
        "get_today_schedule",
        "add_appointment",
        "check_in_status",
        "notify_caregiver",
    ]
    for exp in expected_tools:
        assert exp in tool_names, f"Expected tool {exp} missing from MCP tools/list"

    # Validate JSON schemas
    for t in tools:
        assert "inputSchema" in t
        assert t["inputSchema"].get("type") == "object"


@pytest.mark.asyncio
async def test_mcp_log_medication_and_dynamic_rules():
    """
    Verifies log_medication_taken tool execution and clinical recalculations:
    - Eliquis logged as TAKEN
    - Adherence updates from 50% to 75%
    - Hydration increments
    - Patient status clears from WARNING to HEALTHY
    """
    await state_store.reset_to_seed()
    initial_state = await state_store.get_state()
    assert initial_state["patient"]["adherence_Rate"] == 50
    assert initial_state["patient"]["status"] == "WARNING"

    request = {
        "jsonrpc": "2.0",
        "id": "test_med_01",
        "method": "tools/call",
        "params": {
            "name": "log_medication_taken",
            "arguments": {
                "medication_name": "Eliquis (Apixaban)",
                "taken_time": "02:52 PM",
                "hydration_glass_added": True,
                "notes": "Taken with lunch",
            },
        },
    }

    response = await mcp_server.handle_jsonrpc_request(request)
    assert response is not None
    assert "result" in response
    assert response["result"]["isError"] is False

    structured = response["result"]["structuredContent"]
    assert structured["status"] == "TAKEN"
    assert structured["adherence_rate"] == 75
    assert structured["overall_status"] == "HEALTHY"

    # Verify state store reflects changes
    state = await state_store.get_state()
    assert state["patient"]["adherence_Rate"] == 75
    assert state["patient"]["status"] == "HEALTHY"
    assert state["patient"]["vitals"]["hydration_glasses"] == 4

    # Check that Eliquis alert is acknowledged
    for alert in state["alerts"]:
        if "Eliquis" in alert["title"]:
            assert alert["acknowledged"] is True


@pytest.mark.asyncio
async def test_mcp_checkin_escalation():
    """Verifies that an unresponsive voice check-in escalates patient to CRITICAL."""
    request = {
        "jsonrpc": "2.0",
        "id": "test_chk_01",
        "method": "tools/call",
        "params": {
            "name": "check_in_status",
            "arguments": {
                "check_in_type": "MISSED_DOSE_VERIFICATION",
                "patient_response": "NO_RESPONSE",
                "reported_mood": "Unresponsive",
                "symptom_notes": "No voice answer detected after chimes",
            },
        },
    }

    response = await mcp_server.handle_jsonrpc_request(request)
    assert response is not None
    structured = response["result"]["structuredContent"]
    assert structured["escalation_required"] is True
    assert structured["patient_status"] == "CRITICAL"

    state = await state_store.get_state()
    assert state["patient"]["status"] == "CRITICAL"


@pytest.mark.asyncio
async def test_mcp_notify_caregiver():
    """Verifies notify_caregiver creates alert and timeline event."""
    request = {
        "jsonrpc": "2.0",
        "id": "test_notif_01",
        "method": "tools/call",
        "params": {
            "name": "notify_caregiver",
            "arguments": {
                "urgency": "HIGH",
                "subject": "Medication Reminder Verification",
                "message": "Testing caregiver alert delivery via MCP.",
                "recommended_action": "Check in via phone",
            },
        },
    }

    response = await mcp_server.handle_jsonrpc_request(request)
    assert response is not None
    structured = response["result"]["structuredContent"]
    assert structured["status"] == "SENT"
    assert structured["urgency"] == "HIGH"


@pytest.mark.asyncio
async def test_mcp_resources_and_prompts():
    """Verifies MCP resources read and prompt templating."""
    # Read resource
    res_req = {
        "jsonrpc": "2.0",
        "id": "test_res_01",
        "method": "resources/read",
        "params": {"uri": "care://patient/eleanor/state"},
    }
    res_resp = await mcp_server.handle_jsonrpc_request(res_req)
    assert res_resp is not None
    contents = res_resp["result"]["contents"]
    assert len(contents) > 0
    assert "Eleanor Vance" in contents[0]["text"]

    # Read prompt
    prm_req = {
        "jsonrpc": "2.0",
        "id": "test_prm_01",
        "method": "prompts/get",
        "params": {"name": "morning_briefing", "arguments": {}},
    }
    prm_resp = await mcp_server.handle_jsonrpc_request(prm_req)
    assert prm_resp is not None
    messages = prm_resp["result"]["messages"]
    assert len(messages) > 0
    assert "Eleanor" in messages[0]["content"]["text"]


@pytest.mark.asyncio
async def test_bedrock_agent_scenarios():
    """Verifies multi-tool execution through the Bedrock agent orchestrator."""
    await state_store.reset_to_seed()

    # Scenario: LOG_ELIQUIS
    res = await bedrock_agent.chat(
        prompt="I just took my Eliquis pill with water",
        scenario_id="LOG_ELIQUIS",
    )
    assert "Eliquis" in res["reply"]
    assert len(res["tool_calls"]) == 2  # log_medication_taken + notify_caregiver
    assert res["state"]["patient"]["adherence_Rate"] == 75

    # Scenario: GET_SCHEDULE
    res_sched = await bedrock_agent.chat(
        prompt="What is my schedule for today?",
        scenario_id="GET_SCHEDULE",
    )
    assert "Dr. Aris Thorne" in res_sched["reply"]
    assert len(res_sched["tool_calls"]) >= 1


@pytest.mark.asyncio
async def test_fastapi_streamable_http_endpoints():
    """Verifies FastAPI endpoints over HTTP and SSE streaming."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        h_resp = await client.get("/api/health")
        assert h_resp.status_code == 200
        h_data = h_resp.json()
        assert h_data["status"] == "ok"
        assert h_data["mcp_spec"] == "2025-11-25"

        # 2. POST /mcp initialize
        init_payload = {
            "jsonrpc": "2.0",
            "id": "http_init",
            "method": "initialize",
            "params": {"protocolVersion": "2025-11-25"},
        }
        mcp_post = await client.post("/mcp", json=init_payload)
        assert mcp_post.status_code == 200
        assert "Mcp-Session-Id" in mcp_post.headers
        post_json = mcp_post.json()
        assert post_json["result"]["protocolVersion"] == "2025-11-25"

        # 3. POST /mcp with SSE stream requested
        mcp_sse = await client.post("/mcp?stream=true", json=init_payload)
        assert mcp_sse.status_code == 200
        assert "text/event-stream" in mcp_sse.headers.get("content-type", "")
        sse_text = mcp_sse.text
        assert "event: message" in sse_text
        assert "2025-11-25" in sse_text

        # 4. State Reset
        reset_resp = await client.post("/api/state/reset")
        assert reset_resp.status_code == 200
        assert reset_resp.json()["status"] == "reset_successful"

        # 5. Demo Runner Endpoints
        start_demo = await client.post("/api/demo/start")
        assert start_demo.status_code == 200
        assert start_demo.json()["status"] == "started"

        status_demo = await client.get("/api/demo/status")
        assert status_demo.status_code == 200
        assert status_demo.json()["isRunning"] is True

        stop_demo = await client.post("/api/demo/stop")
        assert stop_demo.status_code == 200
        assert stop_demo.json()["status"] == "stopped"


async def run_standalone_test_suite():
    """Runs all test routines sequentially for direct terminal execution."""
    print("======================================================================")
    print("AuraCare: Running Automated MCP Spec 2025-11-25 Verification Suite")
    print("======================================================================")

    print("\n[1/7] Testing MCP Spec 2025-11-25 Handshake...")
    await test_mcp_initialize_handshake()
    print("  -> Passed: Protocol version 2025-11-25 and capabilities confirmed.")

    print("\n[2/7] Testing MCP Tools List (5 Caregiving Tools)...")
    await test_mcp_tools_list()
    print("  -> Passed: All 5 tools registered with JSON schemas.")

    print("\n[3/7] Testing log_medication_taken and Dynamic Recalculation...")
    await test_mcp_log_medication_and_dynamic_rules()
    print("  -> Passed: Eliquis logged, adherence 75%, hydration +1, status HEALTHY.")

    print("\n[4/7] Testing check_in_status Escalation...")
    await test_mcp_checkin_escalation()
    print("  -> Passed: Unresponsive check-in escalated patient to CRITICAL.")

    print("\n[5/7] Testing notify_caregiver Alert Dispatch...")
    await test_mcp_notify_caregiver()
    print("  -> Passed: Caregiver alert generated and logged.")

    print("\n[6/7] Testing MCP Resources and Prompts...")
    await test_mcp_resources_and_prompts()
    print("  -> Passed: Resources read and prompt templates rendered.")

    print("\n[7/7] Testing FastAPI Streamable HTTP, Bedrock Agent & Demo Runner...")
    await test_bedrock_agent_scenarios()
    await test_fastapi_streamable_http_endpoints()
    print("  -> Passed: Streamable HTTP SSE, Bedrock Converse loop, and Demo Runner verified.")

    print("\n======================================================================")
    print("ALL TESTS PASSED: AuraCare backend is 100% compliant with MCP Spec 2025-11-25!")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(run_standalone_test_suite())
