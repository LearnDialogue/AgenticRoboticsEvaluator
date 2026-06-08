"""
SessionSummary model - stores structured summaries of completed sessions.

Contains BOTH the original general-purpose columns (event_summary, challenges,
strategies, next_goal) AND ELT-aligned columns that map to Kolb's Experiential
Learning Theory phases. Both sets coexist to support different analysis lenses.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class SessionSummary(Base):
    """
    SessionSummary model storing structured extraction from a session.
    Created/updated after session completion.

    General-purpose columns capture practical outcomes.
    ELT columns capture the learning cycle for research analysis.
    """
    __tablename__ = "session_summaries"

    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), primary_key=True)

    # --- General-purpose summaries (original columns) ---
    event_summary = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    strategies = Column(Text, nullable=True)
    next_goal = Column(Text, nullable=True)
    share_plan_json = Column(JSONB, nullable=True)

    # --- ELT-aligned summaries (Kolb's cycle) ---
    concrete_experience = Column(Text, nullable=True)       # What happened? The recalled team event
    reflective_observation = Column(Text, nullable=True)    # What did the student notice about dynamics?
    abstract_conceptualization = Column(Text, nullable=True) # Why did it happen? Patterns/meaning
    active_experimentation = Column(Text, nullable=True)    # What will the student try next?

    # Timestamps
    created_at = Column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    session = relationship("Session", back_populates="summary")

    def __repr__(self):
        return f"<SessionSummary(session_id={self.session_id})>"
