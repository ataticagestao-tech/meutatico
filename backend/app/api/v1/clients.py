from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.client import (
    ClientContactCreate, ClientContactResponse, ClientContactUpdate,
    ClientCreate, ClientListResponse, ClientResponse, ClientUpdate,
)
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    responsible_user_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
):
    service = ClientService(db)
    return await service.list_clients(
        search=search, status=status,
        responsible_user_id=responsible_user_id,
        page=page, per_page=per_page,
        sort_by=sort_by, sort_order=sort_order,
    )


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "create"),
):
    service = ClientService(db)
    return await service.create_client(data, created_by=current_user["id"])


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    service = ClientService(db)
    return await service.get_client(client_id)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    data: ClientUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    return await service.update_client(client_id, data, updated_by=current_user["id"])


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "delete"),
):
    service = ClientService(db)
    await service.soft_delete_client(client_id)


# ── Contatos ─────────────────────────────────────────
@router.get("/{client_id}/contacts")
async def list_contacts(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    service = ClientService(db)
    client = await service.get_client(client_id)
    return client.contacts


@router.post("/{client_id}/contacts", response_model=ClientContactResponse, status_code=201)
async def add_contact(
    client_id: UUID,
    data: ClientContactCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    return await service.add_contact(client_id, data)


@router.put("/{client_id}/contacts/{contact_id}", response_model=ClientContactResponse)
async def update_contact(
    client_id: UUID,
    contact_id: UUID,
    data: ClientContactUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    return await service.update_contact(client_id, contact_id, data)


@router.delete("/{client_id}/contacts/{contact_id}", status_code=204)
async def delete_contact(
    client_id: UUID,
    contact_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    await service.delete_contact(client_id, contact_id)
