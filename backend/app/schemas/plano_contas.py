"""Schemas — Plano de Contas & Regras de Conciliação (schema real do Supabase)."""

from typing import Optional
from pydantic import BaseModel


# ── Plano de Contas ─────────────────────────────────

class ContaBase(BaseModel):
    code: str
    name: str
    account_type: str       # 'revenue' | 'cost' | 'expense' | 'equity'
    account_nature: str     # 'credit' | 'debit'
    is_analytical: bool
    level: int              # 1=grupo, 2=subgrupo, 3=analitica
    parent_id: Optional[str] = None
    dre_group: Optional[str] = None
    recorrencia: Optional[str] = None


class ContaRead(ContaBase):
    id: str
    children: list["ContaRead"] = []


class ContaAnalitica(BaseModel):
    """Conta analítica simplificada (para seletores na UI)."""
    id: str
    code: str
    name: str
    account_nature: str
    dre_group: Optional[str] = None
    recorrencia: Optional[str] = None


# ── Regras de Conciliação ───────────────────────────

class RegraBase(BaseModel):
    account_id: str
    palavras_chave: list[str]
    confianca: str      # 'Alta' | 'Média' | 'Baixa'
    acao: str           # 'auto-conciliar' | 'sugerir'
    recorrencia: Optional[str] = None


class RegraRead(RegraBase):
    id: str
    ativa: bool = True


# ── Matching Engine ─────────────────────────────────

class MatchDetalhe(BaseModel):
    tx_id: str
    descricao: str
    conta_codigo: Optional[str] = None
    conta_nome: Optional[str] = None
    confianca: Optional[str] = None
    confianca_score: int = 0
    acao: Optional[str] = None
    auto_conciliado: bool = False


class MatchResultado(BaseModel):
    total_pendentes: int
    matched: int
    auto_conciliados: int
    sugeridos: int
    sem_match: int
    detalhes: list[MatchDetalhe]


class MatchSingleResult(BaseModel):
    tx_id: str
    descricao: str
    account_id: Optional[str] = None
    confianca: Optional[str] = None
    confianca_score: int = 0
    acao: Optional[str] = None
    regra_id: Optional[str] = None
