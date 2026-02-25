"""add financial_company_id to clients

Revision ID: 006_financial_cid
Revises: 00c7a6cce790
Create Date: 2026-02-22 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_financial_cid'
down_revision: Union[str, None] = '00c7a6cce790'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('financial_company_id', sa.String(100), nullable=True))
    op.create_index('ix_clients_financial_company_id', 'clients', ['financial_company_id'])


def downgrade() -> None:
    op.drop_index('ix_clients_financial_company_id', table_name='clients')
    op.drop_column('clients', 'financial_company_id')
