from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.services.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.get("/status")
async def whatsapp_status(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get WhatsApp connection status."""
    service = WhatsAppService()
    return await service.get_status()


@router.get("/contacts")
async def list_contacts(
    current_user: Annotated[dict, Depends(get_current_user)],
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List WhatsApp contacts."""
    service = WhatsAppService()
    return await service.list_contacts(search=search, limit=limit, offset=offset)


@router.get("/messages/{contact_id}")
async def get_messages(
    contact_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get message history for a contact by contact_id."""
    service = WhatsAppService()
    return await service.get_messages(contact_id, limit=limit, offset=offset)


@router.get("/messages")
async def search_messages(
    current_user: Annotated[dict, Depends(get_current_user)],
    q: str = Query(..., min_length=2),
    limit: int = Query(30, ge=1, le=100),
):
    """Search across all WhatsApp messages."""
    service = WhatsAppService()
    return await service.search_messages(query=q, limit=limit)


@router.get("/groups")
async def list_groups(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List WhatsApp groups."""
    service = WhatsAppService()
    return await service.list_groups()
