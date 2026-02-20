from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    user_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    message: str | None = None
    type: str = Field(default="info", pattern=r"^(info|warning|success|error|task|ticket|mention)$")
    entity_type: str | None = None
    entity_id: UUID | None = None


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str | None
    type: str
    entity_type: str | None
    entity_id: UUID | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int
    total_pages: int
