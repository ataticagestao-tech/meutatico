import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime,
    ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled')",
            name="ck_tasks_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tasks_priority",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)

    # Kanban
    status = Column(String(30), nullable=False, default="todo")
    position = Column(Integer, nullable=False, default=0)

    # Classificação
    priority = Column(String(20), nullable=False, default="medium")
    category = Column(String(100))
    tags = Column(JSON, default=[])

    # Relacionamentos
    client_id = Column(GUID, ForeignKey("clients.id"))
    ticket_id = Column(GUID, ForeignKey("tickets.id"))
    assigned_user_id = Column(GUID, ForeignKey("users.id"))

    # Datas
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    # Recorrência
    is_recurring = Column(Boolean, nullable=False, default=False)
    recurrence_rule = Column(JSON)
    parent_task_id = Column(GUID, ForeignKey("tasks.id"))

    # Checklist embutido
    checklist = Column(JSON, default=[])

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

    client = relationship("Client", back_populates="tasks")


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    trigger_event = Column(String(100))
    tasks_config = Column(JSON, nullable=False, default=[])
    is_active = Column(Boolean, nullable=False, default=True)
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
