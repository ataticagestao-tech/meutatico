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
            pagar, receber, contas, transacoes = await self._fetch_all(
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
                "receitas": total_recebido,
                "despesas": total_pago,
                "liquido": total_recebido - total_pago,
            },
            "connected": True,
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
    ) -> tuple[list, list, list, list]:
        """Fetch all financial data for a company/period in parallel."""
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
                    ("select", "id,status"),
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

    def _empty_dashboard(self, month: int, year: int) -> dict:
        return {
            "periodo": {"mes": month, "ano": year},
            "contas_pagar": {"total": 0, "pago": 0, "pendente": 0},
            "contas_receber": {"total": 0, "recebido": 0, "pendente": 0},
            "saldo_bancario": {"total": 0, "contas": []},
            "conciliacao": {"total": 0, "conciliadas": 0, "pendentes": 0, "percentual": 0},
            "resultado": {"receitas": 0, "despesas": 0, "liquido": 0},
            "connected": False,
        }
