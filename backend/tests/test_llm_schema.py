"""
Tests for LLM response schema (app/schemas/llm.py).

Validates that the Pydantic model correctly accepts good JSON
and rejects malformed / incomplete JSON from the LLM.
"""

import json
import pytest
from pydantic import ValidationError

from app.schemas.llm import LLMTurnResponse, RoutingSignal


# ── Valid payloads ──────────────────────────────────────────────


class TestValidPayloads:
    """LLMTurnResponse should parse valid JSON without error."""

    def test_minimal_valid(self):
        """Bare minimum: text + completed + signal, no reflection_data."""
        data = {
            "student_text": "That sounds like a tough situation.",
            "stage_completed": False,
            "routing_signal": "STAY",
        }
        resp = LLMTurnResponse(**data)
        assert resp.student_text == "That sounds like a tough situation."
        assert resp.stage_completed is False
        assert resp.routing_signal == RoutingSignal.STAY
        assert resp.reflection_data is None

    def test_full_valid_with_reflection(self):
        """All fields present, including reflection_data."""
        data = {
            "student_text": "Let's move on to brainstorming solutions.",
            "stage_completed": True,
            "routing_signal": "NEXT",
            "reflection_data": {
                "emotional_tone": "frustrated",
                "conflict_detected": False,
                "engagement_level": "high",
            },
        }
        resp = LLMTurnResponse(**data)
        assert resp.stage_completed is True
        assert resp.routing_signal == RoutingSignal.NEXT
        assert resp.reflection_data["emotional_tone"] == "frustrated"
        assert resp.reflection_data["conflict_detected"] is False

    def test_reflection_data_explicit_none(self):
        """reflection_data can be explicitly null."""
        data = {
            "student_text": "Hello!",
            "stage_completed": False,
            "routing_signal": "STAY",
            "reflection_data": None,
        }
        resp = LLMTurnResponse(**data)
        assert resp.reflection_data is None

    def test_parse_from_json_string(self):
        """Simulate the real flow: parse raw JSON string → dict → model."""
        raw = json.dumps({
            "student_text": "Tell me more about that.",
            "stage_completed": False,
            "routing_signal": "STAY",
        })
        parsed = json.loads(raw)
        resp = LLMTurnResponse(**parsed)
        assert resp.student_text == "Tell me more about that."

    def test_routing_signal_enum_values(self):
        """Both enum values are accepted."""
        for signal in ["NEXT", "STAY"]:
            resp = LLMTurnResponse(
                student_text="test",
                stage_completed=False,
                routing_signal=signal,
            )
            assert resp.routing_signal.value == signal


# ── Invalid payloads ────────────────────────────────────────────


class TestInvalidPayloads:
    """LLMTurnResponse should reject malformed data with ValidationError."""

    def test_missing_student_text(self):
        """student_text is required."""
        with pytest.raises(ValidationError) as exc_info:
            LLMTurnResponse(
                stage_completed=False,
                routing_signal="STAY",
            )
        assert "student_text" in str(exc_info.value)

    def test_empty_student_text(self):
        """student_text must have at least 1 character."""
        with pytest.raises(ValidationError):
            LLMTurnResponse(
                student_text="",
                stage_completed=False,
                routing_signal="STAY",
            )

    def test_missing_stage_completed(self):
        """stage_completed is required."""
        with pytest.raises(ValidationError) as exc_info:
            LLMTurnResponse(
                student_text="Hello",
                routing_signal="STAY",
            )
        assert "stage_completed" in str(exc_info.value)

    def test_missing_routing_signal(self):
        """routing_signal is required."""
        with pytest.raises(ValidationError) as exc_info:
            LLMTurnResponse(
                student_text="Hello",
                stage_completed=False,
            )
        assert "routing_signal" in str(exc_info.value)

    def test_invalid_routing_signal(self):
        """routing_signal must be NEXT or STAY."""
        with pytest.raises(ValidationError):
            LLMTurnResponse(
                student_text="Hello",
                stage_completed=False,
                routing_signal="JUMP_BACK",
            )

    def test_completely_empty_dict(self):
        """Empty dict should fail."""
        with pytest.raises(ValidationError):
            LLMTurnResponse(**{})

    def test_bad_json_string(self):
        """Malformed JSON string should fail at json.loads, not Pydantic."""
        with pytest.raises(json.JSONDecodeError):
            json.loads("not valid json {{{")

    def test_student_text_wrong_type(self):
        """student_text must be a string."""
        with pytest.raises(ValidationError):
            LLMTurnResponse(
                student_text=12345,
                stage_completed=False,
                routing_signal="STAY",
            )
