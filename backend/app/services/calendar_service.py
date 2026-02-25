from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException
from app.models.tenant.calendar_event import CalendarEvent
from app.models.tenant.client import Client
from app.models.tenant.task import Task
from app.models.tenant.ticket import Ticket
from app.models.tenant.user import User
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate


class CalendarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Agregação: busca todos os itens em um intervalo ──

    async def list_calendar_items(
        self,
        start: datetime,
        end: datetime,
        source_type: str | None = None,
        assigned_user_id: UUID | None = None,
        client_id: UUID | None = None,
    ) -> dict:
        items: list[dict] = []

        # A) Tasks com due_date no intervalo
        if source_type is None or source_type == "task":
            task_query = select(Task).where(
                Task.due_date.isnot(None),
                Task.due_date >= start,
                Task.due_date <= end,
                Task.status != "cancelled",
            )
            if assigned_user_id:
                task_query = task_query.where(
                    Task.assigned_user_id == assigned_user_id
                )
            if client_id:
                task_query = task_query.where(Task.client_id == client_id)

            result = await self.db.execute(task_query)
            for t in result.scalars().all():
                items.append({
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "source_type": "task",
                    "start_date": t.due_date,
                    "end_date": t.due_date,
                    "all_day": True,
                    "status": t.status,
                    "priority": t.priority,
                    "client_id": t.client_id,
                    "client_name": await self._get_client_name(t.client_id),
                    "assigned_user_id": t.assigned_user_id,
                    "assigned_user_name": await self._get_user_name(t.assigned_user_id),
                })

        # B) Tickets com due_date no intervalo
        if source_type is None or source_type == "ticket":
            ticket_query = select(Ticket).where(
                Ticket.due_date.isnot(None),
                Ticket.due_date >= start,
                Ticket.due_date <= end,
                Ticket.status != "cancelled",
            )
            if assigned_user_id:
                ticket_query = ticket_query.where(
                    Ticket.assigned_user_id == assigned_user_id
                )
            if client_id:
                ticket_query = ticket_query.where(Ticket.client_id == client_id)

            result = await self.db.execute(ticket_query)
            for tk in result.scalars().all():
                items.append({
                    "id": tk.id,
                    "title": tk.title,
                    "description": tk.description,
                    "source_type": "ticket",
                    "start_date": tk.due_date,
                    "end_date": tk.due_date,
                    "all_day": True,
                    "status": tk.status,
                    "priority": tk.priority,
                    "client_id": tk.client_id,
                    "client_name": await self._get_client_name(tk.client_id),
                    "assigned_user_id": tk.assigned_user_id,
                    "assigned_user_name": await self._get_user_name(tk.assigned_user_id),
                })

        # C) Eventos do calendário no intervalo
        if source_type is None or source_type == "event":
            event_query = select(CalendarEvent).where(
                CalendarEvent.start_date <= end,
                CalendarEvent.end_date >= start,
            )
            if assigned_user_id:
                event_query = event_query.where(
                    CalendarEvent.assigned_user_id == assigned_user_id
                )
            if client_id:
                event_query = event_query.where(
                    CalendarEvent.client_id == client_id
                )

            result = await self.db.execute(event_query)
            for ev in result.scalars().all():
                items.append({
                    "id": ev.id,
                    "title": ev.title,
                    "description": ev.description,
                    "source_type": "event",
                    "start_date": ev.start_date,
                    "end_date": ev.end_date,
                    "all_day": ev.all_day,
                    "status": None,
                    "priority": None,
                    "client_id": ev.client_id,
                    "client_name": await self._get_client_name(ev.client_id),
                    "assigned_user_id": ev.assigned_user_id,
                    "assigned_user_name": await self._get_user_name(ev.assigned_user_id),
                    "location": ev.location,
                    "meet_link": ev.meet_link,
                })

        items.sort(key=lambda x: x["start_date"])
        return {"items": items, "total": len(items)}

    # ── CRUD de CalendarEvent ──

    async def create_event(
        self, data: CalendarEventCreate, created_by: UUID
    ) -> dict:
        dump = data.model_dump()

        # If meet_link is "auto", we need Google to generate it
        want_meet = dump.get("meet_link") == "auto"
        if want_meet:
            dump["meet_link"] = None  # Will be set after Google creates the event

        event = CalendarEvent(**dump, created_by=created_by)
        self.db.add(event)
        await self.db.flush()

        # Always try to sync to Google Calendar (will no-op if user has no token)
        try:
            await self._push_to_google(event, created_by, with_meet=want_meet)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Google sync on create failed: %s", e)

        return await self._event_to_dict(event)

    async def get_event(self, event_id: UUID) -> CalendarEvent:
        result = await self.db.execute(
            select(CalendarEvent).where(CalendarEvent.id == event_id)
        )
        event = result.scalar_one_or_none()
        if not event:
            raise NotFoundException("Evento não encontrado")
        return event

    async def update_event(self, event_id: UUID, data: CalendarEventUpdate) -> dict:
        event = await self.get_event(event_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(event, key, value)
        await self.db.flush()

        # Sync update to Google if linked
        if event.google_event_id and event.created_by:
            try:
                await self._update_on_google(event)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Google sync on update failed: %s", e)

        return await self._event_to_dict(event)

    async def delete_event(self, event_id: UUID) -> None:
        event = await self.get_event(event_id)

        # Delete from Google if linked
        if event.google_event_id and event.created_by:
            try:
                await self._delete_on_google(event)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Google sync on delete failed: %s", e)

        await self.db.delete(event)
        await self.db.flush()

    # ── Helpers ──

    async def _get_client_name(self, client_id) -> str | None:
        if not client_id:
            return None
        r = await self.db.execute(
            select(Client.company_name).where(Client.id == client_id)
        )
        return r.scalar_one_or_none()

    async def _get_user_name(self, user_id) -> str | None:
        if not user_id:
            return None
        r = await self.db.execute(
            select(User.name).where(User.id == user_id)
        )
        return r.scalar_one_or_none()

    async def _event_to_dict(self, event: CalendarEvent) -> dict:
        return {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "type": event.type,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "all_day": event.all_day,
            "client_id": event.client_id,
            "client_name": await self._get_client_name(event.client_id),
            "assigned_user_id": event.assigned_user_id,
            "assigned_user_name": await self._get_user_name(event.assigned_user_id),
            "location": event.location,
            "meet_link": event.meet_link,
            "google_event_id": event.google_event_id,
            "sync_source": event.sync_source,
            "created_by": event.created_by,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
        }

    # ── Google Calendar sync helpers ──

    async def _push_to_google(
        self, event: CalendarEvent, user_id: UUID, with_meet: bool = False
    ) -> None:
        """Create event on Google Calendar and store google_event_id."""
        from app.services.google_calendar_service import GoogleCalendarService

        svc = GoogleCalendarService(db=self.db, user_id=user_id)
        token = await svc._load_token()
        if not token:
            return

        result = await svc.create_event(
            summary=event.title,
            start=event.start_date,
            end=event.end_date,
            description=event.description,
            location=event.location,
            all_day=event.all_day,
            with_meet=with_meet,
        )
        if result and result.get("id"):
            event.google_event_id = result["id"]
            event.sync_source = "local"
            # Extract Meet link if generated
            conf = result.get("conferenceData")
            if conf:
                for ep in conf.get("entryPoints", []):
                    if ep.get("entryPointType") == "video":
                        event.meet_link = ep.get("uri")
                        break
            await self.db.flush()

    async def _update_on_google(self, event: CalendarEvent) -> None:
        """Update the linked Google Calendar event."""
        from app.services.google_calendar_service import GoogleCalendarService

        svc = GoogleCalendarService(db=self.db, user_id=event.created_by)
        token = await svc._load_token()
        if not token:
            return

        await svc.update_event(
            google_event_id=event.google_event_id,
            summary=event.title,
            start=event.start_date,
            end=event.end_date,
            description=event.description,
            location=event.location,
            all_day=event.all_day,
        )

    async def _delete_on_google(self, event: CalendarEvent) -> None:
        """Delete the linked Google Calendar event."""
        from app.services.google_calendar_service import GoogleCalendarService

        svc = GoogleCalendarService(db=self.db, user_id=event.created_by)
        token = await svc._load_token()
        if not token:
            return

        await svc.delete_event(event.google_event_id)
