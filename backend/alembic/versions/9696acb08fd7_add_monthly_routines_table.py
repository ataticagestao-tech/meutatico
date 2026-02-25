"""add_monthly_routines_table

Revision ID: 9696acb08fd7
Revises: 336dfdf61d76
Create Date: 2026-02-22 17:38:00.425167

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9696acb08fd7'
down_revision: Union[str, None] = '336dfdf61d76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('monthly_routines',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('client_id', sa.String(36), nullable=False),
    sa.Column('month', sa.Integer(), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('contas_pagar', sa.Boolean(), nullable=False),
    sa.Column('contas_receber', sa.Boolean(), nullable=False),
    sa.Column('conciliacao', sa.Boolean(), nullable=False),
    sa.Column('resultado', sa.Boolean(), nullable=False),
    sa.Column('relatorio_enviado', sa.Boolean(), nullable=False),
    sa.Column('contas_pagar_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('contas_receber_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('conciliacao_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('resultado_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('relatorio_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('contas_pagar_by', sa.String(36), nullable=True),
    sa.Column('contas_receber_by', sa.String(36), nullable=True),
    sa.Column('conciliacao_by', sa.String(36), nullable=True),
    sa.Column('resultado_by', sa.String(36), nullable=True),
    sa.Column('relatorio_by', sa.String(36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['conciliacao_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['contas_pagar_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['contas_receber_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['relatorio_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['resultado_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('client_id', 'month', 'year', name='uq_routine_client_month_year')
    )
    with op.batch_alter_table('monthly_routines', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_monthly_routines_client_id'), ['client_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('monthly_routines', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_monthly_routines_client_id'))

    op.drop_table('monthly_routines')
