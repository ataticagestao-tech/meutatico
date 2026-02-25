from datetime import datetime, date, timedelta
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.models.tenant.client import Client
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
    CalendarListResponse,
)
from app.services.calendar_service import CalendarService

router = APIRouter(prefix="/calendar", tags=["Calendario"])


@router.get("/events", response_model=CalendarListResponse)
async def list_calendar_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("calendar", "read"),
    start: datetime = Query(..., description="Inicio do intervalo (ISO 8601)"),
    end: datetime = Query(..., description="Fim do intervalo (ISO 8601)"),
    source_type: Optional[str] = Query(None, description="task, ticket ou event"),
    assigned_user_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
):
    service = CalendarService(db)
    return await service.list_calendar_items(
        start=start,
        end=end,
        source_type=source_type,
        assigned_user_id=assigned_user_id,
        client_id=client_id,
    )


@router.post("", response_model=CalendarEventResponse, status_code=201)
async def create_calendar_event(
    data: CalendarEventCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("calendar", "create"),
):
    service = CalendarService(db)
    return await service.create_event(data, created_by=current_user["id"])


@router.get("/{event_id}", response_model=CalendarEventResponse)
async def get_calendar_event(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("calendar", "read"),
):
    service = CalendarService(db)
    return await service._event_to_dict(await service.get_event(event_id))


@router.put("/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    event_id: UUID,
    data: CalendarEventUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("calendar", "update"),
):
    service = CalendarService(db)
    return await service.update_event(event_id, data)


@router.delete("/{event_id}", status_code=204)
async def delete_calendar_event(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("calendar", "delete"),
):
    service = CalendarService(db)
    await service.delete_event(event_id)


# ── Prazos Contratuais ─────────────────────────────
ALERT_THRESHOLDS = [60, 30, 15, 7, 0]  # days before expiration


@router.get("/prazos-contratuais")
async def list_contract_deadlines(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """List all clients with contract end dates and calculate alert levels."""
    result = await db.execute(
        select(Client).where(
            Client.contract_end_date.isnot(None),
            Client.status != "inactive",
        ).order_by(Client.contract_end_date.asc())
    )
    clients = result.scalars().all()

    today = date.today()
    deadlines = []
    for c in clients:
        end = c.contract_end_date
        days_left = (end - today).days
        if days_left < -90:
            continue  # skip very old expired contracts

        # Determine alert level
        alert = "normal"
        if days_left <= 0:
            alert = "expired"
        elif days_left <= 7:
            alert = "critical"
        elif days_left <= 15:
            alert = "warning"
        elif days_left <= 30:
            alert = "attention"
        elif days_left <= 60:
            alert = "upcoming"

        deadlines.append({
            "client_id": str(c.id),
            "company_name": c.company_name,
            "trade_name": c.trade_name,
            "contract_start_date": str(c.contract_start_date) if c.contract_start_date else None,
            "contract_end_date": str(c.contract_end_date),
            "days_left": days_left,
            "alert": alert,
            "status": c.status,
            "responsible_user_id": str(c.responsible_user_id) if c.responsible_user_id else None,
        })

    # Summary
    summary = {
        "total": len(deadlines),
        "expired": len([d for d in deadlines if d["alert"] == "expired"]),
        "critical": len([d for d in deadlines if d["alert"] == "critical"]),
        "warning": len([d for d in deadlines if d["alert"] == "warning"]),
        "attention": len([d for d in deadlines if d["alert"] == "attention"]),
        "upcoming": len([d for d in deadlines if d["alert"] == "upcoming"]),
        "normal": len([d for d in deadlines if d["alert"] == "normal"]),
    }

    return {"deadlines": deadlines, "summary": summary}
