"""
Multi-empresa Service — acessa Supabase via REST API.

Gerencia grupos empresariais, transferências intercompany,
consolidado financeiro e relatórios comparativos.

Tabelas Supabase:
  grupos_empresariais   (owner_id, nome, descricao, ativo)
  grupos_empresas       (grupo_id, company_id, papel, percentual_participacao)
  transferencias_intercompany  (owner_id, company_origem_id, company_destino_id, valor, ...)
  consolidado_cache     (grupo_id, competencia, receita_bruta, ...)
  relatorios_comparativos  (owner_id, nome, tipo, empresas_ids, ...)
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx

from app.config import settings


class MultiempresaService:
    """Gerencia multi-empresa via Supabase REST API."""

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

    async def _post(self, table: str, payload: dict | list[dict]) -> list[dict]:
        if not self.is_configured:
            return []
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                headers=self._headers({"Prefer": "return=representation"}),
                json=payload,
            )
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

    async def _delete(
        self, table: str, params: list[tuple[str, str]]
    ) -> None:
        if not self.is_configured:
            return
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(url, headers=self._headers(), params=params)
            resp.raise_for_status()

    async def _rpc(self, function_name: str, payload: dict) -> Any:
        if not self.is_configured:
            return None
        url = f"{self.base_url}/rest/v1/rpc/{function_name}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url, headers=self._headers(), json=payload
            )
            resp.raise_for_status()
            return resp.json()

    # ══════════════════════════════════════════════════════
    # GRUPOS EMPRESARIAIS
    # ══════════════════════════════════════════════════════

    async def listar_grupos(self, owner_id: str) -> list[dict]:
        params = [
            ("owner_id", f"eq.{owner_id}"),
            ("order", "nome.asc"),
        ]
        return await self._get("grupos_empresariais", params)

    async def obter_grupo(self, grupo_id: str) -> dict | None:
        params = [("id", f"eq.{grupo_id}")]
        rows = await self._get("grupos_empresariais", params)
        return rows[0] if rows else None

    async def criar_grupo(self, owner_id: str, nome: str, descricao: str | None, ativo: bool) -> dict:
        payload = {
            "owner_id": owner_id,
            "nome": nome,
            "descricao": descricao,
            "ativo": ativo,
        }
        rows = await self._post("grupos_empresariais", payload)
        return rows[0] if rows else {}

    async def atualizar_grupo(self, grupo_id: str, updates: dict) -> dict:
        clean = {k: v for k, v in updates.items() if v is not None}
        if not clean:
            grupo = await self.obter_grupo(grupo_id)
            return grupo or {}
        rows = await self._patch(
            "grupos_empresariais",
            [("id", f"eq.{grupo_id}")],
            clean,
        )
        return rows[0] if rows else {}

    async def deletar_grupo(self, grupo_id: str) -> None:
        await self._delete("grupos_empresariais", [("id", f"eq.{grupo_id}")])

    # ── Vínculos (grupos_empresas) ────────────────────────

    async def listar_empresas_grupo(self, grupo_id: str) -> list[dict]:
        params = [
            ("grupo_id", f"eq.{grupo_id}"),
            ("select", "*,companies(id,name,cnpj)"),
        ]
        return await self._get("grupos_empresas", params)

    async def vincular_empresa(
        self, grupo_id: str, company_id: str, papel: str, percentual: Decimal | None
    ) -> dict:
        payload: dict[str, Any] = {
            "grupo_id": grupo_id,
            "company_id": company_id,
            "papel": papel,
        }
        if percentual is not None:
            payload["percentual_participacao"] = float(percentual)
        rows = await self._post("grupos_empresas", payload)
        return rows[0] if rows else {}

    async def atualizar_vinculo(self, vinculo_id: str, updates: dict) -> dict:
        clean = {k: v for k, v in updates.items() if v is not None}
        if "percentual_participacao" in clean and clean["percentual_participacao"] is not None:
            clean["percentual_participacao"] = float(clean["percentual_participacao"])
        if not clean:
            return {}
        rows = await self._patch(
            "grupos_empresas",
            [("id", f"eq.{vinculo_id}")],
            clean,
        )
        return rows[0] if rows else {}

    async def desvincular_empresa(self, vinculo_id: str) -> None:
        await self._delete("grupos_empresas", [("id", f"eq.{vinculo_id}")])

    # ══════════════════════════════════════════════════════
    # TRANSFERÊNCIAS INTERCOMPANY
    # ══════════════════════════════════════════════════════

    async def listar_transferencias(
        self,
        owner_id: str,
        company_id: str | None = None,
        status: str | None = None,
        data_inicio: str | None = None,
        data_fim: str | None = None,
    ) -> list[dict]:
        params: list[tuple[str, str]] = [
            ("owner_id", f"eq.{owner_id}"),
            ("order", "data.desc"),
        ]
        if company_id:
            params.append(("or", f"(company_origem_id.eq.{company_id},company_destino_id.eq.{company_id})"))
        if status:
            params.append(("status", f"eq.{status}"))
        if data_inicio:
            params.append(("data", f"gte.{data_inicio}"))
        if data_fim:
            params.append(("data", f"lte.{data_fim}"))
        return await self._get("transferencias_intercompany", params)

    async def obter_transferencia(self, transferencia_id: str) -> dict | None:
        params = [("id", f"eq.{transferencia_id}")]
        rows = await self._get("transferencias_intercompany", params)
        return rows[0] if rows else None

    async def criar_transferencia(self, owner_id: str, data: dict) -> dict:
        payload: dict[str, Any] = {
            "owner_id": owner_id,
            "company_origem_id": str(data["company_origem_id"]),
            "company_destino_id": str(data["company_destino_id"]),
            "valor": float(data["valor"]),
            "data": str(data["data"]),
            "natureza": data["natureza"],
            "descricao": data.get("descricao"),
            "documento_url": data.get("documento_url"),
            "gera_juros": data.get("gera_juros", False),
            "status": "pendente",
        }
        if data.get("taxa_juros_mensal") is not None:
            payload["taxa_juros_mensal"] = float(data["taxa_juros_mensal"])
        if data.get("conta_bancaria_orig"):
            payload["conta_bancaria_orig"] = str(data["conta_bancaria_orig"])
        if data.get("conta_bancaria_dest"):
            payload["conta_bancaria_dest"] = str(data["conta_bancaria_dest"])
        rows = await self._post("transferencias_intercompany", payload)
        return rows[0] if rows else {}

    async def atualizar_transferencia(self, transferencia_id: str, updates: dict) -> dict:
        clean = {k: v for k, v in updates.items() if v is not None}
        if "taxa_juros_mensal" in clean:
            clean["taxa_juros_mensal"] = float(clean["taxa_juros_mensal"])
        if not clean:
            t = await self.obter_transferencia(transferencia_id)
            return t or {}
        rows = await self._patch(
            "transferencias_intercompany",
            [("id", f"eq.{transferencia_id}")],
            clean,
        )
        return rows[0] if rows else {}

    async def aprovar_transferencia(
        self, transferencia_id: str, aprovado_por: str, novo_status: str
    ) -> dict:
        payload: dict[str, Any] = {
            "status": novo_status,
            "aprovado_por": aprovado_por,
        }
        if novo_status == "aprovada":
            payload["aprovado_em"] = datetime.utcnow().isoformat()
        rows = await self._patch(
            "transferencias_intercompany",
            [("id", f"eq.{transferencia_id}")],
            payload,
        )
        return rows[0] if rows else {}

    async def concluir_transferencia(self, transferencia_id: str) -> dict:
        rows = await self._patch(
            "transferencias_intercompany",
            [("id", f"eq.{transferencia_id}")],
            {"status": "concluida", "eliminado_consolidado": True},
        )
        return rows[0] if rows else {}

    # ══════════════════════════════════════════════════════
    # CONSOLIDADO
    # ══════════════════════════════════════════════════════

    async def calcular_consolidado(self, grupo_id: str, competencia: str) -> Any:
        return await self._rpc("calcular_consolidado_grupo", {
            "p_grupo_id": grupo_id,
            "p_competencia": competencia,
        })

    async def obter_consolidado(self, grupo_id: str, competencia: str | None = None) -> list[dict]:
        params: list[tuple[str, str]] = [
            ("grupo_id", f"eq.{grupo_id}"),
            ("order", "competencia.desc"),
        ]
        if competencia:
            params.append(("competencia", f"eq.{competencia}"))
        return await self._get("consolidado_cache", params)

    async def obter_consolidado_atual(self, owner_id: str) -> list[dict]:
        params = [("owner_id", f"eq.{owner_id}")]
        return await self._get("v_consolidado_atual", params)

    # ══════════════════════════════════════════════════════
    # RELATÓRIOS COMPARATIVOS
    # ══════════════════════════════════════════════════════

    async def listar_relatorios(self, owner_id: str) -> list[dict]:
        params = [
            ("owner_id", f"eq.{owner_id}"),
            ("order", "created_at.desc"),
        ]
        return await self._get("relatorios_comparativos", params)

    async def criar_relatorio(self, owner_id: str, data: dict) -> dict:
        payload = {
            "owner_id": owner_id,
            "nome": data["nome"],
            "tipo": data["tipo"],
            "empresas_ids": [str(eid) for eid in data["empresas_ids"]],
            "competencia_inicio": data["competencia_inicio"],
            "competencia_fim": data["competencia_fim"],
            "indicador": data.get("indicador"),
            "gerado_por": owner_id,
            "gerado_em": datetime.utcnow().isoformat(),
        }
        rows = await self._post("relatorios_comparativos", payload)
        return rows[0] if rows else {}

    async def deletar_relatorio(self, relatorio_id: str) -> None:
        await self._delete("relatorios_comparativos", [("id", f"eq.{relatorio_id}")])
