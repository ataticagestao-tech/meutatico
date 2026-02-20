"""
Seed script - executa após migrations para popular dados iniciais.
Uso: python seed.py
"""
import asyncio

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.security import hash_password
from app.core.utils import schema_name_from_slug
from app.models.public.plan import Plan, PlanModule
from app.models.public.super_admin import GlobalModule, SuperAdmin
from app.models.public.tenant import Tenant
from app.services.tenant_service import TENANT_SCHEMA_SQL, TENANT_SEED_SQL

engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with async_session() as db:
        # ── 1. SuperAdmin ────────────────────────────
        existing_admin = await db.execute(
            select(SuperAdmin).where(SuperAdmin.email == "admin@taticagestap.com.br")
        )
        if not existing_admin.scalar_one_or_none():
            admin = SuperAdmin(
                name="Admin Tatica",
                email="admin@taticagestap.com.br",
                password_hash=hash_password("TrocaR@123!"),
            )
            db.add(admin)
            print("[+] SuperAdmin criado: admin@taticagestap.com.br / TrocaR@123!")
        else:
            print("[=] SuperAdmin já existe")

        # ── 2. Módulos Globais ───────────────────────
        modules_data = [
            {"key": "clients", "name": "Gestão de Clientes", "icon": "users", "sort_order": 1},
            {"key": "tickets", "name": "Solicitações", "icon": "ticket", "sort_order": 2},
            {"key": "tasks", "name": "Tarefas e Rotinas", "icon": "check-square", "sort_order": 3},
            {"key": "knowledge_base", "name": "Base de Conhecimento", "icon": "book-open", "sort_order": 4},
            {"key": "documents", "name": "Gestão de Documentos", "icon": "folder", "sort_order": 5},
            {"key": "portal", "name": "Portal do Cliente", "icon": "globe", "sort_order": 6},
            {"key": "notifications", "name": "Notificações", "icon": "bell", "sort_order": 7},
            {"key": "reports", "name": "Relatórios", "icon": "bar-chart", "sort_order": 8},
        ]

        for mod in modules_data:
            existing = await db.execute(
                select(GlobalModule).where(GlobalModule.key == mod["key"])
            )
            if not existing.scalar_one_or_none():
                db.add(GlobalModule(**mod))
                print(f"[+] Módulo: {mod['name']}")

        # ── 3. Planos ───────────────────────────────
        plans_data = [
            {
                "name": "Básico",
                "slug": "basico",
                "description": "Plano básico para pequenas empresas",
                "price_monthly": 197.00,
                "max_users": 5,
                "max_storage_gb": 5,
                "max_clients": 20,
                "modules": ["clients", "tickets", "documents", "notifications"],
            },
            {
                "name": "Profissional",
                "slug": "profissional",
                "description": "Plano completo para empresas em crescimento",
                "price_monthly": 497.00,
                "max_users": 15,
                "max_storage_gb": 25,
                "max_clients": 100,
                "modules": ["clients", "tickets", "tasks", "knowledge_base", "documents", "notifications", "reports"],
            },
            {
                "name": "Enterprise",
                "slug": "enterprise",
                "description": "Plano ilimitado para grandes operações",
                "price_monthly": 997.00,
                "max_users": -1,
                "max_storage_gb": 100,
                "max_clients": None,
                "modules": ["clients", "tickets", "tasks", "knowledge_base", "documents", "portal", "notifications", "reports"],
            },
        ]

        plan_ids = {}
        for plan_data in plans_data:
            existing = await db.execute(
                select(Plan).where(Plan.slug == plan_data["slug"])
            )
            plan = existing.scalar_one_or_none()
            if not plan:
                modules = plan_data.pop("modules")
                plan = Plan(**plan_data)
                db.add(plan)
                await db.flush()

                for mod_key in modules:
                    pm = PlanModule(plan_id=plan.id, module_key=mod_key, is_enabled=True)
                    db.add(pm)

                print(f"[+] Plano: {plan.name} (R${plan.price_monthly})")
            else:
                print(f"[=] Plano já existe: {plan.name}")
            plan_ids[plan_data.get("slug", plan.slug)] = plan.id

        await db.flush()

        # ── 4. Tenant Tatica Gestap ──────────────────
        enterprise_plan_id = plan_ids.get("enterprise")
        if not enterprise_plan_id:
            result = await db.execute(select(Plan).where(Plan.slug == "enterprise"))
            p = result.scalar_one_or_none()
            if p:
                enterprise_plan_id = p.id

        existing_tenant = await db.execute(
            select(Tenant).where(Tenant.slug == "tatica-gestap")
        )
        if not existing_tenant.scalar_one_or_none() and enterprise_plan_id:
            schema_name = schema_name_from_slug("tatica-gestap")

            tenant = Tenant(
                name="Tatica Gestap",
                slug="tatica-gestap",
                schema_name=schema_name,
                document="00000000000100",
                email="contato@taticagestap.com.br",
                plan_id=enterprise_plan_id,
            )
            db.add(tenant)
            await db.flush()

            # Cria schema
            await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))

            # Cria tabelas do tenant
            for statement in TENANT_SCHEMA_SQL.format(schema=schema_name).split(";"):
                stmt = statement.strip()
                if stmt:
                    await db.execute(text(stmt))

            # Seed: permissões e roles
            for statement in TENANT_SEED_SQL.format(schema=schema_name).split(";"):
                stmt = statement.strip()
                if stmt and not stmt.startswith("--"):
                    await db.execute(text(stmt))

            # Cria admin user
            password_hash = hash_password("TrocaR@123!")
            admin_result = await db.execute(
                text(f"""
                    INSERT INTO "{schema_name}".users (tenant_id, name, email, password_hash)
                    VALUES (:tenant_id, :name, :email, :password_hash)
                    RETURNING id
                """),
                {
                    "tenant_id": str(tenant.id),
                    "name": "Administrador",
                    "email": "admin@taticagestap.com.br",
                    "password_hash": password_hash,
                },
            )
            admin_id = admin_result.scalar_one()

            # Atribui role admin
            await db.execute(
                text(f"""
                    INSERT INTO "{schema_name}".user_roles (user_id, role_id)
                    SELECT :user_id, id FROM "{schema_name}".roles WHERE slug = 'admin'
                """),
                {"user_id": str(admin_id)},
            )

            print(f"[+] Tenant criado: Tatica Gestap ({schema_name})")
            print("[+] Admin do tenant: admin@taticagestap.com.br / TrocaR@123!")
        else:
            print("[=] Tenant Tatica Gestap já existe")

        await db.commit()
        print("\n[OK] Seed concluído com sucesso!")


if __name__ == "__main__":
    asyncio.run(seed())
