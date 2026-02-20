import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime,
    ForeignKey, JSON, Numeric, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (
        CheckConstraint(
            "document_type IN ('CNPJ', 'CPF')",
            name="ck_clients_document_type",
        ),
        CheckConstraint(
            "status IN ('active', 'inactive', 'onboarding', 'suspended', 'churned')",
            name="ck_clients_status",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False)
    trade_name = Column(String(255))
    document_type = Column(String(4), nullable=False, default="CNPJ")
    document_number = Column(String(20), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    secondary_phone = Column(String(20))

    # Endereço
    address_street = Column(String(255))
    address_number = Column(String(20))
    address_complement = Column(String(100))
    address_neighborhood = Column(String(100))
    address_city = Column(String(100))
    address_state = Column(String(2))
    address_zip = Column(String(10))

    # Gestão
    status = Column(String(20), nullable=False, default="active")
    responsible_user_id = Column(GUID, ForeignKey("users.id"))
    contracted_plan = Column(String(100))
    contract_start_date = Column(Date)
    contract_end_date = Column(Date)
    monthly_fee = Column(Numeric(10, 2))

    # Informações adicionais
    tax_regime = Column(String(50))
    systems_used = Column(JSON, default=[])
    notes = Column(Text)
    tags = Column(JSON, default=[])

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

    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="client")
    tasks = relationship("Task", back_populates="client")


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    client_id = Column(
        GUID,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    role = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20))
    whatsapp = Column(String(20))
    is_primary = Column(Boolean, nullable=False, default=False)
    notes = Column(Text)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", back_populates="contacts")
