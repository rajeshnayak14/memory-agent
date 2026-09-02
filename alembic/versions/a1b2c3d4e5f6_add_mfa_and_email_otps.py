"""add mfa_enabled to users and email_otps table

Revision ID: a1b2c3d4e5f6
Revises: 6f0e67f630a5
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6f0e67f630a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _existing_columns(table: str) -> set:
    return {
        column['name']
        for column in sa.inspect(op.get_bind()).get_columns(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    if 'mfa_enabled' not in _existing_columns('users'):
        op.add_column(
            'users',
            sa.Column(
                'mfa_enabled', sa.Boolean(),
                nullable=False, server_default=sa.false(),
            ),
        )

    if 'email_otps' not in _existing_tables():
        op.create_table(
            'email_otps',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('purpose', sa.String(length=20), nullable=False),
            sa.Column('code_hash', sa.String(length=64), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('consumed', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_email_otps_user_id', 'email_otps', ['user_id'])
        op.create_index('ix_email_otps_created_at', 'email_otps', ['created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    if 'email_otps' in _existing_tables():
        op.drop_table('email_otps')

    if 'mfa_enabled' in _existing_columns('users'):
        op.drop_column('users', 'mfa_enabled')
