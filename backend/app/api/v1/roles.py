from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.exceptions import NotFoundException
from app.models.tenant.permission import Permission
from app.models.tenant.role import Role, RolePermission
from app.schemas.role import RoleCreate, RoleListResponse, RoleResponse, RoleUpdate

router = APIRouter(prefix="/roles", tags=["Cargos e Permissões"])


@router.get("", response_model=RoleListResponse)
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    import math
    total = (await db.execute(select(func.count()).select_from(Role))).scalar()
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
        .order_by(Role.name)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    roles = result.scalars().unique().all()

    items = []
    for r in roles:
        perms = [
            {
                "id": rp.permission.id,
                "module_key": rp.permission.module_key,
                "action": rp.permission.action,
                "description": rp.permission.description,
            }
            for rp in r.role_permissions
        ]
        items.append({
            "id": r.id, "name": r.name, "slug": r.slug,
            "description": r.description, "is_system": r.is_system,
            "color": r.color, "permissions": perms,
            "created_at": r.created_at, "updated_at": r.updated_at,
        })

    return {
        "items": items, "total": total, "page": page, "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(
    data: RoleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("roles", "manage"),
):
    role = Role(
        name=data.name, slug=data.slug,
        description=data.description, color=data.color,
    )
    db.add(role)
    await db.flush()

    for perm_id in data.permission_ids:
        rp = RolePermission(role_id=role.id, permission_id=perm_id)
        db.add(rp)
    await db.flush()

    return {
        "id": role.id, "name": role.name, "slug": role.slug,
        "description": role.description, "is_system": role.is_system,
        "color": role.color, "permissions": [],
        "created_at": role.created_at, "updated_at": role.updated_at,
    }


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("roles", "manage"),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException("Cargo não encontrado")

    update_data = data.model_dump(exclude_unset=True, exclude={"permission_ids"})
    for key, value in update_data.items():
        setattr(role, key, value)

    if data.permission_ids is not None:
        from sqlalchemy import delete
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
        for perm_id in data.permission_ids:
            rp = RolePermission(role_id=role_id, permission_id=perm_id)
            db.add(rp)

    await db.flush()

    return {
        "id": role.id, "name": role.name, "slug": role.slug,
        "description": role.description, "is_system": role.is_system,
        "color": role.color, "permissions": [],
        "created_at": role.created_at, "updated_at": role.updated_at,
    }


@router.get("/permissions")
async def list_permissions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    result = await db.execute(select(Permission).order_by(Permission.module_key, Permission.action))
    perms = result.scalars().all()
    return [
        {
            "id": p.id, "module_key": p.module_key,
            "action": p.action, "description": p.description,
        }
        for p in perms
    ]
