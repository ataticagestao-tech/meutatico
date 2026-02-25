from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class CompanySettingsUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    document: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    logo_url: str | None = None
    settings: dict | None = None


class CompanySettingsResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    document: str | None
    email: str
    phone: str | None
    logo_url: str | None
    settings: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
