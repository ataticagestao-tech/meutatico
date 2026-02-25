"""Add calendar_events table

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("type", sa.String(30), nullable=False, server_default="meeting"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("client_id", sa.String(36), sa.ForeignKey("clients.id")),
        sa.Column("assigned_user_id", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "type IN ('meeting', 'reminder', 'deadline', 'other')",
            name="ck_calendar_events_type",
        ),
    )


def downgrade() -> None:
    op.drop_table("calendar_events")
