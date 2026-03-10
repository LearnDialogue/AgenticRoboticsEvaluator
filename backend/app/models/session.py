"""
Session model - represents a reflection session.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class SessionStatus(str, PyEnum):
    """Session status states."""
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class Session(Base):
    """
    Session model representing a reflection session.
    Each session follows a multi-stage protocol.
    """
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.ACTIVE)
    current_stage = Column(String(50), nullable=False, default="RECALL_EVENT")
    prompt_version = Column(String(20), nullable=False, default="v1")
    model_name = Column(String(100), nullable=False, default="placeholder")
    started_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    evaluation_data = Column(JSONB, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    summary = relationship("SessionSummary", back_populates="session", uselist=False, cascade="all, delete-orphan")
    safety_incidents = relationship("SafetyIncident", back_populates="session")

    def __repr__(self):
        return f"<Session(id={self.id}, student_id={self.student_id}, status={self.status})>"
