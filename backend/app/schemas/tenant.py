from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TenantCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    document: str | None = Field(None, max_length=20)
    email: EmailStr
    phone: str | None = Field(None, max_length=20)
    plan_id: UUID
    admin_name: str = Field(..., min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)


class TenantUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    document: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    plan_id: UUID | None = None
    logo_url: str | None = None
    settings: dict | None = None


class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    schema_name: str
    document: str | None
    email: str
    phone: str | None
    plan_id: UUID
    plan_name: str | None = None
    status: str
    trial_ends_at: datetime | None
    logo_url: str | None
    settings: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TenantListResponse(BaseModel):
    items: list[TenantResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TenantStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(active|inactive|suspended|trial)$")
