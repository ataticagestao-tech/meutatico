import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class WhatsAppInstance(Base):
    __tablename__ = "whatsapp_instances"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, nullable=False, index=True)
    instance_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="disconnected")  # disconnected, connecting, connected
    phone_number = Column(String(20))
    connected_at = Column(DateTime(timezone=True))
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


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, nullable=False, index=True)
    direction = Column(String(10), nullable=False)  # inbound, outbound
    from_phone = Column(String(30), nullable=False)
    to_phone = Column(String(30), nullable=False)
    message_type = Column(String(20), nullable=False, default="text")  # text, image, document, audio, video
    content = Column(Text)
    status = Column(String(20), default="sent")  # sent, delivered, read, failed
    metadata = Column(JSON, default={})
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class WhatsAppChatbotRule(Base):
    __tablename__ = "whatsapp_chatbot_rules"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, nullable=False, index=True)
    trigger_keyword = Column(String(100), nullable=False)
    response_message = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
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
