from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.services.instagram_service import InstagramService

router = APIRouter(prefix="/instagram", tags=["Instagram"])


@router.get("/status")
async def instagram_status(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Check Instagram integration status."""
    svc = InstagramService()
    return await svc.get_status()


@router.get("/profile")
async def get_profile(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Fetch Instagram Business profile metrics."""
    svc = InstagramService()
    return await svc.get_profile()


@router.get("/media")
async def get_media(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(12, ge=1, le=50),
):
    """Fetch recent media posts with engagement metrics."""
    svc = InstagramService()
    return await svc.get_media(limit=limit)


@router.get("/insights")
async def get_insights(
    current_user: Annotated[dict, Depends(get_current_user)],
    period: str = Query("day", pattern="^(day|week|month)$"),
):
    """Fetch account-level insights."""
    svc = InstagramService()
    return await svc.get_insights(period=period)


@router.post("/refresh-token")
async def refresh_token(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Refresh the long-lived token. Returns new token for admin to save to .env."""
    svc = InstagramService()
    return await svc.refresh_token()
