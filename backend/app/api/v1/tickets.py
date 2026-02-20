from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.ticket import (
    TicketCreate, TicketListResponse, TicketMessageCreate,
    TicketMessageResponse, TicketResponse, TicketUpdate,
)
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Solicitações"])


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tickets", "read"),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    client_id: Optional[UUID] = Query(None),
    assigned_user_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    service = TicketService(db)
    return await service.list_tickets(
        search=search, status=status, priority=priority,
        client_id=client_id, assigned_user_id=assigned_user_id,
        page=page, per_page=per_page,
    )


@router.post("", response_model=TicketResponse, status_code=201)
async def create_ticket(
    data: TicketCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tickets", "create"),
):
    service = TicketService(db)
    return await service.create_ticket(data, created_by=current_user["id"])


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tickets", "read"),
):
    service = TicketService(db)
    return await service.get_ticket(ticket_id)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    data: TicketUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tickets", "update"),
):
    service = TicketService(db)
    return await service.update_ticket(ticket_id, data)


@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=201)
async def add_message(
    ticket_id: UUID,
    data: TicketMessageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tickets", "update"),
):
    service = TicketService(db)
    return await service.add_message(
        ticket_id, data, author_user_id=current_user["id"], author_name=current_user["name"]
    )
