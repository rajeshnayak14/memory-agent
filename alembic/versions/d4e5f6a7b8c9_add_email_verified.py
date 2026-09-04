"""add email_verified to users (MFA becomes a one-time registration
verification gate instead of a per-login challenge; Google sign-in
also sets this true immediately since Google already proves ownership)

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set:
    return {
        column['name']
        for column in sa.inspect(op.get_bind()).get_columns(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    if 'email_verified' not in _existing_columns('users'):
        op.add_column(
            'users',
            sa.Column(
                'email_verified', sa.Boolean(),
                nullable=False, server_default=sa.false(),
            ),
        )
        # Every existing account already logged in successfully under the
        # old mandatory-per-login-OTP scheme, which proved email
        # ownership just as well — grandfather them in as verified so
        # nobody who was already using the app gets locked out.
        op.execute("UPDATE users SET email_verified = true WHERE email IS NOT NULL")


def downgrade() -> None:
    """Downgrade schema."""
    if 'email_verified' in _existing_columns('users'):
        op.drop_column('users', 'email_verified')
