from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.onboarding import OnboardingStep
from app.models.tenant.user import User


DEFAULT_STEPS = [
    {"step": "dados", "label": "Dados cadastrais completos", "order": "1"},
    {"step": "contrato_gerado", "label": "Contrato de prestação de serviço gerado", "order": "2"},
    {"step": "contrato_assinado", "label": "Contrato assinado pelo cliente", "order": "3"},
    {"step": "acesso_financeiro", "label": "Acesso ao sistema financeiro configurado", "order": "4"},
    {"step": "responsavel", "label": "Responsável interno atribuído", "order": "5"},
    {"step": "onedrive", "label": "Pasta criada no OneDrive", "order": "6"},
    {"step": "reuniao", "label": "Primeira reunião de alinhamento realizada", "order": "7"},
]


class OnboardingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_steps_exist(self, client_id: UUID) -> list[OnboardingStep]:
        """Create default onboarding steps for a client if they don't exist yet."""
        result = await self.db.execute(
            select(OnboardingStep)
            .where(OnboardingStep.client_id == client_id)
            .order_by(OnboardingStep.order)
        )
        steps = list(result.scalars().all())

        if not steps:
            for s in DEFAULT_STEPS:
                step = OnboardingStep(
                    client_id=client_id,
                    step=s["step"],
                    label=s["label"],
                    order=s["order"],
                )
                self.db.add(step)
            await self.db.flush()

            result = await self.db.execute(
                select(OnboardingStep)
                .where(OnboardingStep.client_id == client_id)
                .order_by(OnboardingStep.order)
            )
            steps = list(result.scalars().all())

        return steps

    async def get_client_onboarding(self, client_id: UUID) -> dict:
        """Get onboarding status for a single client."""
        client = await self.db.get(Client, client_id)
        if not client:
            raise NotFoundException("Cliente não encontrado")

        steps = await self.ensure_steps_exist(client_id)

        step_responses = []
        for step in steps:
            done_by_name = None
            if step.done_by:
                user = await self.db.get(User, step.done_by)
                if user:
                    done_by_name = user.name

            step_responses.append({
                "id": str(step.id),
                "client_id": str(step.client_id),
                "step": step.step,
                "label": step.label,
                "is_done": step.is_done,
                "done_at": step.done_at,
                "done_by": str(step.done_by) if step.done_by else None,
                "done_by_name": done_by_name,
                "order": step.order,
            })

        completed = sum(1 for s in steps if s.is_done)

        return {
            "client_id": str(client.id),
            "client_name": client.company_name,
            "client_trade_name": client.trade_name,
            "client_status": client.status,
            "steps": step_responses,
            "total_steps": len(steps),
            "completed_steps": completed,
        }

    async def toggle_step(
        self, client_id: UUID, step_id: UUID, is_done: bool, user_id: UUID
    ) -> OnboardingStep:
        """Toggle an onboarding step."""
        result = await self.db.execute(
            select(OnboardingStep).where(
                OnboardingStep.id == step_id,
                OnboardingStep.client_id == client_id,
            )
        )
        step = result.scalar_one_or_none()
        if not step:
            raise NotFoundException("Etapa de onboarding não encontrada")

        step.is_done = is_done
        if is_done:
            step.done_at = datetime.now(timezone.utc)
            step.done_by = user_id
        else:
            step.done_at = None
            step.done_by = None

        await self.db.flush()
        return step

    async def list_all_onboardings(self) -> list[dict]:
        """List onboarding progress for all clients that have onboarding status or steps."""
        # Get all clients
        result = await self.db.execute(
            select(Client).order_by(Client.company_name)
        )
        clients = result.scalars().all()

        onboardings = []
        for client in clients:
            steps = await self.ensure_steps_exist(client.id)
            completed = sum(1 for s in steps if s.is_done)
            total = len(steps)

            onboardings.append({
                "client_id": str(client.id),
                "client_name": client.company_name,
                "client_trade_name": client.trade_name,
                "client_status": client.status,
                "total_steps": total,
                "completed_steps": completed,
            })

        return onboardings
