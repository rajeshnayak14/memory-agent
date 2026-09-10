"""add audit_logs table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    """Upgrade schema."""
    if 'audit_logs' not in _existing_tables():
        _create_audit_logs()


def _create_audit_logs() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('actor_username', sa.String(length=100), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('target_username', sa.String(length=100), nullable=True),
        sa.Column('detail', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_audit_logs_actor_user_id'), 'audit_logs', ['actor_user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False,
    )
    op.create_index(
        op.f('ix_audit_logs_target_user_id'), 'audit_logs', ['target_user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    if 'audit_logs' in _existing_tables():
        op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_target_user_id'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_actor_user_id'), table_name='audit_logs')
        op.drop_table('audit_logs')
