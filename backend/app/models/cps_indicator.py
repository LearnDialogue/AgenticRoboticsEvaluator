"""
CPS Indicator model — stores the Collaborative Problem Solving framework.

Each row represents a single behavioral indicator from the CPS framework.
Indicators are organized by facet → sub-facet → indicator and can be
toggled on/off via is_active. The agent dynamically loads active indicators
during the observe_dynamics stage.

Admins populate example_prompt (agent-facing question to probe this behavior)
and literature_ref / literature_doi (academic citation supporting this indicator)
via the admin API.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class CPSIndicator(Base):
    """
    A single behavioral indicator from the CPS framework.

    The CPS framework has 3 facets, each with sub-facets, each with
    specific observable indicators. These are used in two ways:

    1. During live conversation (observe_dynamics stage): active indicators
       and their example_prompt fields are injected into the system prompt
       so the agent knows what teamwork behaviors to probe.

    2. During post-session evaluation: the evaluator classifies student
       complaints/observations against these indicators.
    """
    __tablename__ = "cps_indicators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Framework hierarchy
    facet = Column(String(100), nullable=False, index=True)
    sub_facet = Column(String(150), nullable=False)
    indicator = Column(Text, nullable=False)
    valence = Column(String(10), nullable=False)  # "positive" or "negative"

    # Agent-facing content (researcher-authored)
    description = Column(Text, nullable=True)
    example_prompt = Column(Text, nullable=True)

    # Literature support (researcher-authored)
    literature_ref = Column(Text, nullable=True)
    literature_doi = Column(String(100), nullable=True)

    # Admin controls
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return (
            f"<CPSIndicator(id={self.id}, facet='{self.facet}', "
            f"indicator='{self.indicator[:40]}...', valence='{self.valence}')>"
        )
