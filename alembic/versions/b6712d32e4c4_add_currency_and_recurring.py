"""add currency columns and recurring expenses/budgets

Revision ID: b6712d32e4c4
Revises: b4c91d2e7f30
Create Date: 2026-08-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6712d32e4c4'
down_revision: Union[str, Sequence[str], None] = 'b4c91d2e7f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _existing_columns(table: str) -> set:
    return {
        column['name']
        for column in sa.inspect(op.get_bind()).get_columns(table)
    }


def _index_names(table: str) -> set:
    return {
        index['name']
        for index in sa.inspect(op.get_bind()).get_indexes(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    if 'preferred_currency' not in _existing_columns('users'):
        op.add_column(
            'users',
            sa.Column(
                'preferred_currency', sa.String(length=3),
                nullable=False, server_default='INR',
            ),
        )

    if 'currency' not in _existing_columns('expenses'):
        op.add_column(
            'expenses',
            sa.Column(
                'currency', sa.String(length=3),
                nullable=False, server_default='INR',
            ),
        )

    if 'currency' not in _existing_columns('budgets'):
        op.add_column(
            'budgets',
            sa.Column(
                'currency', sa.String(length=3),
                nullable=False, server_default='INR',
            ),
        )

    existing = _existing_tables()

    if 'recurring_expenses' not in existing:
        _create_recurring_expenses()

    if 'recurring_budgets' not in existing:
        _create_recurring_budgets()


def _create_recurring_expenses() -> None:
    op.create_table(
        'recurring_expenses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column(
            'currency', sa.String(length=3),
            nullable=False, server_default='INR',
        ),
        sa.Column('frequency', sa.String(length=20), nullable=False),
        sa.Column('next_run_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            'active', sa.Boolean(),
            nullable=False, server_default=sa.true(),
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_recurring_expenses_user_id'),
        'recurring_expenses', ['user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_recurring_expenses_thread_id'),
        'recurring_expenses', ['thread_id'], unique=False,
    )


def _create_recurring_budgets() -> None:
    op.create_table(
        'recurring_budgets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column(
            'currency', sa.String(length=3),
            nullable=False, server_default='INR',
        ),
        sa.Column('frequency', sa.String(length=20), nullable=False),
        sa.Column(
            'next_period_start', sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            'active', sa.Boolean(),
            nullable=False, server_default=sa.true(),
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_recurring_budgets_user_id'),
        'recurring_budgets', ['user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_recurring_budgets_thread_id'),
        'recurring_budgets', ['thread_id'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_tables()

    if 'recurring_budgets' in existing:
        op.drop_index(
            op.f('ix_recurring_budgets_thread_id'),
            table_name='recurring_budgets',
        )
        op.drop_index(
            op.f('ix_recurring_budgets_user_id'),
            table_name='recurring_budgets',
        )
        op.drop_table('recurring_budgets')

    if 'recurring_expenses' in existing:
        op.drop_index(
            op.f('ix_recurring_expenses_thread_id'),
            table_name='recurring_expenses',
        )
        op.drop_index(
            op.f('ix_recurring_expenses_user_id'),
            table_name='recurring_expenses',
        )
        op.drop_table('recurring_expenses')

    if 'currency' in _existing_columns('budgets'):
        op.drop_column('budgets', 'currency')

    if 'currency' in _existing_columns('expenses'):
        op.drop_column('expenses', 'currency')

    if 'preferred_currency' in _existing_columns('users'):
        op.drop_column('users', 'preferred_currency')
