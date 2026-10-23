# Devpost Submission: AuraCare

> **Build, Ship, Shape: Amazon Developer Hackathon 2026**  
> **Primary Track:** Alexa+  
> **Mini-Challenges Entered:** AWS Builder & Open Source  
> **Repository:** [https://github.com/CodeByRachit/SRPY](https://github.com/CodeByRachit/SRPY)

---

## Quick Reference / Copy-Paste Fields

- **Project Title:** AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
- **Tagline:** Empowering seniors to age in place safely with Alexa+ voice AI and self-hosted MCP Spec 2025-11-25, bridging remote families through real-time telemetry and peace of mind.
- **Track Selection:** Alexa+ (Primary Track)
- **Mini-Challenges:** AWS Builder, Open Source (MIT)

---

## 💡 The Problem: The Loneliness & Medication Non-Adherence Epidemic

Over **54 million Americans** are age 65 or older, and more than **80% live with at least two chronic medical conditions** such as hypertension, diabetes, or atrial fibrillation. In our society, over **14 million seniors live entirely alone**.

At the same time, their adult children—the **"Sandwich Generation"**—often live hundreds or thousands of miles away, balancing demanding careers, their own children, and constant gnawing anxiety about their aging parents:
- *"Did Mom remember to take her afternoon blood thinner?"*
- *"Why isn't Dad answering his phone—is he just gardening, or did he slip and fall?"*
- *"Is she drinking enough water with her medications?"*

Critical medications like **Eliquis (Apixaban)** have short half-lives; missing a single dose drastically elevates the risk of stroke. Yet existing solutions are broken: seniors reject complicated smartphone apps, and passive alarm clocks lack conversational empathy. Seniors don't want surveillance cameras—they want dignity, warmth, and someone to talk to.

---

## 🛡️ The Solution: AuraCare

**AuraCare** transforms the living room **Amazon Echo Show 15** into a warm, clinically sound, voice-first caregiving companion. Built natively on **Alexa+**, **AWS Bedrock (Amazon Nova Pro & Anthropic Claude 3.5 Sonnet)**, and the **Model Context Protocol (MCP Spec 2025-11-25 Streamable HTTP)**, AuraCare delivers:

1. **Conversational Medication Reconciliation:** Eleanor simply speaks naturally: *"Alexa, I just took my afternoon blood thinner with a glass of water."* AuraCare understands fuzzy aliases, records the dose, increments hydration, and clears overdue warnings.
2. **Real-Time Remote Family Bridge:** 680 miles away in San Francisco, Eleanor's daughter Maya sees her caregiver dashboard update instantly via WebSockets, receiving animated push notifications that confirm her mother is safe.
3. **Proactive Wellness Check-Ins & Fallback Escalation:** If Eleanor is unresponsive to scheduled chimes or reports feeling dizzy, AuraCare immediately escalates her status to `CRITICAL` and dispatches priority alerts to Maya's smartphone.
4. **Voice Care Calendar:** Eleanor can schedule telehealth or clinic visits by voice (*"Alexa, book an eye exam with Dr. Patel for tomorrow"*), automatically updating both the living room calendar and Maya's dashboard.

---

## 🏗️ How We Built It: Technical Architecture

AuraCare was built from the ground up as a zero-compromise distributed system:

```text
Echo Show 15 (Alexa+) ──> FastAPI Gateway (:8000) ──> AWS Bedrock Converse API (Nova Pro)
                                │                                │
                                │ Streamable HTTP SSE            │ In-Code JSON-RPC 2.0
                                v                                v
                     Caregiver Dashboard (:5173) <── MCP Spec 2025-11-25 Server (5 Tools)
                                                        │
                                                        v
                                             CareStateStore (asyncio.Lock)
```

- **Alexa+ & AWS Bedrock Converse API (`bedrock_agent.py`):** Utilizes `boto3.client("bedrock-runtime").converse()` to run a multi-turn tool-calling agent loop. When the foundation model returns `stopReason == "tool_use"`, the agent executes the tool over MCP JSON-RPC 2.0 and feeds the `toolResult` back to the model.
- **MCP Spec 2025-11-25 Streamable HTTP Server (`mcp_server.py`):** Fully self-hosted MCP server implementing both `POST /mcp` (for JSON-RPC request-response and SSE streaming) and `GET /mcp` (for server-initiated notifications). Tracks sessions via `Mcp-Session-Id` and exposes 5 clinical tools, 2 context resources, and 3 clinical prompts.
- **Dual-Engine Zero-Crash Architecture:** If AWS credentials are missing or throttled during live evaluation, AuraCare automatically falls back to an in-memory Deterministic Clinical Intent & Multi-Tool Orchestrator that still executes the real MCP tools via JSON-RPC 2.0!
- **Thread-Safe State Store (`state_store.py`):** Employs an `asyncio.Lock()`-guarded reactive state store with automated disk persistence (`data/care_state.json`) and WebSocket broadcasting to all connected caregiver clients.

---

## 🏆 Mini-Challenge 1: AWS Builder Submission Text

### How AuraCare Leverages AWS Technology
AuraCare is an end-to-end showcase of modern AWS generative AI and distributed architecture:
- **Amazon Bedrock Converse API:** We utilize Bedrock's unified Converse API (`us.amazon.nova-pro-v1:0` and `us.anthropic.claude-3-5-sonnet-20241022-v2:0`) to power multi-turn conversational agents with structured tool calling. Bedrock interprets senior voice intentions, manages dialogue state, and coordinates multi-tool executions seamlessly.
- **Amazon Nova Pro:** We chose Amazon Nova Pro for its lightning-fast time-to-first-token latency, ensuring Eleanor experiences fluid, natural conversational cadence on her Echo Show without uncomfortable pauses.
- **AWS Model Context Protocol Integration:** AuraCare implements the latest MCP Spec 2025-11-25 Streamable HTTP transport, proving how AWS Bedrock models can orchestrate external clinical state machines and enterprise APIs through standardized, open protocols.
- **Resilient Fallback Design:** Our dual-engine architecture demonstrates cloud-resilient engineering principles, ensuring healthcare-critical voice systems remain functional even during cloud connectivity interruptions.

---

## 🌐 Mini-Challenge 2: Open Source Submission Text

### Open Source Commitment & Standards
AuraCare is 100% open source under the permissive **MIT License** and publicly available at:  
👉 **[https://github.com/CodeByRachit/SRPY](https://github.com/CodeByRachit/SRPY)**

- **Spec-Compliant MCP Reference Implementation:** Provides the open-source community with a complete, zero-dependency Python implementation of the **MCP Spec 2025-11-25 Streamable HTTP** transport, complete with session management, SSE event streaming, and JSON-RPC 2.0 dispatching.
- **Automated Test Suite:** Includes `test_mcp_flow.py`, an executable verification suite testing the entire MCP lifecycle (handshake, tool listing, tool execution, dynamic rule recalculation, and HTTP streaming) in under 1 second.
- **Community Documentation:** Includes detailed architectural diagrams, a 6-entry technical friction log with actionable feedback for the Amazon engineering team, and comprehensive quickstart instructions for developers.

---

## 🎬 2-Minute 30-Second Demo Video Script

*Visual & Audio Direction for Screen Recording and Presentation:*

| Timestamp | Visual on Screen | Spoken Audio / Narration |
|---|---|---|
| **0:00 - 0:25** | Split screen: Left shows Eleanor's living room Echo Show 15. Right shows Maya's smartphone in San Francisco displaying the AuraCare Family Dashboard. Status shows **WARNING**, Adherence at **50%**, Eliquis marked **OVERDUE**. | *"Meet Eleanor Vance, 78, living in Seattle with Atrial Fibrillation. 680 miles away in San Francisco is her daughter Maya. It's 2:45 PM, and Eleanor's critical afternoon blood thinner—Eliquis—is 45 minutes overdue. Maya is worried, but she doesn't want to micromanage her mother. This is where AuraCare steps in."* |
| **0:25 - 0:55** | Focus on Echo Show 15. Eleanor speaks: *"Alexa, I just took my afternoon blood thinner with a full glass of water."* Echo Show displays dynamic audio waves. Agent status animates: `THINKING` -> `CALLING_MCP_TOOL` -> `SPEAKING`. | *Eleanor:* "Alexa, I just took my afternoon blood thinner with a full glass of water."<br>*Alexa+ (AuraCare):* "Wonderful, Eleanor! I've logged your afternoon Eliquis 5 milligram dose and marked down an extra glass of water. I also sent a quick note to Maya so she knows you're right on track for your 4:30 PM cardiology video call with Dr. Thorne." |
| **0:55 - 1:25** | Cut to Caregiver Dashboard. Eliquis pill card slides into `TAKEN`, Adherence bar animates smoothly from **50% to 75%**, Status turns green (**HEALTHY**). An animated push banner appears: *"✅ Eliquis 5mg Logged by Eleanor"*. Terminal shows live MCP Spec 2025-11-25 JSON-RPC 2.0 telemetry frames streaming over SSE. | *"Instantly, without Maya having to send a nagging text, her dashboard updates over WebSockets. Under the hood, Alexa+ executed our self-hosted Model Context Protocol server over Spec 2025-11-25 Streamable HTTP. Real JSON-RPC 2.0 packets were dispatched to AWS Bedrock Converse API, logging the dose, incrementing hydration, and updating clinical state in real time."* |
| **1:25 - 1:55** | Dashboard demonstrates the Emergency Check-in scenario. Alexa+ chimes: *"Eleanor, are you feeling alright?"* Senior simulates no response. Patient status immediately escalates to **CRITICAL**. An audible chime and red alert banner flash on Maya's screen with recommended action: *"Initiate Echo Show Drop-In"*. | *"What happens in an emergency? If Eleanor fails to respond to a wellness check-in, AuraCare's check_in_status MCP tool escalates her status to CRITICAL. An urgent push notification alerts Maya to check in or initiate an Echo Show Drop-In immediately."* |
| **1:55 - 2:15** | Senior speaks: *"Alexa, book an eye exam with Dr. Priya Patel for tomorrow at 2 PM."* Appointment card appears instantly on Eleanor's calendar and Maya's dashboard. | *Eleanor:* "Alexa, book an eye exam with Dr. Priya Patel for tomorrow at 2 PM."<br>*Alexa+:* "All set, Eleanor. I've added your eye exam with Dr. Priya Patel for tomorrow at 2:00 PM to your care calendar, and I notified Maya so she can coordinate your ride." |
| **2:15 - 2:30** | Wide beauty shot of AuraCare architecture, GitHub repository, and MIT License badge. | *"AuraCare combines the natural warmth of Alexa+ voice AI with the clinical precision of AWS Bedrock and the Model Context Protocol. It gives seniors the independence they cherish, and families the peace of mind they deserve. Thank you!"* |

---

## 🚀 Accomplishments That We're Proud Of
- 100% complete, zero-placeholder implementation of the official **MCP Spec 2025-11-25 Streamable HTTP** transport in Python.
- Seamless multi-turn tool execution loop using **AWS Bedrock Converse API** (`nova-pro` and `claude-3-5-sonnet`).
- Robust **Dual-Engine Architecture** ensuring zero crashes during live demonstrations.
- Sub-second dynamic clinical recalculation of adherence rates, hydration goals, and overdue dose warnings.

---

## 🔮 What's Next for AuraCare
- Native integration with **Amazon Pharmacy** to automate prescription refills directly via Alexa+ voice commands.
- Biometric vitals ingestion from **AWS IoT** connected blood pressure cuffs and continuous glucose monitors.
- Multi-lingual voice support for non-English-speaking seniors aging in place.
