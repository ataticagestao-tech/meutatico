"""
Testes do módulo de Estoque & Compras.

Testa a lógica de negócio do EstoqueService usando mocks do httpx
para simular as chamadas ao Supabase REST API.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.estoque_service import EstoqueService


@pytest.fixture
def svc():
    """EstoqueService com config mockada."""
    with patch("app.services.estoque_service.settings") as mock_settings:
        mock_settings.SUPABASE_FINANCEIRO_URL = "https://fake.supabase.co"
        mock_settings.SUPABASE_FINANCEIRO_SERVICE_KEY = "fake-key"
        service = EstoqueService()
        yield service


class TestCriarOrdemCompra:
    @pytest.mark.asyncio
    async def test_criar_oc_valida(self, svc):
        """Criar OC com itens válidos retorna OC com número sequencial."""
        with patch.object(svc, "_get") as mock_get, patch.object(svc, "_post") as mock_post:
            # Fornecedor exists
            mock_get.side_effect = [
                [{"id": "forn-1", "company_id": "comp-1", "razao_social": "Forn Test"}],
                [],  # no existing OC for number generation
            ]
            mock_post.side_effect = [
                [{"id": "oc-1", "numero": "OC-2026-001", "status": "rascunho"}],
                [],  # itens insert
            ]

            result = await svc.criar_ordem_compra(
                company_id="comp-1",
                fornecedor_id="forn-1",
                itens=[{"produto_id": "prod-1", "quantidade": 10, "valor_unitario": 5.0}],
            )

            assert result["id"] == "oc-1"
            assert result["status"] == "rascunho"

    @pytest.mark.asyncio
    async def test_criar_oc_fornecedor_invalido(self, svc):
        """Criar OC com fornecedor inexistente lança ValueError."""
        with patch.object(svc, "_get") as mock_get:
            mock_get.return_value = []  # Fornecedor not found

            with pytest.raises(ValueError, match="FORNECEDOR_NOT_FOUND"):
                await svc.criar_ordem_compra(
                    company_id="comp-1",
                    fornecedor_id="forn-nao-existe",
                    itens=[{"produto_id": "prod-1", "quantidade": 1, "valor_unitario": 1}],
                )


class TestReceberOrdemCompra:
    @pytest.mark.asyncio
    async def test_receber_oc_atualiza_estoque(self, svc):
        """Receber OC dispara inserts que atualizam estoque via trigger."""
        with (
            patch.object(svc, "_get") as mock_get,
            patch.object(svc, "_post") as mock_post,
            patch.object(svc, "_patch") as mock_patch,
            patch.object(svc, "buscar_produto") as mock_buscar,
            patch.object(svc, "buscar_ordem_compra") as mock_buscar_oc,
        ):
            mock_buscar_oc.return_value = {
                "id": "oc-1",
                "company_id": "comp-1",
                "fornecedor_id": "forn-1",
                "status": "enviada",
            }
            # buscar_produto: before=10, after=15
            mock_buscar.side_effect = [
                {"estoque_atual": 10, "custo_medio": 1.0},  # before
                {"estoque_atual": 15, "custo_medio": 1.33},  # after
            ]
            mock_post.side_effect = [
                [{"id": "entrada-1"}],  # entradas_estoque
                [],  # entradas_estoque_itens
                [{"id": "cp-1"}],  # contas_pagar
            ]
            mock_get.side_effect = [
                [{"id": "oc-item-1", "quantidade_recebida": 0}],  # OC item lookup
                [{"quantidade": 10, "quantidade_recebida": 5}],  # OC items for status check
                [{"id": "forn-1", "razao_social": "Forn", "cpf_cnpj": "123"}],  # fornecedor
            ]
            mock_patch.return_value = [{}]

            result = await svc.receber_ordem_compra(
                oc_id="oc-1",
                company_id="comp-1",
                itens=[{"produto_id": "prod-1", "quantidade": 5, "valor_unitario": 2.0}],
            )

            assert result["itens_recebidos"] == 1
            assert result["valor_total"] == 10.0
            assert result["conta_pagar_id"] == "cp-1"
            assert result["produtos_atualizados"][0]["estoque_anterior"] == 10
            assert result["produtos_atualizados"][0]["estoque_atual"] == 15

    @pytest.mark.asyncio
    async def test_receber_oc_ja_recebida(self, svc):
        """Receber OC já totalmente recebida lança ValueError."""
        with patch.object(svc, "buscar_ordem_compra") as mock_buscar:
            mock_buscar.return_value = {
                "id": "oc-1",
                "status": "recebida",
            }

            with pytest.raises(ValueError, match="OC_JA_RECEBIDA"):
                await svc.receber_ordem_compra(
                    oc_id="oc-1",
                    company_id="comp-1",
                    itens=[{"produto_id": "p1", "quantidade": 1, "valor_unitario": 1}],
                )


class TestSaida:
    @pytest.mark.asyncio
    async def test_saida_estoque_insuficiente(self, svc):
        """Saída maior que estoque atual lança ESTOQUE_INSUFICIENTE."""
        with patch.object(svc, "buscar_produto") as mock_buscar:
            mock_buscar.return_value = {"estoque_atual": 2, "custo_medio": 5.0}

            with pytest.raises(ValueError, match="ESTOQUE_INSUFICIENTE"):
                await svc.registrar_saida({
                    "company_id": "comp-1",
                    "produto_id": "prod-1",
                    "quantidade": 5,
                    "tipo": "consumo",
                })

    @pytest.mark.asyncio
    async def test_saida_produto_inexistente(self, svc):
        """Saída de produto que não existe lança PRODUTO_NOT_FOUND."""
        with patch.object(svc, "buscar_produto") as mock_buscar:
            mock_buscar.return_value = None

            with pytest.raises(ValueError, match="PRODUTO_NOT_FOUND"):
                await svc.registrar_saida({
                    "company_id": "comp-1",
                    "produto_id": "inexistente",
                    "quantidade": 1,
                    "tipo": "consumo",
                })


class TestInventario:
    @pytest.mark.asyncio
    async def test_inventario_em_andamento_bloqueia(self, svc):
        """Iniciar inventário quando já existe um aberto lança erro."""
        with patch.object(svc, "_get") as mock_get:
            mock_get.return_value = [{"id": "inv-1", "status": "aberto"}]

            with pytest.raises(ValueError, match="INVENTARIO_EM_ANDAMENTO"):
                await svc.iniciar_inventario("comp-1")

    @pytest.mark.asyncio
    async def test_fechar_inventario_com_ajustes(self, svc):
        """Fechar inventário com ajustes gera saídas corretivas para divergências."""
        with (
            patch.object(svc, "_get") as mock_get,
            patch.object(svc, "_post") as mock_post,
            patch.object(svc, "_patch") as mock_patch,
            patch.object(svc, "buscar_produto") as mock_buscar,
        ):
            mock_get.return_value = [{"id": "inv-1", "company_id": "comp-1"}]
            mock_buscar.return_value = {"estoque_atual": 10, "custo_medio": 5.0}
            mock_post.return_value = [{}]
            mock_patch.return_value = [{}]

            result = await svc.fechar_inventario(
                inventario_id="inv-1",
                company_id="comp-1",
                itens=[{"produto_id": "prod-1", "qtd_contada": 8}],
                aplicar_ajustes=True,
            )

            assert result["divergencias"] == 1
            assert result["ajustes_aplicados"] is True
            assert result["valor_divergencia_total"] == 10.0  # 2 * 5.0


class TestProduto:
    @pytest.mark.asyncio
    async def test_criar_produto_codigo_duplicado(self, svc):
        """Criar produto com código duplicado lança PRODUTO_CODIGO_DUPLICADO."""
        with patch.object(svc, "_get") as mock_get:
            mock_get.return_value = [{"id": "prod-existing"}]

            with pytest.raises(ValueError, match="PRODUTO_CODIGO_DUPLICADO"):
                await svc.criar_produto({
                    "company_id": "comp-1",
                    "code": "MAT-001",
                    "description": "Test",
                })


class TestAlertas:
    @pytest.mark.asyncio
    async def test_processar_alertas_gera_ocs(self, svc):
        """Processar alertas gera OCs automaticamente para produtos com fornecedor."""
        with (
            patch.object(svc, "alertas_estoque_minimo") as mock_alertas,
            patch.object(svc, "_get") as mock_get,
            patch.object(svc, "criar_ordem_compra") as mock_criar_oc,
        ):
            mock_alertas.return_value = [
                {
                    "produto_id": "prod-1",
                    "descricao": "Seringa 5ml",
                    "fornecedor_id": "forn-1",
                    "quantidade_repor": 20,
                    "custo_medio": 0.45,
                },
            ]
            mock_get.return_value = []  # Sem OC aberta
            mock_criar_oc.return_value = {"id": "oc-auto-1"}

            result = await svc.processar_alertas_estoque_minimo("comp-1")

            assert result["alertas"] == 1
            assert result["ocs_geradas"] == 1
            mock_criar_oc.assert_called_once()
