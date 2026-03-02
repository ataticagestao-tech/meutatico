import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime,
    ForeignKey, JSON, String, Text,
)

from app.database import Base, GUID


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (
        CheckConstraint(
            "type IN ('meeting', 'reminder', 'deadline', 'other')",
            name="ck_calendar_events_type",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)

    # Tipo do evento
    type = Column(String(30), nullable=False, default="meeting")

    # Datas
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    all_day = Column(Boolean, nullable=False, default=False)

    # Relacionamentos opcionais
    client_id = Column(GUID, ForeignKey("clients.id"))
    assigned_user_id = Column(GUID, ForeignKey("users.id"))

    # Google Calendar sync
    google_event_id = Column(String(255), unique=True, nullable=True)
    sync_source = Column(String(20), nullable=False, default="local")  # "local" | "google"
    location = Column(String(500), nullable=True)
    meet_link = Column(String(500), nullable=True)
    attendees = Column(JSON, nullable=True)  # [{"email": "x@y.com", "name": "..."}]

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
