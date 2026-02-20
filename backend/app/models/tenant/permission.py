import uuid

from sqlalchemy import Column, String

from app.database import Base, GUID


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    module_key = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(String(255))
