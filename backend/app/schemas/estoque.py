from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Fornecedores (table: suppliers) ───────────────────


class CriarFornecedorRequest(BaseModel):
    company_id: UUID
    cpf_cnpj: str
    razao_social: str
    nome_fantasia: str | None = None
    tipo_pessoa: Literal["PF", "PJ"] = "PJ"
    email: str | None = None
    telefone: str | None = None
    celular: str | None = None
    observacoes: str | None = None
    dados_bancarios_pix: str | None = None


class AtualizarFornecedorRequest(BaseModel):
    razao_social: str | None = None
    nome_fantasia: str | None = None
    email: str | None = None
    telefone: str | None = None
    celular: str | None = None
    observacoes: str | None = None
    dados_bancarios_pix: str | None = None


# ── Produtos (table: products) ────────────────────────


class CriarProdutoRequest(BaseModel):
    company_id: UUID
    code: str
    description: str
    tipo_produto: Literal["produto", "insumo", "ativo", "embalagem"] = "produto"
    unidade_medida: str = "un"
    ncm: str | None = None
    fornecedor_id: UUID | None = None
    metodo_custeio: Literal["media_ponderada", "peps", "ueps"] = "media_ponderada"
    price: Decimal | None = None
    estoque_minimo: Decimal = Decimal("0")
    estoque_maximo: Decimal | None = None
    localizacao: str | None = None
    controla_validade: bool = False
    controla_lote: bool = False
    conta_contabil_id: UUID | None = None


class AtualizarProdutoRequest(BaseModel):
    description: str | None = None
    tipo_produto: Literal["produto", "insumo", "ativo", "embalagem"] | None = None
    unidade_medida: str | None = None
    ncm: str | None = None
    fornecedor_id: UUID | None = None
    price: Decimal | None = None
    estoque_minimo: Decimal | None = None
    estoque_maximo: Decimal | None = None
    localizacao: str | None = None
    controla_validade: bool | None = None
    controla_lote: bool | None = None
    conta_contabil_id: UUID | None = None


# ── Ordens de Compra ──────────────────────────────────


class ItemOCRequest(BaseModel):
    produto_id: UUID
    quantidade: Decimal = Field(gt=0)
    valor_unitario: Decimal = Field(gt=0)


class CriarOCRequest(BaseModel):
    company_id: UUID
    fornecedor_id: UUID
    itens: list[ItemOCRequest] = Field(min_length=1)
    data_prevista: date | None = None
    cond_pagamento: str | None = None
    observacoes: str | None = None
    gerada_por_alerta: bool = False


class AtualizarOCRequest(BaseModel):
    data_prevista: date | None = None
    cond_pagamento: str | None = None
    observacoes: str | None = None


class ItemRecebimentoRequest(BaseModel):
    produto_id: UUID
    quantidade: Decimal = Field(gt=0)
    valor_unitario: Decimal = Field(gt=0)
    lote: str | None = None
    data_validade: date | None = None


class ReceberOCRequest(BaseModel):
    itens: list[ItemRecebimentoRequest] = Field(min_length=1)
    numero_nf: str | None = None
    chave_nf: str | None = None
    gerar_conta_pagar: bool = True
    data_vencimento_cp: date | None = None


# ── Saídas ────────────────────────────────────────────


class RegistrarSaidaRequest(BaseModel):
    company_id: UUID
    produto_id: UUID
    quantidade: Decimal = Field(gt=0)
    tipo: Literal["consumo", "venda", "transferencia", "perda", "ajuste", "devolucao"]
    motivo: str | None = None
    lote: str | None = None
    centro_custo_id: UUID | None = None


# ── Inventário ────────────────────────────────────────


class IniciarInventarioRequest(BaseModel):
    company_id: UUID
    descricao: str | None = None


class ItemInventarioRequest(BaseModel):
    produto_id: UUID
    qtd_contada: Decimal


class FecharInventarioRequest(BaseModel):
    itens: list[ItemInventarioRequest] = Field(min_length=1)
    aplicar_ajustes: bool = False


# ── Job ───────────────────────────────────────────────


class ProcessarAlertasRequest(BaseModel):
    company_id: UUID
