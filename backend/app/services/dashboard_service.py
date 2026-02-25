from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.client import Client
from app.models.tenant.task import Task
from app.models.tenant.ticket import Ticket
from app.models.tenant.user import User
from app.schemas.dashboard import (
    ClientHealth,
    DashboardClientPanelResponse,
    DashboardKPIs,
    DashboardOverviewResponse,
    RecentTicket,
    UpcomingTask,
    WeeklyVolume,
)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self, user_id: UUID | None = None) -> DashboardOverviewResponse:
        kpis = await self._get_kpis()
        weekly = await self._get_weekly_volume()
        tickets = await self._get_recent_tickets()
        tasks = await self._get_upcoming_tasks(user_id)

        return DashboardOverviewResponse(
            kpis=kpis,
            weekly_volume=weekly,
            recent_tickets=tickets,
            upcoming_tasks=tasks,
        )

    async def get_client_panel(self) -> DashboardClientPanelResponse:
        clients_result = await self.db.execute(
            select(Client)
            .where(Client.status.in_(["active", "onboarding"]))
            .order_by(Client.company_name.asc())
        )
        clients = clients_result.scalars().all()

        now = datetime.now(timezone.utc)
        items: list[ClientHealth] = []

        for c in clients:
            # Pending tasks for this client
            pending_q = await self.db.execute(
                select(func.count()).select_from(Task).where(
                    Task.client_id == c.id,
                    Task.status.notin_(["done", "cancelled"]),
                )
            )
            pending = pending_q.scalar() or 0

            # Overdue tasks
            overdue_q = await self.db.execute(
                select(func.count()).select_from(Task).where(
                    Task.client_id == c.id,
                    Task.status.notin_(["done", "cancelled"]),
                    Task.due_date < now,
                    Task.due_date.isnot(None),
                )
            )
            overdue = overdue_q.scalar() or 0

            # Last activity (most recent task or ticket update)
            last_task_q = await self.db.execute(
                select(func.max(Task.updated_at)).where(Task.client_id == c.id)
            )
            last_task = last_task_q.scalar()

            last_ticket_q = await self.db.execute(
                select(func.max(Ticket.updated_at)).where(Ticket.client_id == c.id)
            )
            last_ticket = last_ticket_q.scalar()

            last_activity = max(
                filter(None, [last_task, last_ticket]), default=None
            )

            # Health: green (no overdue), yellow (1-2 overdue), red (3+ overdue)
            if overdue >= 3:
                health = "red"
            elif overdue >= 1:
                health = "yellow"
            else:
                health = "green"

            # Responsible user name
            resp_name = None
            if c.responsible_user_id:
                u_r = await self.db.execute(
                    select(User.name).where(User.id == c.responsible_user_id)
                )
                resp_name = u_r.scalar_one_or_none()

            items.append(
                ClientHealth(
                    id=c.id,
                    company_name=c.company_name,
                    trade_name=c.trade_name,
                    responsible_user_name=resp_name,
                    pending_tasks=pending,
                    overdue_tasks=overdue,
                    health=health,
                    last_activity=last_activity,
                )
            )

        return DashboardClientPanelResponse(clients=items)

    # ── KPIs ──────────────────────────────────────────

    async def _get_kpis(self) -> DashboardKPIs:
        now = datetime.now(timezone.utc)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Active clients
        active_q = await self.db.execute(
            select(func.count()).select_from(Client).where(
                Client.status.in_(["active", "onboarding"])
            )
        )
        active_clients = active_q.scalar() or 0

        # Pending tasks (not done/cancelled)
        pending_q = await self.db.execute(
            select(func.count()).select_from(Task).where(
                Task.status.notin_(["done", "cancelled"])
            )
        )
        pending_tasks = pending_q.scalar() or 0

        # Overdue tasks
        overdue_q = await self.db.execute(
            select(func.count()).select_from(Task).where(
                Task.status.notin_(["done", "cancelled"]),
                Task.due_date < now,
                Task.due_date.isnot(None),
            )
        )
        overdue_tasks = overdue_q.scalar() or 0

        # Completed this month
        completed_q = await self.db.execute(
            select(func.count()).select_from(Task).where(
                Task.status == "done",
                Task.completed_at >= first_of_month,
            )
        )
        completed_this_month = completed_q.scalar() or 0

        # Open tickets
        open_tickets_q = await self.db.execute(
            select(func.count()).select_from(Ticket).where(
                Ticket.status.notin_(["resolved", "closed", "cancelled"])
            )
        )
        open_tickets = open_tickets_q.scalar() or 0

        # Overdue tickets
        overdue_tickets_q = await self.db.execute(
            select(func.count()).select_from(Ticket).where(
                Ticket.status.notin_(["resolved", "closed", "cancelled"]),
                Ticket.due_date < now,
                Ticket.due_date.isnot(None),
            )
        )
        overdue_tickets = overdue_tickets_q.scalar() or 0

        return DashboardKPIs(
            active_clients=active_clients,
            pending_tasks=pending_tasks,
            overdue_tasks=overdue_tasks,
            completed_this_month=completed_this_month,
            open_tickets=open_tickets,
            overdue_tickets=overdue_tickets,
        )

    # ── Weekly Volume ─────────────────────────────────

    async def _get_weekly_volume(self) -> list[WeeklyVolume]:
        now = datetime.now(timezone.utc)
        weeks: list[WeeklyVolume] = []

        for i in range(3, -1, -1):
            week_start = now - timedelta(weeks=i, days=now.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(days=7)

            label = f"{week_start.day:02d}/{week_start.month:02d}"

            created_q = await self.db.execute(
                select(func.count()).select_from(Task).where(
                    Task.created_at >= week_start,
                    Task.created_at < week_end,
                )
            )
            created = created_q.scalar() or 0

            completed_q = await self.db.execute(
                select(func.count()).select_from(Task).where(
                    Task.status == "done",
                    Task.completed_at >= week_start,
                    Task.completed_at < week_end,
                )
            )
            completed = completed_q.scalar() or 0

            weeks.append(WeeklyVolume(week_label=label, created=created, completed=completed))

        return weeks

    # ── Recent Tickets ────────────────────────────────

    async def _get_recent_tickets(self) -> list[RecentTicket]:
        result = await self.db.execute(
            select(Ticket)
            .order_by(Ticket.created_at.desc())
            .limit(5)
        )
        tickets = result.scalars().all()

        items: list[RecentTicket] = []
        for t in tickets:
            client_name = None
            if t.client_id:
                cr = await self.db.execute(
                    select(Client.trade_name, Client.company_name).where(
                        Client.id == t.client_id
                    )
                )
                row = cr.first()
                if row:
                    client_name = row[0] or row[1]

            items.append(
                RecentTicket(
                    id=t.id,
                    ticket_number=t.ticket_number,
                    title=t.title,
                    status=t.status,
                    priority=t.priority,
                    client_name=client_name,
                    created_at=t.created_at,
                )
            )

        return items

    # ── Upcoming Tasks ────────────────────────────────

    async def _get_upcoming_tasks(self, user_id: UUID | None = None) -> list[UpcomingTask]:
        now = datetime.now(timezone.utc)
        query = (
            select(Task)
            .where(
                Task.status.notin_(["done", "cancelled"]),
                Task.due_date.isnot(None),
            )
            .order_by(Task.due_date.asc())
            .limit(8)
        )
        if user_id:
            query = query.where(Task.assigned_user_id == user_id)

        result = await self.db.execute(query)
        tasks = result.scalars().all()

        items: list[UpcomingTask] = []
        for t in tasks:
            client_name = None
            if t.client_id:
                cr = await self.db.execute(
                    select(Client.trade_name, Client.company_name).where(
                        Client.id == t.client_id
                    )
                )
                row = cr.first()
                if row:
                    client_name = row[0] or row[1]

            user_name = None
            if t.assigned_user_id:
                ur = await self.db.execute(
                    select(User.name).where(User.id == t.assigned_user_id)
                )
                user_name = ur.scalar_one_or_none()

            items.append(
                UpcomingTask(
                    id=t.id,
                    title=t.title,
                    status=t.status,
                    priority=t.priority,
                    due_date=t.due_date,
                    client_name=client_name,
                    assigned_user_name=user_name,
                )
            )

        return items
