from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    status: str = Field(default="todo", pattern=r"^(backlog|todo|in_progress|review|done|cancelled)$")
    position: int = 0
    priority: str = Field(default="medium", pattern=r"^(low|medium|high|urgent)$")
    category: str | None = None
    tags: list[str] = []
    client_id: UUID | None = None
    ticket_id: UUID | None = None
    assigned_user_id: UUID | None = None
    due_date: datetime | None = None
    is_recurring: bool = False
    recurrence_rule: dict | None = None
    checklist: list[dict] = []


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    status: str | None = Field(None, pattern=r"^(backlog|todo|in_progress|review|done|cancelled)$")
    position: int | None = None
    priority: str | None = Field(None, pattern=r"^(low|medium|high|urgent)$")
    category: str | None = None
    tags: list[str] | None = None
    client_id: UUID | None = None
    ticket_id: UUID | None = None
    assigned_user_id: UUID | None = None
    due_date: datetime | None = None
    is_recurring: bool | None = None
    recurrence_rule: dict | None = None
    checklist: list[dict] | None = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    status: str
    position: int
    priority: str
    category: str | None
    tags: list[str]
    client_id: UUID | None
    client_name: str | None = None
    ticket_id: UUID | None
    assigned_user_id: UUID | None
    assigned_user_name: str | None = None
    due_date: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    is_recurring: bool
    recurrence_rule: dict | None
    checklist: list[dict]
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TaskMoveRequest(BaseModel):
    status: str = Field(..., pattern=r"^(backlog|todo|in_progress|review|done|cancelled)$")
    position: int = 0


class TaskTemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    trigger_event: str | None = None
    tasks_config: list[dict] = []
    is_active: bool = True


class TaskTemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    trigger_event: str | None
    tasks_config: list[dict]
    is_active: bool
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
