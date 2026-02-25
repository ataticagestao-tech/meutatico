"""add_inbox_and_email_templates

Revision ID: d071f6cdd29d
Revises: 31b5a98517c3
Create Date: 2026-02-22 17:54:29.415090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd071f6cdd29d'
down_revision: Union[str, None] = '31b5a98517c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('email_templates',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('subject', sa.String(length=500), nullable=False),
    sa.Column('html_body', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('created_by', sa.String(36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('inbox_messages',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('channel', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('subject', sa.String(length=500), nullable=True),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('sender', sa.String(length=255), nullable=True),
    sa.Column('sender_email', sa.String(length=255), nullable=True),
    sa.Column('client_id', sa.String(36), nullable=True),
    sa.Column('assigned_user_id', sa.String(36), nullable=True),
    sa.Column('task_id', sa.String(36), nullable=True),
    sa.Column('external_id', sa.String(length=500), nullable=True),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assigned_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('inbox_messages')
    op.drop_table('email_templates')
