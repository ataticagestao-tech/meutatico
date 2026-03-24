import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Column, Date, DateTime,
    ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class DocumentFolder(Base):
    __tablename__ = "document_folders"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_folder_id = Column(
        GUID,
        ForeignKey("document_folders.id"),
    )
    client_id = Column(GUID, ForeignKey("clients.id"))
    color = Column(String(7), default="#6B7280")
    created_by = Column(GUID, ForeignKey("users.id"))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    documents = relationship("Document", back_populates="folder")
    children = relationship("DocumentFolder", back_populates="parent")
    parent = relationship(
        "DocumentFolder", back_populates="children", remote_side="DocumentFolder.id"
    )


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'archived', 'deleted')",
            name="ck_documents_status",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    folder_id = Column(GUID, ForeignKey("document_folders.id"))
    client_id = Column(GUID, ForeignKey("clients.id"))

    # Arquivo
    name = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_url = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)

    # Metadados
    description = Column(Text)
    category = Column(String(50))  # contrato, nota_fiscal, alvara, certidao, etc.
    tags = Column(JSON, default=[])

    # Gestão
    status = Column(String(20), nullable=False, default="active")

    # Versionamento
    version = Column(Integer, nullable=False, default=1)
    previous_version_id = Column(GUID, ForeignKey("documents.id"))

    # Metadados
    uploaded_by = Column(GUID, ForeignKey("users.id"))
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

    folder = relationship("DocumentFolder", back_populates="documents")
    validity = relationship("DocumentValidity", back_populates="document", uselist=False)


class DocumentValidity(Base):
    """Controle de vencimento por documento."""
    __tablename__ = "document_validities"
    __table_args__ = (
        CheckConstraint(
            "status IN ('valido', 'vencendo', 'vencido', 'renovado')",
            name="ck_document_validities_status",
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    issue_date = Column(Date)
    expiry_date = Column(Date, nullable=False)
    issuing_body = Column(String(255))  # orgao_emissor
    responsible = Column(String(255))
    observations = Column(Text)

    alert_30d = Column(Boolean, nullable=False, default=True)
    alert_60d = Column(Boolean, nullable=False, default=False)
    alert_90d = Column(Boolean, nullable=False, default=False)

    status = Column(String(20), nullable=False, default="valido")

    renewed_at = Column(Date)
    renewed_document_id = Column(GUID, ForeignKey("documents.id"))

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

    document = relationship("Document", back_populates="validity", foreign_keys=[document_id])
