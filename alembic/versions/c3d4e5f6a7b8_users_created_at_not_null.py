"""users.created_at: enforce NOT NULL (matches the model; the original
migration left it nullable by mistake, harmless since the ORM always
supplies a value, but flagged by `alembic check` on any fresh database)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _is_nullable(table: str, column: str) -> bool:
    for col in sa.inspect(op.get_bind()).get_columns(table):
        if col['name'] == column:
            return col['nullable']
    return False


def upgrade() -> None:
    """Upgrade schema."""
    if _is_nullable('users', 'created_at'):
        op.execute(
            "UPDATE users SET created_at = now() WHERE created_at IS NULL"
        )
        op.alter_column('users', 'created_at', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    if not _is_nullable('users', 'created_at'):
        op.alter_column('users', 'created_at', nullable=True)
