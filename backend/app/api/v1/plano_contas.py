"""
API — Plano de Contas & Motor de Matching

Endpoints:
  GET  /plano-contas/{empresa_id}           → Árvore hierárquica completa
  GET  /plano-contas/{empresa_id}/analiticas → Apenas contas analíticas (para selects)
  GET  /plano-contas/{empresa_id}/flat       → Lista plana
  GET  /plano-contas/{empresa_id}/regras     → Regras de conciliação
  POST /plano-contas/{empresa_id}/matching   → Executar motor de matching (todas pendentes)
  POST /plano-contas/{empresa_id}/matching/{tx_id} → Matching para uma transação
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.permissions import require_permission
from app.dependencies import get_current_user
from app.schemas.plano_contas import (
    ContaAnalitica,
    ContaRead,
    MatchResultado,
    MatchSingleResult,
    RegraRead,
)
from app.services.plano_contas_service import PlanoContasService

router = APIRouter(prefix="/plano-contas", tags=["Plano de Contas"])


def _get_service() -> PlanoContasService:
    svc = PlanoContasService()
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")
    return svc


@router.get("/{empresa_id}", response_model=list[ContaRead])
async def get_plano_contas(
    empresa_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """
    Retorna árvore hierárquica completa do plano de contas.
    Filtrado por ativa=true, ordenado por codigo ASC.
    Usado no seletor de categoria na tela de conciliação e em contas a pagar/receber.
    """
    svc = _get_service()
    return await svc.get_plano_contas(empresa_id)


@router.get("/{empresa_id}/analiticas", response_model=list[ContaAnalitica])
async def get_contas_analiticas(
    empresa_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """
    Retorna apenas contas analíticas (nível = 'analitica').
    Somente estas aparecem como opção de seleção na UI.
    """
    svc = _get_service()
    return await svc.get_contas_analiticas(empresa_id)


@router.get("/{empresa_id}/flat")
async def get_plano_contas_flat(
    empresa_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Retorna lista plana de todas as contas ativas."""
    svc = _get_service()
    return await svc.get_plano_contas_flat(empresa_id)


@router.get("/{empresa_id}/regras", response_model=list[RegraRead])
async def get_regras(
    empresa_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Retorna regras de conciliação ativas da empresa."""
    svc = _get_service()
    return await svc.get_regras(empresa_id)


@router.post("/{empresa_id}/matching", response_model=MatchResultado)
async def run_matching(
    empresa_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
):
    """
    Executa o motor de matching em TODAS as transações pendentes da empresa.

    Lógica:
      1. Normalizar descrição da transação (sem acentos, uppercase)
      2. Para cada regra ativa, checar se QUALQUER palavra-chave está contida (OR)
      3. Se match:
         - acao='auto-conciliar' + confiança>=85 → concilia automaticamente
         - acao='sugerir' → marca sugestão na UI
      4. Se nenhuma regra bater → status = 'sem_match'
    """
    svc = _get_service()
    return await svc.run_matching(empresa_id)


@router.post("/{empresa_id}/matching/{tx_id}", response_model=MatchSingleResult)
async def match_single_transaction(
    empresa_id: str,
    tx_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Executa matching para uma única transação bancária."""
    svc = _get_service()
    result = await svc.match_single_transaction(empresa_id, tx_id)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result
