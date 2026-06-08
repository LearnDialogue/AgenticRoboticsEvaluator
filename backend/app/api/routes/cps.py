"""CPS Framework routes — CRUD for Collaborative Problem Solving indicators."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DBSession, CurrentUser, AdminUser
from app.models.cps_indicator import CPSIndicator
from app.schemas.cps import (
    CPSIndicatorCreate,
    CPSIndicatorRead,
    CPSIndicatorUpdate,
    CPSFrameworkRead,
)

router = APIRouter(prefix="/cps", tags=["cps"])


@router.get("/indicators", response_model=CPSFrameworkRead)
def list_active_indicators(
    db: DBSession,
    current_user: CurrentUser,
) -> CPSFrameworkRead:
    """
    List all active CPS indicators, ordered by facet and sort_order.
    Available to any authenticated user.
    """
    indicators = (
        db.query(CPSIndicator)
        .filter(CPSIndicator.is_active == True)  # noqa: E712
        .order_by(CPSIndicator.facet, CPSIndicator.sort_order, CPSIndicator.sub_facet)
        .all()
    )
    return CPSFrameworkRead(
        indicators=[CPSIndicatorRead.model_validate(i) for i in indicators],
        total=len(indicators),
    )


@router.get("/indicators/all", response_model=CPSFrameworkRead)
def list_all_indicators(
    db: DBSession,
    admin: AdminUser,
) -> CPSFrameworkRead:
    """
    List ALL indicators including inactive (admin only).
    Used for managing the framework — see which are toggled off.
    """
    indicators = (
        db.query(CPSIndicator)
        .order_by(CPSIndicator.facet, CPSIndicator.sort_order, CPSIndicator.sub_facet)
        .all()
    )
    return CPSFrameworkRead(
        indicators=[CPSIndicatorRead.model_validate(i) for i in indicators],
        total=len(indicators),
    )


@router.get("/indicators/{indicator_id}", response_model=CPSIndicatorRead)
def get_indicator(
    indicator_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> CPSIndicator:
    """Get a specific CPS indicator by ID."""
    indicator = db.query(CPSIndicator).filter(CPSIndicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CPS indicator not found",
        )
    return indicator


@router.post("/indicators", response_model=CPSIndicatorRead, status_code=status.HTTP_201_CREATED)
def create_indicator(
    data: CPSIndicatorCreate,
    db: DBSession,
    admin: AdminUser,
) -> CPSIndicator:
    """Create a new CPS indicator (admin only)."""
    indicator = CPSIndicator(**data.model_dump())
    db.add(indicator)
    db.commit()
    db.refresh(indicator)
    return indicator


@router.patch("/indicators/{indicator_id}", response_model=CPSIndicatorRead)
def update_indicator(
    indicator_id: UUID,
    data: CPSIndicatorUpdate,
    db: DBSession,
    admin: AdminUser,
) -> CPSIndicator:
    """
    Update a CPS indicator (admin only).
    Only provided fields are updated (PATCH semantics).
    """
    indicator = db.query(CPSIndicator).filter(CPSIndicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CPS indicator not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(indicator, field, value)

    db.commit()
    db.refresh(indicator)
    return indicator


@router.delete("/indicators/{indicator_id}", response_model=CPSIndicatorRead)
def deactivate_indicator(
    indicator_id: UUID,
    db: DBSession,
    admin: AdminUser,
) -> CPSIndicator:
    """
    Soft-delete a CPS indicator by setting is_active=False (admin only).
    The indicator is preserved for historical reference but excluded
    from active framework queries and prompt injection.
    """
    indicator = db.query(CPSIndicator).filter(CPSIndicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CPS indicator not found",
        )

    indicator.is_active = False
    db.commit()
    db.refresh(indicator)
    return indicator
