"""add is_admin to users

Revision ID: 6f0e67f630a5
Revises: a4064a032fb0
Create Date: 2026-08-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f0e67f630a5'
down_revision: Union[str, Sequence[str], None] = 'a4064a032fb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set:
    return {
        column['name']
        for column in sa.inspect(op.get_bind()).get_columns(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    if 'is_admin' not in _existing_columns('users'):
        op.add_column(
            'users',
            sa.Column(
                'is_admin', sa.Boolean(),
                nullable=False, server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    """Downgrade schema."""
    if 'is_admin' in _existing_columns('users'):
        op.drop_column('users', 'is_admin')
