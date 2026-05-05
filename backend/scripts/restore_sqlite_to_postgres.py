"""
Restore data from local SQLite backup to a Postgres database.

USAGE:
    cd tatica-gestap/backend
    python scripts/restore_sqlite_to_postgres.py \\
        --sqlite tatica_gestap.db \\
        --postgres "postgresql+asyncpg://user:pass@host:port/db"

What it does:
    1. Connects to the SQLite source (read-only).
    2. Connects to the Postgres target.
    3. Creates tables in Postgres if missing (Base.metadata.create_all).
    4. Copies every row from every table, preserving IDs.
    5. Skips tables that already have data in Postgres unless --force.

This is intentionally safe: never DROPs anything, refuses to overwrite by default.
"""

import argparse
import asyncio
import sqlite3
import sys
from pathlib import Path

# Allow running as `python scripts/restore_sqlite_to_postgres.py`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import date, datetime  # noqa: E402

from sqlalchemy import (  # noqa: E402
    Boolean,
    Date,
    DateTime,
    inspect,
    text,
)
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

# Load all models so Base.metadata sees them
from app import models  # noqa: F401, E402
from app.database import Base  # noqa: E402


def _parse_datetime(value):
    """Try several SQLite datetime formats."""
    if value is None or value == "":
        return None
    if isinstance(value, (datetime, date)):
        return value
    if not isinstance(value, str):
        return value
    # fromisoformat handles 'YYYY-MM-DD HH:MM:SS[.ffffff][+HH:MM]' and 'YYYY-MM-DDTHH:MM:SS...'
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        pass
    # Fallback for weird formats
    for fmt in (
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {value!r}")


def _parse_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return _parse_datetime(value).date()
    return value


def _coerce_row(row: dict, table, id_map: dict) -> dict:
    """Convert SQLite row values to types Postgres expects, plus remap FK IDs."""
    out = {}
    for col_name, value in row.items():
        # Remap UUIDs that match an entry in id_map (covers all FK columns)
        if isinstance(value, str) and value in id_map:
            out[col_name] = id_map[value]
            continue

        col = table.columns.get(col_name) if table is not None else None
        col_type = col.type if col is not None else None

        if value is None:
            out[col_name] = None
            continue
        # Boolean: SQLite returns 0/1 as int
        if isinstance(col_type, Boolean) or col_name in {"is_done", "all_day", "is_recurring", "is_active", "contas_pagar", "contas_receber", "conciliacao", "resultado", "relatorio_enviado"}:
            out[col_name] = bool(value)
            continue
        # DateTime — heuristic: column names ending in _at, _date, expires_at, etc
        if isinstance(col_type, DateTime) or col_name.endswith(("_at", "_date")) or col_name in {"due_date", "started_at", "completed_at", "resolved_at", "closed_at", "token_expires_at", "last_login_at", "assigned_at", "contract_start_date", "contract_end_date", "start_date", "end_date"}:
            out[col_name] = _parse_datetime(value) if value else None
            continue
        if isinstance(col_type, Date):
            out[col_name] = _parse_date(value)
            continue
        out[col_name] = value
    return out


async def build_id_map(sqlite_path: str, engine) -> dict:
    """Map SQLite IDs → Postgres IDs by matching unique fields (email, slug, etc)."""
    id_map: dict[str, str] = {}
    src = sqlite3.connect(sqlite_path)
    src.row_factory = sqlite3.Row

    queries = [
        ("tenants", "SELECT id, slug FROM tenants", "SELECT id FROM tenants WHERE slug = :v", "slug"),
        ("users", "SELECT id, email FROM users", "SELECT id FROM users WHERE email = :v", "email"),
        ("super_admins", "SELECT id, email FROM super_admins", "SELECT id FROM super_admins WHERE email = :v", "email"),
        ("roles", "SELECT id, slug FROM roles", "SELECT id FROM roles WHERE slug = :v", "slug"),
        ("global_modules", "SELECT id, key FROM global_modules", "SELECT id FROM global_modules WHERE key = :v", "key"),
        ("plans", "SELECT id, slug FROM plans", "SELECT id FROM plans WHERE slug = :v", "slug"),
    ]

    for table, sql_src, sql_pg, key in queries:
        try:
            sqlite_rows = list(src.execute(sql_src))
        except sqlite3.OperationalError:
            continue
        for row in sqlite_rows:
            old_id, key_value = row[0], row[1]
            try:
                async with engine.connect() as conn:
                    new_id = (await conn.execute(text(sql_pg), {"v": key_value})).scalar()
            except Exception:
                continue
            if new_id and str(new_id) != str(old_id):
                id_map[str(old_id)] = str(new_id)

    # Permissions: composite key (module_key, action)
    try:
        for row in src.execute("SELECT id, module_key, action FROM permissions"):
            old_id, mk, ac = row[0], row[1], row[2]
            try:
                async with engine.connect() as conn:
                    new_id = (await conn.execute(
                        text("SELECT id FROM permissions WHERE module_key = :m AND action = :a"),
                        {"m": mk, "a": ac},
                    )).scalar()
            except Exception:
                continue
            if new_id and str(new_id) != str(old_id):
                id_map[str(old_id)] = str(new_id)
    except sqlite3.OperationalError:
        pass

    src.close()
    return id_map


# Order matters for FK constraints — parents before children.
TABLE_ORDER = [
    # public-ish schema
    "global_modules",
    "plans",
    "plan_modules",
    "tenants",
    "super_admins",
    # tenant data
    "permissions",
    "roles",
    "role_permissions",
    "users",
    "user_roles",
    "clients",
    "client_contacts",
    "client_partners",
    "sla_categories",
    "task_templates",
    "tasks",
    "tickets",
    "ticket_messages",
    "calendar_events",
    "google_oauth_tokens",
    "monthly_routines",
    "onboarding_steps",
    "document_folders",
    "documents",
    "document_templates",
    "generated_documents",
    "document_validities",
    "email_templates",
    "inbox_messages",
    "knowledge_base_categories",
    "knowledge_base_articles",
    "notifications",
    "audit_log",
    "audit_log_global",
    "whatsapp_instances",
    "whatsapp_messages",
    "whatsapp_chatbot_rules",
    "alembic_version",
]


def get_sqlite_rows(sqlite_path: str, table: str) -> list[dict]:
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        rows = cur.execute(f'SELECT * FROM "{table}"').fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


async def main(sqlite_path: str, postgres_url: str, force: bool, dry_run: bool):
    print(f"Source SQLite : {sqlite_path}")
    print(f"Target Postgres: {postgres_url.split('@')[-1] if '@' in postgres_url else postgres_url}")
    print(f"Force overwrite: {force}")
    print(f"Dry run        : {dry_run}")
    print()

    # Verify SQLite has tables
    src = sqlite3.connect(sqlite_path)
    sqlite_tables = {r[0] for r in src.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )}
    src.close()
    print(f"SQLite tables found: {len(sqlite_tables)}")

    # Connect to Postgres
    engine = create_async_engine(postgres_url, echo=False)

    if not dry_run:
        async with engine.begin() as conn:
            print("Creating tables in Postgres (if missing)...")
            await conn.run_sync(Base.metadata.create_all)

    # Build ID remap for entities that exist in both DBs but with different UUIDs
    id_map = await build_id_map(sqlite_path, engine)
    print(f"ID remap entries: {len(id_map)}")

    total_inserted = 0
    total_skipped = 0

    for table in TABLE_ORDER:
        if table not in sqlite_tables:
            continue

        rows = get_sqlite_rows(sqlite_path, table)
        if not rows:
            continue

        # Check if Postgres table already has data (fresh transaction)
        try:
            async with engine.connect() as conn:
                existing = (await conn.execute(text(f'SELECT COUNT(*) FROM "{table}"'))).scalar()
        except Exception as e:
            print(f"  [{table}] table missing in Postgres? skipping ({str(e)[:100]})")
            continue

        if existing and not force:
            print(f"  [{table}] {existing} rows already exist in Postgres — SKIP")
            total_skipped += len(rows)
            continue

        cols = list(rows[0].keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        col_list = ", ".join(f'"{c}"' for c in cols)
        stmt = text(f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})')

        sa_table = Base.metadata.tables.get(table)
        coerced_rows = [_coerce_row(r, sa_table, id_map) for r in rows]

        if dry_run:
            print(f"  [{table}] would insert {len(rows)} rows")
            continue

        # Each table gets its own transaction so a failure doesn't abort others
        try:
            async with engine.begin() as conn:
                if force and existing:
                    await conn.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
                    print(f"  [{table}] TRUNCATED ({existing} rows wiped)")
                await conn.execute(stmt, coerced_rows)
            print(f"  [{table}] inserted {len(rows)} rows")
            total_inserted += len(rows)
        except Exception as e:
            print(f"  [{table}] FAILED: {str(e)[:300]}")

    await engine.dispose()
    print()
    print(f"Done. Inserted={total_inserted}, Skipped={total_skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite", required=True, help="Path to SQLite backup file")
    parser.add_argument(
        "--postgres",
        required=True,
        help="Postgres URL (postgresql+asyncpg://user:pass@host:port/db)",
    )
    parser.add_argument(
        "--force", action="store_true", help="Truncate target tables before insert"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would happen, no changes"
    )
    args = parser.parse_args()

    asyncio.run(main(args.sqlite, args.postgres, args.force, args.dry_run))
