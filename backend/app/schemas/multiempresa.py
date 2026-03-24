"""
Schemas — Módulo Multi-empresa
Grupos empresariais, transferências intercompany, consolidado e relatórios.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Grupos Empresariais ───────────────────────────────

class CriarGrupoRequest(BaseModel):
    nome: str
    descricao: str | None = None
    ativo: bool = True


class AtualizarGrupoRequest(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    ativo: bool | None = None


class VincularEmpresaRequest(BaseModel):
    grupo_id: UUID
    company_id: UUID
    papel: Literal["holding", "controlada", "coligada", "membro"] = "membro"
    percentual_participacao: Decimal | None = None


class AtualizarVinculoRequest(BaseModel):
    papel: Literal["holding", "controlada", "coligada", "membro"] | None = None
    percentual_participacao: Decimal | None = None


# ── Transferências Intercompany ───────────────────────

class CriarTransferenciaRequest(BaseModel):
    company_origem_id: UUID
    company_destino_id: UUID
    valor: Decimal = Field(..., gt=0)
    data: date
    natureza: Literal["mutuo", "adiantamento", "capital", "operacional", "outros"]
    descricao: str | None = None
    documento_url: str | None = None
    gera_juros: bool = False
    taxa_juros_mensal: Decimal | None = None
    conta_bancaria_orig: UUID | None = None
    conta_bancaria_dest: UUID | None = None


class AtualizarTransferenciaRequest(BaseModel):
    descricao: str | None = None
    documento_url: str | None = None
    gera_juros: bool | None = None
    taxa_juros_mensal: Decimal | None = None


class AprovarTransferenciaRequest(BaseModel):
    status: Literal["aprovada", "cancelada"]


# ── Consolidado ───────────────────────────────────────

class CalcularConsolidadoRequest(BaseModel):
    grupo_id: UUID
    competencia: str = Field(..., pattern=r"^\d{4}-\d{2}$")


# ── Relatórios Comparativos ──────────────────────────

class CriarRelatorioRequest(BaseModel):
    nome: str
    tipo: Literal[
        "dre_comparativo",
        "fluxo_caixa_comparativo",
        "indicadores_comparativos",
        "ranking_empresas",
        "evolucao_historica",
    ]
    empresas_ids: list[UUID]
    competencia_inicio: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    competencia_fim: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    indicador: str | None = None
