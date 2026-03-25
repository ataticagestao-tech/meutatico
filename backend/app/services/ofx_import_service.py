"""
OFX Import Service — importa extratos bancários OFX com proteção contra duplicatas.

Fluxo:
  1. Parsear arquivo OFX (formato SGML/XML)
  2. Para cada transação, calcular hash e verificar FITID
  3. Consultar bank_transactions existentes para detectar duplicatas
  4. Inserir apenas transações novas
  5. Registrar histórico da importação
"""

import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime
from typing import Any

import httpx

from app.config import settings


def _parse_ofx_date(raw: str) -> date | None:
    """Parse OFX date string (YYYYMMDD or YYYYMMDDHHMMSS) → date."""
    if not raw:
        return None
    clean = raw.strip().split("[")[0].split(".")[0]  # remove timezone info
    try:
        if len(clean) >= 14:
            return datetime.strptime(clean[:14], "%Y%m%d%H%M%S").date()
        elif len(clean) >= 8:
            return datetime.strptime(clean[:8], "%Y%m%d").date()
    except ValueError:
        pass
    return None


def _extract_tag(block: str, tag: str) -> str:
    """Extrai valor de uma tag OFX SGML (sem closing tag)."""
    pattern = rf"<{tag}>([^<\r\n]+)"
    match = re.search(pattern, block, re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _compute_hash(dt: str, amount: str, description: str, account_id: str) -> str:
    """Gera SHA256 hash de date|amount|description|account_id para detecção de duplicatas."""
    raw = f"{dt}|{amount}|{description}|{account_id}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _compute_file_hash(content: bytes) -> str:
    """SHA256 do conteúdo do arquivo para detectar reimportação do mesmo arquivo."""
    return hashlib.sha256(content).hexdigest()


def parse_ofx(content: bytes) -> list[dict]:
    """
    Parseia arquivo OFX (SGML ou XML) e retorna lista de transações.

    Cada transação retornada:
      - fitid: str (Financial Institution Transaction ID)
      - date: str (YYYY-MM-DD)
      - amount: float
      - type: str (income/expense)
      - description: str
      - memo: str
      - check_num: str
    """
    text = content.decode("latin-1", errors="replace")

    # Tenta XML primeiro
    transactions = _try_parse_xml(text)
    if transactions:
        return transactions

    # Fallback: SGML (formato mais comum no Brasil)
    return _parse_sgml(text)


def _try_parse_xml(text: str) -> list[dict]:
    """Tenta parsear como XML OFX (versão 2.x)."""
    if "<?xml" not in text.lower()[:100] and "<?OFX" not in text[:100]:
        return []
    try:
        root = ET.fromstring(text)
        ns = ""
        # Detectar namespace se houver
        if root.tag.startswith("{"):
            ns = root.tag.split("}")[0] + "}"

        txs = []
        for stmttrn in root.iter(f"{ns}STMTTRN"):
            fitid = (stmttrn.findtext(f"{ns}FITID") or "").strip()
            dt_raw = (stmttrn.findtext(f"{ns}DTPOSTED") or "").strip()
            amount_raw = (stmttrn.findtext(f"{ns}TRNAMT") or "0").strip()
            name = (stmttrn.findtext(f"{ns}NAME") or "").strip()
            memo = (stmttrn.findtext(f"{ns}MEMO") or "").strip()
            check_num = (stmttrn.findtext(f"{ns}CHECKNUM") or "").strip()

            dt = _parse_ofx_date(dt_raw)
            amount = float(amount_raw.replace(",", "."))

            txs.append({
                "fitid": fitid,
                "date": dt.isoformat() if dt else "",
                "amount": amount,
                "type": "income" if amount > 0 else "expense",
                "description": name,
                "memo": memo,
                "check_num": check_num,
            })
        return txs
    except ET.ParseError:
        return []


def _parse_sgml(text: str) -> list[dict]:
    """Parseia OFX SGML (formato brasileiro padrão)."""
    txs = []

    # Dividir em blocos <STMTTRN>...</STMTTRN>
    blocks = re.split(r"<STMTTRN>", text, flags=re.IGNORECASE)

    for block in blocks[1:]:  # primeiro bloco é header
        end = re.search(r"</STMTTRN>", block, re.IGNORECASE)
        if end:
            block = block[: end.start()]

        fitid = _extract_tag(block, "FITID")
        dt_raw = _extract_tag(block, "DTPOSTED")
        amount_raw = _extract_tag(block, "TRNAMT")
        name = _extract_tag(block, "NAME")
        memo = _extract_tag(block, "MEMO")
        check_num = _extract_tag(block, "CHECKNUM")

        dt = _parse_ofx_date(dt_raw)
        try:
            amount = float(amount_raw.replace(",", "."))
        except (ValueError, AttributeError):
            amount = 0.0

        txs.append({
            "fitid": fitid,
            "date": dt.isoformat() if dt else "",
            "amount": amount,
            "type": "income" if amount > 0 else "expense",
            "description": name,
            "memo": memo,
            "check_num": check_num,
        })

    return txs


def extract_account_info(content: bytes) -> dict:
    """Extrai informações da conta bancária do arquivo OFX."""
    text = content.decode("latin-1", errors="replace")
    return {
        "bank_id": _extract_tag(text, "BANKID"),
        "branch_id": _extract_tag(text, "BRANCHID"),
        "acct_id": _extract_tag(text, "ACCTID"),
        "acct_type": _extract_tag(text, "ACCTTYPE"),
    }


class OFXImportService:
    """Importa transações OFX para o Supabase com proteção contra duplicatas."""

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

    async def import_ofx(
        self,
        company_id: str,
        bank_account_id: str,
        file_content: bytes,
        file_name: str,
        imported_by: str = "",
    ) -> dict[str, Any]:
        """
        Importa arquivo OFX com proteção completa contra duplicatas.

        Validações (nesta ordem):
          0. Extrato pertence à conta bancária selecionada? (ACCTID do OFX vs conta cadastrada)
          1. Arquivo já foi importado antes? (hash do arquivo)
          1b. Já existe importação para o mesmo banco/período? (range de datas)
          2. FITID já existe? (por transação)
          3. Hash data+valor+descrição já existe? (fallback por transação)
          4. Duplicata dentro do próprio arquivo?

        Retorna:
          {
            "success": True,
            "file_name": "extrato.ofx",
            "total_in_file": 45,
            "imported": 30,
            "skipped_duplicates": 15,
            "skipped_details": [...],
            "date_range": {"start": "2026-01-01", "end": "2026-01-31"},
            "import_id": "uuid"
          }
        """
        if not self.is_configured:
            return {"success": False, "error": "Integração financeira não configurada"}

        # 0. Validar que o extrato pertence à conta bancária selecionada
        account_validation = await self._validate_account_ownership(
            company_id, bank_account_id, file_content
        )
        if not account_validation["valid"]:
            return {
                "success": False,
                "error": account_validation["error"],
                "details": account_validation.get("details"),
            }

        # 1. Verificar se o mesmo arquivo já foi importado antes
        file_hash = _compute_file_hash(file_content)
        same_file = await self._check_file_already_imported(company_id, file_hash)
        if same_file:
            return {
                "success": False,
                "error": "Este arquivo OFX já foi importado anteriormente",
                "previous_import": same_file,
            }

        # 2. Parsear OFX
        transactions = parse_ofx(file_content)
        if not transactions:
            return {"success": False, "error": "Nenhuma transação encontrada no arquivo OFX"}

        # 2b. Verificar se já existe importação para o mesmo banco + período sobreposto
        all_dates = [tx["date"] for tx in transactions if tx["date"]]
        file_date_start = min(all_dates) if all_dates else None
        file_date_end = max(all_dates) if all_dates else None

        if file_date_start and file_date_end:
            overlap = await self._check_period_overlap(
                company_id, bank_account_id, file_date_start, file_date_end
            )
            if overlap:
                return {
                    "success": False,
                    "error": (
                        f"Já existe uma importação para esta conta no período "
                        f"{overlap['date_range_start']} a {overlap['date_range_end']} "
                        f"(arquivo: {overlap['file_name']}, importado em {overlap['imported_at']}). "
                        f"O extrato que você está tentando subir cobre {file_date_start} a {file_date_end}."
                    ),
                    "previous_import": overlap,
                }

        # 3. Buscar transações existentes para detectar duplicatas
        existing_fitids = await self._get_existing_fitids(company_id, bank_account_id)
        existing_hashes = await self._get_existing_hashes(company_id)

        # 4. Filtrar duplicatas
        new_transactions = []
        skipped = []
        now = datetime.utcnow().isoformat()

        for tx in transactions:
            fitid = tx["fitid"]
            tx_hash = _compute_hash(
                tx["date"], str(tx["amount"]), tx["description"], bank_account_id
            )

            # Check 1: FITID já existe
            if fitid and fitid in existing_fitids:
                skipped.append({
                    "fitid": fitid,
                    "date": tx["date"],
                    "amount": tx["amount"],
                    "description": tx["description"],
                    "reason": "FITID já existe",
                })
                continue

            # Check 2: Hash já existe (mesmo valor + data + descrição + conta)
            if tx_hash in existing_hashes:
                skipped.append({
                    "fitid": fitid,
                    "date": tx["date"],
                    "amount": tx["amount"],
                    "description": tx["description"],
                    "reason": "Transação idêntica já existe (data + valor + descrição)",
                })
                continue

            # Marcar como nova
            new_transactions.append({
                "company_id": company_id,
                "bank_account_id": bank_account_id,
                "fitid": fitid or None,
                "date": tx["date"],
                "amount": tx["amount"],
                "type": tx["type"],
                "description": tx["description"],
                "memo": tx["memo"] or None,
                "status": "pending",
                "import_hash": tx_hash,
                "imported_at": now,
            })

            # Adicionar aos sets para evitar duplicatas dentro do próprio arquivo
            if fitid:
                existing_fitids.add(fitid)
            existing_hashes.add(tx_hash)

        # 5. Inserir transações novas em batch
        if new_transactions:
            await self._insert_transactions(new_transactions)

        # 6. Registrar histórico da importação
        import_record = await self._record_import_history(
            company_id=company_id,
            bank_account_id=bank_account_id,
            file_name=file_name,
            file_hash=file_hash,
            total_in_file=len(transactions),
            imported=len(new_transactions),
            skipped_dupes=len(skipped),
            date_start=file_date_start,
            date_end=file_date_end,
            imported_by=imported_by,
        )

        return {
            "success": True,
            "file_name": file_name,
            "total_in_file": len(transactions),
            "imported": len(new_transactions),
            "skipped_duplicates": len(skipped),
            "skipped_details": skipped[:50],  # Limitar detalhes para não sobrecarregar
            "date_range": {"start": file_date_start, "end": file_date_end},
            "import_id": import_record.get("id") if import_record else None,
        }

    async def get_import_history(
        self, company_id: str, limit: int = 20
    ) -> list[dict]:
        """
        Retorna histórico de importações OFX da empresa,
        enriquecido com status de conciliação de cada importação.
        """
        import asyncio

        async with httpx.AsyncClient(timeout=15) as client:
            # Buscar histórico
            resp = await client.get(
                f"{self.base_url}/rest/v1/ofx_import_history",
                headers=self._headers(),
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("select", "id,file_name,total_in_file,imported,skipped_dupes,date_range_start,date_range_end,imported_at,imported_by,bank_account_id"),
                    ("order", "imported_at.desc"),
                    ("limit", str(limit)),
                ],
            )
            resp.raise_for_status()
            history = resp.json()

        if not history:
            return []

        # Para cada importação, contar quantas transações já foram conciliadas
        # Busca por bank_account_id + período da importação
        async with httpx.AsyncClient(timeout=15) as client:
            tasks = []
            for h in history:
                if not h.get("date_range_start") or not h.get("bank_account_id"):
                    tasks.append(None)
                    continue
                # Buscar transações deste período/conta com status
                tasks.append(
                    client.get(
                        f"{self.base_url}/rest/v1/bank_transactions",
                        headers=self._headers(),
                        params=[
                            ("company_id", f"eq.{company_id}"),
                            ("bank_account_id", f"eq.{h['bank_account_id']}"),
                            ("date", f"gte.{h['date_range_start']}"),
                            ("date", f"lte.{h['date_range_end']}"),
                            ("select", "id,status"),
                        ],
                    )
                )

            results = await asyncio.gather(
                *[t for t in tasks if t is not None], return_exceptions=True
            )

        # Mapear resultados de volta
        result_idx = 0
        for i, h in enumerate(history):
            if tasks[i] is None:
                h["conciliacao"] = {
                    "total": h.get("imported", 0),
                    "conciliadas": 0,
                    "pendentes": h.get("imported", 0),
                    "percentual": 0,
                    "status": "sem_dados",
                }
                continue

            r = results[result_idx]
            result_idx += 1

            if isinstance(r, Exception):
                h["conciliacao"] = {
                    "total": h.get("imported", 0),
                    "conciliadas": 0,
                    "pendentes": h.get("imported", 0),
                    "percentual": 0,
                    "status": "erro",
                }
                continue

            r.raise_for_status()
            txs = r.json()
            total = len(txs)
            conciliadas = sum(1 for t in txs if t.get("status") == "reconciled")
            pendentes = total - conciliadas

            if total == 0:
                status = "vazio"
                pct = 0
            elif conciliadas == total:
                status = "conciliado"
                pct = 100
            elif conciliadas > 0:
                status = "parcial"
                pct = round((conciliadas / total) * 100)
            else:
                status = "pendente"
                pct = 0

            h["conciliacao"] = {
                "total": total,
                "conciliadas": conciliadas,
                "pendentes": pendentes,
                "percentual": pct,
                "status": status,
            }

        return history

    # ── Private methods ──────────────────────────────────

    async def _validate_account_ownership(
        self, company_id: str, bank_account_id: str, file_content: bytes
    ) -> dict:
        """
        Valida que o extrato OFX pertence à conta bancária selecionada.

        Cruza o ACCTID (número da conta) do arquivo OFX com os dados
        da conta cadastrada no sistema (campo 'conta' da bank_accounts).

        Se a conta cadastrada não tiver número preenchido, permite a importação
        com um warning (para não bloquear em dados incompletos).
        """
        ofx_info = extract_account_info(file_content)
        ofx_acct_id = ofx_info.get("acct_id", "").strip()

        if not ofx_acct_id:
            # OFX não contém ACCTID — não conseguimos validar, permite com warning
            return {"valid": True, "warning": "OFX sem identificador de conta (ACCTID)"}

        # Buscar dados da conta bancária selecionada
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/rest/v1/bank_accounts",
                headers=self._headers(),
                params=[
                    ("id", f"eq.{bank_account_id}"),
                    ("company_id", f"eq.{company_id}"),
                    ("select", "id,name,banco,conta,agencia"),
                    ("limit", "1"),
                ],
            )
            resp.raise_for_status()
            accounts = resp.json()

        if not accounts:
            return {
                "valid": False,
                "error": "Conta bancária não encontrada ou não pertence a esta empresa.",
            }

        account = accounts[0]
        registered_conta = (account.get("conta") or "").strip()

        if not registered_conta:
            # Conta sem número cadastrado — não bloqueia, mas avisa
            return {"valid": True, "warning": "Conta sem número cadastrado para validação"}

        # Normalizar: remover zeros à esquerda, traços, pontos, espaços
        def normalize_account(raw: str) -> str:
            return raw.replace("-", "").replace(".", "").replace(" ", "").lstrip("0")

        ofx_normalized = normalize_account(ofx_acct_id)
        registered_normalized = normalize_account(registered_conta)

        # Verificar se um contém o outro (bancos às vezes incluem dígito verificador)
        if ofx_normalized == registered_normalized:
            return {"valid": True}

        # Verificar containment: "12345" está em "123456" (conta + dígito)
        if ofx_normalized in registered_normalized or registered_normalized in ofx_normalized:
            return {"valid": True}

        return {
            "valid": False,
            "error": (
                f"O extrato OFX é da conta {ofx_acct_id}, "
                f"mas a conta selecionada é {registered_conta} ({account.get('banco', '')} — {account.get('name', '')}). "
                f"Verifique se selecionou a conta correta."
            ),
            "details": {
                "ofx_account": ofx_acct_id,
                "ofx_bank": ofx_info.get("bank_id", ""),
                "registered_account": registered_conta,
                "registered_bank": account.get("banco", ""),
            },
        }

    async def _check_period_overlap(
        self, company_id: str, bank_account_id: str, date_start: str, date_end: str
    ) -> dict | None:
        """
        Verifica se já existe uma importação para a mesma conta bancária
        com período que se sobrepõe ao do arquivo sendo importado.

        Overlap = import existente onde:
          date_range_start <= date_end AND date_range_end >= date_start
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/rest/v1/ofx_import_history",
                headers=self._headers(),
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("bank_account_id", f"eq.{bank_account_id}"),
                    ("date_range_start", f"lte.{date_end}"),
                    ("date_range_end", f"gte.{date_start}"),
                    ("select", "id,file_name,date_range_start,date_range_end,imported_at,imported"),
                    ("order", "imported_at.desc"),
                    ("limit", "1"),
                ],
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None

    async def _check_file_already_imported(
        self, company_id: str, file_hash: str
    ) -> dict | None:
        """Verifica se o mesmo arquivo (por hash) já foi importado."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/rest/v1/ofx_import_history",
                headers=self._headers(),
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("file_hash", f"eq.{file_hash}"),
                    ("select", "id,file_name,imported_at,imported,skipped_dupes"),
                    ("limit", "1"),
                ],
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None

    async def _get_existing_fitids(
        self, company_id: str, bank_account_id: str
    ) -> set[str]:
        """Busca todos os FITIDs existentes para a conta bancária."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/rest/v1/bank_transactions",
                headers=self._headers(),
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("bank_account_id", f"eq.{bank_account_id}"),
                    ("fitid", "not.is.null"),
                    ("select", "fitid"),
                ],
            )
            resp.raise_for_status()
            return {row["fitid"] for row in resp.json() if row.get("fitid")}

    async def _get_existing_hashes(self, company_id: str) -> set[str]:
        """Busca todos os import_hash existentes da empresa."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/rest/v1/bank_transactions",
                headers=self._headers(),
                params=[
                    ("company_id", f"eq.{company_id}"),
                    ("import_hash", "not.is.null"),
                    ("select", "import_hash"),
                ],
            )
            resp.raise_for_status()
            return {row["import_hash"] for row in resp.json() if row.get("import_hash")}

    async def _insert_transactions(self, transactions: list[dict]) -> None:
        """Insere transações em batch via Supabase REST API."""
        # Inserir em batches de 50 para evitar timeout
        batch_size = 50
        async with httpx.AsyncClient(timeout=30) as client:
            for i in range(0, len(transactions), batch_size):
                batch = transactions[i : i + batch_size]
                resp = await client.post(
                    f"{self.base_url}/rest/v1/bank_transactions",
                    headers=self._headers({"Prefer": "return=minimal"}),
                    json=batch,
                )
                resp.raise_for_status()

    async def _record_import_history(
        self,
        company_id: str,
        bank_account_id: str,
        file_name: str,
        file_hash: str,
        total_in_file: int,
        imported: int,
        skipped_dupes: int,
        date_start: str | None,
        date_end: str | None,
        imported_by: str,
    ) -> dict:
        """Registra a importação no histórico."""
        payload = {
            "company_id": company_id,
            "bank_account_id": bank_account_id,
            "file_name": file_name,
            "file_hash": file_hash,
            "total_in_file": total_in_file,
            "imported": imported,
            "skipped_dupes": skipped_dupes,
            "date_range_start": date_start,
            "date_range_end": date_end,
            "imported_by": imported_by,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.base_url}/rest/v1/ofx_import_history",
                headers=self._headers({"Prefer": "return=representation"}),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else {}
