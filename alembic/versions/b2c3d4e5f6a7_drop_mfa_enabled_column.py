"""drop mfa_enabled column (mfa is now mandatory) and email_otps.purpose
(only one purpose remains: login)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set:
    return {
        column['name']
        for column in sa.inspect(op.get_bind()).get_columns(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    if 'mfa_enabled' in _existing_columns('users'):
        op.drop_column('users', 'mfa_enabled')

    if 'purpose' in _existing_columns('email_otps'):
        op.drop_column('email_otps', 'purpose')


def downgrade() -> None:
    """Downgrade schema."""
    if 'purpose' not in _existing_columns('email_otps'):
        op.add_column(
            'email_otps',
            sa.Column(
                'purpose', sa.String(length=20),
                nullable=False, server_default='login',
            ),
        )

    if 'mfa_enabled' not in _existing_columns('users'):
        op.add_column(
            'users',
            sa.Column(
                'mfa_enabled', sa.Boolean(),
                nullable=False, server_default=sa.false(),
            ),
        )
