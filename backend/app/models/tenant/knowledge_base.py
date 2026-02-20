import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime,
    ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class KnowledgeBaseCategory(Base):
    __tablename__ = "knowledge_base_categories"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    parent_category_id = Column(
        GUID,
        ForeignKey("knowledge_base_categories.id"),
    )
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    articles = relationship("KnowledgeBaseArticle", back_populates="category")
    children = relationship("KnowledgeBaseCategory", back_populates="parent")
    parent = relationship(
        "KnowledgeBaseCategory", back_populates="children", remote_side="KnowledgeBaseCategory.id"
    )


class KnowledgeBaseArticle(Base):
    __tablename__ = "knowledge_base_articles"
    __table_args__ = (
        CheckConstraint(
            "content_type IN ('text', 'video', 'document', 'mixed')",
            name="ck_kb_articles_content_type",
        ),
        CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="ck_kb_articles_status",
        ),
        CheckConstraint(
            "visibility IN ('internal', 'portal', 'public')",
            name="ck_kb_articles_visibility",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    category_id = Column(
        GUID,
        ForeignKey("knowledge_base_categories.id"),
    )
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False)
    content_type = Column(String(20), nullable=False, default="text")

    # Conteúdo
    body = Column(Text)
    video_url = Column(Text)
    video_thumbnail_url = Column(Text)
    attachments = Column(JSON, default=[])

    # Gestão
    status = Column(String(20), nullable=False, default="draft")
    is_pinned = Column(Boolean, nullable=False, default=False)
    view_count = Column(Integer, nullable=False, default=0)
    visibility = Column(String(20), nullable=False, default="internal")

    # Relacionamentos
    client_id = Column(GUID, ForeignKey("clients.id"))
    tags = Column(JSON, default=[])

    # Versionamento
    version = Column(Integer, nullable=False, default=1)
    last_edited_by = Column(GUID, ForeignKey("users.id"))

    # Metadados
    created_by = Column(GUID, ForeignKey("users.id"))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    published_at = Column(DateTime(timezone=True))

    category = relationship("KnowledgeBaseCategory", back_populates="articles")
