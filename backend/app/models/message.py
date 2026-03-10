"""
Message model - represents chat messages in a session.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class MessageRole(str, PyEnum):
    """Message author role."""
    user = "user"
    assistant = "assistant"


class Message(Base):
    """
    Message model representing a single message in a reflection session.
    """
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    stage_id = Column(String(50), nullable=False)
    llm_metadata = Column("llm_metadata", JSONB, nullable=True)  # routing_signal, reflection_data, model info
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    session = relationship("Session", back_populates="messages")
    safety_incidents = relationship("SafetyIncident", back_populates="message")

    def __repr__(self):
        return f"<Message(id={self.id}, role={self.role}, session_id={self.session_id})>"
