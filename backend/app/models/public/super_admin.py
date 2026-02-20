import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, Text

from app.database import GUID, Base


class SuperAdmin(Base):
    __tablename__ = "super_admins"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime(timezone=True))
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


class GlobalModule(Base):
    __tablename__ = "global_modules"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class AuditLogGlobal(Base):
    __tablename__ = "audit_log_global"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_type = Column(String(20), nullable=False)
    actor_id = Column(GUID)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(GUID)
    details = Column(JSON, default={})
    ip_address = Column(String(45))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
