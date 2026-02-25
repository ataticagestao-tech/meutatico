import os
import re
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.client import (
    ClientContactCreate, ClientContactResponse, ClientContactUpdate,
    ClientCreate, ClientListResponse, ClientResponse, ClientUpdate,
    ClientPartnerCreate, ClientPartnerResponse, ClientPartnerUpdate,
)
from app.models.tenant.client import Client
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("/check-document/{document_number}")
async def check_document_exists(
    document_number: str,
    exclude_id: Optional[UUID] = Query(None),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    _perm=require_permission("clients", "read"),
):
    """Check if a client with this document number already exists."""
    service = ClientService(db)
    existing = await service.check_document_exists(document_number, exclude_id)
    return {
        "exists": existing is not None,
        "client": {
            "id": str(existing.id),
            "company_name": existing.company_name,
            "trade_name": existing.trade_name,
        } if existing else None,
    }


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


# ── Sócios (Partners) ────────────────────────────────
@router.get("/{client_id}/partners", response_model=list[ClientPartnerResponse])
async def list_partners(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    service = ClientService(db)
    return await service.list_partners(client_id)


@router.post("/{client_id}/partners", response_model=ClientPartnerResponse, status_code=201)
async def add_partner(
    client_id: UUID,
    data: ClientPartnerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    return await service.add_partner(client_id, data)


@router.put("/{client_id}/partners/{partner_id}", response_model=ClientPartnerResponse)
async def update_partner(
    client_id: UUID,
    partner_id: UUID,
    data: ClientPartnerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    return await service.update_partner(client_id, partner_id, data)


@router.delete("/{client_id}/partners/{partner_id}", status_code=204)
async def delete_partner(
    client_id: UUID,
    partner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    service = ClientService(db)
    await service.delete_partner(client_id, partner_id)


# ── Logo ──────────────────────────────────────────────
@router.post("/{client_id}/logo")
async def upload_client_logo(
    client_id: UUID,
    logo: UploadFile = File(...),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    _perm=require_permission("clients", "update"),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
    if logo.content_type not in allowed:
        raise HTTPException(400, "Formato nao suportado. Use JPG, PNG, WebP ou SVG.")

    contents = await logo.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(400, "Arquivo muito grande. Maximo: 2MB.")

    file_ext = (logo.filename or "logo.png").rsplit(".", 1)[-1]
    file_name = f"clients/{client_id}/logo.{file_ext}"
    file_path = f"./uploads/{file_name}"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    logo_url = f"/uploads/{file_name}"

    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente nao encontrado")

    client.logo_url = logo_url
    client.logo_source = "manual"
    await db.flush()

    return {"logo_url": logo_url, "source": "manual"}


@router.delete("/{client_id}/logo", status_code=204)
async def remove_client_logo(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    _perm=require_permission("clients", "update"),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente nao encontrado")

    if client.logo_source == "manual" and client.logo_url:
        file_path = f".{client.logo_url}"
        if os.path.exists(file_path):
            os.remove(file_path)

    client.logo_url = None
    client.logo_source = None
    await db.flush()
