import math
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.utils import schema_name_from_slug
from app.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.public.plan import Plan
from app.models.public.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate

# SQL para criar as tabelas do tenant schema
TENANT_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS {schema}.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{{"theme": "system", "notifications_email": true}}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    UNIQUE(module_key, action)
);

CREATE TABLE IF NOT EXISTS {schema}.role_permissions (
    role_id UUID NOT NULL REFERENCES {schema}.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES {schema}.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS {schema}.user_roles (
    user_id UUID NOT NULL REFERENCES {schema}.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES {schema}.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES {schema}.users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS {schema}.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_type VARCHAR(4) NOT NULL DEFAULT 'CNPJ',
    document_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    secondary_phone VARCHAR(20),
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    responsible_user_id UUID REFERENCES {schema}.users(id),
    contracted_plan VARCHAR(100),
    contract_start_date DATE,
    contract_end_date DATE,
    monthly_fee DECIMAL(10,2),
    tax_regime VARCHAR(50),
    systems_used TEXT[],
    notes TEXT,
    tags TEXT[],
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES {schema}.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'request',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    category VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    source VARCHAR(20) NOT NULL DEFAULT 'internal',
    client_id UUID REFERENCES {schema}.clients(id),
    requester_user_id UUID REFERENCES {schema}.users(id),
    requester_name VARCHAR(255),
    requester_email VARCHAR(255),
    assigned_user_id UUID REFERENCES {schema}.users(id),
    due_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    tags TEXT[],
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES {schema}.tickets(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES {schema}.users(id),
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'todo',
    position INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    category VARCHAR(100),
    tags TEXT[],
    client_id UUID REFERENCES {schema}.clients(id),
    ticket_id UUID REFERENCES {schema}.tickets(id),
    assigned_user_id UUID REFERENCES {schema}.users(id),
    due_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule JSONB,
    parent_task_id UUID REFERENCES {schema}.tasks(id),
    checklist JSONB DEFAULT '[]',
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100),
    tasks_config JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.knowledge_base_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    parent_category_id UUID REFERENCES {schema}.knowledge_base_categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES {schema}.knowledge_base_categories(id),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text',
    body TEXT,
    video_url TEXT,
    video_thumbnail_url TEXT,
    attachments JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER NOT NULL DEFAULT 0,
    visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
    client_id UUID REFERENCES {schema}.clients(id),
    tags TEXT[],
    version INTEGER NOT NULL DEFAULT 1,
    last_edited_by UUID REFERENCES {schema}.users(id),
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS {schema}.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES {schema}.document_folders(id),
    client_id UUID REFERENCES {schema}.clients(id),
    color VARCHAR(7) DEFAULT '#6B7280',
    created_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES {schema}.document_folders(id),
    client_id UUID REFERENCES {schema}.clients(id),
    name VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    tags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES {schema}.documents(id),
    uploaded_by UUID REFERENCES {schema}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES {schema}.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(30) NOT NULL DEFAULT 'info',
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES {schema}.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

TENANT_SEED_SQL = """
INSERT INTO {schema}.permissions (module_key, action, description) VALUES
    ('clients', 'create', 'Criar clientes'),
    ('clients', 'read', 'Visualizar clientes'),
    ('clients', 'update', 'Editar clientes'),
    ('clients', 'delete', 'Excluir clientes'),
    ('clients', 'export', 'Exportar clientes'),
    ('tickets', 'create', 'Criar solicitações'),
    ('tickets', 'read', 'Visualizar solicitações'),
    ('tickets', 'update', 'Editar solicitações'),
    ('tickets', 'delete', 'Excluir solicitações'),
    ('tickets', 'assign', 'Atribuir solicitações'),
    ('tickets', 'manage', 'Gerenciar todas as solicitações'),
    ('tasks', 'create', 'Criar tarefas'),
    ('tasks', 'read', 'Visualizar tarefas'),
    ('tasks', 'update', 'Editar tarefas'),
    ('tasks', 'delete', 'Excluir tarefas'),
    ('tasks', 'manage', 'Gerenciar todas as tarefas'),
    ('knowledge_base', 'create', 'Criar artigos'),
    ('knowledge_base', 'read', 'Visualizar artigos'),
    ('knowledge_base', 'update', 'Editar artigos'),
    ('knowledge_base', 'delete', 'Excluir artigos'),
    ('knowledge_base', 'publish', 'Publicar artigos'),
    ('documents', 'create', 'Fazer upload de documentos'),
    ('documents', 'read', 'Visualizar documentos'),
    ('documents', 'update', 'Editar documentos'),
    ('documents', 'delete', 'Excluir documentos'),
    ('documents', 'manage_folders', 'Gerenciar pastas'),
    ('users', 'create', 'Criar usuários'),
    ('users', 'read', 'Visualizar usuários'),
    ('users', 'update', 'Editar usuários'),
    ('users', 'delete', 'Desativar usuários'),
    ('roles', 'manage', 'Gerenciar cargos e permissões'),
    ('settings', 'manage', 'Gerenciar configurações do tenant')
ON CONFLICT DO NOTHING;

INSERT INTO {schema}.roles (name, slug, description, is_system, color) VALUES
    ('Administrador', 'admin', 'Acesso total ao sistema do tenant', TRUE, '#DC2626'),
    ('Gestor', 'manager', 'Gerencia equipes, clientes e relatórios', TRUE, '#2563EB'),
    ('Analista', 'analyst', 'Operacional - executa tarefas e atende solicitações', TRUE, '#059669'),
    ('Estagiário', 'intern', 'Acesso limitado para aprendizado', TRUE, '#D97706'),
    ('Visualizador', 'viewer', 'Apenas visualização', TRUE, '#6B7280')
ON CONFLICT DO NOTHING;

-- Dar todas as permissões para o role Admin
INSERT INTO {schema}.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM {schema}.roles r
CROSS JOIN {schema}.permissions p
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;
"""


class TenantService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tenants(
        self, search: str | None = None, status: str | None = None,
        page: int = 1, per_page: int = 20,
    ) -> dict:
        query = select(Tenant)
        count_query = select(func.count()).select_from(Tenant)

        if search:
            query = query.where(
                Tenant.name.ilike(f"%{search}%") | Tenant.document.ilike(f"%{search}%")
            )
            count_query = count_query.where(
                Tenant.name.ilike(f"%{search}%") | Tenant.document.ilike(f"%{search}%")
            )

        if status:
            query = query.where(Tenant.status == status)
            count_query = count_query.where(Tenant.status == status)

        total = (await self.db.execute(count_query)).scalar()
        query = query.order_by(Tenant.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        tenants = result.scalars().all()

        # Busca nomes dos planos
        items = []
        for t in tenants:
            plan_result = await self.db.execute(select(Plan).where(Plan.id == t.plan_id))
            plan = plan_result.scalar_one_or_none()
            item = {
                "id": t.id, "name": t.name, "slug": t.slug,
                "schema_name": t.schema_name, "document": t.document,
                "email": t.email, "phone": t.phone, "plan_id": t.plan_id,
                "plan_name": plan.name if plan else None,
                "status": t.status, "trial_ends_at": t.trial_ends_at,
                "logo_url": t.logo_url, "settings": t.settings,
                "created_at": t.created_at, "updated_at": t.updated_at,
            }
            items.append(item)

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_tenant(self, tenant_id: UUID) -> Tenant:
        result = await self.db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise NotFoundException("Tenant não encontrado")
        return tenant

    async def create_tenant(self, data: TenantCreate) -> dict:
        """Cria tenant + schema + tabelas + seed + admin user."""
        # Verifica se slug já existe
        existing = await self.db.execute(
            select(Tenant).where(Tenant.slug == data.slug)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Slug já existe")

        # Verifica se o plano existe
        plan_result = await self.db.execute(select(Plan).where(Plan.id == data.plan_id))
        plan = plan_result.scalar_one_or_none()
        if not plan:
            raise BadRequestException("Plano não encontrado")

        schema_name = schema_name_from_slug(data.slug)

        # 1. Cria o tenant no public
        tenant = Tenant(
            name=data.name,
            slug=data.slug,
            schema_name=schema_name,
            document=data.document,
            email=data.email,
            phone=data.phone,
            plan_id=data.plan_id,
        )
        self.db.add(tenant)
        await self.db.flush()

        # 2. Cria o schema
        await self.db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))

        # 3. Cria as tabelas do tenant
        for statement in TENANT_SCHEMA_SQL.format(schema=schema_name).split(";"):
            stmt = statement.strip()
            if stmt:
                await self.db.execute(text(stmt))

        # 4. Seed: permissões, roles e role_permissions
        for statement in TENANT_SEED_SQL.format(schema=schema_name).split(";"):
            stmt = statement.strip()
            if stmt and not stmt.startswith("--"):
                await self.db.execute(text(stmt))

        # 5. Cria o admin user do tenant
        password_hash = hash_password(data.admin_password)
        admin_result = await self.db.execute(
            text(f"""
                INSERT INTO "{schema_name}".users (tenant_id, name, email, password_hash)
                VALUES (:tenant_id, :name, :email, :password_hash)
                RETURNING id
            """),
            {
                "tenant_id": str(tenant.id),
                "name": data.admin_name,
                "email": data.admin_email,
                "password_hash": password_hash,
            },
        )
        admin_user_id = admin_result.scalar_one()

        # 6. Atribui role admin ao user
        await self.db.execute(
            text(f"""
                INSERT INTO "{schema_name}".user_roles (user_id, role_id)
                SELECT :user_id, id FROM "{schema_name}".roles WHERE slug = 'admin'
            """),
            {"user_id": str(admin_user_id)},
        )

        return {
            "id": tenant.id, "name": tenant.name, "slug": tenant.slug,
            "schema_name": schema_name, "document": tenant.document,
            "email": tenant.email, "phone": tenant.phone,
            "plan_id": tenant.plan_id, "plan_name": plan.name,
            "status": tenant.status, "trial_ends_at": tenant.trial_ends_at,
            "logo_url": tenant.logo_url, "settings": tenant.settings,
            "created_at": tenant.created_at, "updated_at": tenant.updated_at,
        }

    async def update_tenant(self, tenant_id: UUID, data: TenantUpdate) -> Tenant:
        tenant = await self.get_tenant(tenant_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tenant, key, value)
        await self.db.flush()
        return tenant

    async def update_status(self, tenant_id: UUID, new_status: str) -> Tenant:
        tenant = await self.get_tenant(tenant_id)
        tenant.status = new_status
        await self.db.flush()
        return tenant
