from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.monthly_routine import MonthlyRoutine
from app.models.tenant.user import User


STEP_FIELDS = [
    "contas_pagar",
    "contas_receber",
    "conciliacao",
    "resultado",
    "relatorio_enviado",
]

STEP_LABELS = {
    "contas_pagar": "Contas a Pagar — lançadas e conferidas",
    "contas_receber": "Contas a Receber — registradas e atualizadas",
    "conciliacao": "Conciliação Bancária — realizada e conferida",
    "resultado": "Resultado Financeiro — apurado",
    "relatorio_enviado": "Relatório Mensal — gerado e enviado ao cliente",
}


class MonthlyRoutineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, client_id: UUID, month: int, year: int) -> MonthlyRoutine:
        """Get or create a monthly routine for a client/month."""
        result = await self.db.execute(
            select(MonthlyRoutine).where(
                MonthlyRoutine.client_id == client_id,
                MonthlyRoutine.month == month,
                MonthlyRoutine.year == year,
            )
        )
        routine = result.scalar_one_or_none()

        if not routine:
            client = await self.db.get(Client, client_id)
            if not client:
                raise NotFoundException("Cliente não encontrado")

            routine = MonthlyRoutine(
                client_id=client_id,
                month=month,
                year=year,
            )
            self.db.add(routine)
            await self.db.flush()

        return routine

    async def get_routine_detail(self, client_id: UUID, month: int, year: int) -> dict:
        """Get detailed routine status for a client/month."""
        routine = await self.get_or_create(client_id, month, year)

        client = await self.db.get(Client, client_id)
        steps = []
        completed = 0

        for field in STEP_FIELDS:
            is_done = getattr(routine, field, False)
            done_at = getattr(routine, f"{field}_at", None)
            done_by_id = getattr(routine, f"{field}_by", None)
            done_by_name = None

            if done_by_id:
                user = await self.db.get(User, done_by_id)
                if user:
                    done_by_name = user.name

            if is_done:
                completed += 1

            steps.append({
                "field": field,
                "label": STEP_LABELS[field],
                "is_done": is_done,
                "done_at": done_at.isoformat() if done_at else None,
                "done_by": str(done_by_id) if done_by_id else None,
                "done_by_name": done_by_name,
            })

        return {
            "id": str(routine.id),
            "client_id": str(client_id),
            "client_name": client.company_name if client else "",
            "client_trade_name": client.trade_name if client else None,
            "month": month,
            "year": year,
            "steps": steps,
            "total_steps": len(STEP_FIELDS),
            "completed_steps": completed,
        }

    async def toggle_step(
        self, client_id: UUID, month: int, year: int, field: str, is_done: bool, user_id: UUID
    ) -> dict:
        """Toggle a routine step."""
        if field not in STEP_FIELDS:
            raise NotFoundException(f"Etapa '{field}' não encontrada")

        routine = await self.get_or_create(client_id, month, year)

        setattr(routine, field, is_done)
        if is_done:
            setattr(routine, f"{field}_at", datetime.now(timezone.utc))
            setattr(routine, f"{field}_by", user_id)
        else:
            setattr(routine, f"{field}_at", None)
            setattr(routine, f"{field}_by", None)

        await self.db.flush()

        return {
            "field": field,
            "is_done": is_done,
            "done_at": getattr(routine, f"{field}_at"),
        }

    async def list_all_routines(self, month: int, year: int) -> list[dict]:
        """List routine progress for all clients for a given month."""
        result = await self.db.execute(
            select(Client).where(
                Client.status.in_(["active", "onboarding"])
            ).order_by(Client.company_name)
        )
        clients = result.scalars().all()

        routines = []
        for client in clients:
            routine = await self.get_or_create(client.id, month, year)
            completed = sum(1 for f in STEP_FIELDS if getattr(routine, f, False))

            routines.append({
                "client_id": str(client.id),
                "client_name": client.company_name,
                "client_trade_name": client.trade_name,
                "month": month,
                "year": year,
                "total_steps": len(STEP_FIELDS),
                "completed_steps": completed,
            })

        return routines
