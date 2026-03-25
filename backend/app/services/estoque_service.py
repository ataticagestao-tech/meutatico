"""
Estoque & Compras Service — acessa Supabase via REST API.

Gerencia suppliers, products, ordens de compra, entradas/saídas
de estoque e inventário. Os triggers do banco (trg_entrada_atualiza_estoque
e trg_saida_atualiza_estoque) mantêm products.estoque_atual automaticamente.

Mapeamento de nomes (Supabase):
  fornecedores → suppliers (company_id, cpf_cnpj, razao_social, nome_fantasia)
  produtos     → products  (company_id, code, description, tipo_produto, price)
  empresa_id   → company_id
"""

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx

from app.config import settings


class EstoqueService:
    """Gerencia estoque e compras via Supabase REST API."""

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

    # ══════════════════════════════════════════════════════
    # FORNECEDORES (table: suppliers)
    # ══════════════════════════════════════════════════════

    async def listar_fornecedores(
        self, company_id: str, search: str | None = None
    ) -> list[dict]:
        params: list[tuple[str, str]] = [
            ("company_id", f"eq.{company_id}"),
            ("is_active", "eq.true"),
            ("select", "*"),
            ("order", "razao_social.asc"),
        ]
        if search:
            params.append(("or", f"(razao_social.ilike.%{search}%,cpf_cnpj.ilike.%{search}%,nome_fantasia.ilike.%{search}%)"))
        return await self._get("suppliers", params)

    async def criar_fornecedor(self, data: dict) -> dict:
        result = await self._post("suppliers", data)
        return result[0] if result else {}

    async def atualizar_fornecedor(
        self, fornecedor_id: str, company_id: str, data: dict
    ) -> dict:
        result = await self._patch(
            "suppliers",
            [("id", f"eq.{fornecedor_id}"), ("company_id", f"eq.{company_id}")],
            data,
        )
        return result[0] if result else {}

    async def buscar_fornecedor_por_cnpj(
        self, company_id: str, cnpj: str
    ) -> dict | None:
        result = await self._get("suppliers", [
            ("company_id", f"eq.{company_id}"),
            ("cpf_cnpj", f"eq.{cnpj}"),
            ("limit", "1"),
        ])
        return result[0] if result else None

    # ══════════════════════════════════════════════════════
    # PRODUTOS (table: products)
    # ══════════════════════════════════════════════════════

    async def listar_produtos(
        self, company_id: str, search: str | None = None
    ) -> list[dict]:
        params: list[tuple[str, str]] = [
            ("company_id", f"eq.{company_id}"),
            ("is_active", "eq.true"),
            ("select", "*"),
            ("order", "code.asc"),
        ]
        if search:
            params.append(("or", f"(code.ilike.%{search}%,description.ilike.%{search}%)"))
        return await self._get("products", params)

    async def criar_produto(self, data: dict) -> dict:
        # Verificar duplicidade de código
        existing = await self._get("products", [
            ("company_id", f"eq.{data['company_id']}"),
            ("code", f"eq.{data['code']}"),
            ("limit", "1"),
        ])
        if existing:
            raise ValueError("PRODUTO_CODIGO_DUPLICADO")
        result = await self._post("products", data)
        return result[0] if result else {}

    async def atualizar_produto(
        self, produto_id: str, company_id: str, data: dict
    ) -> dict:
        result = await self._patch(
            "products",
            [("id", f"eq.{produto_id}"), ("company_id", f"eq.{company_id}")],
            data,
        )
        return result[0] if result else {}

    async def buscar_produto(self, produto_id: str) -> dict | None:
        result = await self._get("products", [
            ("id", f"eq.{produto_id}"),
            ("limit", "1"),
        ])
        return result[0] if result else None

    async def alertas_estoque_minimo(self, company_id: str) -> list[dict]:
        return await self._get("v_estoque_minimo_alerta", [
            ("company_id", f"eq.{company_id}"),
            ("select", "*"),
        ])

    # ══════════════════════════════════════════════════════
    # ORDENS DE COMPRA
    # ══════════════════════════════════════════════════════

    async def _gerar_numero_oc(self, company_id: str) -> str:
        ano = date.today().year
        existing = await self._get("ordens_compra", [
            ("company_id", f"eq.{company_id}"),
            ("numero", f"like.OC-{ano}-%"),
            ("select", "numero"),
            ("order", "numero.desc"),
            ("limit", "1"),
        ])
        if existing:
            last_num = int(existing[0]["numero"].split("-")[-1])
            return f"OC-{ano}-{last_num + 1:03d}"
        return f"OC-{ano}-001"

    async def listar_ordens_compra(
        self,
        company_id: str,
        status: str | None = None,
        fornecedor_id: str | None = None,
    ) -> list[dict]:
        params: list[tuple[str, str]] = [
            ("company_id", f"eq.{company_id}"),
            ("select", "*,suppliers(razao_social,nome_fantasia)"),
            ("order", "created_at.desc"),
        ]
        if status:
            params.append(("status", f"eq.{status}"))
        if fornecedor_id:
            params.append(("fornecedor_id", f"eq.{fornecedor_id}"))
        return await self._get("ordens_compra", params)

    async def buscar_ordem_compra(
        self, oc_id: str, company_id: str
    ) -> dict | None:
        result = await self._get("ordens_compra", [
            ("id", f"eq.{oc_id}"),
            ("company_id", f"eq.{company_id}"),
            ("select", "*,ordens_compra_itens(*,products(description,code,unidade_medida,controla_lote,controla_validade))"),
            ("limit", "1"),
        ])
        return result[0] if result else None

    async def criar_ordem_compra(
        self, company_id: str, fornecedor_id: str, itens: list[dict], **kwargs: Any
    ) -> dict:
        # Validar fornecedor pertence à empresa
        fornecedor = await self._get("suppliers", [
            ("id", f"eq.{fornecedor_id}"),
            ("company_id", f"eq.{company_id}"),
            ("limit", "1"),
        ])
        if not fornecedor:
            raise ValueError("FORNECEDOR_NOT_FOUND")

        numero = await self._gerar_numero_oc(company_id)
        valor_total = sum(
            Decimal(str(i["quantidade"])) * Decimal(str(i["valor_unitario"]))
            for i in itens
        )

        oc_data: dict[str, Any] = {
            "company_id": company_id,
            "fornecedor_id": fornecedor_id,
            "numero": numero,
            "data_emissao": date.today().isoformat(),
            "valor_total": float(valor_total),
            "status": "rascunho",
        }
        for key in ("data_prevista", "cond_pagamento", "observacoes", "gerada_por_alerta"):
            if key in kwargs and kwargs[key] is not None:
                val = kwargs[key]
                oc_data[key] = val.isoformat() if hasattr(val, "isoformat") else val

        oc_result = await self._post("ordens_compra", oc_data)
        oc = oc_result[0]

        itens_insert = [
            {
                "ordem_compra_id": oc["id"],
                "produto_id": i["produto_id"],
                "quantidade": float(i["quantidade"]),
                "valor_unitario": float(i["valor_unitario"]),
                "quantidade_recebida": 0,
            }
            for i in itens
        ]
        await self._post("ordens_compra_itens", itens_insert)

        return oc

    async def atualizar_ordem_compra(
        self, oc_id: str, company_id: str, data: dict
    ) -> dict:
        oc = await self.buscar_ordem_compra(oc_id, company_id)
        if not oc:
            raise ValueError("OC_NOT_FOUND")
        if oc["status"] != "rascunho":
            raise ValueError("OC_NAO_EDITAVEL")

        result = await self._patch(
            "ordens_compra",
            [("id", f"eq.{oc_id}"), ("company_id", f"eq.{company_id}")],
            data,
        )
        return result[0] if result else {}

    async def cancelar_ordem_compra(self, oc_id: str, company_id: str) -> dict:
        oc = await self.buscar_ordem_compra(oc_id, company_id)
        if not oc:
            raise ValueError("OC_NOT_FOUND")
        if oc["status"] == "recebida":
            raise ValueError("OC_JA_RECEBIDA")
        if oc["status"] == "cancelada":
            raise ValueError("OC_CANCELADA")

        result = await self._patch(
            "ordens_compra",
            [("id", f"eq.{oc_id}"), ("company_id", f"eq.{company_id}")],
            {"status": "cancelada"},
        )
        return result[0] if result else {}

    async def receber_ordem_compra(
        self,
        oc_id: str,
        company_id: str,
        itens: list[dict],
        numero_nf: str | None = None,
        chave_nf: str | None = None,
        gerar_conta_pagar: bool = True,
        data_vencimento_cp: str | None = None,
    ) -> dict:
        """
        Fluxo ATÔMICO de recebimento:
        1. Validar OC
        2. INSERT entradas_estoque
        3. INSERT entradas_estoque_itens (trigger atualiza estoque_atual e custo_medio)
        4. UPDATE ordens_compra_itens.quantidade_recebida
        5. UPDATE ordens_compra.status
        6. Opcional: INSERT contas_pagar
        """
        oc = await self.buscar_ordem_compra(oc_id, company_id)
        if not oc:
            raise ValueError("OC_NOT_FOUND")
        if oc["status"] == "recebida":
            raise ValueError("OC_JA_RECEBIDA")
        if oc["status"] == "cancelada":
            raise ValueError("OC_CANCELADA")

        valor_total = sum(
            Decimal(str(i["quantidade"])) * Decimal(str(i["valor_unitario"]))
            for i in itens
        )

        # Snapshot do estoque antes
        estoque_antes: dict[str, float] = {}
        for item in itens:
            produto = await self.buscar_produto(item["produto_id"])
            estoque_antes[item["produto_id"]] = float(produto["estoque_atual"]) if produto else 0

        # INSERT entradas_estoque
        entrada_result = await self._post("entradas_estoque", {
            "company_id": company_id,
            "fornecedor_id": oc["fornecedor_id"],
            "ordem_compra_id": oc_id,
            "data_entrada": date.today().isoformat(),
            "numero_nf": numero_nf,
            "chave_nf": chave_nf,
            "valor_total": float(valor_total),
        })
        entrada = entrada_result[0]

        # INSERT entradas_estoque_itens (trigger atualiza produto)
        itens_insert = [
            {
                "entrada_id": entrada["id"],
                "produto_id": i["produto_id"],
                "quantidade": float(i["quantidade"]),
                "valor_unitario": float(i["valor_unitario"]),
                "lote": i.get("lote"),
                "data_validade": i.get("data_validade"),
            }
            for i in itens
        ]
        await self._post("entradas_estoque_itens", itens_insert)

        # UPDATE quantidades recebidas nos itens da OC
        for item in itens:
            oc_itens = await self._get("ordens_compra_itens", [
                ("ordem_compra_id", f"eq.{oc_id}"),
                ("produto_id", f"eq.{item['produto_id']}"),
                ("limit", "1"),
            ])
            if oc_itens:
                nova_qtd = float(oc_itens[0].get("quantidade_recebida", 0)) + float(item["quantidade"])
                await self._patch(
                    "ordens_compra_itens",
                    [("id", f"eq.{oc_itens[0]['id']}")],
                    {"quantidade_recebida": nova_qtd},
                )

        # Verificar se OC foi totalmente recebida
        oc_itens_all = await self._get("ordens_compra_itens", [
            ("ordem_compra_id", f"eq.{oc_id}"),
            ("select", "quantidade,quantidade_recebida"),
        ])
        totalmente_recebida = all(
            float(i.get("quantidade_recebida", 0)) >= float(i["quantidade"])
            for i in oc_itens_all
        )
        parcialmente = any(
            float(i.get("quantidade_recebida", 0)) > 0
            for i in oc_itens_all
        )
        novo_status = "recebida" if totalmente_recebida else ("parcial" if parcialmente else oc["status"])

        await self._patch(
            "ordens_compra",
            [("id", f"eq.{oc_id}")],
            {"status": novo_status},
        )

        # Gerar conta a pagar
        cp_id = None
        if gerar_conta_pagar:
            fornecedor = await self._get("suppliers", [
                ("id", f"eq.{oc['fornecedor_id']}"),
                ("limit", "1"),
            ])
            if fornecedor:
                f = fornecedor[0]
                cp_result = await self._post("contas_pagar", {
                    "company_id": company_id,
                    "ordem_compra_id": oc_id,
                    "credor_nome": f["razao_social"],
                    "credor_cpf_cnpj": f["cpf_cnpj"],
                    "valor": float(valor_total),
                    "data_vencimento": data_vencimento_cp or date.today().isoformat(),
                    "status": "aberto",
                })
                if cp_result:
                    cp_id = cp_result[0]["id"]
                    await self._patch(
                        "entradas_estoque",
                        [("id", f"eq.{entrada['id']}")],
                        {"conta_pagar_id": cp_id},
                    )

        # Snapshot do estoque depois
        produtos_atualizados = []
        for pid, est_antes in estoque_antes.items():
            produto = await self.buscar_produto(pid)
            produtos_atualizados.append({
                "produto_id": pid,
                "estoque_anterior": est_antes,
                "estoque_atual": float(produto["estoque_atual"]) if produto else est_antes,
            })

        return {
            "entrada_id": entrada["id"],
            "ordem_compra_id": oc_id,
            "itens_recebidos": len(itens),
            "valor_total": float(valor_total),
            "conta_pagar_id": cp_id,
            "produtos_atualizados": produtos_atualizados,
        }

    # ══════════════════════════════════════════════════════
    # ENTRADAS E SAÍDAS
    # ══════════════════════════════════════════════════════

    async def listar_entradas(self, company_id: str) -> list[dict]:
        return await self._get("entradas_estoque", [
            ("company_id", f"eq.{company_id}"),
            ("select", "*,suppliers(razao_social)"),
            ("order", "data_entrada.desc"),
        ])

    async def registrar_saida(self, data: dict) -> dict:
        # Verificar estoque disponível
        produto = await self.buscar_produto(data["produto_id"])
        if not produto:
            raise ValueError("PRODUTO_NOT_FOUND")

        estoque_atual = Decimal(str(produto["estoque_atual"]))
        quantidade = Decimal(str(data["quantidade"]))
        if quantidade > estoque_atual:
            raise ValueError("ESTOQUE_INSUFICIENTE")

        saida_data = {
            "company_id": data["company_id"],
            "produto_id": data["produto_id"],
            "quantidade": float(quantidade),
            "valor_unitario": float(produto.get("custo_medio", 0)),
            "tipo": data["tipo"],
            "motivo": data.get("motivo"),
            "lote": data.get("lote"),
            "centro_custo_id": data.get("centro_custo_id"),
        }
        result = await self._post("saidas_estoque", saida_data)
        return result[0] if result else {}

    async def movimentacoes_produto(self, produto_id: str) -> dict:
        """Retorna entradas e saídas de um produto."""
        import asyncio
        entradas_task = self._get("entradas_estoque_itens", [
            ("produto_id", f"eq.{produto_id}"),
            ("select", "*,entradas_estoque(data_entrada,numero_nf,suppliers(razao_social))"),
            ("order", "created_at.desc"),
        ])
        saidas_task = self._get("saidas_estoque", [
            ("produto_id", f"eq.{produto_id}"),
            ("select", "*"),
            ("order", "created_at.desc"),
        ])
        entradas, saidas = await asyncio.gather(entradas_task, saidas_task)
        return {"entradas": entradas, "saidas": saidas}

    # ══════════════════════════════════════════════════════
    # INVENTÁRIO
    # ══════════════════════════════════════════════════════

    async def listar_inventarios(self, company_id: str) -> list[dict]:
        return await self._get("inventario", [
            ("company_id", f"eq.{company_id}"),
            ("select", "*"),
            ("order", "created_at.desc"),
        ])

    async def iniciar_inventario(self, company_id: str, descricao: str | None = None) -> dict:
        # Verificar se já existe inventário aberto
        em_andamento = await self._get("inventario", [
            ("company_id", f"eq.{company_id}"),
            ("status", "eq.aberto"),
            ("limit", "1"),
        ])
        if em_andamento:
            raise ValueError("INVENTARIO_EM_ANDAMENTO")

        result = await self._post("inventario", {
            "company_id": company_id,
            "data_inicio": date.today().isoformat(),
            "descricao": descricao,
            "status": "aberto",
        })
        return result[0] if result else {}

    async def fechar_inventario(
        self,
        inventario_id: str,
        company_id: str,
        itens: list[dict],
        aplicar_ajustes: bool = False,
    ) -> dict:
        inventario = await self._get("inventario", [
            ("id", f"eq.{inventario_id}"),
            ("company_id", f"eq.{company_id}"),
            ("limit", "1"),
        ])
        if not inventario:
            raise ValueError("INVENTARIO_NOT_FOUND")

        itens_insert = []
        divergencias = []

        for item in itens:
            produto = await self.buscar_produto(item["produto_id"])
            if not produto:
                continue

            qtd_sistema = float(produto["estoque_atual"])
            qtd_contada = float(item["qtd_contada"])
            custo_medio = float(produto.get("custo_medio", 0))

            item_data = {
                "inventario_id": inventario_id,
                "produto_id": item["produto_id"],
                "qtd_sistema": qtd_sistema,
                "qtd_contada": qtd_contada,
                "valor_unitario": custo_medio,
                "ajuste_aprovado": aplicar_ajustes,
                "ajuste_aplicado": False,
            }
            itens_insert.append(item_data)

            if abs(qtd_contada - qtd_sistema) > 0.001:
                divergencias.append(item_data)

        if itens_insert:
            await self._post("inventario_itens", itens_insert)

        valor_div = sum(
            abs(i["qtd_contada"] - i["qtd_sistema"]) * i["valor_unitario"]
            for i in divergencias
        )

        # Aplicar ajustes corretivos
        if aplicar_ajustes and divergencias:
            for item in divergencias:
                diff = Decimal(str(item["qtd_contada"])) - Decimal(str(item["qtd_sistema"]))
                if diff > 0:
                    # Sobra → entrada corretiva
                    entrada_result = await self._post("entradas_estoque", {
                        "company_id": company_id,
                        "data_entrada": date.today().isoformat(),
                        "valor_total": float(abs(diff) * Decimal(str(item["valor_unitario"]))),
                    })
                    if entrada_result:
                        await self._post("entradas_estoque_itens", {
                            "entrada_id": entrada_result[0]["id"],
                            "produto_id": item["produto_id"],
                            "quantidade": float(abs(diff)),
                            "valor_unitario": item["valor_unitario"],
                        })
                elif diff < 0:
                    # Falta → saída corretiva (trigger valida estoque)
                    await self._post("saidas_estoque", {
                        "company_id": company_id,
                        "produto_id": item["produto_id"],
                        "quantidade": float(abs(diff)),
                        "valor_unitario": item["valor_unitario"],
                        "tipo": "ajuste",
                        "motivo": f"Ajuste de inventário {inventario_id}",
                    })

            # Marcar ajustes como aplicados
            await self._patch(
                "inventario_itens",
                [("inventario_id", f"eq.{inventario_id}")],
                {"ajuste_aplicado": True},
            )

        # Fechar inventário
        await self._patch(
            "inventario",
            [("id", f"eq.{inventario_id}")],
            {"status": "concluido"},
        )

        return {
            "inventario_id": inventario_id,
            "total_itens": len(itens_insert),
            "divergencias": len(divergencias),
            "valor_divergencia_total": round(valor_div, 2),
            "ajustes_aplicados": aplicar_ajustes,
        }

    # ══════════════════════════════════════════════════════
    # ALERTAS E JOBS
    # ══════════════════════════════════════════════════════

    async def processar_alertas_estoque_minimo(self, company_id: str) -> dict:
        alertas = await self.alertas_estoque_minimo(company_id)

        ocs_geradas = []
        for alerta in alertas:
            fornecedor_id = alerta.get("fornecedor_id")
            if not fornecedor_id:
                continue

            # Verificar se já existe OC aberta para este produto
            oc_aberta = await self._get("ordens_compra_itens", [
                ("produto_id", f"eq.{alerta['produto_id']}"),
                ("select", "ordem_compra_id,ordens_compra(status)"),
            ])
            has_open = any(
                i.get("ordens_compra", {}).get("status") in ("rascunho", "enviada", "parcial")
                for i in oc_aberta
            )
            if has_open:
                continue

            try:
                oc = await self.criar_ordem_compra(
                    company_id=company_id,
                    fornecedor_id=fornecedor_id,
                    itens=[{
                        "produto_id": alerta["produto_id"],
                        "quantidade": float(alerta.get("quantidade_repor", 1)),
                        "valor_unitario": float(alerta.get("custo_medio", 0)),
                    }],
                    gerada_por_alerta=True,
                )
                ocs_geradas.append(oc["id"])
            except Exception:
                pass

        return {
            "alertas": len(alertas),
            "ocs_geradas": len(ocs_geradas),
            "produtos": [a.get("descricao", "") for a in alertas],
        }
