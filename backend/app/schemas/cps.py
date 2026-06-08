"""CPS Indicator schemas for API request/response validation."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class CPSIndicatorCreate(BaseModel):
    """Create a new CPS indicator (admin only)."""

    facet: str = Field(..., min_length=1, max_length=100)
    sub_facet: str = Field(..., min_length=1, max_length=150)
    indicator: str = Field(..., min_length=1)
    valence: str = Field(..., pattern=r"^(positive|negative)$")
    description: Optional[str] = None
    example_prompt: Optional[str] = None
    literature_ref: Optional[str] = None
    literature_doi: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    sort_order: int = 0


class CPSIndicatorUpdate(BaseModel):
    """Update a CPS indicator (admin only). All fields optional."""

    facet: Optional[str] = Field(None, min_length=1, max_length=100)
    sub_facet: Optional[str] = Field(None, min_length=1, max_length=150)
    indicator: Optional[str] = Field(None, min_length=1)
    valence: Optional[str] = Field(None, pattern=r"^(positive|negative)$")
    description: Optional[str] = None
    example_prompt: Optional[str] = None
    literature_ref: Optional[str] = None
    literature_doi: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CPSIndicatorRead(BaseModel):
    """CPS indicator response."""

    id: UUID
    facet: str
    sub_facet: str
    indicator: str
    valence: str
    description: Optional[str] = None
    example_prompt: Optional[str] = None
    literature_ref: Optional[str] = None
    literature_doi: Optional[str] = None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def serialize_datetimes(self, value: datetime) -> str:
        """Ensure UTC timestamps include Z suffix for JS parsing."""
        return value.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


class CPSFrameworkRead(BaseModel):
    """
    Full framework response, grouped by facet for convenience.
    Used by the frontend and by build_cps_context() in prompts.py.
    """

    indicators: list[CPSIndicatorRead]
    total: int
