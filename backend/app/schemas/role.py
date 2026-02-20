from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PermissionResponse(BaseModel):
    id: UUID
    module_key: str
    action: str
    description: str | None

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    permission_ids: list[UUID] = []


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    permission_ids: list[UUID] | None = None


class RoleResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    is_system: bool
    color: str | None
    permissions: list[PermissionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleListResponse(BaseModel):
    items: list[RoleResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
