from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import require_permission
from app.dependencies import get_current_user
from app.schemas.multiempresa import (
    AprovarTransferenciaRequest,
    AtualizarGrupoRequest,
    AtualizarTransferenciaRequest,
    AtualizarVinculoRequest,
    CalcularConsolidadoRequest,
    CriarGrupoRequest,
    CriarRelatorioRequest,
    CriarTransferenciaRequest,
    VincularEmpresaRequest,
)
from app.services.multiempresa_service import MultiempresaService

router = APIRouter(prefix="/multiempresa", tags=["Multi-empresa"])


def _svc() -> MultiempresaService:
    return MultiempresaService()


def _check_configured(svc: MultiempresaService) -> None:
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")


# ══════════════════════════════════════════════════════
# GRUPOS EMPRESARIAIS
# ══════════════════════════════════════════════════════


@router.get("/grupos/")
async def listar_grupos(
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_grupos(current_user["id"])


@router.get("/grupos/{grupo_id}")
async def obter_grupo(
    grupo_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    grupo = await svc.obter_grupo(str(grupo_id))
    if not grupo:
        raise HTTPException(404, "Grupo não encontrado")
    return grupo


@router.post("/grupos/", status_code=201)
async def criar_grupo(
    data: CriarGrupoRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "create"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.criar_grupo(
        owner_id=current_user["id"],
        nome=data.nome,
        descricao=data.descricao,
        ativo=data.ativo,
    )


@router.patch("/grupos/{grupo_id}")
async def atualizar_grupo(
    grupo_id: UUID,
    data: AtualizarGrupoRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "update"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.atualizar_grupo(str(grupo_id), data.model_dump(exclude_unset=True))


@router.delete("/grupos/{grupo_id}", status_code=204)
async def deletar_grupo(
    grupo_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "delete"),
):
    svc = _svc()
    _check_configured(svc)
    await svc.deletar_grupo(str(grupo_id))


# ── Vínculos (empresas do grupo) ─────────────────────


@router.get("/grupos/{grupo_id}/empresas")
async def listar_empresas_grupo(
    grupo_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_empresas_grupo(str(grupo_id))


@router.post("/grupos/empresas/vincular", status_code=201)
async def vincular_empresa(
    data: VincularEmpresaRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "create"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.vincular_empresa(
        grupo_id=str(data.grupo_id),
        company_id=str(data.company_id),
        papel=data.papel,
        percentual=data.percentual_participacao,
    )


@router.patch("/grupos/empresas/{vinculo_id}")
async def atualizar_vinculo(
    vinculo_id: UUID,
    data: AtualizarVinculoRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "update"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.atualizar_vinculo(str(vinculo_id), data.model_dump(exclude_unset=True))


@router.delete("/grupos/empresas/{vinculo_id}", status_code=204)
async def desvincular_empresa(
    vinculo_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "delete"),
):
    svc = _svc()
    _check_configured(svc)
    await svc.desvincular_empresa(str(vinculo_id))


# ══════════════════════════════════════════════════════
# TRANSFERÊNCIAS INTERCOMPANY
# ══════════════════════════════════════════════════════


@router.get("/transferencias/")
async def listar_transferencias(
    company_id: UUID | None = Query(None),
    status: str | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_transferencias(
        owner_id=current_user["id"],
        company_id=str(company_id) if company_id else None,
        status=status,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )


@router.get("/transferencias/{transferencia_id}")
async def obter_transferencia(
    transferencia_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    t = await svc.obter_transferencia(str(transferencia_id))
    if not t:
        raise HTTPException(404, "Transferência não encontrada")
    return t


@router.post("/transferencias/", status_code=201)
async def criar_transferencia(
    data: CriarTransferenciaRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "create"),
):
    svc = _svc()
    _check_configured(svc)
    if data.company_origem_id == data.company_destino_id:
        raise HTTPException(400, "Empresa de origem e destino devem ser diferentes")
    return await svc.criar_transferencia(current_user["id"], data.model_dump())


@router.patch("/transferencias/{transferencia_id}")
async def atualizar_transferencia(
    transferencia_id: UUID,
    data: AtualizarTransferenciaRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "update"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.atualizar_transferencia(
        str(transferencia_id), data.model_dump(exclude_unset=True)
    )


@router.post("/transferencias/{transferencia_id}/aprovar")
async def aprovar_transferencia(
    transferencia_id: UUID,
    data: AprovarTransferenciaRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "approve"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.aprovar_transferencia(
        str(transferencia_id), current_user["id"], data.status
    )


@router.post("/transferencias/{transferencia_id}/concluir")
async def concluir_transferencia(
    transferencia_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "approve"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.concluir_transferencia(str(transferencia_id))


# ══════════════════════════════════════════════════════
# CONSOLIDADO
# ══════════════════════════════════════════════════════


@router.get("/consolidado/")
async def obter_consolidado_atual(
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.obter_consolidado_atual(current_user["id"])


@router.get("/consolidado/{grupo_id}")
async def obter_consolidado_grupo(
    grupo_id: UUID,
    competencia: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.obter_consolidado(str(grupo_id), competencia)


@router.post("/consolidado/calcular")
async def calcular_consolidado(
    data: CalcularConsolidadoRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "create"),
):
    svc = _svc()
    _check_configured(svc)
    await svc.calcular_consolidado(str(data.grupo_id), data.competencia)
    return {"message": "Consolidado calculado com sucesso"}


# ══════════════════════════════════════════════════════
# RELATÓRIOS COMPARATIVOS
# ══════════════════════════════════════════════════════


@router.get("/relatorios/")
async def listar_relatorios(
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "read"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.listar_relatorios(current_user["id"])


@router.post("/relatorios/", status_code=201)
async def criar_relatorio(
    data: CriarRelatorioRequest,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "create"),
):
    svc = _svc()
    _check_configured(svc)
    return await svc.criar_relatorio(current_user["id"], data.model_dump())


@router.delete("/relatorios/{relatorio_id}", status_code=204)
async def deletar_relatorio(
    relatorio_id: UUID,
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("multiempresa", "delete"),
):
    svc = _svc()
    _check_configured(svc)
    await svc.deletar_relatorio(str(relatorio_id))
