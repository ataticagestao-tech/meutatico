from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notificações"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    is_read: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    service = NotificationService(db)
    return await service.list_notifications(
        user_id=current_user["id"],
        is_read=is_read,
        page=page,
        per_page=per_page,
    )


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = NotificationService(db)
    await service.mark_as_read(notification_id)
    return {"message": "Notificação marcada como lida"}


@router.patch("/read-all")
async def mark_all_as_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = NotificationService(db)
    await service.mark_all_as_read(current_user["id"])
    return {"message": "Todas as notificações marcadas como lidas"}
