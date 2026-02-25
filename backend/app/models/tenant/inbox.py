import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class InboxMessage(Base):
    """Unified inbox — aggregates messages from email, WhatsApp, phone calls."""
    __tablename__ = "inbox_messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)

    # Channel: email, whatsapp, phone, manual
    channel = Column(String(30), nullable=False)

    # Status: new, in_progress, replied, archived
    status = Column(String(30), nullable=False, default="new")

    # Content
    subject = Column(String(500))
    body = Column(Text)
    sender = Column(String(255))
    sender_email = Column(String(255))

    # Associations
    client_id = Column(GUID, ForeignKey("clients.id"))
    assigned_user_id = Column(GUID, ForeignKey("users.id"))
    task_id = Column(GUID, ForeignKey("tasks.id"))  # if converted to task

    # External reference (email message ID, etc.)
    external_id = Column(String(500))

    received_at = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    client = relationship("Client")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])


class EmailTemplate(Base):
    """Reusable email templates with variable placeholders."""
    __tablename__ = "email_templates"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="general")
    created_by = Column(GUID, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
