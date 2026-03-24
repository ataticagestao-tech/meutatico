from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentFolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_folder_id: UUID | None = None
    client_id: UUID | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class DocumentFolderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    parent_folder_id: UUID | None = None
    color: str | None = None


class DocumentFolderResponse(BaseModel):
    id: UUID
    name: str
    parent_folder_id: UUID | None
    client_id: UUID | None
    color: str | None
    created_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    id: UUID
    folder_id: UUID | None
    client_id: UUID | None
    name: str
    original_filename: str
    file_url: str
    file_size: int
    mime_type: str
    description: str | None
    tags: list[str]
    status: str
    version: int
    uploaded_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    tags: list[str] | None = None
    folder_id: UUID | None = None
    status: str | None = Field(None, pattern=r"^(active|archived|deleted)$")


class DocumentListResponse(BaseModel):
    items: list[DocumentUploadResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── Document Validity ────────────────────────────────

class DocumentValidityCreate(BaseModel):
    document_id: UUID
    issue_date: date | None = None
    expiry_date: date
    issuing_body: str | None = None
    responsible: str | None = None
    observations: str | None = None
    alert_30d: bool = True
    alert_60d: bool = False
    alert_90d: bool = False


class DocumentValidityUpdate(BaseModel):
    expiry_date: date | None = None
    issuing_body: str | None = None
    responsible: str | None = None
    observations: str | None = None
    alert_30d: bool | None = None
    alert_60d: bool | None = None
    alert_90d: bool | None = None
    status: str | None = Field(None, pattern=r"^(valido|vencendo|vencido|renovado)$")


class DocumentValidityResponse(BaseModel):
    id: UUID
    document_id: UUID
    issue_date: date | None
    expiry_date: date
    issuing_body: str | None
    responsible: str | None
    observations: str | None
    alert_30d: bool
    alert_60d: bool
    alert_90d: bool
    status: str
    renewed_at: date | None
    renewed_document_id: UUID | None
    created_at: datetime
    updated_at: datetime

    # Joined fields (from document)
    document_name: str | None = None
    document_category: str | None = None
    days_remaining: int | None = None
    alert_level: str | None = None  # ok | atencao | critico | vencido

    model_config = {"from_attributes": True}
