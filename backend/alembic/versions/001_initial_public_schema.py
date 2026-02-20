"""Initial schema - all tables (SQLite compatible)

Revision ID: 001
Revises:
Create Date: 2024-01-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Usa metadata.create_all para criar todas as tabelas de uma vez
    from app.database import Base
    from app.models import *  # noqa: F401, F403

    bind = op.get_bind()
    Base.metadata.create_all(bind)


def downgrade() -> None:
    from app.database import Base
    from app.models import *  # noqa: F401, F403

    bind = op.get_bind()
    Base.metadata.drop_all(bind)
