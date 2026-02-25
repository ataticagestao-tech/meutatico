from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.services.google_calendar_service import GoogleCalendarService

router = APIRouter(prefix="/google-calendar", tags=["Google Calendar"])


def _get_service(db: AsyncSession, user: dict) -> GoogleCalendarService:
    return GoogleCalendarService(db=db, user_id=user["id"])


@router.get("/authorize")
async def authorize(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Return Google OAuth consent URL (authenticated endpoint)."""
    svc = GoogleCalendarService.__new__(GoogleCalendarService)
    svc.db = None
    svc.user_id = current_user["id"]
    svc._token = None

    if not svc.is_configured:
        return {"error": "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}

    state = str(current_user["id"])
    url = svc.get_authorize_url(state=state)
    return {"authorize_url": url}


@router.get("/authorize-redirect")
async def authorize_redirect(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Redirect endpoint that validates token via query param, then redirects to Google.
    Used when browser needs to navigate directly (can't send Authorization header)."""
    from app.core.security import decode_token

    payload = decode_token(token)
    if not payload:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=error&reason=invalid_token"
        )

    user_id = payload.get("sub")
    if not user_id:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=error&reason=invalid_token"
        )

    svc = GoogleCalendarService.__new__(GoogleCalendarService)
    svc.db = None
    svc.user_id = user_id
    svc._token = None

    if not svc.is_configured:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=error&reason=not_configured"
        )

    state = str(user_id)
    url = svc.get_authorize_url(state=state)
    return RedirectResponse(url=url)


@router.get("/callback")
async def callback(
    code: str = Query(...),
    state: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback. Exchanges code for tokens."""
    from uuid import UUID

    try:
        user_id = UUID(state)
    except (ValueError, TypeError):
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=error&reason=invalid_state"
        )

    svc = GoogleCalendarService(db=db, user_id=user_id)
    try:
        await svc.handle_callback(code)
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=connected"
        )
    except Exception as e:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/settings/integracoes?google=error&reason={str(e)[:100]}"
        )


@router.get("/status")
async def google_calendar_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Check Google Calendar connection status for current user."""
    svc = _get_service(db, current_user)
    return await svc.get_status()


@router.post("/sync")
async def sync_google_calendar(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    days_back: int = Query(30, ge=1, le=365),
    days_forward: int = Query(90, ge=1, le=365),
):
    """Pull events from Google Calendar into local database."""
    svc = _get_service(db, current_user)

    now = datetime.now(timezone.utc)
    time_min = now - timedelta(days=days_back)
    time_max = now + timedelta(days=days_forward)

    return await svc.sync_from_google(time_min, time_max)


@router.post("/disconnect")
async def disconnect_google(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Disconnect Google Calendar (revoke token)."""
    svc = _get_service(db, current_user)
    return await svc.disconnect()
