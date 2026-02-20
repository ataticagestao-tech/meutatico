import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException
from app.models.tenant.notification import Notification
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_notifications(
        self,
        user_id: UUID,
        is_read: bool | None = None,
        type: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id)
        )

        if is_read is not None:
            query = query.where(Notification.is_read == is_read)
            count_query = count_query.where(Notification.is_read == is_read)

        if type:
            query = query.where(Notification.type == type)
            count_query = count_query.where(Notification.type == type)

        total = (await self.db.execute(count_query)).scalar()

        # Contagem de nao lidas (sempre baseada no user, sem filtros extras)
        unread_count_result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        unread_count = unread_count_result.scalar()

        query = query.order_by(Notification.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        notifications = result.scalars().all()

        items = [
            {
                "id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "entity_type": n.entity_type,
                "entity_id": n.entity_id,
                "is_read": n.is_read,
                "read_at": n.read_at,
                "created_at": n.created_at,
            }
            for n in notifications
        ]

        return {
            "items": items,
            "total": total,
            "unread_count": unread_count,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def create_notification(self, data: NotificationCreate) -> Notification:
        notification = Notification(**data.model_dump())
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def create_bulk_notifications(
        self,
        user_ids: list[UUID],
        title: str,
        message: str | None = None,
        type: str = "info",
        entity_type: str | None = None,
        entity_id: UUID | None = None,
    ) -> list[Notification]:
        """Cria a mesma notificacao para multiplos usuarios."""
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type,
                entity_type=entity_type,
                entity_id=entity_id,
            )
            self.db.add(notification)
            notifications.append(notification)

        await self.db.flush()
        return notifications

    async def mark_as_read(self, notification_id: UUID, user_id: UUID) -> Notification:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundException("Notifica\u00e7\u00e3o n\u00e3o encontrada")

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await self.db.flush()

        return notification

    async def mark_all_as_read(self, user_id: UUID) -> int:
        """Marca todas as notificacoes do usuario como lidas.
        Retorna a quantidade de notificacoes atualizadas."""
        result = await self.db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        notifications = result.scalars().all()
        now = datetime.now(timezone.utc)
        count = 0
        for n in notifications:
            n.is_read = True
            n.read_at = now
            count += 1

        await self.db.flush()
        return count

    async def delete_notification(
        self, notification_id: UUID, user_id: UUID
    ) -> None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundException("Notifica\u00e7\u00e3o n\u00e3o encontrada")

        await self.db.delete(notification)
        await self.db.flush()
