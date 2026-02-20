"""Initial public schema

Revision ID: 001
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Plans
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_users", sa.Integer, nullable=False, server_default="5"),
        sa.Column("max_storage_gb", sa.Integer, nullable=False, server_default="5"),
        sa.Column("max_clients", sa.Integer),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("features", postgresql.JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        schema="public",
    )

    # Plan Modules
    op.create_table(
        "plan_modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_key", sa.String(100), nullable=False),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("config", postgresql.JSONB, server_default="{}"),
        sa.UniqueConstraint("plan_id", "module_key"),
        schema="public",
    )

    # Tenants
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("schema_name", sa.String(100), unique=True, nullable=False),
        sa.Column("document", sa.String(20)),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.plans.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True)),
        sa.Column("logo_url", sa.Text),
        sa.Column("settings", postgresql.JSONB, server_default='{"theme":"light","timezone":"America/Sao_Paulo","language":"pt-BR","date_format":"DD/MM/YYYY"}'),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('active', 'inactive', 'suspended', 'trial')", name="ck_tenants_status"),
        schema="public",
    )

    # Super Admins
    op.create_table(
        "super_admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        schema="public",
    )

    # Global Modules
    op.create_table(
        "global_modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("icon", sa.String(50)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        schema="public",
    )

    # Audit Log Global
    op.create_table(
        "audit_log_global",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100)),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("details", postgresql.JSONB, server_default="{}"),
        sa.Column("ip_address", postgresql.INET),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        schema="public",
    )

    # Indexes
    op.create_index("idx_tenants_slug", "tenants", ["slug"], schema="public")
    op.create_index("idx_tenants_status", "tenants", ["status"], schema="public")
    op.create_index("idx_audit_global_actor", "audit_log_global", ["actor_id"], schema="public")
    op.create_index("idx_audit_global_created", "audit_log_global", [sa.text("created_at DESC")], schema="public")


def downgrade() -> None:
    op.drop_table("audit_log_global", schema="public")
    op.drop_table("global_modules", schema="public")
    op.drop_table("super_admins", schema="public")
    op.drop_table("tenants", schema="public")
    op.drop_table("plan_modules", schema="public")
    op.drop_table("plans", schema="public")
