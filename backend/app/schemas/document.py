from datetime import datetime
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
