import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # "contrato" or "termo"
    description = Column(Text)
    html_content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
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


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    template_id = Column(GUID, ForeignKey("document_templates.id"), nullable=False)
    client_id = Column(GUID, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    file_url = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    generated_by = Column(GUID, ForeignKey("users.id"))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    template = relationship("DocumentTemplate")
    client = relationship("Client")
