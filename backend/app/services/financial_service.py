"""
Financial Service — reads data from the external Supabase financial system.
All queries are READ-ONLY via Supabase REST API using the service_role key.
"""

from datetime import date
from typing import Any

import httpx

from app.config import settings


class FinancialService:
    """Reads financial data from ataticagestao.com Supabase instance."""

    def __init__(self):
        self.base_url = settings.SUPABASE_FINANCEIRO_URL
        self.service_key = settings.SUPABASE_FINANCEIRO_SERVICE_KEY

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.service_key)

    def _headers(self) -> dict:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }

    async def _get(
        self, table: str, params: list[tuple[str, str]] | dict | None = None
    ) -> list[dict]:
        """Execute a GET request against the Supabase REST API."""
        if not self.is_configured:
            return []

        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=self._headers(), params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def get_status(self) -> dict:
        """Check Supabase connection status."""
        if not self.is_configured:
            return {"configured": False, "connected": False}
        try:
            data = await self._get("companies", [
                ("select", "id"),
                ("limit", "1"),
            ])
            return {"configured": True, "connected": True, "companies_count": len(data)}
        except Exception:
            return {"configured": True, "connected": False}

    async def list_companies(self) -> list[dict]:
        """List all companies from financial system."""
        if not self.is_configured:
            return []
        try:
            data = await self._get("companies", [
                ("select", "id,cnpj,razao_social,nome_fantasia,email,telefone,is_active,tenant_id"),
                ("is_active", "eq.true"),
                ("order", "razao_social.asc"),
            ])
            return data
        except Exception:
            return []

    async def get_dashboard(self, company_id: str, month: int, year: int) -> dict:
        """Get financial dashboard KPIs for a company/month."""
        if not self.is_configured:
            return self._empty_dashboard(month, year)

        start = f"{year}-{month:02d}-01"
        last_day = 28
        if month in (1, 3, 5, 7, 8, 10, 12):
            last_day = 31
        elif month in (4, 6, 9, 11):
            last_day = 30
        elif month == 2:
            last_day = 29 if year % 4 == 0 else 28
        end = f"{year}-{month:02d}-{last_day}"

        try:
            pagar, receber, contas, transacoes, plano_contas = await self._fetch_all(
                company_id, start, end
            )
        except Exception:
            return self._empty_dashboard(month, year)

        total_pagar = sum(float(p.get("amount", 0) or 0) for p in pagar)
        total_pago = sum(
            float(p.get("amount", 0) or 0) for p in pagar if p.get("status") == "paid"
        )
        total_receber = sum(float(r.get("amount", 0) or 0) for r in receber)
        total_recebido = sum(
            float(r.get("amount", 0) or 0)
            for r in receber
            if r.get("status") == "received"
        )
        saldo_total = sum(float(c.get("current_balance", 0) or 0) for c in contas)
        total_tx = len(transacoes)
        tx_conciliadas = sum(
            1 for t in transacoes if t.get("status") == "reconciled"
        )

        # ── Resultado por Plano de Contas ──
        # Mapear contas por ID → código para identificar o grupo contábil
        conta_by_id = {c["id"]: c for c in plano_contas}

        # Classificar transações por grupo do plano de contas
        # Grupo 1.x = Receitas, 2.x = Deduções, 3.x = Custos (CSP),
        # 4.x = Despesas Operacionais, 5.x = Resultado/Distribuição
        # Transferências entre contas = IGNORADAS (não compõem faturamento)
        receitas_tx = 0.0
        deducoes_tx = 0.0
        custos_tx = 0.0
        despesas_op_tx = 0.0
        distribuicao_tx = 0.0
        transferencias_tx = 0.0
        sem_classificacao = 0.0

        # Keywords que indicam transferência entre contas da própria empresa
        TRANSFER_KEYWORDS = {
            "TRANSFERENCIA", "TRANSF", "TED MESMA TITULAR",
            "TRANSF ENTRE CONTAS", "TRANSF CONTA", "RESGATE AUTOMATICO",
            "APLICACAO AUTOMATICA", "APLICACAO AUTO", "RESGATE AUTO",
        }

        def _is_transfer(tx: dict, conta: dict | None) -> bool:
            """Detecta se a transação é transferência entre contas próprias."""
            # 1. Conta do plano com nome indicando transferência
            if conta:
                nome = (conta.get("name") or "").upper()
                if any(kw in nome for kw in (
                    "TRANSFERENCIA", "TRANSF ENTRE CONTAS",
                    "MOVIMENTACAO INTERNA", "APLICACAO AUTOMATICA",
                    "RESGATE AUTOMATICO",
                )):
                    return True
                # Conta do tipo Ativo/Patrimônio (não é resultado)
                acc_type = (conta.get("account_type") or "").lower()
                if acc_type in ("ativo", "passivo", "patrimonio"):
                    return True

            # 2. Descrição da transação indica transferência
            desc = (tx.get("description") or "").upper()
            memo = (tx.get("memo") or "").upper()
            combined = f"{desc} {memo}"
            if any(kw in combined for kw in TRANSFER_KEYWORDS):
                return True

            return False

        for tx in transacoes:
            amt = abs(float(tx.get("amount", 0) or 0))
            conta_id = tx.get("sugestao_conta_id")
            conta = conta_by_id.get(conta_id) if conta_id else None

            # Verificar se é transferência entre contas — ignorar do resultado
            if _is_transfer(tx, conta):
                transferencias_tx += amt
                continue

            if not conta_id or conta_id not in conta_by_id:
                # Transação sem vínculo ao plano de contas — usar tipo básico
                # mas verificar descrição para não contar transferências
                if tx.get("type") == "income":
                    receitas_tx += amt
                elif tx.get("type") == "expense":
                    sem_classificacao += amt
                continue

            code = str(conta.get("code", ""))
            first_digit = code.split(".")[0] if "." in code else code[:1]

            if first_digit == "1":
                receitas_tx += amt
            elif first_digit == "2":
                deducoes_tx += amt
            elif first_digit == "3":
                custos_tx += amt
            elif first_digit == "4":
                despesas_op_tx += amt
            elif first_digit == "5":
                distribuicao_tx += amt
            elif first_digit == "6":
                # Grupo 6 = Movimentações patrimoniais (transferências) — não entra no DRE
                transferencias_tx += amt
            else:
                sem_classificacao += amt

        # Receita líquida = Receitas - Deduções
        # Lucro bruto = Receita líquida - Custos (CSP)
        # Resultado operacional = Lucro bruto - Despesas operacionais
        # Resultado após distribuição = Resultado op. - Distribuição

        # Se há transações classificadas pelo plano de contas, usar essa lógica
        has_plano_data = (receitas_tx + custos_tx + despesas_op_tx + distribuicao_tx) > 0

        if has_plano_data:
            receita_liquida = receitas_tx - deducoes_tx
            lucro_bruto = receita_liquida - custos_tx
            resultado_operacional = lucro_bruto - despesas_op_tx
            resultado_final = resultado_operacional - distribuicao_tx
        else:
            # Fallback: usar accounts_payable/receivable como antes
            receita_liquida = total_recebido
            lucro_bruto = total_recebido
            custos_tx = 0
            resultado_operacional = total_recebido - total_pago
            resultado_final = resultado_operacional
            distribuicao_tx = 0
            despesas_op_tx = total_pago

        return {
            "periodo": {"mes": month, "ano": year},
            "contas_pagar": {
                "total": total_pagar,
                "pago": total_pago,
                "pendente": total_pagar - total_pago,
            },
            "contas_receber": {
                "total": total_receber,
                "recebido": total_recebido,
                "pendente": total_receber - total_recebido,
            },
            "saldo_bancario": {
                "total": saldo_total,
                "contas": [
                    {
                        "name": c.get("name"),
                        "banco": c.get("banco"),
                        "current_balance": float(c.get("current_balance", 0) or 0),
                    }
                    for c in contas
                ],
            },
            "conciliacao": {
                "total": total_tx,
                "conciliadas": tx_conciliadas,
                "pendentes": total_tx - tx_conciliadas,
                "percentual": (
                    round((tx_conciliadas / total_tx) * 100) if total_tx > 0 else 0
                ),
            },
            "resultado": {
                "receitas": receitas_tx if has_plano_data else total_recebido,
                "deducoes": deducoes_tx,
                "receita_liquida": receita_liquida,
                "custos": custos_tx,
                "lucro_bruto": lucro_bruto,
                "despesas_operacionais": despesas_op_tx,
                "resultado_operacional": resultado_operacional,
                "distribuicao_lucro": distribuicao_tx,
                "transferencias": transferencias_tx,
                "liquido": resultado_final,
            },
            "connected": True,
        }

    async def get_fluxo_caixa(self, company_id: str, month: int, year: int) -> dict:
        """Get cash flow statement for a company/month."""
        if not self.is_configured:
            return self._empty_fluxo_caixa(month, year)

        start = f"{year}-{month:02d}-01"
        last_day = 28
        if month in (1, 3, 5, 7, 8, 10, 12):
            last_day = 31
        elif month in (4, 6, 9, 11):
            last_day = 30
        elif month == 2:
            last_day = 29 if year % 4 == 0 else 28
        end = f"{year}-{month:02d}-{last_day}"

        # Calculate previous month for opening balance
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        prev_last_day = 28
        if prev_month in (1, 3, 5, 7, 8, 10, 12):
            prev_last_day = 31
        elif prev_month in (4, 6, 9, 11):
            prev_last_day = 30
        elif prev_month == 2:
            prev_last_day = 29 if prev_year % 4 == 0 else 28
        prev_end = f"{prev_year}-{prev_month:02d}-{prev_last_day}"

        try:
            pagar, receber, contas, transacoes = await self._fetch_fluxo_caixa(
                company_id, start, end
            )
        except Exception:
            return self._empty_fluxo_caixa(month, year)

        # ── Operating Activities ──
        # Inflows: received payments from clients
        recebimentos_clientes = sum(
            float(r.get("amount", 0) or 0)
            for r in receber
            if r.get("status") == "received"
        )
        # Outflows: paid bills to suppliers
        pagamentos_fornecedores = sum(
            float(p.get("amount", 0) or 0)
            for p in pagar
            if p.get("status") == "paid"
        )

        # Separate by category if available
        pagamentos_pessoal = sum(
            float(p.get("amount", 0) or 0)
            for p in pagar
            if p.get("status") == "paid" and (p.get("category") or "").lower() in ("folha", "pessoal", "salario", "salarios", "pro-labore")
        )
        pagamentos_impostos = sum(
            float(p.get("amount", 0) or 0)
            for p in pagar
            if p.get("status") == "paid" and (p.get("category") or "").lower() in ("imposto", "impostos", "tributos", "taxa", "taxas")
        )
        pagamentos_outros_fornecedores = pagamentos_fornecedores - pagamentos_pessoal - pagamentos_impostos

        caixa_operacional = recebimentos_clientes - pagamentos_fornecedores

        # ── Investing Activities ──
        # Check bank_transactions for investment type
        investimentos_saida = sum(
            abs(float(t.get("amount", 0) or 0))
            for t in transacoes
            if t.get("type") == "expense" and (t.get("category") or "").lower() in ("investimento", "investimentos", "ativo", "imobilizado", "equipamento")
        )
        investimentos_entrada = sum(
            float(t.get("amount", 0) or 0)
            for t in transacoes
            if t.get("type") == "income" and (t.get("category") or "").lower() in ("venda ativo", "resgate", "resgate investimento")
        )
        caixa_investimento = investimentos_entrada - investimentos_saida

        # ── Financing Activities ──
        financiamentos_entrada = sum(
            float(t.get("amount", 0) or 0)
            for t in transacoes
            if t.get("type") == "income" and (t.get("category") or "").lower() in ("emprestimo", "emprestimos", "financiamento", "aporte", "capital")
        )
        financiamentos_saida = sum(
            abs(float(t.get("amount", 0) or 0))
            for t in transacoes
            if t.get("type") == "expense" and (t.get("category") or "").lower() in ("emprestimo", "emprestimos", "financiamento", "amortizacao", "juros emprestimo", "distribuicao", "dividendos")
        )
        caixa_financiamento = financiamentos_entrada - financiamentos_saida

        # ── Balances ──
        saldo_final = sum(float(c.get("current_balance", 0) or 0) for c in contas)
        variacao_liquida = caixa_operacional + caixa_investimento + caixa_financiamento
        saldo_inicial = saldo_final - variacao_liquida

        # ── Monthly transactions breakdown ──
        entradas_total = sum(
            float(t.get("amount", 0) or 0)
            for t in transacoes
            if float(t.get("amount", 0) or 0) > 0
        )
        saidas_total = sum(
            abs(float(t.get("amount", 0) or 0))
            for t in transacoes
            if float(t.get("amount", 0) or 0) < 0
        )

        # Bank accounts detail
        contas_detail = [
            {
                "name": c.get("name") or c.get("banco", ""),
                "banco": c.get("banco", ""),
                "saldo": float(c.get("current_balance", 0) or 0),
            }
            for c in contas
        ]

        return {
            "periodo": {"mes": month, "ano": year},
            "saldo_inicial": saldo_inicial,
            "saldo_final": saldo_final,
            "variacao_liquida": variacao_liquida,
            "operacional": {
                "total": caixa_operacional,
                "recebimentos_clientes": recebimentos_clientes,
                "pagamentos_fornecedores": pagamentos_outros_fornecedores,
                "pagamentos_pessoal": pagamentos_pessoal,
                "pagamentos_impostos": pagamentos_impostos,
            },
            "investimento": {
                "total": caixa_investimento,
                "entradas": investimentos_entrada,
                "saidas": investimentos_saida,
            },
            "financiamento": {
                "total": caixa_financiamento,
                "entradas": financiamentos_entrada,
                "saidas": financiamentos_saida,
            },
            "resumo": {
                "entradas": recebimentos_clientes + investimentos_entrada + financiamentos_entrada,
                "saidas": pagamentos_fornecedores + investimentos_saida + financiamentos_saida,
            },
            "contas_bancarias": contas_detail,
            "connected": True,
        }

    async def _fetch_fluxo_caixa(
        self, company_id: str, start: str, end: str
    ) -> tuple[list, list, list, list]:
        """Fetch data for cash flow statement."""
        import asyncio

        async with httpx.AsyncClient(timeout=15) as client:
            headers = self._headers()
            base = f"{self.base_url}/rest/v1"

            pagar_req = client.get(
                f"{base}/accounts_payable",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("due_date", f"gte.{start}"),
                    ("due_date", f"lte.{end}"),
                    ("select", "id,amount,due_date,payment_date,status,category,description"),
                ],
            )
            receber_req = client.get(
                f"{base}/accounts_receivable",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("due_date", f"gte.{start}"),
                    ("due_date", f"lte.{end}"),
                    ("select", "id,amount,due_date,receive_date,status,category,description"),
                ],
            )
            contas_req = client.get(
                f"{base}/bank_accounts",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("is_active", "eq.true"),
                    ("select", "id,name,banco,current_balance"),
                ],
            )
            tx_req = client.get(
                f"{base}/bank_transactions",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("date", f"gte.{start}"),
                    ("date", f"lte.{end}"),
                    ("select", "id,amount,date,type,category,description,status"),
                ],
            )

            results = await asyncio.gather(
                pagar_req, receber_req, contas_req, tx_req, return_exceptions=True
            )

            parsed = []
            for r in results:
                if isinstance(r, Exception):
                    parsed.append([])
                else:
                    r.raise_for_status()
                    parsed.append(r.json())

            return tuple(parsed)  # type: ignore

    def _empty_fluxo_caixa(self, month: int, year: int) -> dict:
        return {
            "periodo": {"mes": month, "ano": year},
            "saldo_inicial": 0,
            "saldo_final": 0,
            "variacao_liquida": 0,
            "operacional": {
                "total": 0,
                "recebimentos_clientes": 0,
                "pagamentos_fornecedores": 0,
                "pagamentos_pessoal": 0,
                "pagamentos_impostos": 0,
            },
            "investimento": {"total": 0, "entradas": 0, "saidas": 0},
            "financiamento": {"total": 0, "entradas": 0, "saidas": 0},
            "resumo": {"entradas": 0, "saidas": 0},
            "contas_bancarias": [],
            "connected": False,
        }

    async def get_inadimplentes(self, company_id: str) -> list[dict]:
        """Get overdue receivables (inadimplentes) for a company."""
        if not self.is_configured:
            return []

        today = date.today().isoformat()
        try:
            data = await self._get(
                "accounts_receivable",
                [
                    ("company_id", f"eq.{company_id}"),
                    ("status", "eq.pending"),
                    ("due_date", f"lt.{today}"),
                    ("select", "id,description,amount,due_date,client_id"),
                    ("order", "due_date.asc"),
                ],
            )
            return data
        except Exception:
            return []

    async def _fetch_all(
        self, company_id: str, start: str, end: str
    ) -> tuple[list, list, list, list, list]:
        """Fetch all financial data for a company/period in parallel.

        Returns (accounts_payable, accounts_receivable, bank_accounts,
                 bank_transactions, chart_of_accounts).
        """
        import asyncio

        async with httpx.AsyncClient(timeout=15) as client:
            headers = self._headers()
            base = f"{self.base_url}/rest/v1"

            # Use list of tuples to support duplicate key names for range filters
            pagar_req = client.get(
                f"{base}/accounts_payable",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("due_date", f"gte.{start}"),
                    ("due_date", f"lte.{end}"),
                    ("select", "id,amount,due_date,payment_date,status"),
                ],
            )
            receber_req = client.get(
                f"{base}/accounts_receivable",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("due_date", f"gte.{start}"),
                    ("due_date", f"lte.{end}"),
                    ("select", "id,amount,due_date,receive_date,status"),
                ],
            )
            contas_req = client.get(
                f"{base}/bank_accounts",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("is_active", "eq.true"),
                    ("select", "id,name,banco,current_balance"),
                ],
            )
            tx_req = client.get(
                f"{base}/bank_transactions",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("date", f"gte.{start}"),
                    ("date", f"lte.{end}"),
                    ("select", "id,amount,date,type,description,status,sugestao_conta_id"),
                ],
            )
            # Plano de contas — para mapear transações por grupo contábil
            coa_req = client.get(
                f"{base}/chart_of_accounts",
                headers=headers,
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("status", "eq.active"),
                    ("select", "id,code,name,account_type,account_nature,is_analytical"),
                ],
            )

            results = await asyncio.gather(
                pagar_req, receber_req, contas_req, tx_req, coa_req,
                return_exceptions=True,
            )

            parsed = []
            for r in results:
                if isinstance(r, Exception):
                    parsed.append([])
                else:
                    r.raise_for_status()
                    parsed.append(r.json())

            return tuple(parsed)  # type: ignore

    def _empty_dashboard(self, month: int, year: int) -> dict:
        return {
            "periodo": {"mes": month, "ano": year},
            "contas_pagar": {"total": 0, "pago": 0, "pendente": 0},
            "contas_receber": {"total": 0, "recebido": 0, "pendente": 0},
            "saldo_bancario": {"total": 0, "contas": []},
            "conciliacao": {"total": 0, "conciliadas": 0, "pendentes": 0, "percentual": 0},
            "resultado": {
                "receitas": 0,
                "deducoes": 0,
                "receita_liquida": 0,
                "custos": 0,
                "lucro_bruto": 0,
                "despesas_operacionais": 0,
                "resultado_operacional": 0,
                "distribuicao_lucro": 0,
                "transferencias": 0,
                "liquido": 0,
            },
            "connected": False,
        }
