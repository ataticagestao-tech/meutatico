from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.document import (
    DocumentFolderCreate, DocumentFolderResponse, DocumentFolderUpdate,
    DocumentListResponse, DocumentUpdate, DocumentUploadResponse,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documentos"])


# ── Pastas ───────────────────────────────────────────
@router.get("/folders")
async def list_folders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    client_id: Optional[UUID] = Query(None),
    parent_folder_id: Optional[UUID] = Query(None),
):
    service = DocumentService(db)
    return await service.list_folders(client_id=client_id, parent_folder_id=parent_folder_id)


@router.post("/folders", response_model=DocumentFolderResponse, status_code=201)
async def create_folder(
    data: DocumentFolderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "manage_folders"),
):
    service = DocumentService(db)
    return await service.create_folder(data, created_by=current_user["id"])


@router.put("/folders/{folder_id}", response_model=DocumentFolderResponse)
async def update_folder(
    folder_id: UUID,
    data: DocumentFolderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "manage_folders"),
):
    service = DocumentService(db)
    return await service.update_folder(folder_id, data)


# ── Documentos ───────────────────────────────────────
@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    search: Optional[str] = Query(None),
    folder_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    service = DocumentService(db)
    return await service.list_documents(
        search=search, folder_id=folder_id, client_id=client_id,
        status=status, page=page, per_page=per_page,
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "create"),
    file: UploadFile = File(...),
    folder_id: Optional[UUID] = Form(None),
    client_id: Optional[UUID] = Form(None),
    description: Optional[str] = Form(None),
):
    import os
    import aiofiles
    from app.config import settings

    # Salva o arquivo localmente
    upload_dir = settings.STORAGE_LOCAL_PATH
    os.makedirs(upload_dir, exist_ok=True)

    import uuid as uuid_mod
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    stored_name = f"{uuid_mod.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, stored_name)

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    file_url = f"/uploads/{stored_name}"

    service = DocumentService(db)
    return await service.create_document(
        name=file.filename or stored_name,
        original_filename=file.filename or stored_name,
        file_url=file_url,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        folder_id=folder_id,
        client_id=client_id,
        description=description,
        uploaded_by=current_user["id"],
    )


@router.put("/{document_id}", response_model=DocumentUploadResponse)
async def update_document(
    document_id: UUID,
    data: DocumentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "update"),
):
    service = DocumentService(db)
    return await service.update_document(document_id, data)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "delete"),
):
    service = DocumentService(db)
    await service.soft_delete_document(document_id)
