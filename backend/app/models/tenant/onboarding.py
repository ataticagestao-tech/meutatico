import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class OnboardingStep(Base):
    __tablename__ = "onboarding_steps"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    client_id = Column(
        GUID,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step = Column(String(50), nullable=False)
    label = Column(String(255), nullable=False)
    is_done = Column(Boolean, nullable=False, default=False)
    done_at = Column(DateTime(timezone=True))
    done_by = Column(GUID, ForeignKey("users.id"))
    order = Column(String(10), nullable=False, default="0")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", backref="onboarding_steps")
    done_by_user = relationship("User", foreign_keys=[done_by])
