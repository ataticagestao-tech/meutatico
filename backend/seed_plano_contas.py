"""
Seed: Plano de Contas + Regras de Conciliação para uma empresa.

Usa o schema EXISTENTE do chart_of_accounts:
  id, company_id, code, name, account_type, account_nature,
  is_analytical, is_synthetic, level, parent_id, dre_group,
  dre_order, show_in_dre, recorrencia, status

Uso:
  python seed_plano_contas.py <empresa_id>
  python seed_plano_contas.py   (usa HAIR OF BRASIL por padrão)

Requer variáveis de ambiente no .env:
  SUPABASE_FINANCEIRO_URL
  SUPABASE_FINANCEIRO_SERVICE_KEY
"""

import asyncio
import sys
import unicodedata
from pathlib import Path

import httpx

# ── Config ──────────────────────────────────────────

SUPABASE_URL = ""
SUPABASE_KEY = ""

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k == "SUPABASE_FINANCEIRO_URL":
                SUPABASE_URL = v
            elif k == "SUPABASE_FINANCEIRO_SERVICE_KEY":
                SUPABASE_KEY = v

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Hair of Brasil LTDA
DEFAULT_EMPRESA_ID = "6d41eb71-e593-4ff2-8e3b-e36089a2aca7"


def normalizar(texto: str) -> str:
    """Remove acentos e converte para uppercase."""
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().upper()


# ══════════════════════════════════════════════════════
# MAPEAMENTO: nivel -> level (int), tipo -> is_analytical, account_type
# ══════════════════════════════════════════════════════

NIVEL_MAP = {"grupo": 1, "subgrupo": 2, "analitica": 3}

def _account_type(codigo: str) -> str:
    """Mapeia código do grupo -> account_type enum."""
    if codigo.startswith("1"):
        return "revenue"
    if codigo.startswith("2"):
        return "revenue"  # Deduções = revenue com natureza debit
    if codigo.startswith("3"):
        return "cost"
    if codigo.startswith("4"):
        return "expense"
    if codigo.startswith("5"):
        return "equity"
    if codigo.startswith("6"):
        return "asset"  # Movimentações patrimoniais
    return "expense"

def _account_nature(natureza: str) -> str:
    if "Crédito" in natureza and "Débito" in natureza:
        return "credit"  # Crédito/Débito -> default credit
    if "Crédito" in natureza:
        return "credit"
    return "debit"


# ══════════════════════════════════════════════════════
# PLANO DE CONTAS — Dados completos (formato user prompt)
# ══════════════════════════════════════════════════════

