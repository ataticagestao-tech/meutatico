from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_super_admin, get_db
from app.models.public.plan import Plan, PlanModule
from app.models.public.super_admin import GlobalModule
from app.models.public.tenant import Tenant
from app.schemas.plan import PlanCreate, PlanListResponse, PlanResponse, PlanUpdate
from app.schemas.tenant import (
    TenantCreate, TenantListResponse, TenantResponse, TenantStatusUpdate, TenantUpdate,
)
from app.services.auth_service import AuthService
from app.services.tenant_service import TenantService

router = APIRouter(prefix="/super-admin", tags=["SuperAdmin"])


# ── Auth ────────────────────────────────────────────
@router.post("/auth/login")
async def super_admin_login(
    data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    return await service.super_admin_login(data["email"], data["password"])


# ── Dashboard ────────────────────────────────────────
@router.get("/dashboard")
async def dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar()
    active_tenants = (
        await db.execute(
            select(func.count()).select_from(Tenant).where(Tenant.status == "active")
        )
    ).scalar()
    trial_tenants = (
        await db.execute(
            select(func.count()).select_from(Tenant).where(Tenant.status == "trial")
        )
    ).scalar()

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "trial_tenants": trial_tenants,
    }


# ── Tenants ──────────────────────────────────────────
@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    service = TenantService(db)
    return await service.list_tenants(search=search, status=status, page=page, per_page=per_page)


@router.post("/tenants", response_model=TenantResponse, status_code=201)
async def create_tenant(
    data: TenantCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    service = TenantService(db)
    return await service.create_tenant(data)


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    service = TenantService(db)
    tenant = await service.get_tenant(tenant_id)
    plan_result = await db.execute(select(Plan).where(Plan.id == tenant.plan_id))
    plan = plan_result.scalar_one_or_none()
    return {
        **{c.key: getattr(tenant, c.key) for c in tenant.__table__.columns},
        "plan_name": plan.name if plan else None,
    }


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    data: TenantUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    service = TenantService(db)
    return await service.update_tenant(tenant_id, data)


@router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: UUID,
    data: TenantStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    service = TenantService(db)
    tenant = await service.update_status(tenant_id, data.status)
    return {"message": f"Tenant atualizado para {data.status}", "id": str(tenant.id)}


# ── Plans ────────────────────────────────────────────
@router.get("/plans", response_model=PlanListResponse)
async def list_plans(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    import math
    total = (await db.execute(select(func.count()).select_from(Plan))).scalar()
    result = await db.execute(
        select(Plan).order_by(Plan.price_monthly).offset((page - 1) * per_page).limit(per_page)
    )
    plans = result.scalars().all()

    items = []
    for p in plans:
        mods_result = await db.execute(select(PlanModule).where(PlanModule.plan_id == p.id))
        modules = mods_result.scalars().all()
        items.append({
            "id": p.id, "name": p.name, "slug": p.slug,
            "description": p.description,
            "price_monthly": float(p.price_monthly),
            "max_users": p.max_users, "max_storage_gb": p.max_storage_gb,
            "max_clients": p.max_clients, "is_active": p.is_active,
            "features": p.features or {},
            "modules": [
                {"module_key": m.module_key, "is_enabled": m.is_enabled, "config": m.config or {}}
                for m in modules
            ],
            "created_at": p.created_at, "updated_at": p.updated_at,
        })

    return {
        "items": items, "total": total, "page": page, "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


@router.post("/plans", response_model=PlanResponse, status_code=201)
async def create_plan(
    data: PlanCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    plan = Plan(
        name=data.name, slug=data.slug, description=data.description,
        price_monthly=data.price_monthly, max_users=data.max_users,
        max_storage_gb=data.max_storage_gb, max_clients=data.max_clients,
        features=data.features,
    )
    db.add(plan)
    await db.flush()

    for mod in data.modules:
        pm = PlanModule(
            plan_id=plan.id, module_key=mod.module_key,
            is_enabled=mod.is_enabled, config=mod.config,
        )
        db.add(pm)

    await db.flush()
    return {
        "id": plan.id, "name": plan.name, "slug": plan.slug,
        "description": plan.description, "price_monthly": float(plan.price_monthly),
        "max_users": plan.max_users, "max_storage_gb": plan.max_storage_gb,
        "max_clients": plan.max_clients, "is_active": plan.is_active,
        "features": plan.features or {},
        "modules": [m.model_dump() for m in data.modules],
        "created_at": plan.created_at, "updated_at": plan.updated_at,
    }


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: UUID,
    data: PlanUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        from app.exceptions import NotFoundException
        raise NotFoundException("Plano não encontrado")

    update_data = data.model_dump(exclude_unset=True, exclude={"modules"})
    for key, value in update_data.items():
        setattr(plan, key, value)

    if data.modules is not None:
        # Remove módulos antigos e recria
        await db.execute(
            select(PlanModule).where(PlanModule.plan_id == plan_id)
        )
        from sqlalchemy import delete
        await db.execute(delete(PlanModule).where(PlanModule.plan_id == plan_id))
        for mod in data.modules:
            pm = PlanModule(
                plan_id=plan_id, module_key=mod.module_key,
                is_enabled=mod.is_enabled, config=mod.config,
            )
            db.add(pm)

    await db.flush()

    mods_result = await db.execute(select(PlanModule).where(PlanModule.plan_id == plan_id))
    modules = mods_result.scalars().all()

    return {
        "id": plan.id, "name": plan.name, "slug": plan.slug,
        "description": plan.description, "price_monthly": float(plan.price_monthly),
        "max_users": plan.max_users, "max_storage_gb": plan.max_storage_gb,
        "max_clients": plan.max_clients, "is_active": plan.is_active,
        "features": plan.features or {},
        "modules": [
            {"module_key": m.module_key, "is_enabled": m.is_enabled, "config": m.config or {}}
            for m in modules
        ],
        "created_at": plan.created_at, "updated_at": plan.updated_at,
    }


# ── Modules ──────────────────────────────────────────
@router.get("/modules")
async def list_modules(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    result = await db.execute(select(GlobalModule).order_by(GlobalModule.sort_order))
    modules = result.scalars().all()
    return [
        {
            "id": m.id, "key": m.key, "name": m.name,
            "description": m.description, "icon": m.icon,
            "is_active": m.is_active, "sort_order": m.sort_order,
        }
        for m in modules
    ]


@router.post("/modules", status_code=201)
async def create_module(
    data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[dict, Depends(get_current_super_admin)],
):
    module = GlobalModule(
        key=data["key"], name=data["name"],
        description=data.get("description"),
        icon=data.get("icon"),
        sort_order=data.get("sort_order", 0),
    )
    db.add(module)
    await db.flush()
    return {"id": str(module.id), "key": module.key, "name": module.name}
