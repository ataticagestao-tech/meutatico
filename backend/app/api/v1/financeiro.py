from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.models.tenant.client import Client
from app.services.email_service import EmailService
from app.services.financial_service import FinancialService
from app.services.monthly_routine_service import MonthlyRoutineService
from app.services.ofx_import_service import OFXImportService
from app.services.plano_contas_service import PlanoContasService

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


async def _resolve_financial_company_id(db: AsyncSession, client_id: UUID) -> str:
    """Resolve Gestap client_id → Supabase financial company_id."""
    result = await db.execute(
        select(Client.financial_company_id).where(Client.id == client_id)
    )
    fid = result.scalar_one_or_none()
    if not fid:
        raise HTTPException(
            404,
            "Cliente não possui vínculo com empresa financeira. "
            "Vincule na aba Financeiro do cadastro do cliente.",
        )
    return fid


@router.get("/status")
async def get_financial_status(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Check if the financial integration is configured and connected."""
    svc = FinancialService()
    return await svc.get_status()


@router.get("/companies")
async def list_financial_companies(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List all companies from the financial system."""
    svc = FinancialService()
    return await svc.list_companies()


@router.get("/dashboard/{client_id}")
async def get_financial_dashboard(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
):
    """Get financial dashboard KPIs for a client (resolves to Supabase company)."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    return await svc.get_dashboard(company_id, mes, ano)


@router.get("/fluxo-caixa/{client_id}")
async def get_fluxo_caixa(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
):
    """Get cash flow statement for a client (resolves to Supabase company)."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    return await svc.get_fluxo_caixa(company_id, mes, ano)


@router.get("/inadimplentes/{client_id}")
async def get_inadimplentes(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Get overdue receivables for a client (resolves to Supabase company)."""
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    return await svc.get_inadimplentes(company_id)


# ── Monthly Routine ──────────────────────────────────────


@router.get("/rotina")
async def list_routines(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
):
    """List routine progress for all clients for a given month."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    svc = MonthlyRoutineService(db)
    return await svc.list_all_routines(mes, ano)


@router.get("/rotina/{client_id}")
async def get_routine_detail(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
):
    """Get routine detail for a specific client/month."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    svc = MonthlyRoutineService(db)
    return await svc.get_routine_detail(client_id, mes, ano)


@router.patch("/rotina/{client_id}/{field}")
async def toggle_routine_step(
    client_id: UUID,
    field: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "update"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
    is_done: bool = Query(default=True),
):
    """Toggle a routine step as done/undone."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    svc = MonthlyRoutineService(db)
    return await svc.toggle_step(
        client_id=client_id,
        month=mes,
        year=ano,
        field=field,
        is_done=is_done,
        user_id=UUID(current_user["id"]),
    )


# ── Relatório Mensal — Export PDF & Email ──────────────


MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def _format_brl(value: float) -> str:
    """Format number as BRL currency."""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _build_report_html(client_name: str, mes: int, ano: int, dashboard: dict) -> str:
    """Build a printable HTML report from dashboard data."""
    cp = dashboard.get("contas_pagar", {})
    cr = dashboard.get("contas_receber", {})
    sb = dashboard.get("saldo_bancario", {})
    cc = dashboard.get("conciliacao", {})
    res = dashboard.get("resultado", {})

    bank_rows = ""
    for conta in sb.get("contas", []):
        name = conta.get("name") or conta.get("banco", "")
        bank_rows += f"""<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">{_format_brl(conta.get("current_balance", 0))}</td>
        </tr>"""

    conc_pct = cc.get("percentual", 0)
    conc_color = "#16a34a" if conc_pct == 100 else "#f59e0b"
    liq = res.get("liquido", 0)
    liq_color = "#16a34a" if liq >= 0 else "#ef4444"

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório Financeiro — {client_name} — {MESES_PT[mes-1]} {ano}</title>
<style>
  @page {{ margin: 20mm; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; }}
  h1 {{ text-align: center; font-size: 22px; margin-bottom: 4px; }}
  .subtitle {{ text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px; }}
  .section {{ margin-bottom: 28px; }}
  .section-title {{ font-size: 15px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }}
  table {{ width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; }}
  td {{ padding: 8px 12px; }}
  .label {{ color: #6b7280; }}
  .value {{ text-align: right; font-weight: 600; }}
  .total-row {{ background: #f3f4f6; font-weight: 700; }}
  .green {{ color: #16a34a; }}
  .red {{ color: #ef4444; }}
  .amber {{ color: #f59e0b; }}
  .footer {{ text-align: center; font-size: 11px; color: #9ca3af; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }}
  .bar-bg {{ height: 10px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin-top: 6px; }}
  .bar-fill {{ height: 100%; border-radius: 99px; }}
</style>
</head>
<body>
<h1>Relatório Financeiro Mensal</h1>
<p class="subtitle">{client_name}<br>{MESES_PT[mes-1]} de {ano}</p>

<div class="section">
  <div class="section-title">📤 Contas a Pagar</div>
  <table>
    <tr><td class="label" style="border-bottom:1px solid #e5e7eb;">Total do Período</td><td class="value" style="border-bottom:1px solid #e5e7eb;">{_format_brl(cp.get("total",0))}</td></tr>
    <tr><td class="label" style="border-bottom:1px solid #e5e7eb;">Pago</td><td class="value green" style="border-bottom:1px solid #e5e7eb;">{_format_brl(cp.get("pago",0))}</td></tr>
    <tr><td class="label">Pendente</td><td class="value red">{_format_brl(cp.get("pendente",0))}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">📥 Contas a Receber</div>
  <table>
    <tr><td class="label" style="border-bottom:1px solid #e5e7eb;">Total do Período</td><td class="value" style="border-bottom:1px solid #e5e7eb;">{_format_brl(cr.get("total",0))}</td></tr>
    <tr><td class="label" style="border-bottom:1px solid #e5e7eb;">Recebido</td><td class="value green" style="border-bottom:1px solid #e5e7eb;">{_format_brl(cr.get("recebido",0))}</td></tr>
    <tr><td class="label">Pendente</td><td class="value amber">{_format_brl(cr.get("pendente",0))}</td></tr>
  </table>
</div>

{"<div class='section'><div class='section-title'>🏦 Saldos Bancários</div><table><tr style='border-bottom:1px solid #d1d5db;'><td style='padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;'>Conta</td><td style='padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;text-align:right;'>Saldo</td></tr>" + bank_rows + f"<tr class='total-row'><td style='padding:8px 12px;'>Total</td><td style='padding:8px 12px;text-align:right;'>{_format_brl(sb.get('total',0))}</td></tr></table></div>" if sb.get("contas") else ""}

<div class="section">
  <div class="section-title">🔍 Conciliação Bancária</div>
  <div style="background:#f9fafb;padding:12px;border-radius:8px;">
    <div style="display:flex;justify-content:space-between;font-size:14px;">
      <span>{cc.get("conciliadas",0)} de {cc.get("total",0)} transações conciliadas</span>
      <span style="font-weight:600;color:{conc_color};">{conc_pct}%</span>
    </div>
    <div class="bar-bg"><div class="bar-fill" style="width:{conc_pct}%;background:{conc_color};"></div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">{"📈" if liq >= 0 else "📉"} Resultado do Período</div>
  <table>
    <tr><td class="label" style="border-bottom:1px solid #e5e7eb;">Receitas</td><td class="value green" style="border-bottom:1px solid #e5e7eb;">{_format_brl(res.get("receitas",0))}</td></tr>
    {"<tr><td class='label' style='border-bottom:1px solid #e5e7eb;'>(-) Deduções</td><td class='value red' style='border-bottom:1px solid #e5e7eb;'>" + _format_brl(res.get("deducoes",0)) + "</td></tr>" if res.get("deducoes",0) > 0 else ""}
    {"<tr><td class='label' style='border-bottom:1px solid #e5e7eb;'>(-) Custos (CSP)</td><td class='value red' style='border-bottom:1px solid #e5e7eb;'>" + _format_brl(res.get("custos",0)) + "</td></tr>" if res.get("custos",0) > 0 else ""}
    {"<tr><td class='label' style='border-bottom:1px solid #e5e7eb;'>(-) Despesas Operacionais</td><td class='value red' style='border-bottom:1px solid #e5e7eb;'>" + _format_brl(res.get("despesas_operacionais",0)) + "</td></tr>" if res.get("despesas_operacionais",0) > 0 else ""}
    {"<tr><td class='label' style='border-bottom:1px solid #e5e7eb;'>(-) Antecipação de Lucro</td><td class='value amber' style='border-bottom:1px solid #e5e7eb;'>" + _format_brl(res.get("distribuicao_lucro",0)) + "</td></tr>" if res.get("distribuicao_lucro",0) > 0 else ""}
    <tr class="total-row"><td style="padding:10px 12px;">Resultado Líquido</td><td style="padding:10px 12px;text-align:right;font-size:18px;color:{liq_color};">{_format_brl(liq)}</td></tr>
  </table>
</div>

<div class="footer">
  Relatório gerado automaticamente pelo Central Tática — {datetime.now().strftime("%d/%m/%Y %H:%M")}
</div>
</body>
</html>"""


@router.get("/relatorio/export/{client_id}")
async def export_report_html(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
    mes: int = Query(default=0),
    ano: int = Query(default=0),
):
    """Generate a printable HTML report for browser print-to-PDF."""
    now = datetime.now()
    if mes == 0:
        mes = now.month
    if ano == 0:
        ano = now.year

    # Get client name
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente não encontrado")
    client_name = client.trade_name or client.company_name

    # Get dashboard data
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    dashboard = await svc.get_dashboard(company_id, mes, ano)

    html = _build_report_html(client_name, mes, ano, dashboard)
    return HTMLResponse(content=html)


class ReportEmailRequest(BaseModel):
    to_email: str
    mes: int = 0
    ano: int = 0


@router.post("/relatorio/email/{client_id}")
async def send_report_email(
    client_id: UUID,
    data: ReportEmailRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("clients", "read"),
):
    """Send the financial report via email."""
    now = datetime.now()
    mes = data.mes or now.month
    ano = data.ano or now.year

    # Get client name
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente não encontrado")
    client_name = client.trade_name or client.company_name

    # Get dashboard data
    company_id = await _resolve_financial_company_id(db, client_id)
    fin_svc = FinancialService()
    dashboard = await fin_svc.get_dashboard(company_id, mes, ano)

    html = _build_report_html(client_name, mes, ano, dashboard)
    subject = f"Relatório Financeiro — {MESES_PT[mes-1]} {ano} — {client_name}"

    email_svc = EmailService(db)
    result = await email_svc.send_email(data.to_email, subject, html)
    return result


# ── Importação OFX — Anti-duplicata ──────────────────


@router.post("/importar-ofx/{client_id}")
async def import_ofx(
    client_id: UUID,
    bank_account_id: str = Query(..., description="ID da conta bancária no Supabase"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "update"),
):
    """
    Importa arquivo OFX com proteção contra duplicatas.

    Verificações:
      1. Arquivo já importado antes (hash do arquivo)
      2. FITID já existe (identificador único OFX)
      3. Hash de data+valor+descrição já existe
      4. Duplicatas dentro do próprio arquivo

    Retorna relatório com total importado vs duplicatas ignoradas.
    """
    if not file.filename or not file.filename.lower().endswith(".ofx"):
        raise HTTPException(400, "Arquivo deve ter extensão .ofx")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Arquivo OFX vazio")

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Arquivo OFX muito grande (máximo 10MB)")

    company_id = await _resolve_financial_company_id(db, client_id)

    svc = OFXImportService()
    result = await svc.import_ofx(
        company_id=company_id,
        bank_account_id=bank_account_id,
        file_content=content,
        file_name=file.filename,
        imported_by=current_user.get("email", ""),
    )

    if not result.get("success"):
        raise HTTPException(409, result.get("error", "Erro na importação"))

    return result


@router.get("/import-history/{client_id}")
async def get_import_history(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "read"),
):
    """Retorna histórico de importações OFX do cliente."""
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = OFXImportService()
    return await svc.get_import_history(company_id)


@router.get("/bank-accounts/{client_id}")
async def get_bank_accounts(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "read"),
):
    """Lista contas bancárias ativas do cliente."""
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    if not svc.is_configured:
        return []
    try:
        return await svc._get("bank_accounts", [
            ("company_id", f"eq.{company_id}"),
            ("is_active", "eq.true"),
            ("select", "id,name,banco,agencia,conta,current_balance"),
            ("order", "name.asc"),
        ])
    except Exception:
        return []


@router.get("/extrato/{client_id}")
async def get_extrato_pendente(
    client_id: UUID,
    bank_account_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "read"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, le=200),
):
    """
    Retorna transações do extrato pendentes de conciliação.
    Inclui informações de sugestão do motor de matching.
    """
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = FinancialService()
    if not svc.is_configured:
        return {"items": [], "total": 0}

    offset = (page - 1) * per_page
    try:
        data = await svc._get("bank_transactions", [
            ("company_id", f"eq.{company_id}"),
            ("bank_account_id", f"eq.{bank_account_id}"),
            ("status", "eq.pending"),
            ("select", "id,fitid,date,amount,type,description,memo,status,sugestao_conta_id,confianca_match,metodo_match,imported_at"),
            ("order", "date.desc"),
            ("offset", str(offset)),
            ("limit", str(per_page)),
        ])
        return {"items": data, "total": len(data), "page": page}
    except Exception:
        return {"items": [], "total": 0}


# ── Conciliação — Salvar ──────────────────────────────


class ConciliarRequest(BaseModel):
    transaction_ids: list[str]
    conta_id: str | None = None  # Se None, usa a sugestao_conta_id existente


@router.post("/conciliar/{client_id}")
async def conciliar_transacoes(
    client_id: UUID,
    data: ConciliarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "update"),
):
    """
    Salva a conciliação: marca transações como reconciled.

    - Se conta_id é fornecido, atualiza a sugestao_conta_id de todas.
    - Se conta_id é None, mantém a sugestão existente do motor de matching.
    """
    if not data.transaction_ids:
        raise HTTPException(400, "Nenhuma transação selecionada")

    company_id = await _resolve_financial_company_id(db, client_id)
    svc = PlanoContasService()
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")

    conciliadas = 0
    erros = []

    for tx_id in data.transaction_ids:
        try:
            payload: dict = {"status": "reconciled"}
            if data.conta_id:
                payload["sugestao_conta_id"] = data.conta_id
                payload["confianca_match"] = 100
                payload["metodo_match"] = "manual"

            await svc._patch(
                "bank_transactions",
                [("id", f"eq.{tx_id}"), ("company_id", f"eq.{company_id}")],
                payload,
            )
            conciliadas += 1
        except Exception as e:
            erros.append({"tx_id": tx_id, "error": str(e)})

    return {
        "conciliadas": conciliadas,
        "erros": len(erros),
        "detalhes_erros": erros[:10],
    }


class AlterarContaRequest(BaseModel):
    transaction_id: str
    conta_id: str


@router.patch("/conciliar/{client_id}/conta")
async def alterar_conta_transacao(
    client_id: UUID,
    data: AlterarContaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "update"),
):
    """Altera a conta sugerida de uma transação (sem conciliar)."""
    company_id = await _resolve_financial_company_id(db, client_id)
    svc = PlanoContasService()
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")

    result = await svc._patch(
        "bank_transactions",
        [("id", f"eq.{data.transaction_id}"), ("company_id", f"eq.{company_id}")],
        {
            "sugestao_conta_id": data.conta_id,
            "confianca_match": 100,
            "metodo_match": "manual",
        },
    )
    return {"updated": len(result)}


@router.post("/desconciliar/{client_id}")
async def desconciliar_transacoes(
    client_id: UUID,
    data: ConciliarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _perm=require_permission("clients", "update"),
):
    """Reverte conciliação: marca transações como pending novamente."""
    if not data.transaction_ids:
        raise HTTPException(400, "Nenhuma transação selecionada")

    company_id = await _resolve_financial_company_id(db, client_id)
    svc = PlanoContasService()
    if not svc.is_configured:
        raise HTTPException(503, "Integração financeira não configurada")

    revertidas = 0
    for tx_id in data.transaction_ids:
        try:
            await svc._patch(
                "bank_transactions",
                [("id", f"eq.{tx_id}"), ("company_id", f"eq.{company_id}")],
                {"status": "pending"},
            )
            revertidas += 1
        except Exception:
            pass

    return {"revertidas": revertidas}
