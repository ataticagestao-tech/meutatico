from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    type: str = Field(
        default="meeting",
        pattern=r"^(meeting|reminder|deadline|other)$",
    )
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    client_id: UUID | None = None
    assigned_user_id: UUID | None = None
    location: str | None = None
    meet_link: str | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    type: str | None = Field(
        None, pattern=r"^(meeting|reminder|deadline|other)$"
    )
    start_date: datetime | None = None
    end_date: datetime | None = None
    all_day: bool | None = None
    client_id: UUID | None = None
    assigned_user_id: UUID | None = None
    location: str | None = None
    meet_link: str | None = None


class CalendarEventResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    type: str
    start_date: datetime
    end_date: datetime
    all_day: bool
    client_id: UUID | None
    client_name: str | None = None
    assigned_user_id: UUID | None
    assigned_user_name: str | None = None
    location: str | None = None
    meet_link: str | None = None
    google_event_id: str | None = None
    sync_source: str | None = "local"
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Item unificado para a view do calendário ---

class CalendarItem(BaseModel):
    """Item normalizado do calendário. Unifica tasks, tickets e events."""
    id: UUID
    title: str
    description: str | None = None
    source_type: str  # "task" | "ticket" | "event"
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    status: str | None = None
    priority: str | None = None
    client_id: UUID | None = None
    client_name: str | None = None
    assigned_user_id: UUID | None = None
    assigned_user_name: str | None = None
    location: str | None = None
    meet_link: str | None = None

    model_config = {"from_attributes": True}


class CalendarListResponse(BaseModel):
    items: list[CalendarItem]
    total: int
