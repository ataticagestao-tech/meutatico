from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: str | None = Field(None, max_length=20)
    role_ids: list[UUID] = []


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    avatar_url: str | None = None
    is_active: bool | None = None
    role_ids: list[UUID] | None = None
    settings: dict | None = None


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar_url: str | None
    phone: str | None
    is_active: bool
    roles: list["RoleBasicResponse"] = []
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleBasicResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    color: str | None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
