import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, CheckConstraint, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import GUID, Base

DEFAULT_TENANT_SETTINGS = {
    "theme": "light",
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR",
    "date_format": "DD/MM/YYYY",
}


class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'inactive', 'suspended', 'trial')",
            name="ck_tenants_status",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    schema_name = Column(String(100), unique=True, nullable=False)
    document = Column(String(20))  # CNPJ
    email = Column(String(255), nullable=False)
    phone = Column(String(20))
    plan_id = Column(
        GUID,
        ForeignKey("plans.id"),
        nullable=False,
    )
    status = Column(String(20), nullable=False, default="active")
    trial_ends_at = Column(DateTime(timezone=True))
    logo_url = Column(Text)
    settings = Column(JSON, default=DEFAULT_TENANT_SETTINGS)
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

    plan = relationship("Plan", back_populates="tenants")
