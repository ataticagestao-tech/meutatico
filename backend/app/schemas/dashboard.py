from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    active_clients: int = 0
    pending_tasks: int = 0
    overdue_tasks: int = 0
    completed_this_month: int = 0
    open_tickets: int = 0
    overdue_tickets: int = 0


class WeeklyVolume(BaseModel):
    week_label: str
    created: int = 0
    completed: int = 0


class RecentTicket(BaseModel):
    id: UUID
    ticket_number: int | None
    title: str
    status: str
    priority: str
    client_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UpcomingTask(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    due_date: datetime | None = None
    client_name: str | None = None
    assigned_user_name: str | None = None

    model_config = {"from_attributes": True}


class ClientHealth(BaseModel):
    id: UUID
    company_name: str
    trade_name: str | None = None
    responsible_user_name: str | None = None
    pending_tasks: int = 0
    overdue_tasks: int = 0
    health: str = "green"  # green / yellow / red
    last_activity: datetime | None = None


class DashboardOverviewResponse(BaseModel):
    kpis: DashboardKPIs
    weekly_volume: list[WeeklyVolume]
    recent_tickets: list[RecentTicket]
    upcoming_tasks: list[UpcomingTask]


class DashboardClientPanelResponse(BaseModel):
    clients: list[ClientHealth]
