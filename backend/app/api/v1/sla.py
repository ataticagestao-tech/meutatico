from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.services.sla_service import SlaService

router = APIRouter(prefix="/sla", tags=["SLA"])


class SlaCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=50)
    sla_hours: int = Field(default=24, ge=1)
    color: str = Field(default="#3b82f6", max_length=20)


class SlaCategoryUpdate(BaseModel):
    name: str | None = None
    sla_hours: int | None = Field(None, ge=1)
    color: str | None = None
    is_active: bool | None = None


@router.get("/categories")
async def list_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = SlaService(db)
    return await service.list_categories()


@router.post("/categories/seed")
async def seed_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("settings", "manage"),
):
    service = SlaService(db)
    return await service.seed_defaults()


@router.post("/categories", status_code=201)
async def create_category(
    data: SlaCategoryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("settings", "manage"),
):
    service = SlaService(db)
    return await service.create_category(data.name, data.slug, data.sla_hours, data.color)


@router.put("/categories/{cat_id}")
async def update_category(
    cat_id: UUID,
    data: SlaCategoryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("settings", "manage"),
):
    service = SlaService(db)
    result = await service.update_category(cat_id, data.name, data.sla_hours, data.color, data.is_active)
    if not result:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return result


@router.delete("/categories/{cat_id}", status_code=204)
async def delete_category(
    cat_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("settings", "manage"),
):
    service = SlaService(db)
    deleted = await service.delete_category(cat_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")


@router.get("/dashboard")
async def sla_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = SlaService(db)
    return await service.get_task_sla_dashboard()
