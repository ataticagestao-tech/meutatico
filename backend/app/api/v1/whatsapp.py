from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.schemas.whatsapp import (
    ChatbotRuleCreate,
    ChatbotRuleUpdate,
    SendDocumentRequest,
    SendTextRequest,
)
from app.services.evolution_service import EvolutionService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def _get_evolution(db: AsyncSession, user: dict) -> EvolutionService:
    return EvolutionService(db=db, tenant_id=user.get("tenant_id"))


# ── Contacts & Messages (via Evolution API) ───────────

@router.get("/status")
async def whatsapp_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get WhatsApp connection status via Evolution API."""
    svc = _get_evolution(db, current_user)
    status = await svc.get_instance_status()
    is_connected = status.get("status") in ("open", "connected")
    return {
        "configured": status.get("configured", False),
        "connected": is_connected,
        "phone_number": status.get("phone_number"),
    }


@router.get("/contacts")
async def list_contacts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List WhatsApp chats from Evolution API."""
    svc = _get_evolution(db, current_user)
    chats = await svc.fetch_chats(search=search)
    total = len(chats)
    chats = chats[offset : offset + limit]
    return {"items": chats, "total": total}


@router.get("/messages/{contact_id:path}")
async def get_messages(
    contact_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get message history for a contact from Evolution API."""
    svc = _get_evolution(db, current_user)
    # contact_id can be a remoteJid (with @) or just a phone number
    remote_jid = contact_id if "@" in contact_id else f"{contact_id}@s.whatsapp.net"
    messages = await svc.fetch_messages(remote_jid, limit=limit)
    return {"items": messages, "total": len(messages)}


# ── Evolution API: Instance Management ──────────────────

@router.post("/instance/create")
async def create_instance(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a WhatsApp instance on Evolution API."""
    svc = _get_evolution(db, current_user)
    return await svc.create_instance()


@router.get("/instance/status")
async def instance_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get Evolution API instance connection status."""
    svc = _get_evolution(db, current_user)
    return await svc.get_instance_status()


@router.get("/instance/qrcode")
async def instance_qrcode(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get QR code to connect WhatsApp."""
    svc = _get_evolution(db, current_user)
    return await svc.get_qr_code()


@router.post("/instance/disconnect")
async def instance_disconnect(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Disconnect WhatsApp instance."""
    svc = _get_evolution(db, current_user)
    return await svc.disconnect_instance()


# ── Evolution API: Messaging ────────────────────────────

@router.post("/send/text")
async def send_text(
    data: SendTextRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Send a text message via WhatsApp."""
    svc = _get_evolution(db, current_user)
    return await svc.send_text(data.phone, data.message)


@router.post("/send/document")
async def send_document(
    data: SendDocumentRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Send a document/file via WhatsApp."""
    svc = _get_evolution(db, current_user)
    return await svc.send_document(data.phone, data.file_url, data.filename)


# ── Evolution API: Webhook (public, no auth) ────────────

@router.post("/webhook")
async def webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Receive webhook events from Evolution API."""
    if settings.WHATSAPP_WEBHOOK_SECRET:
        secret = request.headers.get("x-webhook-secret", "")
        if secret != settings.WHATSAPP_WEBHOOK_SECRET:
            return {"error": "Invalid webhook secret"}

    payload = await request.json()
    svc = EvolutionService(db=db)
    await svc.process_webhook(payload)
    return {"status": "ok"}


# ── Evolution API: Chatbot Rules ────────────────────────

@router.get("/chatbot/rules")
async def list_chatbot_rules(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List chatbot rules."""
    svc = _get_evolution(db, current_user)
    return {"items": await svc.list_chatbot_rules()}


@router.post("/chatbot/rules", status_code=201)
async def create_chatbot_rule(
    data: ChatbotRuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a chatbot rule."""
    svc = _get_evolution(db, current_user)
    return await svc.create_chatbot_rule(data.trigger_keyword, data.response_message)


@router.put("/chatbot/rules/{rule_id}")
async def update_chatbot_rule(
    rule_id: str,
    data: ChatbotRuleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update a chatbot rule."""
    svc = _get_evolution(db, current_user)
    result = await svc.update_chatbot_rule(rule_id, data.model_dump(exclude_unset=True))
    if not result:
        from app.exceptions import NotFoundException
        raise NotFoundException("Regra não encontrada")
    return result


@router.delete("/chatbot/rules/{rule_id}")
async def delete_chatbot_rule(
    rule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete a chatbot rule."""
    svc = _get_evolution(db, current_user)
    deleted = await svc.delete_chatbot_rule(rule_id)
    if not deleted:
        from app.exceptions import NotFoundException
        raise NotFoundException("Regra não encontrada")
    return {"message": "Regra removida com sucesso"}
