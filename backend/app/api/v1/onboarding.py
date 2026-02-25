from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.onboarding import (
    ClientOnboardingResponse,
    OnboardingStepToggle,
)
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.get("")
async def list_all_onboardings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """List onboarding progress for all clients."""
    service = OnboardingService(db)
    return await service.list_all_onboardings()


@router.get("/{client_id}", response_model=ClientOnboardingResponse)
async def get_client_onboarding(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Get onboarding status for a specific client."""
    service = OnboardingService(db)
    return await service.get_client_onboarding(client_id)


@router.patch("/{client_id}/steps/{step_id}")
async def toggle_onboarding_step(
    client_id: UUID,
    step_id: UUID,
    body: OnboardingStepToggle,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    """Toggle an onboarding step as done/undone."""
    service = OnboardingService(db)
    step = await service.toggle_step(
        client_id=client_id,
        step_id=step_id,
        is_done=body.is_done,
        user_id=UUID(current_user["id"]),
    )
    return {
        "id": str(step.id),
        "step": step.step,
        "is_done": step.is_done,
        "done_at": step.done_at,
    }
