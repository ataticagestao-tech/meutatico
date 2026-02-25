"""Add client_partners table

Revision ID: 002
Revises: 001
Create Date: 2026-02-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_partners",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("client_id", sa.String(36), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("document_number", sa.String(20), nullable=True),
        sa.Column("document_type", sa.String(4), nullable=True),
        sa.Column("role", sa.String(255), nullable=True),
        sa.Column("role_code", sa.Integer, nullable=True),
        sa.Column("partner_type", sa.Integer, nullable=False, server_default="2"),
        sa.Column("partner_type_label", sa.String(50), nullable=True),
        sa.Column("entry_date", sa.Date, nullable=True),
        sa.Column("age_range", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), server_default="Brasil"),
        sa.Column("legal_representative_name", sa.String(255), nullable=True),
        sa.Column("legal_representative_document", sa.String(20), nullable=True),
        sa.Column("legal_representative_role", sa.String(255), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="api"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_client_partners_client", "client_partners", ["client_id"])


def downgrade() -> None:
    op.drop_index("idx_client_partners_client", table_name="client_partners")
    op.drop_table("client_partners")
