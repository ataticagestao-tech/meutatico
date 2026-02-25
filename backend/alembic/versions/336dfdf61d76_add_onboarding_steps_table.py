"""add_onboarding_steps_table

Revision ID: 336dfdf61d76
Revises: 005
Create Date: 2026-02-22 17:27:21.034866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '336dfdf61d76'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('onboarding_steps',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('client_id', sa.String(36), nullable=False),
    sa.Column('step', sa.String(length=50), nullable=False),
    sa.Column('label', sa.String(length=255), nullable=False),
    sa.Column('is_done', sa.Boolean(), nullable=False),
    sa.Column('done_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('done_by', sa.String(36), nullable=True),
    sa.Column('order', sa.String(length=10), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['done_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('onboarding_steps', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_onboarding_steps_client_id'), ['client_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('onboarding_steps', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_onboarding_steps_client_id'))

    op.drop_table('onboarding_steps')
