"""
Webhook receivers — endpoints publicos (autenticados via secret) que recebem
eventos de sistemas externos.

Atualmente:
- POST /webhooks/empresa-flow/event — eventos do Supabase Financeiro (ataticagestao.com)
"""

import logging
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.services.empresa_flow_webhook_service import EmpresaFlowWebhookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class EmpresaFlowEvent(BaseModel):
    event: str = Field(..., description="Tipo do evento (ex: payable.created)")
    company_id: str = Field(..., description="UUID da empresa no Supabase Financeiro")
    data: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime | None = None


def _verify_secret(provided: str | None) -> None:
    """Verifica o secret compartilhado entre Supabase Financeiro e meutatico."""
    expected = settings.EMPRESA_FLOW_WEBHOOK_SECRET
    if not expected:
        # Sem secret configurado — recusar todos os webhooks pra nao virar endpoint aberto
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="EMPRESA_FLOW_WEBHOOK_SECRET nao configurado no backend",
        )
    if not provided or provided != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Secret invalido",
        )


@router.post("/empresa-flow/event")
async def receive_empresa_flow_event(
    payload: EmpresaFlowEvent,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_webhook_secret: Annotated[str | None, Header(alias="X-Webhook-Secret")] = None,
):
    """Recebe eventos do empresa-flow e cria notifications no meutatico.

    O Supabase Financeiro deve enviar:
        POST https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event
        Headers:
            Content-Type: application/json
            X-Webhook-Secret: <EMPRESA_FLOW_WEBHOOK_SECRET>
        Body:
            {
              "event": "payable.created",
              "company_id": "<uuid_supabase>",
              "data": { "valor": 1500.00, "credor_nome": "Fornecedor X", "vencimento": "2026-05-15" },
              "occurred_at": "2026-05-05T12:00:00Z"
            }
    """
    _verify_secret(x_webhook_secret)

    svc = EmpresaFlowWebhookService(db)
    try:
        result = await svc.handle_event(
            event=payload.event,
            company_id=payload.company_id,
            data=payload.data,
            occurred_at=payload.occurred_at,
        )
        await db.commit()
        return result
    except Exception as exc:
        logger.exception("Falha ao processar evento empresa-flow")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar evento: {str(exc)[:200]}",
        )


@router.get("/empresa-flow/health")
async def empresa_flow_health():
    """Health check para o Supabase verificar se o endpoint esta vivo."""
    return {
        "status": "ok",
        "configured": bool(settings.EMPRESA_FLOW_WEBHOOK_SECRET),
        "supported_events": [
            "payable.created",
            "payable.due_soon",
            "receivable.created",
            "receivable.received",
            "reconciliation.done",
            "monthly_report.sent",
        ],
    }
