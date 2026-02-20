import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.database import GUID, Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    max_users = Column(Integer, nullable=False, default=5)
    max_storage_gb = Column(Integer, nullable=False, default=5)
    max_clients = Column(Integer)  # NULL = ilimitado
    is_active = Column(Boolean, nullable=False, default=True)
    features = Column(JSON, default={})
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

    modules = relationship("PlanModule", back_populates="plan", cascade="all, delete-orphan")
    tenants = relationship("Tenant", back_populates="plan")


class PlanModule(Base):
    __tablename__ = "plan_modules"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    plan_id = Column(
        GUID,
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    module_key = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)
    config = Column(JSON, default={})

    plan = relationship("Plan", back_populates="modules")
