import math
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.utils import schema_name_from_slug
from app.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.public.plan import Plan
from app.models.public.tenant import Tenant
from app.models.tenant.permission import Permission
from app.models.tenant.role import Role, RolePermission
from app.models.tenant.user import User, UserRole
from app.schemas.tenant import TenantCreate, TenantUpdate


class TenantService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tenants(
        self, search: str | None = None, status: str | None = None,
        page: int = 1, per_page: int = 20,
    ) -> dict:
        query = select(Tenant)
        count_query = select(func.count()).select_from(Tenant)

        if search:
            query = query.where(
                Tenant.name.ilike(f"%{search}%") | Tenant.document.ilike(f"%{search}%")
            )
            count_query = count_query.where(
                Tenant.name.ilike(f"%{search}%") | Tenant.document.ilike(f"%{search}%")
            )

        if status:
            query = query.where(Tenant.status == status)
            count_query = count_query.where(Tenant.status == status)

        total = (await self.db.execute(count_query)).scalar()
        query = query.order_by(Tenant.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        tenants = result.scalars().all()

        items = []
        for t in tenants:
            plan_result = await self.db.execute(select(Plan).where(Plan.id == t.plan_id))
            plan = plan_result.scalar_one_or_none()
            item = {
                "id": t.id, "name": t.name, "slug": t.slug,
                "schema_name": t.schema_name, "document": t.document,
                "email": t.email, "phone": t.phone, "plan_id": t.plan_id,
                "plan_name": plan.name if plan else None,
                "status": t.status, "trial_ends_at": t.trial_ends_at,
                "logo_url": t.logo_url, "settings": t.settings,
                "created_at": t.created_at, "updated_at": t.updated_at,
            }
            items.append(item)

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_tenant(self, tenant_id: UUID) -> Tenant:
        result = await self.db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise NotFoundException("Tenant não encontrado")
        return tenant

    async def create_tenant(self, data: TenantCreate) -> dict:
        """Cria tenant + admin user (SQLite: tabelas compartilhadas)."""
        existing = await self.db.execute(
            select(Tenant).where(Tenant.slug == data.slug)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Slug já existe")

        plan_result = await self.db.execute(select(Plan).where(Plan.id == data.plan_id))
        plan = plan_result.scalar_one_or_none()
        if not plan:
            raise BadRequestException("Plano não encontrado")

        schema_name = schema_name_from_slug(data.slug)

        # 1. Cria o tenant
        tenant = Tenant(
            name=data.name,
            slug=data.slug,
            schema_name=schema_name,
            document=data.document,
            email=data.email,
            phone=data.phone,
            plan_id=data.plan_id,
        )
        self.db.add(tenant)
        await self.db.flush()

        # 2. Cria o admin user do tenant (via ORM)
        password_hash = hash_password(data.admin_password)
        admin_user = User(
            tenant_id=tenant.id,
            name=data.admin_name,
            email=data.admin_email,
            password_hash=password_hash,
        )
        self.db.add(admin_user)
        await self.db.flush()

        # 3. Atribui role admin ao user
        admin_role_result = await self.db.execute(
            select(Role).where(Role.slug == "admin")
        )
        admin_role = admin_role_result.scalar_one_or_none()
        if admin_role:
            self.db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

        return {
            "id": tenant.id, "name": tenant.name, "slug": tenant.slug,
            "schema_name": schema_name, "document": tenant.document,
            "email": tenant.email, "phone": tenant.phone,
            "plan_id": tenant.plan_id, "plan_name": plan.name,
            "status": tenant.status, "trial_ends_at": tenant.trial_ends_at,
            "logo_url": tenant.logo_url, "settings": tenant.settings,
            "created_at": tenant.created_at, "updated_at": tenant.updated_at,
        }

    async def update_tenant(self, tenant_id: UUID, data: TenantUpdate) -> Tenant:
        tenant = await self.get_tenant(tenant_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tenant, key, value)
        await self.db.flush()
        return tenant

    async def update_status(self, tenant_id: UUID, new_status: str) -> Tenant:
        tenant = await self.get_tenant(tenant_id)
        tenant.status = new_status
        await self.db.flush()
        return tenant
