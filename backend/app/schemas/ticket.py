from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TicketMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal_note: bool = False
    attachments: list[dict] = []


class TicketMessageResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    author_user_id: UUID | None
    author_name: str | None
    content: str
    is_internal_note: bool
    attachments: list[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    type: str = Field(default="request", pattern=r"^(request|incident|question|suggestion)$")
    priority: str = Field(default="medium", pattern=r"^(low|medium|high|urgent)$")
    category: str | None = Field(None, max_length=100)
    source: str = Field(default="internal", pattern=r"^(internal|portal|email|whatsapp|phone)$")
    client_id: UUID | None = None
    assigned_user_id: UUID | None = None
    due_date: datetime | None = None
    tags: list[str] = []


class TicketUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    type: str | None = Field(None, pattern=r"^(request|incident|question|suggestion)$")
    priority: str | None = Field(None, pattern=r"^(low|medium|high|urgent)$")
    category: str | None = None
    status: str | None = Field(
        None,
        pattern=r"^(open|in_progress|waiting_client|waiting_internal|resolved|closed|cancelled)$",
    )
    client_id: UUID | None = None
    assigned_user_id: UUID | None = None
    due_date: datetime | None = None
    tags: list[str] | None = None


class TicketResponse(BaseModel):
    id: UUID
    ticket_number: int | None
    title: str
    description: str | None
    type: str
    priority: str
    category: str | None
    status: str
    source: str
    client_id: UUID | None
    client_name: str | None = None
    requester_user_id: UUID | None
    requester_name: str | None
    assigned_user_id: UUID | None
    assigned_user_name: str | None = None
    due_date: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None
    tags: list[str]
    messages: list[TicketMessageResponse] = []
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
