from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.document import (
    DocumentFolderCreate, DocumentFolderResponse, DocumentFolderUpdate,
    DocumentListResponse, DocumentUpdate, DocumentUploadResponse,
    DocumentValidityCreate, DocumentValidityResponse, DocumentValidityUpdate,
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
    folder_id: Optional[UUID] = Query(None),
):
    # Accept both folder_id and parent_folder_id for compatibility
    parent = parent_folder_id or folder_id
    service = DocumentService(db)
    return await service.list_folders(client_id=client_id, parent_folder_id=parent)


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


@router.delete("/folders/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "manage_folders"),
):
    service = DocumentService(db)
    await service.delete_folder(folder_id)


# ── Documentos (Files) ──────────────────────────────
@router.get("/files", response_model=DocumentListResponse)
async def list_files(
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


# Keep original path for backwards compatibility
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


@router.post("/files/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_file(
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


# Keep original upload path for backwards compatibility
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
    return await upload_file(db, current_user, _perm, file, folder_id, client_id, description)


@router.get("/files/{document_id}/download")
async def download_file(
    document_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
):
    import os
    from app.config import settings

    service = DocumentService(db)
    document = await service.get_document(document_id)

    # file_url is like /uploads/filename.ext
    filename = document.file_url.split("/")[-1] if document.file_url else ""
    file_path = os.path.join(settings.STORAGE_LOCAL_PATH, filename)

    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(404, "Arquivo não encontrado no servidor")

    return FileResponse(
        path=file_path,
        filename=document.original_filename or document.name,
        media_type=document.mime_type or "application/octet-stream",
    )


@router.put("/files/{document_id}", response_model=DocumentUploadResponse)
async def update_file(
    document_id: UUID,
    data: DocumentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "update"),
):
    service = DocumentService(db)
    return await service.update_document(document_id, data)


# Keep original update path
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


@router.delete("/files/{document_id}", status_code=204)
async def delete_file(
    document_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "delete"),
):
    service = DocumentService(db)
    await service.soft_delete_document(document_id)


# Keep original delete path
@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "delete"),
):
    service = DocumentService(db)
    await service.soft_delete_document(document_id)


# ── Validade / Vencimentos ───────────────────────────

@router.get("/validities")
async def list_validities(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    status: Optional[str] = Query(None),
    alert_level: Optional[str] = Query(None),
):
    service = DocumentService(db)
    return await service.list_validities(status_filter=status, alert_level=alert_level)


@router.post("/validities", response_model=DocumentValidityResponse, status_code=201)
async def create_validity(
    data: DocumentValidityCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "create"),
):
    service = DocumentService(db)
    return await service.create_validity(data)


@router.put("/validities/{validity_id}", response_model=DocumentValidityResponse)
async def update_validity(
    validity_id: UUID,
    data: DocumentValidityUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "update"),
):
    service = DocumentService(db)
    return await service.update_validity(validity_id, data)


@router.delete("/validities/{validity_id}", status_code=204)
async def delete_validity(
    validity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "delete"),
):
    service = DocumentService(db)
    await service.delete_validity(validity_id)
