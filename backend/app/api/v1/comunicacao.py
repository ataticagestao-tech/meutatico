from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.services.email_service import EmailService

router = APIRouter(prefix="/comunicacao", tags=["Comunicação"])


# ── Inbox ─────────────────────────────────────────────


@router.get("/inbox")
async def list_inbox(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    client_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List unified inbox messages."""
    svc = EmailService(db)
    return await svc.list_inbox(
        status=status,
        channel=channel,
        client_id=client_id,
        page=page,
        per_page=per_page,
    )


class InboxStatusUpdate(BaseModel):
    status: str
    assigned_user_id: UUID | None = None


@router.patch("/inbox/{message_id}")
async def update_inbox_message(
    message_id: UUID,
    data: InboxStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    """Update inbox message status."""
    svc = EmailService(db)
    return await svc.update_inbox_status(
        message_id, data.status, data.assigned_user_id
    )


class ManualInboxMessage(BaseModel):
    channel: str = "phone"
    subject: str | None = None
    body: str | None = None
    sender: str | None = None
    client_id: UUID | None = None


@router.post("/inbox")
async def create_manual_inbox_message(
    data: ManualInboxMessage,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "create"),
):
    """Create a manual inbox entry (phone call, etc.)."""
    svc = EmailService(db)
    msg = await svc.create_inbox_message(
        channel=data.channel,
        subject=data.subject,
        body=data.body,
        sender=data.sender,
        client_id=data.client_id,
    )
    return {"id": str(msg.id), "status": msg.status}


# ── Email Templates ───────────────────────────────────


@router.get("/email-templates")
async def list_email_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    category: Optional[str] = Query(None),
):
    """List email templates."""
    svc = EmailService(db)
    return await svc.list_templates(category=category)


@router.get("/email-templates/{template_id}")
async def get_email_template(
    template_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Get a specific email template."""
    svc = EmailService(db)
    return await svc.get_template(template_id)


@router.get("/email-templates/{template_id}/preview/{client_id}")
async def preview_email_template(
    template_id: UUID,
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Preview an email template rendered with client data."""
    svc = EmailService(db)
    return await svc.preview_template(template_id, client_id)


# ── Send Email ────────────────────────────────────────


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    html_body: str


@router.post("/send-email")
async def send_email(
    data: SendEmailRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    """Send an email via SMTP."""
    svc = EmailService(db)
    return await svc.send_email(data.to_email, data.subject, data.html_body)


# ── Email Status ──────────────────────────────────────


@router.get("/email-status")
async def email_status(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Check email integration status."""
    from app.config import settings
    return {
        "smtp_configured": bool(settings.SMTP_HOST and settings.SMTP_USER),
        "gmail_configured": bool(settings.GOOGLE_CLIENT_ID),
        "outlook_configured": bool(settings.MICROSOFT_CLIENT_ID),
    }
