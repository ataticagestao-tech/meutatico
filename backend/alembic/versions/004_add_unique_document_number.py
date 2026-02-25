"""Add unique constraint on clients document_number

Revision ID: 004
Revises: 003
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove duplicate document_numbers first (keep the oldest record)
    conn = op.get_bind()
    conn.execute(sa.text("""
        DELETE FROM clients WHERE id IN (
            SELECT c2.id FROM clients c1
            JOIN clients c2 ON c1.document_number = c2.document_number
            AND c1.created_at < c2.created_at
        )
    """))

    with op.batch_alter_table("clients") as batch_op:
        batch_op.create_unique_constraint(
            "uq_clients_document_number", ["document_number"]
        )


def downgrade() -> None:
    with op.batch_alter_table("clients") as batch_op:
        batch_op.drop_constraint("uq_clients_document_number", type_="unique")
