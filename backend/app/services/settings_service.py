from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.public.tenant import Tenant
from app.schemas.settings import CompanySettingsUpdate


class SettingsService:

    @staticmethod
    async def get_company(db: AsyncSession, tenant_id: UUID) -> Tenant:
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_company(
        db: AsyncSession, tenant_id: UUID, data: CompanySettingsUpdate
    ) -> Tenant:
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "settings" and value is not None:
                # Merge settings instead of replacing
                current = tenant.settings or {}
                current.update(value)
                tenant.settings = current
            else:
                setattr(tenant, field, value)

        tenant.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return tenant
