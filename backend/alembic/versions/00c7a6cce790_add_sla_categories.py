"""add_sla_categories

Revision ID: 00c7a6cce790
Revises: d071f6cdd29d
Create Date: 2026-02-22 18:08:38.274388

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00c7a6cce790'
down_revision: Union[str, None] = 'd071f6cdd29d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('sla_categories',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('slug', sa.String(length=50), nullable=False),
    sa.Column('sla_hours', sa.Integer(), nullable=False),
    sa.Column('color', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )


def downgrade() -> None:
    op.drop_table('sla_categories')
