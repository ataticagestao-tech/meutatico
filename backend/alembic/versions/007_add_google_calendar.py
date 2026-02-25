"""add google_oauth_tokens table and google calendar columns to calendar_events

Revision ID: 007_google_cal
Revises: 006_financial_cid
Create Date: 2026-02-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_google_cal'
down_revision: Union[str, None] = '006_financial_cid'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Google OAuth tokens (per-user)
    op.create_table(
        "google_oauth_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("access_token", sa.Text, nullable=False),
        sa.Column("refresh_token", sa.Text, nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scopes", sa.String(500), nullable=False, server_default=""),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Google Calendar fields on calendar_events
    with op.batch_alter_table("calendar_events") as batch_op:
        batch_op.add_column(sa.Column("google_event_id", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("sync_source", sa.String(20), nullable=False, server_default="local"))
        batch_op.add_column(sa.Column("location", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("meet_link", sa.String(500), nullable=True))
        batch_op.create_unique_constraint("uq_calendar_events_google_event_id", ["google_event_id"])


def downgrade() -> None:
    with op.batch_alter_table("calendar_events") as batch_op:
        batch_op.drop_constraint("uq_calendar_events_google_event_id", type_="unique")
        batch_op.drop_column("meet_link")
        batch_op.drop_column("location")
        batch_op.drop_column("sync_source")
        batch_op.drop_column("google_event_id")

    op.drop_table("google_oauth_tokens")
