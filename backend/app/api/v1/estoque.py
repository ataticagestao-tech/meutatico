from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import require_permission
from app.dependencies import get_current_user
from app.schemas.estoque import (
    AtualizarFornecedorRequest,
    AtualizarOCRequest,
    AtualizarProdutoRequest,
    CriarFornecedorRequest,
    CriarOCRequest,
    CriarProdutoRequest,
    FecharInventarioRequest,
    IniciarInventarioRequest,
    ProcessarAlertasRequest,
    ReceberOCRequest,
    RegistrarSaidaRequest,
)
from app.services.estoque_service import EstoqueService

router = APIRouter(prefix="/estoque", tags=["Estoque & Compras"])


def _svc() -> EstoqueService:
    return EstoqueService()


def _check_configured(svc: EstoqueService) -> None:
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")


# ══════════════════════════════════════════════════════
# FORNECEDORES (suppliers)
# ══════════════════════════════════════════════════════


@router.get("/fornecedores/")
async def listar_fornecedores(
    company_id: UUID = Query(...),
    search: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_fornecedores(str(company_id), search)


@router.post("/fornecedores/")
async def criar_fornecedor(
    data: CriarFornecedorRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(mode="json", exclude_none=True)
    payload["company_id"] = str(data.company_id)
    return await svc.criar_fornecedor(payload)


@router.put("/fornecedores/{fornecedor_id}")
async def atualizar_fornecedor(
    fornecedor_id: UUID,
    data: AtualizarFornecedorRequest,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "update"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(exclude_none=True, mode="json")
    if not payload:
        raise HTTPException(400, "Nenhum campo para atualizar")
    return await svc.atualizar_fornecedor(str(fornecedor_id), str(company_id), payload)


@router.get("/fornecedores/{cnpj}/buscar")
async def buscar_fornecedor_cnpj(
    cnpj: str,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    result = await svc.buscar_fornecedor_por_cnpj(str(company_id), cnpj)
    if not result:
        raise HTTPException(404, "Fornecedor não encontrado")
    return result


# ══════════════════════════════════════════════════════
# PRODUTOS (products)
# ══════════════════════════════════════════════════════


@router.get("/produtos/")
async def listar_produtos(
    company_id: UUID = Query(...),
    search: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_produtos(str(company_id), search)


@router.post("/produtos/")
async def criar_produto(
    data: CriarProdutoRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(mode="json", exclude_none=True)
    payload["company_id"] = str(data.company_id)
    if data.fornecedor_id:
        payload["fornecedor_id"] = str(data.fornecedor_id)
    if data.conta_contabil_id:
        payload["conta_contabil_id"] = str(data.conta_contabil_id)
    payload["estoque_atual"] = 0
    payload["custo_medio"] = 0
    try:
        return await svc.criar_produto(payload)
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.put("/produtos/{produto_id}")
async def atualizar_produto(
    produto_id: UUID,
    data: AtualizarProdutoRequest,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "update"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(exclude_none=True, mode="json")
    if not payload:
        raise HTTPException(400, "Nenhum campo para atualizar")
    return await svc.atualizar_produto(str(produto_id), str(company_id), payload)


@router.get("/produtos/alertas")
async def alertas_estoque_minimo(
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.alertas_estoque_minimo(str(company_id))


# ══════════════════════════════════════════════════════
# ORDENS DE COMPRA
# ══════════════════════════════════════════════════════


@router.get("/ordens-compra/")
async def listar_ordens_compra(
    company_id: UUID = Query(...),
    status: str | None = Query(None),
    fornecedor_id: UUID | None = Query(None),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_ordens_compra(
        str(company_id),
        status,
        str(fornecedor_id) if fornecedor_id else None,
    )


@router.post("/ordens-compra/")
async def criar_ordem_compra(
    data: CriarOCRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    itens = [
        {
            "produto_id": str(i.produto_id),
            "quantidade": float(i.quantidade),
            "valor_unitario": float(i.valor_unitario),
        }
        for i in data.itens
    ]
    try:
        return await svc.criar_ordem_compra(
            company_id=str(data.company_id),
            fornecedor_id=str(data.fornecedor_id),
            itens=itens,
            data_prevista=data.data_prevista,
            cond_pagamento=data.cond_pagamento,
            observacoes=data.observacoes,
            gerada_por_alerta=data.gerada_por_alerta,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.put("/ordens-compra/{oc_id}")
async def atualizar_ordem_compra(
    oc_id: UUID,
    data: AtualizarOCRequest,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "update"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(exclude_none=True, mode="json")
    try:
        return await svc.atualizar_ordem_compra(str(oc_id), str(company_id), payload)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/ordens-compra/{oc_id}/receber")
async def receber_ordem_compra(
    oc_id: UUID,
    data: ReceberOCRequest,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    itens = [
        {
            "produto_id": str(i.produto_id),
            "quantidade": float(i.quantidade),
            "valor_unitario": float(i.valor_unitario),
            "lote": i.lote,
            "data_validade": i.data_validade.isoformat() if i.data_validade else None,
        }
        for i in data.itens
    ]
    try:
        return await svc.receber_ordem_compra(
            oc_id=str(oc_id),
            company_id=str(company_id),
            itens=itens,
            numero_nf=data.numero_nf,
            chave_nf=data.chave_nf,
            gerar_conta_pagar=data.gerar_conta_pagar,
            data_vencimento_cp=data.data_vencimento_cp.isoformat() if data.data_vencimento_cp else None,
        )
    except ValueError as e:
        msg = str(e)
        code = 400
        if "NOT_FOUND" in msg:
            code = 404
        elif "JA_RECEBIDA" in msg or "CANCELADA" in msg:
            code = 409
        raise HTTPException(code, msg)


@router.post("/ordens-compra/{oc_id}/cancelar")
async def cancelar_ordem_compra(
    oc_id: UUID,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "update"),
):
    svc = _svc()
    _check_configured(svc)
    try:
        return await svc.cancelar_ordem_compra(str(oc_id), str(company_id))
    except ValueError as e:
        raise HTTPException(409, str(e))


# ══════════════════════════════════════════════════════
# ENTRADAS E SAÍDAS
# ══════════════════════════════════════════════════════


@router.get("/entradas/")
async def listar_entradas(
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_entradas(str(company_id))


@router.post("/saidas/")
async def registrar_saida(
    data: RegistrarSaidaRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    payload = data.model_dump(mode="json", exclude_none=True)
    payload["company_id"] = str(data.company_id)
    payload["produto_id"] = str(data.produto_id)
    if data.centro_custo_id:
        payload["centro_custo_id"] = str(data.centro_custo_id)
    try:
        return await svc.registrar_saida(payload)
    except ValueError as e:
        msg = str(e)
        code = 400
        if "NOT_FOUND" in msg:
            code = 404
        raise HTTPException(code, msg)


@router.get("/movimentacoes/{produto_id}")
async def movimentacoes_produto(
    produto_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.movimentacoes_produto(str(produto_id))


# ══════════════════════════════════════════════════════
# INVENTÁRIO
# ══════════════════════════════════════════════════════


@router.get("/inventario/")
async def listar_inventarios(
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_inventarios(str(company_id))


@router.post("/inventario/iniciar")
async def iniciar_inventario(
    data: IniciarInventarioRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    try:
        return await svc.iniciar_inventario(str(data.company_id), data.descricao)
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.post("/inventario/{inventario_id}/fechar")
async def fechar_inventario(
    inventario_id: UUID,
    data: FecharInventarioRequest,
    company_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "update"),
):
    svc = _svc()
    _check_configured(svc)
    itens = [
        {"produto_id": str(i.produto_id), "qtd_contada": float(i.qtd_contada)}
        for i in data.itens
    ]
    try:
        return await svc.fechar_inventario(
            str(inventario_id), str(company_id), itens, data.aplicar_ajustes
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


# ══════════════════════════════════════════════════════
# JOBS
# ══════════════════════════════════════════════════════


@router.post("/alertas/processar")
async def processar_alertas(
    data: ProcessarAlertasRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("estoque", "create"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.processar_alertas_estoque_minimo(str(data.company_id))
