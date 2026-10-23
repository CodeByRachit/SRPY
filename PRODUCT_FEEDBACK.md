# Product Feedback: Alexa+ MCP & AWS Bedrock

> **Submitted for:** Build, Ship, Shape: Amazon Developer Hackathon 2026  
> **Project:** AuraCare (Alexa+ Voice Caregiving & Remote Family Bridge)  
> **Author:** The AuraCare Engineering Team

---

## 1. Alexa+ Model Context Protocol (MCP) Server (Spec 2025-11-25 Streamable HTTP)

### What We Used It For
We implemented a self-hosted Model Context Protocol (MCP) server adhering strictly to the **Spec 2025-11-25 Streamable HTTP** transport. Our server exposes:
- **5 Core Clinical Caregiving Tools:** `log_medication_taken`, `get_today_schedule`, `add_appointment`, `check_in_status`, and `notify_caregiver`.
- **Dynamic Context Resources:** `care://patient/eleanor/state` and `care://patient/eleanor/medications`.
- **Pre-choreographed Prompts:** `morning_briefing`, `overdue_dose_checkin`, and `caregiver_escalation_summary`.

### What Worked Well (Developer Delights)
- **Standardized Schema Contracts:** Using JSON Schema for tool definitions eliminated ambiguity between our backend data models and the LLM's tool calling expectations.
- **Bi-directional Capability Negotiation:** The `initialize` handshake (`protocolVersion: "2025-11-25"`) provides a clean separation of concerns, allowing clients to announce feature support (tools, resources, prompts, logging) dynamically.
- **Streamable HTTP Unification:** Combining HTTP POST (for JSON-RPC request-response) with SSE streams (for notifications and progress updates) provides an ideal architecture for cloud-hosted agent backends.

### What Needs Work (Friction Encountered)
- **Session Header Standardization:** The transition to `Mcp-Session-Id` header handling in the 2025-11-25 spec lacked standard middleware reference implementations in Python (FastAPI/Starlette). We had to build custom header extraction and session management logic.
- **Error Response Homogeneity:** The spec defines standard JSON-RPC 2.0 error codes (`-32600`, `-32601`, etc.), but lacks specific guidance on clinical validation errors vs. agent execution faults. Providing standard `isError: true` result envelopes alongside JSON-RPC errors requires custom adapter boilerplate.

### Onboarding Experience
- **Rating:** 8.5 / 10
- **Feedback:** Clear conceptual model; would benefit from a turnkey FastAPI / ASGI adapter package provided directly by the Amazon Alexa+ developer relations team.

### Would We Build With It Again?
**Yes, absolutely.** MCP is clearly the future of agentic tool-calling and context sharing.

---

## 2. Amazon Bedrock Converse API (`bedrock-runtime`)

### What We Used It For
We utilized the Bedrock Converse API (`boto3.client("bedrock-runtime").converse()`) to orchestrate multi-turn conversational tool execution with:
- `us.amazon.nova-pro-v1:0` (Amazon Nova Pro)
- `us.anthropic.claude-3-5-sonnet-20241022-v2:0` (Anthropic Claude 3.5 Sonnet)

The agent consumes senior voice utterances from the living room Echo Show 15, detects intent, selects MCP caregiving tools via `stopReason == "tool_use"`, receives structured `toolResult` payloads, and generates empathetic spoken voice confirmations.

### What Worked Well (Developer Delights)
- **Unified Tool-Use Interface:** The Converse API eliminates the tedious model-specific payload formats between Nova and Claude. A single `toolConfig` and `toolResult` block structure works across foundation model providers.
- **Amazon Nova Pro Latency:** Nova Pro demonstrated exceptional time-to-first-token latency, critical for maintaining a conversational voice rhythm on Alexa+ devices where seniors expect sub-second responses.
- **Deterministic Multi-Turn Loops:** The Converse API handles tool chaining cleanly, allowing our agent to log a medication and immediately trigger a caregiver notification in a single prompt exchange.

### What Needs Work (Friction Encountered)
- **Tool Result Schema Strictness:** Bedrock Converse requires `toolResult` blocks to contain either `text` or `json`. When returning rich diagnostic metadata alongside voice text, strict schema mismatches occasionally caused `ValidationException` without verbose field-level error pointers.
- **Credential Graceful Degradation:** During live hackathon demonstrations, intermittent IAM throttling or expired session tokens can abruptly terminate client workflows. We engineered a resilient Dual-Engine Fallback architecture to safeguard our demo.

### Onboarding Experience
- **Rating:** 9 / 10
- **Feedback:** Outstanding API evolution compared to legacy `invoke_model`. The Converse API is now our default recommendation for AWS agentic workflows.

### Would We Build With It Again?
**Yes.** Bedrock Converse API is best-in-class for enterprise generative AI orchestration.

---

## 3. Kiro & AWS Developer Tooling

### What We Used It For
We leveraged AWS developer tooling, CLI utilities, and AWS CloudShell for model testing, IAM credential verification, and bedrock runtime latency benchmarking across `us-east-1` and `us-west-2`.

### What Worked Well (Developer Delights)
- Rapid access to foundation model playgrounds via the AWS Management Console to test clinical system prompt wording before wiring into backend code.
- Predictable IAM role scoping for Bedrock invocation (`bedrock:InvokeModel`, `bedrock:Converse`).

### What Needs Work (Friction Encountered)
- Local debugging of Alexa+ skills and MCP agents currently lacks an integrated desktop simulator that can visually render both the voice audio waveform and the Echo Show APL (Alexa Presentation Language) screen simultaneously.

---

## 4. Top 3 Prioritized Feature Requests for Amazon Engineering

### 1. [CRITICAL] Official AWS-Managed MCP Gateway for Bedrock Agents
- **Description:** Provide a native AWS service (or API Gateway extension) that exposes a secure, managed MCP Spec 2025-11-25 Streamable HTTP endpoint directly to Bedrock Agents.
- **Impact:** Developers currently have to host custom FastAPI wrappers to translate Bedrock action groups into MCP JSON-RPC 2.0 packets. A native AWS MCP Gateway would make Bedrock the definitive cloud home for MCP servers globally.

### 2. [IMPORTANT] Bedrock Converse API Streaming Tool Progress Indicators
- **Description:** Allow the Converse stream API (`converse_stream`) to emit intermediate progress heartbeats while an MCP tool is executing (e.g. database query or external notification).
- **Impact:** Alexa+ voice assistants could play an audible "checking now..." audio earcon if an MCP tool takes longer than 800ms, keeping the senior engaged without awkward dead silence.

### 3. [NICE-TO-HAVE] Local Alexa+ Echo Show Hardware Simulator CLI
- **Description:** A lightweight developer CLI tool that mocks the living room Echo Show 15 screen, audio microphone input, and speaker output locally with live WebSocket inspector tabs.
- **Impact:** Dramatically accelerates hackathon and enterprise development cycles by removing the requirement for physical Echo Show test hardware on the desk.
