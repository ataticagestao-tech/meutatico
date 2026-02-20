from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class KBCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    icon: str | None = Field(None, max_length=50)
    parent_category_id: UUID | None = None
    sort_order: int = 0


class KBCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    icon: str | None = None
    parent_category_id: UUID | None = None
    sort_order: int | None = None


class KBCategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    icon: str | None
    parent_category_id: UUID | None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class KBArticleCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=500)
    slug: str = Field(..., min_length=2, max_length=500, pattern=r"^[a-z0-9-]+$")
    category_id: UUID | None = None
    content_type: str = Field(default="text", pattern=r"^(text|video|document|mixed)$")
    body: str | None = None
    video_url: str | None = None
    video_thumbnail_url: str | None = None
    attachments: list[dict] = []
    status: str = Field(default="draft", pattern=r"^(draft|published|archived)$")
    is_pinned: bool = False
    visibility: str = Field(default="internal", pattern=r"^(internal|portal|public)$")
    client_id: UUID | None = None
    tags: list[str] = []


class KBArticleUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=500)
    category_id: UUID | None = None
    content_type: str | None = None
    body: str | None = None
    video_url: str | None = None
    video_thumbnail_url: str | None = None
    attachments: list[dict] | None = None
    status: str | None = Field(None, pattern=r"^(draft|published|archived)$")
    is_pinned: bool | None = None
    visibility: str | None = Field(None, pattern=r"^(internal|portal|public)$")
    client_id: UUID | None = None
    tags: list[str] | None = None


class KBArticleResponse(BaseModel):
    id: UUID
    category_id: UUID | None
    category_name: str | None = None
    title: str
    slug: str
    content_type: str
    body: str | None
    video_url: str | None
    video_thumbnail_url: str | None
    attachments: list[dict]
    status: str
    is_pinned: bool
    view_count: int
    visibility: str
    client_id: UUID | None
    tags: list[str]
    version: int
    last_edited_by: UUID | None
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None

    model_config = {"from_attributes": True}


class KBArticleListResponse(BaseModel):
    items: list[KBArticleResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