PLANO_DE_CONTAS_RAW = [
    # GRUPO 1 — RECEITAS
    {"codigo": "1",      "nome": "RECEITAS",                                  "tipo": "Grupo",     "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "1.1",    "nome": "Receita Bruta de Serviços",                 "tipo": "Grupo",     "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "1"},
    {"codigo": "1.1.01", "nome": "Consultas Médicas",                         "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.1"},
    {"codigo": "1.1.02", "nome": "Transplante Capilar — Sinal",               "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.1"},
    {"codigo": "1.1.03", "nome": "Transplante Capilar — Parcela/Restante",    "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.1"},
    {"codigo": "1.1.04", "nome": "Protocolo MMP — Pacote 3 Sessões",          "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.1"},
    {"codigo": "1.1.05", "nome": "Protocolo MMP — Sessão Avulsa",             "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.1"},
    {"codigo": "1.2",    "nome": "Receita Bruta de Produtos",                 "tipo": "Grupo",     "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "1"},
    {"codigo": "1.2.01", "nome": "Minoxidil e Derivados",                     "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.2"},
    {"codigo": "1.2.02", "nome": "Dutasterida / Finasterida",                 "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.2"},
    {"codigo": "1.2.03", "nome": "Suplementos Vitamínicos",                   "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.2"},
    {"codigo": "1.2.04", "nome": "Shampoos e Cosméticos",                     "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.2"},
    {"codigo": "1.2.05", "nome": "Kits de Produtos / Pós-operatório",         "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Receita Bruta",       "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.2"},
    {"codigo": "1.3",    "nome": "Outras Receitas",                            "tipo": "Grupo",     "natureza": "Crédito",         "grupo_dre": "Outras Receitas",     "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "1"},
    {"codigo": "1.3.01", "nome": "Crédito de Maquininha / Recebimentos Stone", "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Outras Receitas",     "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "1.3"},
    {"codigo": "1.3.02", "nome": "Outras Receitas Diversas",                  "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Outras Receitas",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "1.3"},
    # GRUPO 2 — DEDUÇÕES DA RECEITA
    {"codigo": "2",      "nome": "DEDUÇÕES DA RECEITA",                       "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "2.1",    "nome": "Impostos e Taxas",                          "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "2"},
    {"codigo": "2.1.01", "nome": "DARF / Imposto Trimestral IR",              "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": "Trimestral",  "nivel": "analitica","codigo_pai": "2.1"},
    {"codigo": "2.1.02", "nome": "DAM / ISS Municipal",                       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "2.1"},
    {"codigo": "2.1.03", "nome": "PIS",                                       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "2.1"},
    {"codigo": "2.1.04", "nome": "IPTU",                                      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Deduções",            "recorrencia": "Mensal/Anual","nivel": "analitica","codigo_pai": "2.1"},
    # GRUPO 3 — CSP
    {"codigo": "3",      "nome": "CUSTOS DOS SERVIÇOS PRESTADOS (CSP)",       "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "3.1",    "nome": "Custos Diretos",                            "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "3"},
    {"codigo": "3.1.01", "nome": "Compra de Serviços Médicos / Cirúrgicos",   "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "3.1"},
    {"codigo": "3.1.02", "nome": "Equipe Cirúrgica",                          "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "3.1"},
    {"codigo": "3.1.03", "nome": "Compra de Mercadorias para Revenda",        "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "3.1"},
    {"codigo": "3.1.04", "nome": "Comissões Comerciais",                      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "3.1"},
    {"codigo": "3.1.05", "nome": "Frete / SEDEX",                             "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "CSP",                 "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "3.1"},
    # GRUPO 4 — DESPESAS OPERACIONAIS
    {"codigo": "4",      "nome": "DESPESAS OPERACIONAIS",                     "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Despesas Operacionais","recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "4.1",    "nome": "Despesas com Pessoal",                      "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Despesas Operacionais","recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "4"},
    {"codigo": "4.1.01", "nome": "Salários e Ordenados",                      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.02", "nome": "Adiantamento Salarial",                     "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Quinzenal",   "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.03", "nome": "Rescisão / Verbas Rescisórias",             "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.04", "nome": "INSS Patronal",                             "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.05", "nome": "Vale Transporte",                           "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.06", "nome": "Plano de Saúde / Assistência Médica",       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.07", "nome": "Honorários — Contabilidade",                "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.08", "nome": "Honorários — Consultoria / BPO (Tática)",   "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.1.09", "nome": "Honorários — Outros Profissionais",         "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Pessoal",       "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.1"},
    {"codigo": "4.2",    "nome": "Despesas Administrativas",                  "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Despesas Operacionais","recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "4"},
    {"codigo": "4.2.01", "nome": "Aluguel e Condomínio",                      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.02", "nome": "Energia Elétrica",                          "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.03", "nome": "Telefone e Internet — Empresa",             "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.04", "nome": "Telefone — Uso Pessoal / Outros",           "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.05", "nome": "Softwares e Assinaturas SaaS",              "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.06", "nome": "Marketing e Publicidade",                   "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Variável",   "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.07", "nome": "Material de Escritório / Papelaria",        "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Variável",   "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.08", "nome": "Material de Limpeza e Higiene",             "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Variável",   "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.09", "nome": "Uniformes e EPIs",                          "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Esporádico", "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.10", "nome": "Resíduos e Descarte (Pró Ambiental)",       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Mensal",     "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.11", "nome": "Reembolsos a Funcionários",                 "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Esporádico", "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.2.12", "nome": "Hospital / Procedimentos Externos",         "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Administrativas","recorrencia": "Esporádico", "nivel": "analitica","codigo_pai": "4.2"},
    {"codigo": "4.3",    "nome": "Despesas Variáveis / Manutenção",           "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Despesas Operacionais","recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "4"},
    {"codigo": "4.3.01", "nome": "Manutenção e Reparos",                      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Variáveis",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.3"},
    {"codigo": "4.3.02", "nome": "Equipamentos e Utensílios",                 "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Variáveis",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.3"},
    {"codigo": "4.3.03", "nome": "Higienização e Limpeza Especializada",      "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Variáveis",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.3"},
    {"codigo": "4.3.04", "nome": "Embalagens e Materiais de Expedição",       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Variáveis",     "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "4.3"},
    {"codigo": "4.4",    "nome": "Despesas Financeiras",                      "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Despesas Financeiras", "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "4"},
    {"codigo": "4.4.01", "nome": "Juros sobre Empréstimos",                   "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Financeiras",   "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.4"},
    {"codigo": "4.4.02", "nome": "Tarifas Bancárias",                         "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Financeiras",   "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.4"},
    {"codigo": "4.4.03", "nome": "Parcela de Empréstimo (Principal)",          "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Financeiras",   "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.4"},
    {"codigo": "4.4.04", "nome": "IOF e Outros Encargos",                     "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Financeiras",   "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.4"},
    {"codigo": "4.4.05", "nome": "Taxas de Maquininha / Antecipação",         "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Desp. Financeiras",   "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "4.4"},
    {"codigo": "4.5",    "nome": "Outras Despesas",                           "tipo": "Grupo",     "natureza": "Débito",          "grupo_dre": "Outras Despesas",     "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "4"},
    {"codigo": "4.5.01", "nome": "Despesas Médicas / Hospitalares (Não CSP)", "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Outras Despesas",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.5"},
    {"codigo": "4.5.02", "nome": "Despesas Diversas Não Classificadas",       "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Outras Despesas",     "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "4.5"},
    # GRUPO 5 — RESULTADO / DISTRIBUIÇÃO
    {"codigo": "5",      "nome": "RESULTADO / DISTRIBUIÇÃO",                  "tipo": "Grupo",     "natureza": "Crédito/Débito",  "grupo_dre": "Resultado",           "recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "5.1",    "nome": "Distribuição de Lucros",                    "tipo": "Grupo",     "natureza": "Crédito/Débito",  "grupo_dre": "Resultado",           "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "5"},
    {"codigo": "5.1.01", "nome": "Antecipação de Lucros / Retirada do Sócio", "tipo": "Analítica", "natureza": "Débito",          "grupo_dre": "Resultado",           "recorrencia": "Mensal",      "nivel": "analitica","codigo_pai": "5.1"},
    {"codigo": "5.1.02", "nome": "Reserva de Lucros",                         "tipo": "Analítica", "natureza": "Crédito",         "grupo_dre": "Resultado",           "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "5.1"},
    # GRUPO 6 — MOVIMENTAÇÕES PATRIMONIAIS (não entra no DRE)
    {"codigo": "6",      "nome": "MOVIMENTAÇÕES PATRIMONIAIS",               "tipo": "Grupo",     "natureza": "Crédito/Débito",  "grupo_dre": "Não DRE",             "recorrencia": None,          "nivel": "grupo",    "codigo_pai": None},
    {"codigo": "6.1",    "nome": "Transferências entre Contas",              "tipo": "Grupo",     "natureza": "Crédito/Débito",  "grupo_dre": "Não DRE",             "recorrencia": None,          "nivel": "subgrupo", "codigo_pai": "6"},
    {"codigo": "6.1.01", "nome": "Transferência entre Contas Bancárias",     "tipo": "Analítica", "natureza": "Crédito/Débito",  "grupo_dre": "Não DRE",             "recorrencia": "Variável",    "nivel": "analitica","codigo_pai": "6.1"},
    {"codigo": "6.1.02", "nome": "Aplicação / Resgate de Investimentos",     "tipo": "Analítica", "natureza": "Crédito/Débito",  "grupo_dre": "Não DRE",             "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "6.1"},
    {"codigo": "6.1.03", "nome": "Empréstimo entre Empresas / Sócios",       "tipo": "Analítica", "natureza": "Crédito/Débito",  "grupo_dre": "Não DRE",             "recorrencia": "Esporádico",  "nivel": "analitica","codigo_pai": "6.1"},
]


# ══════════════════════════════════════════════════════
# REGRAS DE CONCILIAÇÃO
# ══════════════════════════════════════════════════════

REGRAS_CONCILIACAO = [
    {"codigo_conta": "1.1.01", "palavras_chave": ["CONSULTA", "ATENDIMENTO", "AVALIACAO"],                       "confianca": "Alta",  "recorrencia": "Variável",    "acao": "sugerir"},
    {"codigo_conta": "1.1.02", "palavras_chave": ["SINAL", "ENTRADA TRANSPLANTE", "RESERVA CIRURGIA"],           "confianca": "Alta",  "recorrencia": "Variável",    "acao": "sugerir"},
    {"codigo_conta": "1.1.03", "palavras_chave": ["RESTANTE", "PARCELA TRANSPLANTE", "CIRURGIA"],                "confianca": "Alta",  "recorrencia": "Variável",    "acao": "sugerir"},
    {"codigo_conta": "1.3.01", "palavras_chave": ["CRED DOM", "STONE", "ARRANJO CREDITO"],                       "confianca": "Alta",  "recorrencia": "Variável",    "acao": "auto-conciliar"},
    {"codigo_conta": "2.1.01", "palavras_chave": ["DARF", "IMPOSTO TRIMESTRAL"],                                 "confianca": "Alta",  "recorrencia": "Trimestral",  "acao": "auto-conciliar"},
    {"codigo_conta": "2.1.02", "palavras_chave": ["DAM", "ISS", "TAXA MUNICIPAL"],                               "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "2.1.03", "palavras_chave": ["PIS", "PIS PASEP"],                                           "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "2.1.04", "palavras_chave": ["IPTU", "IMPOSTO PREDIAL"],                                    "confianca": "Alta",  "recorrencia": "Anual",       "acao": "auto-conciliar"},
    {"codigo_conta": "3.1.02", "palavras_chave": ["EQUIPE CIRURGICA", "TECNICO CIRURGIA"],                       "confianca": "Alta",  "recorrencia": "Variável",    "acao": "sugerir"},
    {"codigo_conta": "3.1.04", "palavras_chave": ["COMISSAO", "COMISSAO COMERCIAL"],                             "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "sugerir"},
    {"codigo_conta": "3.1.05", "palavras_chave": ["SEDEX", "CORREIOS", "FRETE"],                                 "confianca": "Alta",  "recorrencia": "Variável",    "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.01", "palavras_chave": ["SALARIO", "FOLHA PAGAMENTO"],                                 "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.02", "palavras_chave": ["ADIANTAMENTO", "ADIANT"],                                     "confianca": "Média", "recorrencia": "Quinzenal",   "acao": "sugerir"},
    {"codigo_conta": "4.1.04", "palavras_chave": ["INSS", "GPS", "PREVIDENCIA"],                                 "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.05", "palavras_chave": ["VALE TRANSPORTE", "VT"],                                      "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.06", "palavras_chave": ["PLANO SAUDE", "ASSISTENCIA MEDICA", "UNIMED"],                "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.07", "palavras_chave": ["CONTABILIDADE", "REAL CONTABILIDADE"],                        "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.08", "palavras_chave": ["TATICA GESTAO", "BPO"],                                       "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.1.09", "palavras_chave": ["HONORARIOS", "RAPHAELA", "SPADONE"],                          "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.2.03", "palavras_chave": ["VIVO CLINICA", "CLARO EMPRESA", "ALARES"],                    "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.2.04", "palavras_chave": ["VIVO PESSOAL", "CELULAR PESSOAL"],                            "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.2.05", "palavras_chave": ["RD STATION", "RD SISTEMAS", "OMIE", "SAAS"],                  "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.2.10", "palavras_chave": ["PRO AMBIENTAL"],                                              "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.3.01", "palavras_chave": ["MANUTENCAO", "ELETRICISTA", "OFICINA", "CONSERTO"],           "confianca": "Média", "recorrencia": "Esporádico",  "acao": "sugerir"},
    {"codigo_conta": "4.4.01", "palavras_chave": ["JUROS", "JURO EMPRESTIMO"],                                   "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.4.02", "palavras_chave": ["TARIFA BANCARIA", "TAXA BANCO", "MENSALIDADE"],               "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.4.03", "palavras_chave": ["PARCELA EMPRESTIMO", "AMORTIZACAO", "EMPRESTIMO"],            "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "4.4.05", "palavras_chave": ["MERCADO PAGO", "TAXA MAQUININHA", "MDR", "STONE"],            "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "auto-conciliar"},
    {"codigo_conta": "5.1.01", "palavras_chave": ["ANTECIPACAO LUCRO", "RETIRADA SOCIO", "PRO-LABORE"],          "confianca": "Alta",  "recorrencia": "Mensal",      "acao": "sugerir"},
    {"codigo_conta": "6.1.01", "palavras_chave": ["TRANSFERENCIA", "TRANSF", "TED", "TEF", "PIX TRANSF", "MESMA TITULARIDADE", "ENTRE CONTAS"],  "confianca": "Alta",  "recorrencia": "Variável",  "acao": "sugerir"},
    {"codigo_conta": "6.1.02", "palavras_chave": ["APLICACAO", "RESGATE", "CDB", "INVESTIMENTO", "POUPANCA", "RENDA FIXA"],                     "confianca": "Média", "recorrencia": "Esporádico","acao": "sugerir"},
]


def _transform_to_db(raw: dict, company_id: str, dre_order: int) -> dict:
    """Transforma formato do prompt -> formato do chart_of_accounts existente."""
    is_analitica = raw["tipo"] == "Analítica"
    recorrencia = raw.get("recorrencia")
    result = {
        "company_id": company_id,
        "code": raw["codigo"],
        "name": raw["nome"],
        "account_type": _account_type(raw["codigo"]),
        "account_nature": _account_nature(raw["natureza"]),
        "is_analytical": is_analitica,
        "is_synthetic": not is_analitica,
        "level": NIVEL_MAP.get(raw["nivel"], 1),
        "dre_group": raw.get("grupo_dre"),
        "dre_order": dre_order,
        "show_in_dre": True,
        "status": "active",
    }
    # Guardar recorrencia no campo description (coluna recorrencia pode nao existir ainda)
    result["description"] = f"Recorrencia: {recorrencia}" if recorrencia else None
    return result


async def seed(empresa_id: str):
    base = f"{SUPABASE_URL}/rest/v1"

    async with httpx.AsyncClient(timeout=30) as client:
        # ── 0. Limpar contas existentes desta empresa ────
        print(f"[0/4] Verificando contas existentes para {empresa_id}...")
        resp = await client.get(
            f"{base}/chart_of_accounts",
            headers=HEADERS,
            params=[("company_id", f"eq.{empresa_id}"), ("select", "id,code")],
        )
        existing = resp.json() if resp.status_code == 200 else []
        if existing:
            print(f"  WARN: {len(existing)} contas já existem. Deletando para reinserir...")
            del_resp = await client.delete(
                f"{base}/chart_of_accounts",
                headers=HEADERS,
                params=[("company_id", f"eq.{empresa_id}")],
            )
            print(f"  Delete status: {del_resp.status_code}")

        # ── 1. Inserir contas (sem parent_id — resolver depois) ──
        print(f"\n[1/4] Inserindo {len(PLANO_DE_CONTAS_RAW)} contas...")

        accounts_payload = []
        for i, raw in enumerate(PLANO_DE_CONTAS_RAW):
            accounts_payload.append(_transform_to_db(raw, empresa_id, i + 1))

        resp = await client.post(
            f"{base}/chart_of_accounts",
            headers={**HEADERS, "Prefer": "return=representation"},
            json=accounts_payload,
        )
        if resp.status_code >= 400:
            print(f"  ERRO: {resp.status_code} — {resp.text[:300]}")
            return
        inserted = resp.json()
        print(f"  OK {len(inserted)} contas inseridas")

        # ── 2. Resolver parent_id (code -> uuid) ──────────
        print("\n[2/4] Resolvendo parent_id...")

        code_to_id = {row["code"]: row["id"] for row in inserted}

        updates = []
        for raw in PLANO_DE_CONTAS_RAW:
            if raw["codigo_pai"] and raw["codigo_pai"] in code_to_id:
                updates.append({
                    "id": code_to_id[raw["codigo"]],
                    "parent_id": code_to_id[raw["codigo_pai"]],
                })

        # Paralelo em lotes de 10 para não sobrecarregar
        import asyncio as _aio
        for batch_start in range(0, len(updates), 10):
            batch = updates[batch_start:batch_start + 10]
            await _aio.gather(*(
                client.patch(
                    f"{base}/chart_of_accounts",
                    headers={**HEADERS, "Prefer": "return=minimal"},
                    params=[("id", f"eq.{upd['id']}")],
                    json={"parent_id": upd["parent_id"]},
                )
                for upd in batch
            ))
        print(f"  OK {len(updates)} parent_id resolvidos")

        # ── 3. Limpar regras existentes ──────────────────
        print("\n[3/4] Limpando regras existentes...")
        del_resp = await client.delete(
            f"{base}/conciliation_rules",
            headers=HEADERS,
            params=[("company_id", f"eq.{empresa_id}")],
        )
        if del_resp.status_code == 404:
            print("  WARN: Tabela conciliation_rules não existe! Execute a migration SQL primeiro.")
            print(f"  -> Arquivo: supabase_migrations/001_chart_of_accounts_and_rules.sql")
            return
        print(f"  Delete status: {del_resp.status_code}")

        # ── 4. Inserir Regras de Conciliação ─────────────
        print(f"\n[4/4] Inserindo {len(REGRAS_CONCILIACAO)} regras...")

        rules_payload = []
        for regra in REGRAS_CONCILIACAO:
            account_id = code_to_id.get(regra["codigo_conta"])
            if not account_id:
                print(f"  WARN: Conta {regra['codigo_conta']} não encontrada, pulando")
                continue

            rules_payload.append({
                "company_id": empresa_id,
                "account_id": account_id,
                "palavras_chave": [normalizar(kw) for kw in regra["palavras_chave"]],
                "confianca": regra["confianca"],
                "acao": regra["acao"],
                "recorrencia": regra["recorrencia"],
                "ativa": True,
            })

        if rules_payload:
            resp = await client.post(
                f"{base}/conciliation_rules",
                headers={**HEADERS, "Prefer": "return=representation"},
                json=rules_payload,
            )
            if resp.status_code >= 400:
                print(f"  ERRO: {resp.status_code} — {resp.text[:300]}")
                return
            print(f"  OK {len(resp.json())} regras inseridas")

        print("\nDONE Seed concluído com sucesso!")
        print(f"   Contas: {len(inserted)}")
        print(f"   Regras: {len(rules_payload)}")


async def get_all_companies() -> list[dict]:
    """Busca todas as empresas (companies) do Supabase."""
    base = f"{SUPABASE_URL}/rest/v1"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{base}/companies",
            headers=HEADERS,
            params=[("select", "id,nome_fantasia,razao_social"), ("is_active", "eq.true"), ("order", "nome_fantasia.asc")],
        )
        if resp.status_code >= 400:
            print(f"ERRO ao buscar empresas: {resp.status_code} — {resp.text[:200]}")
            return []
        return resp.json()


async def seed_all():
    """Aplica o plano de contas para TODAS as empresas."""
    companies = await get_all_companies()
    if not companies:
        print("Nenhuma empresa encontrada!")
        return

    print(f"Encontradas {len(companies)} empresas:\n")
    for c in companies:
        print(f"  - {c.get('nome_fantasia') or c.get('razao_social') or 'Sem nome'} ({c['id']})")

    print(f"\n{'='*60}")
    for i, c in enumerate(companies, 1):
        nome = c.get("name", "Sem nome")
        print(f"\n[{i}/{len(companies)}] Processando: {nome}")
        print(f"{'='*60}")
        await seed(c["id"])

    print(f"\n{'='*60}")
    print(f"CONCLUÍDO: {len(companies)} empresas processadas!")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        print("Modo: TODAS as empresas\n")
        asyncio.run(seed_all())
    else:
        empresa_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMPRESA_ID
        print(f"Empresa ID: {empresa_id}")
        print("(Use --all para aplicar em todas as empresas)\n")
        asyncio.run(seed(empresa_id))
