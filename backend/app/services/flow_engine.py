"""
FlowEngine - Core conversation flow management.

Orchestrates the conversation by building prompts, calling the LLM client,
interpreting structured responses, and managing stage transitions.
The LLM is a functional component — the FlowEngine stays in control.
"""

import logging
from typing import TYPE_CHECKING, Optional

from app.core.config import settings
from app.core.prompts import STAGE_REGISTRY, STAGE_ORDER, build_system_prompt
from app.schemas.llm import RoutingSignal

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.message import Message
    from app.models.student import Student
    from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)


class FlowEngine:
    """
    Manages conversation flow through stages.

    Takes a session, its message history, the student, and an LLM client.
    process() calls the LLM and returns the response text, new stage,
    completion flag, and metadata to persist.
    """

    def __init__(
        self,
        session: "Session",
        history: list["Message"],
        student: "Student",
        llm_client: "LLMClient",
    ):
        self.session = session
        self.history = history
        self.student = student
        self.llm_client = llm_client
        self.current_stage = session.current_stage

    async def process(self, user_input: str) -> tuple[str, str, bool, Optional[dict]]:
        """
        Process user input and generate an LLM response.

        Returns:
            (response_text, new_stage, is_complete, llm_metadata)
        """
        # Build system prompt for current stage
        system_prompt = build_system_prompt(
            stage_id=self.current_stage,
            student_name=self.student.display_name or self.student.username,
            pronouns=self.student.pronouns,
            tone_pref=self.student.tone_pref,
        )

        # Build message history for the LLM
        messages = self._build_message_history(user_input)

        # Call the LLM
        llm_result = await self.llm_client.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            stage_id=self.current_stage,
        )
        llm_response = llm_result.response

        # Check safety valve: force-advance if too many turns in this stage
        stage_turns = self._count_stage_turns()
        stage_config = STAGE_REGISTRY.get(self.current_stage, {})
        max_turns = stage_config.get("max_turns", settings.LLM_STAGE_MAX_TURNS)
        forced_advance = False

        if stage_turns >= max_turns and not llm_response.stage_completed:
            logger.info(
                f"Safety valve: forcing advance from '{self.current_stage}' "
                f"after {stage_turns} turns (max: {max_turns})"
            )
            llm_response.stage_completed = True
            llm_response.routing_signal = RoutingSignal.NEXT
            forced_advance = True

        # Determine new stage
        new_stage = self.current_stage
        if llm_response.stage_completed and llm_response.routing_signal == RoutingSignal.NEXT:
            next_stage = stage_config.get("next_stage")
            if next_stage:
                new_stage = next_stage

        # Session is complete when wrap_up stage is completed
        is_complete = (
            self.current_stage == "wrap_up" and llm_response.stage_completed
        )

        # Build metadata to save alongside the assistant message
        llm_metadata = {
            "routing_signal": llm_response.routing_signal.value,
            "stage_completed": llm_response.stage_completed,
            "reflection_data": llm_response.reflection_data,
            "model": settings.OPENAI_MODEL,
            "prompt_version": "v2",
            "forced_advance": forced_advance,
            "response_time_ms": llm_result.response_time_ms,
            "token_usage": llm_result.token_usage,
            "attempt_number": llm_result.attempt_number,
        }

        return llm_response.student_text, new_stage, is_complete, llm_metadata

    def _build_message_history(self, current_input: str) -> list[dict]:
        """
        Convert DB message history + current user input into the
        [{role, content}] format the LLM expects.
        """
        messages = []
        for msg in self.history:
            messages.append({
                "role": msg.role.value,
                "content": msg.content,
            })

        # Add the current user message (not yet in DB history)
        messages.append({
            "role": "user",
            "content": current_input,
        })

        return messages

    def _count_stage_turns(self) -> int:
        """Count how many assistant messages exist in the current stage."""
        return sum(
            1 for m in self.history
            if m.stage_id == self.current_stage and m.role.value == "assistant"
        )
