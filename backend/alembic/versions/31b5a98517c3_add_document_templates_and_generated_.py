"""add_document_templates_and_generated_docs

Revision ID: 31b5a98517c3
Revises: 9696acb08fd7
Create Date: 2026-02-22 17:46:39.787702

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31b5a98517c3'
down_revision: Union[str, None] = '9696acb08fd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('document_templates',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('html_content', sa.Text(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('created_by', sa.String(36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('generated_documents',
    sa.Column('id', sa.String(36), nullable=False),
    sa.Column('template_id', sa.String(36), nullable=False),
    sa.Column('client_id', sa.String(36), nullable=False),
    sa.Column('name', sa.String(length=500), nullable=False),
    sa.Column('file_url', sa.Text(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('generated_by', sa.String(36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['generated_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['template_id'], ['document_templates.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('generated_documents')
    op.drop_table('document_templates')
