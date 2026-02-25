"""Add logo fields to clients

Revision ID: 003
Revises: 002
Create Date: 2026-02-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("clients") as batch_op:
        batch_op.add_column(sa.Column("logo_url", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("logo_source", sa.String(20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("clients") as batch_op:
        batch_op.drop_column("logo_source")
        batch_op.drop_column("logo_url")
