"""
Empresa-flow webhook receiver service.

Recebe eventos do Supabase Financeiro (sistema empresa-flow / ataticagestao.com)
quando algo acontece nele e cria notifications/calendar events no meutatico.site.

Eventos suportados (mapeados pelo campo `event` do payload):
- payable.created       → conta a pagar lancada
- payable.due_soon      → conta a pagar vencendo em 3 dias
- receivable.created    → conta a receber criada
- receivable.received   → recebimento confirmado
- reconciliation.done   → conciliacao do mes concluida
- monthly_report.sent   → relatorio mensal enviado ao cliente

Payload esperado:
{
  "event": "payable.created",
  "company_id": "<uuid_supabase>",     # mapeia para clients.financial_company_id
  "data": { ... },                     # dados do evento
  "occurred_at": "2026-05-05T12:00:00Z"
}
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.client import Client
from app.models.tenant.notification import Notification
from app.models.tenant.user import User

logger = logging.getLogger(__name__)


# Mapping: tipo de evento → (titulo template, type da notification)
EVENT_TEMPLATES: dict[str, tuple[str, str]] = {
    "payable.created":      ("Nova conta a pagar — {client}",        "info"),
    "payable.due_soon":     ("Conta a pagar vence em breve — {client}", "warning"),
    "receivable.created":   ("Nova conta a receber — {client}",      "info"),
    "receivable.received":  ("Recebimento confirmado — {client}",    "success"),
    "reconciliation.done":  ("Conciliacao concluida — {client}",     "success"),
    "monthly_report.sent":  ("Relatorio mensal enviado — {client}",  "success"),
}


class EmpresaFlowWebhookService:
    """Processa eventos vindos do empresa-flow (Supabase Financeiro)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle_event(
        self,
        event: str,
        company_id: str,
        data: dict[str, Any],
        occurred_at: datetime | None = None,
    ) -> dict:
        """Processa um evento do empresa-flow.

        Returns: {"processed": bool, "notifications_created": int, "reason": str?}
        """
        if event not in EVENT_TEMPLATES:
            logger.info("Empresa-flow webhook: evento desconhecido %s — ignorando", event)
            return {"processed": False, "reason": "unknown_event", "notifications_created": 0}

        # Resolver client a partir do company_id
        result = await self.db.execute(
            select(Client).where(Client.financial_company_id == company_id)
        )
        client = result.scalar_one_or_none()

        if not client:
            logger.warning(
                "Empresa-flow webhook: company_id=%s nao tem cliente vinculado",
                company_id,
            )
            return {
                "processed": False,
                "reason": "company_not_linked",
                "notifications_created": 0,
            }

        # Buscar usuario responsavel + admins ativos (notificar todos)
        target_user_ids: set = set()
        if client.responsible_user_id:
            target_user_ids.add(client.responsible_user_id)

        # Adicionar usuarios ativos (admins) — notificacao em massa
        admins = await self.db.execute(
            select(User.id).where(User.is_active == True)  # noqa: E712
        )
        for row in admins.scalars().all():
            target_user_ids.add(row)

        if not target_user_ids:
            logger.warning("Empresa-flow webhook: nenhum usuario para notificar")
            return {
                "processed": False,
                "reason": "no_users",
                "notifications_created": 0,
            }

        title_tmpl, n_type = EVENT_TEMPLATES[event]
        client_label = client.trade_name or client.company_name or "Cliente"
        title = title_tmpl.format(client=client_label)
        message = self._build_message(event, data)

        created = 0
        for uid in target_user_ids:
            notif = Notification(
                user_id=uid,
                title=title[:255],
                message=message,
                type=n_type,
                entity_type="client",
                entity_id=client.id,
                is_read=False,
                created_at=occurred_at or datetime.now(timezone.utc),
            )
            self.db.add(notif)
            created += 1

        await self.db.flush()

        logger.info(
            "Empresa-flow webhook %s: %d notifications criadas para client=%s",
            event, created, client_label,
        )

        return {
            "processed": True,
            "notifications_created": created,
            "client_id": str(client.id),
            "event": event,
        }

    def _build_message(self, event: str, data: dict[str, Any]) -> str:
        """Constroi a mensagem da notification baseada no payload."""
        if event in ("payable.created", "payable.due_soon"):
            valor = data.get("valor") or data.get("amount") or 0
            credor = data.get("credor_nome") or data.get("supplier") or "fornecedor"
            vencimento = data.get("vencimento") or data.get("due_date") or "—"
            return f"R$ {valor:.2f} | {credor} | Vencimento: {vencimento}"

        if event in ("receivable.created", "receivable.received"):
            valor = data.get("valor") or data.get("amount") or 0
            descricao = data.get("descricao") or data.get("description") or "—"
            return f"R$ {valor:.2f} — {descricao}"

        if event == "reconciliation.done":
            mes = data.get("mes") or data.get("month")
            ano = data.get("ano") or data.get("year")
            pct = data.get("percentual") or data.get("percentage") or 100
            return f"Conciliacao {mes}/{ano} concluida ({pct}%)"

        if event == "monthly_report.sent":
            mes = data.get("mes") or data.get("month")
            ano = data.get("ano") or data.get("year")
            return f"Relatorio mensal {mes}/{ano} enviado ao cliente"

        return ""
