"""add notifications, categories, goals tables

Revision ID: a4064a032fb0
Revises: b6712d32e4c4
Create Date: 2026-08-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4064a032fb0'
down_revision: Union[str, Sequence[str], None] = 'b6712d32e4c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_tables()

    if 'notifications' not in existing:
        _create_notifications()

    if 'categories' not in existing:
        _create_categories()

    if 'goals' not in existing:
        _create_goals()


def _create_notifications() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('budget_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('body', sa.String(length=500), nullable=False),
        sa.Column(
            'read', sa.Boolean(),
            nullable=False, server_default=sa.false(),
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['budget_id'], ['budgets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_notifications_budget_id'), 'notifications', ['budget_id'], unique=False,
    )
    op.create_index(
        op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False,
    )


def _create_categories() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column(
            'icon', sa.String(length=50),
            nullable=False, server_default='Tag',
        ),
        sa.Column(
            'color', sa.String(length=7),
            nullable=False, server_default='#1f4d3b',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_categories_user_id'), 'categories', ['user_id'], unique=False,
    )


def _create_goals() -> None:
    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('target_amount', sa.Float(), nullable=False),
        sa.Column(
            'current_amount', sa.Float(),
            nullable=False, server_default='0',
        ),
        sa.Column(
            'currency', sa.String(length=3),
            nullable=False, server_default='INR',
        ),
        sa.Column('target_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_goals_user_id'), 'goals', ['user_id'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_tables()

    if 'goals' in existing:
        op.drop_index(op.f('ix_goals_user_id'), table_name='goals')
        op.drop_table('goals')

    if 'categories' in existing:
        op.drop_index(op.f('ix_categories_user_id'), table_name='categories')
        op.drop_table('categories')

    if 'notifications' in existing:
        op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
        op.drop_index(op.f('ix_notifications_budget_id'), table_name='notifications')
        op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
        op.drop_table('notifications')
