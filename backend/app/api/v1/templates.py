from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.services.pdf_service import PdfService, TEMPLATE_VARIABLES

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("/variables")
async def get_template_variables(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List available template variables."""
    return TEMPLATE_VARIABLES


@router.get("")
async def list_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    category: Optional[str] = Query(None),
):
    """List all document templates."""
    svc = PdfService(db)
    return await svc.list_templates(category=category)


@router.get("/{template_id}")
async def get_template(
    template_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
):
    """Get a template with its HTML content."""
    svc = PdfService(db)
    tpl = await svc.get_template(template_id)
    return {
        "id": str(tpl.id),
        "name": tpl.name,
        "category": tpl.category,
        "description": tpl.description,
        "html_content": tpl.html_content,
        "version": tpl.version,
        "created_at": tpl.created_at.isoformat() if tpl.created_at else None,
    }


@router.get("/{template_id}/preview/{client_id}")
async def preview_document(
    template_id: UUID,
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
):
    """Preview a document rendered with client data."""
    svc = PdfService(db)
    return await svc.preview_document(template_id, client_id)


@router.post("/{template_id}/generate/{client_id}")
async def generate_document(
    template_id: UUID,
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "create"),
):
    """Generate a document from a template + client data."""
    svc = PdfService(db)
    return await svc.generate_pdf(
        template_id=template_id,
        client_id=client_id,
        user_id=UUID(current_user["id"]),
    )


@router.get("/generated/list")
async def list_generated_documents(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    client_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
):
    """List generated documents."""
    svc = PdfService(db)
    return await svc.list_generated(client_id=client_id, category=category)
