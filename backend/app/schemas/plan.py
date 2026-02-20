from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PlanModuleSchema(BaseModel):
    module_key: str
    is_enabled: bool = True
    config: dict = {}


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    price_monthly: float = Field(..., ge=0)
    max_users: int = Field(default=5, ge=-1)
    max_storage_gb: int = Field(default=5, ge=-1)
    max_clients: int | None = None
    features: dict = {}
    modules: list[PlanModuleSchema] = []


class PlanUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = None
    price_monthly: float | None = Field(None, ge=0)
    max_users: int | None = Field(None, ge=-1)
    max_storage_gb: int | None = Field(None, ge=-1)
    max_clients: int | None = None
    is_active: bool | None = None
    features: dict | None = None
    modules: list[PlanModuleSchema] | None = None


class PlanResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    price_monthly: float
    max_users: int
    max_storage_gb: int
    max_clients: int | None
    is_active: bool
    features: dict
    modules: list[PlanModuleSchema] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlanListResponse(BaseModel):
    items: list[PlanResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
