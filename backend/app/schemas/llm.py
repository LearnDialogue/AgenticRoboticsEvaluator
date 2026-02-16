"""
LLM Response Schema — the contract between the LLM and the FlowEngine.

Every LLM call must return JSON that validates against LLMTurnResponse.
The FlowEngine never sees raw LLM text; it only sees this structured object.
"""

from enum import Enum as PyEnum
from typing import Optional

from pydantic import BaseModel, Field


class RoutingSignal(str, PyEnum):
    """
    Determines how the FlowEngine should handle stage transitions.
    
    Current options:
        NEXT — Student has satisfied the stage goal; advance to next stage.
        STAY — Student is still working through this stage; remain here.
    
    Future options (add here when needed):
        PREVIOUS — Student needs to revisit an earlier stage.
        JUMP_TO  — Non-linear jump (would carry a target stage_id).
    """
    NEXT = "NEXT"
    STAY = "STAY"


class LLMTurnResponse(BaseModel):
    """
    The exact JSON structure the LLM must return on every turn.
    
    This is validated by Pydantic after every LLM call.
    If validation fails, the LLM client retries or falls back to a template.
    
    Fields:
        student_text:    The conversational response shown to the student.
        stage_completed: Has the student satisfied the current stage's goal?
        routing_signal:  NEXT (advance) or STAY (remain in stage).
        reflection_data: Optional research extraction (never shown to user).
                         Examples: {"emotional_tone": "frustrated", 
                                    "conflict_detected": false,
                                    "engagement_level": "high"}
    """
    student_text: str = Field(
        ...,
        description="The conversational response to show the student.",
        min_length=1,
    )
    stage_completed: bool = Field(
        ...,
        description="True if the student has satisfied this stage's goal.",
    )
    routing_signal: RoutingSignal = Field(
        ...,
        description="NEXT to advance stage, STAY to remain.",
    )
    reflection_data: Optional[dict] = Field(
        default=None,
        description="Optional research metadata. Never shown to the user.",
    )
