import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, String, Text

from app.database import Base, GUID


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "type IN ('info', 'warning', 'success', 'error', 'task', 'ticket', 'mention')",
            name="ck_notifications_type",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(255), nullable=False)
    message = Column(Text)
    type = Column(String(30), nullable=False, default="info")

    # Referência ao objeto
    entity_type = Column(String(50))
    entity_id = Column(GUID)

    # Status
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True))

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
