import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint(
            "type IN ('request', 'incident', 'question', 'suggestion')",
            name="ck_tickets_type",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tickets_priority",
        ),
        CheckConstraint(
            "status IN ('open', 'in_progress', 'waiting_client', 'waiting_internal', 'resolved', 'closed', 'cancelled')",
            name="ck_tickets_status",
        ),
        CheckConstraint(
            "source IN ('internal', 'portal', 'email', 'whatsapp', 'phone')",
            name="ck_tickets_source",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(Integer, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)

    # Classificação
    type = Column(String(20), nullable=False, default="request")
    priority = Column(String(20), nullable=False, default="medium")
    category = Column(String(100))

    # Status
    status = Column(String(20), nullable=False, default="open")

    # Origem
    source = Column(String(20), nullable=False, default="internal")

    # Relacionamentos
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    requester_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    requester_name = Column(String(255))
    requester_email = Column(String(255))
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # SLA
    due_date = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))

    # Metadados
    tags = Column(ARRAY(Text), default=[])
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
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

    client = relationship("Client", back_populates="tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    author_name = Column(String(255))
    content = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, nullable=False, default=False)
    attachments = Column(JSONB, default=[])
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    ticket = relationship("Ticket", back_populates="messages")
