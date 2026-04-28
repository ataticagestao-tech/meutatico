"""
FIX: Atribui category_id em accounts_payable e accounts_receivable
baseado nas regras de conciliação + plano de contas.

O sistema externo (ataticagestao.com) mostra "Sem categoria" porque
accounts_payable.category_id e accounts_receivable.category_id estão NULL.

Fluxo:
  1. Para cada empresa, busca regras de conciliação + contas analíticas
  2. Busca accounts_payable e accounts_receivable sem category_id
  3. Roda matching por palavras-chave na descrição
  4. Atualiza category_id com o ID da conta do plano
  5. Também atualiza sugestao_conta_id nas bank_transactions vinculadas
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

HEADERS_MINIMAL = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

CONFIANCA_MAP = {"Alta": 95, "Média": 70, "Baixa": 50}


def normalizar(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().upper().strip()


def match_description(desc: str, regras: list[dict]) -> str | None:
    """Retorna account_id da primeira regra que bater, ou None."""
    desc_norm = normalizar(desc)
    for regra in regras:
        keywords = regra.get("palavras_chave", [])
        if any(kw in desc_norm for kw in keywords):
            return regra.get("account_id")
    return None


async def fix_empresa(client: httpx.AsyncClient, empresa_id: str, empresa_nome: str):
    """Atribui category_id em AP/AR e sugestao_conta_id em bank_transactions."""
    base = f"{SUPABASE_URL}/rest/v1"

    # 1. Buscar contas analíticas (novos IDs)
    resp = await client.get(f"{base}/chart_of_accounts", headers=HEADERS, params=[
        ("company_id", f"eq.{empresa_id}"), ("status", "eq.active"),
        ("is_analytical", "eq.true"), ("select", "id,code,name"),
    ])
    contas = resp.json() if resp.status_code == 200 else []
    if not contas:
        print(f"  SEM contas — pulando")
        return

    conta_ids = {c["id"] for c in contas}

    # 2. Buscar regras de conciliação
    resp = await client.get(f"{base}/conciliation_rules", headers=HEADERS, params=[
        ("company_id", f"eq.{empresa_id}"), ("ativa", "eq.true"),
        ("select", "id,account_id,palavras_chave,confianca,acao"),
    ])
    regras = resp.json() if resp.status_code == 200 else []
    if not regras:
        print(f"  SEM regras de conciliação — pulando")
        return

    fixed_ap = 0
    fixed_ar = 0
    fixed_tx = 0

    # ── 3. Contas a Pagar sem category_id ──
    offset = 0
    while True:
        resp = await client.get(f"{base}/accounts_payable", headers=HEADERS, params=[
            ("company_id", f"eq.{empresa_id}"),
            ("or", "(category_id.is.null,category_id.not.in.(" + ",".join(conta_ids) + "))"),
            ("select", "id,description,category_id"),
            ("limit", "200"), ("offset", str(offset)),
        ])
        rows = resp.json() if resp.status_code == 200 else []
        if not rows:
            break

        updates = []
        for ap in rows:
            desc = ap.get("description") or ""
            account_id = match_description(desc, regras)
            if account_id and account_id in conta_ids:
                updates.append((ap["id"], account_id))

        # Batch update em paralelo (lotes de 10)
        for batch_start in range(0, len(updates), 10):
            batch = updates[batch_start:batch_start + 10]
            await asyncio.gather(*(
                client.patch(f"{base}/accounts_payable", headers=HEADERS_MINIMAL,
                             params=[("id", f"eq.{uid}")], json={"category_id": aid})
                for uid, aid in batch
            ))

        fixed_ap += len(updates)
        offset += len(rows)
        if len(rows) < 200:
            break

    # ── 4. Contas a Receber sem category_id ──
    offset = 0
    while True:
        resp = await client.get(f"{base}/accounts_receivable", headers=HEADERS, params=[
            ("company_id", f"eq.{empresa_id}"),
            ("or", "(category_id.is.null,category_id.not.in.(" + ",".join(conta_ids) + "))"),
            ("select", "id,description,category_id"),
            ("limit", "200"), ("offset", str(offset)),
        ])
        rows = resp.json() if resp.status_code == 200 else []
        if not rows:
            break

        updates = []
        for ar in rows:
            desc = ar.get("description") or ""
            account_id = match_description(desc, regras)
            if account_id and account_id in conta_ids:
                updates.append((ar["id"], account_id))

        for batch_start in range(0, len(updates), 10):
            batch = updates[batch_start:batch_start + 10]
            await asyncio.gather(*(
                client.patch(f"{base}/accounts_receivable", headers=HEADERS_MINIMAL,
                             params=[("id", f"eq.{uid}")], json={"category_id": aid})
                for uid, aid in batch
            ))

        fixed_ar += len(updates)
        offset += len(rows)
        if len(rows) < 200:
            break

    # ── 5. Bank Transactions sem sugestao_conta_id ──
    offset = 0
    while True:
        resp = await client.get(f"{base}/bank_transactions", headers=HEADERS, params=[
            ("company_id", f"eq.{empresa_id}"),
            ("or", "(sugestao_conta_id.is.null,sugestao_conta_id.not.in.(" + ",".join(conta_ids) + "))"),
            ("select", "id,description,memo,sugestao_conta_id"),
            ("limit", "200"), ("offset", str(offset)),
        ])
        rows = resp.json() if resp.status_code == 200 else []
        if not rows:
            break

        updates = []
        for tx in rows:
            desc = f"{tx.get('description', '')} {tx.get('memo', '')}"
            account_id = match_description(desc, regras)
            if account_id and account_id in conta_ids:
                updates.append((tx["id"], account_id))

        for batch_start in range(0, len(updates), 10):
            batch = updates[batch_start:batch_start + 10]
            await asyncio.gather(*(
                client.patch(f"{base}/bank_transactions", headers=HEADERS_MINIMAL,
                             params=[("id", f"eq.{uid}")],
                             json={"sugestao_conta_id": aid, "confianca_match": 95, "metodo_match": "regra"})
                for uid, aid in batch
            ))

        fixed_tx += len(updates)
        offset += len(rows)
        if len(rows) < 200:
            break

    print(f"  Corrigidas: AP={fixed_ap} | AR={fixed_ar} | TX={fixed_tx}")


async def fix_all():
    base = f"{SUPABASE_URL}/rest/v1"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{base}/companies", headers=HEADERS, params=[
            ("select", "id,nome_fantasia,razao_social"), ("is_active", "eq.true"),
            ("order", "nome_fantasia.asc"),
        ])
        companies = resp.json() if resp.status_code == 200 else []
        print(f"Corrigindo categorias para {len(companies)} empresas...\n")

        for i, c in enumerate(companies, 1):
            nome = c.get("nome_fantasia") or c.get("razao_social") or "Sem nome"
            print(f"[{i}/{len(companies)}] {nome}")
            await fix_empresa(client, c["id"], nome)

        print(f"\nCONCLUÍDO!")


async def fix_single(empresa_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        print(f"Corrigindo categorias para empresa {empresa_id}...")
        await fix_empresa(client, empresa_id, empresa_id)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        asyncio.run(fix_all())
    else:
        empresa_id = sys.argv[1] if len(sys.argv) > 1 else "6d41eb71-e593-4ff2-8e3b-e36089a2aca7"
        asyncio.run(fix_single(empresa_id))
