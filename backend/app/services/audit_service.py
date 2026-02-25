"""Audit log listing, filtering, and CSV export."""

import csv
import io
import math
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.audit_log import AuditLog
from app.models.tenant.user import User


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_logs(
        self,
        user_id: UUID | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        query = select(AuditLog).order_by(AuditLog.created_at.desc())
        count_query = select(func.count()).select_from(AuditLog)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)
            count_query = count_query.where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)

        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
            count_query = count_query.where(AuditLog.entity_type == entity_type)

        if date_from:
            query = query.where(AuditLog.created_at >= date_from)
            count_query = count_query.where(AuditLog.created_at >= date_from)

        if date_to:
            query = query.where(AuditLog.created_at <= date_to)
            count_query = count_query.where(AuditLog.created_at <= date_to)

        if search:
            s = f"%{search}%"
            flt = AuditLog.action.ilike(s) | AuditLog.entity_type.ilike(s)
            query = query.where(flt)
            count_query = count_query.where(flt)

        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        # Batch-load user names
        user_ids = {l.user_id for l in logs if l.user_id}
        user_names: dict[str, str] = {}
        if user_ids:
            u_result = await self.db.execute(
                select(User.id, User.name).where(User.id.in_(user_ids))
            )
            for uid, uname in u_result.all():
                user_names[str(uid)] = uname

        items = []
        for log in logs:
            items.append({
                "id": log.id,
                "user_id": str(log.user_id) if log.user_id else None,
                "user_name": user_names.get(str(log.user_id)) if log.user_id else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_actions_list(self) -> list[str]:
        """Return distinct action types for filtering."""
        result = await self.db.execute(
            select(AuditLog.action).distinct().order_by(AuditLog.action.asc())
        )
        return [row[0] for row in result.all() if row[0]]

    async def get_entity_types_list(self) -> list[str]:
        """Return distinct entity types for filtering."""
        result = await self.db.execute(
            select(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type.asc())
        )
        return [row[0] for row in result.all() if row[0]]

    async def export_csv(
        self,
        user_id: UUID | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> str:
        """Export audit logs as CSV string."""
        data = await self.list_logs(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            date_from=date_from,
            date_to=date_to,
            page=1,
            per_page=5000,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Data/Hora", "Usuário", "Ação", "Módulo", "Entidade ID", "IP"])

        for item in data["items"]:
            writer.writerow([
                item["created_at"],
                item["user_name"] or item["user_id"] or "-",
                item["action"],
                item["entity_type"] or "-",
                item["entity_id"] or "-",
                item["ip_address"] or "-",
            ])

        return output.getvalue()
