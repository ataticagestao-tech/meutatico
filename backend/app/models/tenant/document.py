import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, CheckConstraint, Column, DateTime,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentFolder(Base):
    __tablename__ = "document_folders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_folder_id = Column(
        UUID(as_uuid=True),
        ForeignKey("document_folders.id"),
    )
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    color = Column(String(7), default="#6B7280")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    folder_id = Column(UUID(as_uuid=True), ForeignKey("document_folders.id"))
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))

    # Arquivo
    name = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_url = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)

    # Metadados
    description = Column(Text)
    tags = Column(ARRAY(Text), default=[])

    # Gestão
    status = Column(String(20), nullable=False, default="active")

    # Versionamento
    version = Column(Integer, nullable=False, default=1)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))

    # Metadados
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
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
