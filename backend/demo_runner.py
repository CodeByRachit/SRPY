"""
AuraCare: Alexa+ Voice Caregiving & Remote Family Bridge
Module: demo_runner.py
Description: Production Backend Demo Orchestrator.
             Executes live choreographed Judge Demo sequences on the backend,
             driving genuine Bedrock Converse / MCP tool calls (log_medication_taken,
             add_appointment, check_in_status, notify_caregiver), and broadcasting
             live DEMO_STATUS and STATE_UPDATE events over the WebSocket hub.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("auracare.demo_runner")


class DemoRunner:
    """
    Centralized backend orchestrator for the 90-second Hackathon Judge Auto-Demo.
    Eliminates client-side dummy timers by running real MCP tool workflows
    and broadcasting real-time progress to all connected dashboards.
    """

    def __init__(self, state_store, bedrock_agent):
        self.state_store = state_store
        self.bedrock_agent = bedrock_agent
        self.is_running: bool = False
        self.current_step: int = 0
        self.total_steps: int = 4
        self.current_story: str = ""
        self.time_remaining: int = 0
        self._task: Optional[asyncio.Task] = None

    def get_status(self) -> Dict[str, Any]:
        """Returns the current demo execution status."""
        return {
            "isRunning": self.is_running,
            "step": self.current_step,
            "totalSteps": self.total_steps,
            "story": self.current_story,
            "timeRemaining": self.time_remaining,
        }

    async def broadcast_status(self) -> None:
        """Pushes current demo state to all WebSocket dashboard clients."""
        status = self.get_status()
        await self.state_store.broadcast({
            "type": "DEMO_STATUS",
            "payload": status,
            "data": status,
        })

    async def start(self) -> Dict[str, Any]:
        """Starts the backend choreographed demo sequence."""
        if self.is_running:
            return self.get_status()

        # Ensure we start from clean baseline seed state
        await self.state_store.reset_to_seed()

        self.is_running = True
        self.time_remaining = 75
        self.current_step = 1
        self.current_story = (
            "Scene 1/4: Eleanor Vance (78, Portland, OR). Her 2:00 PM Eliquis dose is overdue. "
            "Notice the red 3D capsule, 50% adherence gauge, and warning status."
        )
        await self.broadcast_status()

        if self._task and not self._task.done():
            self._task.cancel()

        self._task = asyncio.create_task(self._run_sequence())
        return self.get_status()

    async def stop(self) -> Dict[str, Any]:
        """Pauses or cancels the running demo sequence."""
        self.is_running = False
        self.current_step = 0
        self.current_story = ""
        self.time_remaining = 0

        if self._task and not self._task.done():
            self._task.cancel()

        await self.broadcast_status()
        return self.get_status()

    async def _run_sequence(self) -> None:
        """Executes the 4 live scenes in real time with Bedrock & MCP execution."""
        try:
            # --- Scene 1: Baseline inspection (4 seconds) ---
            for _ in range(4):
                if not self.is_running:
                    return
                await asyncio.sleep(1)
                self.time_remaining = max(0, self.time_remaining - 1)
                await self.broadcast_status()

            # --- Scene 2: Eleanor logs Eliquis pill ---
            if not self.is_running:
                return
            self.current_step = 2
            self.current_story = (
                "Scene 2/4: Eleanor speaks: \"Alexa, I just took my afternoon Eliquis pill\". "
                "MCP log_medication_taken executes live. 3D capsule turns green, adherence jumps to 75%, "
                "and Maya receives an instant push notification in Seattle!"
            )
            await self.broadcast_status()

            # Live backend Bedrock / MCP execution
            await self.bedrock_agent.chat(
                prompt="Alexa, I just took my afternoon Eliquis pill with a glass of water",
                scenario_id="LOG_ELIQUIS",
            )

            for _ in range(16):
                if not self.is_running:
                    return
                await asyncio.sleep(1)
                self.time_remaining = max(0, self.time_remaining - 1)
                await self.broadcast_status()

            # --- Scene 3: Book retinal exam with Dr. Priya Patel ---
            if not self.is_running:
                return
            self.current_step = 3
            self.current_story = (
                "Scene 3/4: Voice Care Coordination: Eleanor asks Alexa+ to schedule a retinal exam with Dr. Priya Patel. "
                "MCP add_appointment adds it to both her schedule and Maya’s synced dashboard."
            )
            await self.broadcast_status()

            # Live backend Bedrock / MCP execution
            await self.bedrock_agent.chat(
                prompt="Alexa, could you schedule an eye exam with Dr. Priya Patel for tomorrow at 2:00 PM?",
                scenario_id="ADD_EYE_EXAM",
            )

            for _ in range(16):
                if not self.is_running:
                    return
                await asyncio.sleep(1)
                self.time_remaining = max(0, self.time_remaining - 1)
                await self.broadcast_status()

            # --- Scene 4: Emergency Escalation Check ---
            if not self.is_running:
                return
            self.current_step = 4
            self.current_story = (
                "Scene 4/4: Emergency Guardian Escalate: Eleanor is unresponsive to proactive wellness prompt. "
                "MCP check_in_status sets status to CRITICAL, triggers alert sirens, and alerts Maya immediately."
            )
            await self.broadcast_status()

            # Live backend Bedrock / MCP execution
            await self.bedrock_agent.chat(
                prompt="Alexa, Eleanor has not responded to the proactive living room check-in prompt!",
                scenario_id="UNRESPONSIVE_CHECKIN",
            )

            for _ in range(16):
                if not self.is_running:
                    return
                await asyncio.sleep(1)
                self.time_remaining = max(0, self.time_remaining - 1)
                await self.broadcast_status()

            # --- Resolution: Eleanor checks in safely ---
            if not self.is_running:
                return
            self.current_story = (
                "Resolution: Eleanor checks in verbally (\"I'm okay, just stepped outside for fresh air\"). "
                "MCP resets status back to Healthy, reassuring Maya 680 miles away."
            )
            await self.broadcast_status()

            # Live backend Bedrock / MCP execution
            await self.bedrock_agent.chat(
                prompt="Alexa, I'm okay now, just stepped outside for fresh air",
                scenario_id="RESET_OK",
            )

            for _ in range(12):
                if not self.is_running:
                    return
                await asyncio.sleep(1)
                self.time_remaining = max(0, self.time_remaining - 1)
                await self.broadcast_status()

            # Completed
            self.is_running = False
            self.current_step = 0
            self.current_story = "Demo completed successfully. All 4 scenes executed live on the backend MCP server."
            self.time_remaining = 0
            await self.broadcast_status()

        except asyncio.CancelledError:
            logger.info("Demo runner task cancelled by user or reset.")
        except Exception as exc:
            logger.exception("Unexpected error in DemoRunner sequence: %s", exc)
            self.is_running = False
            await self.broadcast_status()
