"""
Plano de Contas & Motor de Matching — acessa Supabase via REST API.

Usa o schema EXISTENTE do chart_of_accounts:
  id, company_id, code, name, account_type, account_nature,
  is_analytical, level, parent_id, dre_group, recorrencia, status
"""

import unicodedata
from typing import Any

import httpx

from app.config import settings


def normalizar(texto: str) -> str:
    """Remove acentos e converte para uppercase para comparação."""
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode()
        .upper()
        .strip()
    )


CONFIANCA_MAP = {"Alta": 95, "Média": 70, "Baixa": 50}


class PlanoContasService:
    """Gerencia plano de contas e motor de matching via Supabase REST API."""

    def __init__(self):
        self.base_url = settings.SUPABASE_FINANCEIRO_URL
        self.service_key = settings.SUPABASE_FINANCEIRO_SERVICE_KEY

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.service_key)

    def _headers(self, extra: dict | None = None) -> dict:
        h = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }
        if extra:
            h.update(extra)
        return h

    async def _get(
        self, table: str, params: list[tuple[str, str]] | None = None
    ) -> list[dict]:
        if not self.is_configured:
            return []
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=self._headers(), params=params or [])
            resp.raise_for_status()
            return resp.json()

    async def _patch(
        self, table: str, params: list[tuple[str, str]], payload: dict
    ) -> list[dict]:
        if not self.is_configured:
            return []
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.patch(
                url,
                headers=self._headers({"Prefer": "return=representation"}),
                params=params,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    # ══════════════════════════════════════════════════════
    # PLANO DE CONTAS
    # ══════════════════════════════════════════════════════

    async def get_plano_contas(self, empresa_id: str) -> list[dict]:
        """Retorna árvore hierárquica completa. Filtrado por status=active, order code ASC."""
        rows = await self._get(
            "chart_of_accounts",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("status", "eq.active"),
                ("select", "id,code,name,account_type,account_nature,is_analytical,level,parent_id,dre_group,recorrencia"),
                ("order", "code.asc"),
            ],
        )
        return self._build_tree(rows)

    async def get_contas_analiticas(self, empresa_id: str) -> list[dict]:
        """Retorna apenas contas analíticas (selecionáveis na UI)."""
        return await self._get(
            "chart_of_accounts",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("status", "eq.active"),
                ("is_analytical", "eq.true"),
                ("select", "id,code,name,account_nature,dre_group,recorrencia"),
                ("order", "code.asc"),
            ],
        )

    async def get_plano_contas_flat(self, empresa_id: str) -> list[dict]:
        """Retorna lista plana de todas as contas ativas."""
        return await self._get(
            "chart_of_accounts",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("status", "eq.active"),
                ("select", "id,code,name,account_type,account_nature,is_analytical,level,parent_id,dre_group,recorrencia"),
                ("order", "code.asc"),
            ],
        )

    @staticmethod
    def _build_tree(rows: list[dict]) -> list[dict]:
        """Monta estrutura hierárquica a partir da lista plana."""
        by_id: dict[str, dict] = {}
        for row in rows:
            row["children"] = []
            by_id[row["id"]] = row

        roots: list[dict] = []
        for row in rows:
            parent = row.get("parent_id")
            if parent and parent in by_id:
                by_id[parent]["children"].append(row)
            else:
                roots.append(row)

        return roots

    # ══════════════════════════════════════════════════════
    # REGRAS DE CONCILIAÇÃO
    # ══════════════════════════════════════════════════════

    async def get_regras(self, empresa_id: str) -> list[dict]:
        """Busca regras ativas de conciliação da empresa."""
        return await self._get(
            "conciliation_rules",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("ativa", "eq.true"),
                ("select", "id,account_id,palavras_chave,confianca,acao,recorrencia"),
            ],
        )

    # ══════════════════════════════════════════════════════
    # MOTOR DE MATCHING
    # ══════════════════════════════════════════════════════

    async def run_matching(self, empresa_id: str) -> dict[str, Any]:
        """
        Executa motor de matching em todas as transações pendentes.

        1. Normalizar descrição (sem acentos, uppercase)
        2. Para cada regra, checar se QUALQUER keyword está contida (OR)
        3. Se match + acao='auto-conciliar' + confiança>=85 → concilia
        4. Se match + acao='sugerir' → marca sugestão
        5. Sem match → sem_match
        """
        import asyncio

        rules_task = self.get_regras(empresa_id)
        pending_task = self._get(
            "bank_transactions",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("status", "eq.pending"),
                ("select", "id,description,memo,amount,date,status"),
            ],
        )
        accounts_task = self._get(
            "chart_of_accounts",
            [
                ("company_id", f"eq.{empresa_id}"),
                ("status", "eq.active"),
                ("is_analytical", "eq.true"),
                ("select", "id,code,name,recorrencia"),
            ],
        )

        rules, pending_txs, accounts = await asyncio.gather(
            rules_task, pending_task, accounts_task
        )

        account_map = {a["id"]: a for a in accounts}

        results: dict[str, Any] = {
            "total_pendentes": len(pending_txs),
            "matched": 0,
            "auto_conciliados": 0,
            "sugeridos": 0,
            "sem_match": 0,
            "detalhes": [],
        }

        for tx in pending_txs:
            desc_raw = f"{tx.get('description', '')} {tx.get('memo', '')}"
            desc_norm = normalizar(desc_raw)

            match_found = False

            for rule in rules:
                keywords: list[str] = rule.get("palavras_chave", [])
                hit = any(kw in desc_norm for kw in keywords)
                if not hit:
                    continue

                match_found = True
                confianca_label = rule.get("confianca", "Baixa")
                confianca_score = CONFIANCA_MAP.get(confianca_label, 50)
                acao = rule.get("acao", "sugerir")
                account_id = rule.get("account_id")
                account_info = account_map.get(account_id, {})

                update_payload: dict[str, Any] = {
                    "sugestao_conta_id": account_id,
                    "confianca_match": confianca_score,
                    "metodo_match": "regra",
                }

                if acao == "auto-conciliar" and confianca_score >= 85:
                    update_payload["status"] = "reconciled"
                    results["auto_conciliados"] += 1
                else:
                    results["sugeridos"] += 1

                results["matched"] += 1
                results["detalhes"].append({
                    "tx_id": tx["id"],
                    "descricao": tx.get("description", ""),
                    "conta_codigo": account_info.get("code"),
                    "conta_nome": account_info.get("name"),
                    "confianca": confianca_label,
                    "confianca_score": confianca_score,
                    "acao": acao,
                    "auto_conciliado": acao == "auto-conciliar" and confianca_score >= 85,
                })

                await self._patch(
                    "bank_transactions",
                    [("id", f"eq.{tx['id']}")],
                    update_payload,
                )
                break  # Primeira regra que bate ganha

            if not match_found:
                results["sem_match"] += 1
                results["detalhes"].append({
                    "tx_id": tx["id"],
                    "descricao": tx.get("description", ""),
                    "conta_codigo": None,
                    "conta_nome": None,
                    "confianca": None,
                    "confianca_score": 0,
                    "acao": None,
                    "auto_conciliado": False,
                })

        return results

    async def match_single_transaction(
        self, empresa_id: str, tx_id: str
    ) -> dict[str, Any]:
        """Executa matching para uma única transação."""
        txs = await self._get(
            "bank_transactions",
            [
                ("id", f"eq.{tx_id}"),
                ("select", "id,description,memo,amount,date,status"),
            ],
        )
        if not txs:
            return {"error": "Transação não encontrada"}

        tx = txs[0]
        rules = await self.get_regras(empresa_id)

        desc_raw = f"{tx.get('description', '')} {tx.get('memo', '')}"
        desc_norm = normalizar(desc_raw)

        for rule in rules:
            keywords: list[str] = rule.get("palavras_chave", [])
            if any(kw in desc_norm for kw in keywords):
                confianca_label = rule.get("confianca", "Baixa")
                return {
                    "tx_id": tx["id"],
                    "descricao": tx.get("description", ""),
                    "account_id": rule.get("account_id"),
                    "confianca": confianca_label,
                    "confianca_score": CONFIANCA_MAP.get(confianca_label, 50),
                    "acao": rule.get("acao", "sugerir"),
                    "regra_id": rule.get("id"),
                }

        return {
            "tx_id": tx["id"],
            "descricao": tx.get("description", ""),
            "account_id": None,
            "confianca": None,
            "confianca_score": 0,
            "acao": None,
            "regra_id": None,
        }
