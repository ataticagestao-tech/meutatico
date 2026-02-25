"""SLA Category management + SLA calculation for tasks."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.sla_category import SlaCategory
from app.models.tenant.task import Task


DEFAULT_CATEGORIES = [
    {"name": "Financeiro", "slug": "financeiro", "sla_hours": 24, "color": "#3b82f6"},
    {"name": "Cobrança", "slug": "cobranca", "sla_hours": 48, "color": "#ef4444"},
    {"name": "Atendimento", "slug": "atendimento", "sla_hours": 12, "color": "#8b5cf6"},
    {"name": "Documentos", "slug": "documentos", "sla_hours": 72, "color": "#f97316"},
    {"name": "Administrativo", "slug": "administrativo", "sla_hours": 72, "color": "#6b7280"},
]


class SlaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_categories(self) -> list[dict]:
        result = await self.db.execute(
            select(SlaCategory).order_by(SlaCategory.name.asc())
        )
        categories = result.scalars().all()
        return [self._cat_to_dict(c) for c in categories]

    async def get_category(self, cat_id: UUID) -> dict | None:
        result = await self.db.execute(
            select(SlaCategory).where(SlaCategory.id == cat_id)
        )
        cat = result.scalar_one_or_none()
        return self._cat_to_dict(cat) if cat else None

    async def create_category(
        self, name: str, slug: str, sla_hours: int, color: str = "#3b82f6"
    ) -> dict:
        cat = SlaCategory(
            name=name,
            slug=slug,
            sla_hours=sla_hours,
            color=color,
        )
        self.db.add(cat)
        await self.db.flush()
        return self._cat_to_dict(cat)

    async def update_category(
        self, cat_id: UUID, name: str | None, sla_hours: int | None, color: str | None, is_active: bool | None
    ) -> dict | None:
        result = await self.db.execute(
            select(SlaCategory).where(SlaCategory.id == cat_id)
        )
        cat = result.scalar_one_or_none()
        if not cat:
            return None

        if name is not None:
            cat.name = name
        if sla_hours is not None:
            cat.sla_hours = sla_hours
        if color is not None:
            cat.color = color
        if is_active is not None:
            cat.is_active = is_active
        await self.db.flush()
        return self._cat_to_dict(cat)

    async def delete_category(self, cat_id: UUID) -> bool:
        result = await self.db.execute(
            select(SlaCategory).where(SlaCategory.id == cat_id)
        )
        cat = result.scalar_one_or_none()
        if not cat:
            return False
        await self.db.delete(cat)
        await self.db.flush()
        return True

    async def seed_defaults(self) -> list[dict]:
        existing = await self.db.execute(
            select(func.count()).select_from(SlaCategory)
        )
        if (existing.scalar() or 0) > 0:
            return await self.list_categories()

        created = []
        for d in DEFAULT_CATEGORIES:
            cat = SlaCategory(**d)
            self.db.add(cat)
            await self.db.flush()
            created.append(self._cat_to_dict(cat))
        return created

    async def get_task_sla_dashboard(self) -> dict:
        """Calculate SLA status for all open tasks that have a category."""
        now = datetime.now(timezone.utc)

        # Load all active SLA categories
        cats_result = await self.db.execute(
            select(SlaCategory).where(SlaCategory.is_active.is_(True))
        )
        categories = {c.slug: c for c in cats_result.scalars().all()}

        if not categories:
            return {"within": 0, "warning": 0, "breached": 0, "tasks": []}

        # Load open tasks (exclude done/cancelled) that have a category
        tasks_result = await self.db.execute(
            select(Task).where(
                Task.status.notin_(["done", "cancelled"]),
                Task.category.isnot(None),
            )
        )
        tasks = tasks_result.scalars().all()

        within = 0
        warning = 0
        breached = 0
        task_list = []

        for t in tasks:
            cat_slug = (t.category or "").lower().replace(" ", "_")
            cat = categories.get(cat_slug)
            if not cat:
                continue

            reference_time = t.created_at
            elapsed_hours = (now - reference_time).total_seconds() / 3600
            sla_hours = cat.sla_hours

            if elapsed_hours > sla_hours:
                sla_status = "breached"
                breached += 1
            elif elapsed_hours > sla_hours - 24:
                sla_status = "warning"
                warning += 1
            else:
                sla_status = "within"
                within += 1

            task_list.append({
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "category": t.category,
                "sla_status": sla_status,
                "sla_hours": sla_hours,
                "elapsed_hours": round(elapsed_hours, 1),
                "remaining_hours": round(max(0, sla_hours - elapsed_hours), 1),
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "assigned_user_id": str(t.assigned_user_id) if t.assigned_user_id else None,
                "client_id": str(t.client_id) if t.client_id else None,
            })

        # Sort: breached first, then warning, then within
        order = {"breached": 0, "warning": 1, "within": 2}
        task_list.sort(key=lambda x: (order.get(x["sla_status"], 3), -x["elapsed_hours"]))

        return {
            "within": within,
            "warning": warning,
            "breached": breached,
            "tasks": task_list,
        }

    def _cat_to_dict(self, cat: SlaCategory) -> dict:
        return {
            "id": str(cat.id),
            "name": cat.name,
            "slug": cat.slug,
            "sla_hours": cat.sla_hours,
            "color": cat.color,
            "is_active": cat.is_active,
            "created_at": cat.created_at.isoformat() if cat.created_at else None,
            "updated_at": cat.updated_at.isoformat() if cat.updated_at else None,
        }
