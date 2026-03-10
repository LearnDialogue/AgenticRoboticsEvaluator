"""Session schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    """Create a new session (student)."""

    pass  # No fields required; student_id comes from JWT


class SessionRead(BaseModel):
    """Session response."""

    id: UUID
    student_id: UUID
    status: SessionStatus
    current_stage: str
    prompt_version: str
    model_name: str
    started_at: datetime
    completed_at: datetime | None = None
    evaluation_data: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("started_at", "completed_at")
    def serialize_datetimes(self, value: datetime | None) -> str | None:
        """Ensure UTC timestamps include Z suffix for JS parsing."""
        if value is None:
            return None
        return value.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


class SessionList(BaseModel):
    """Paginated list of sessions."""

    items: list[SessionRead]
    total: int
    page: int
    page_size: int
