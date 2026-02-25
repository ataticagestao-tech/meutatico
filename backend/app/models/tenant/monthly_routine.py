import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base, GUID


class MonthlyRoutine(Base):
    __tablename__ = "monthly_routines"
    __table_args__ = (
        UniqueConstraint("client_id", "month", "year", name="uq_routine_client_month_year"),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    client_id = Column(
        GUID,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    # Checklist items
    contas_pagar = Column(Boolean, nullable=False, default=False)
    contas_receber = Column(Boolean, nullable=False, default=False)
    conciliacao = Column(Boolean, nullable=False, default=False)
    resultado = Column(Boolean, nullable=False, default=False)
    relatorio_enviado = Column(Boolean, nullable=False, default=False)

    # Who/when completed each step
    contas_pagar_at = Column(DateTime(timezone=True))
    contas_receber_at = Column(DateTime(timezone=True))
    conciliacao_at = Column(DateTime(timezone=True))
    resultado_at = Column(DateTime(timezone=True))
    relatorio_at = Column(DateTime(timezone=True))

    contas_pagar_by = Column(GUID, ForeignKey("users.id"))
    contas_receber_by = Column(GUID, ForeignKey("users.id"))
    conciliacao_by = Column(GUID, ForeignKey("users.id"))
    resultado_by = Column(GUID, ForeignKey("users.id"))
    relatorio_by = Column(GUID, ForeignKey("users.id"))

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

    client = relationship("Client", backref="monthly_routines")
