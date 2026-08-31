"""add expenses and budgets tables

Revision ID: b4c91d2e7f30
Revises: 786ddd2cb4e8
Create Date: 2026-08-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4c91d2e7f30'
down_revision: Union[str, Sequence[str], None] = '786ddd2cb4e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _index_names(table: str) -> set:
    return {
        index['name']
        for index in sa.inspect(op.get_bind()).get_indexes(table)
    }


def upgrade() -> None:
    """Upgrade schema."""
    # These two tables predate this migration on databases that were bootstrapped
    # with `create_all` instead of Alembic. Create them where they are missing,
    # and where they already exist bring them up to the model definition so both
    # paths end at the same schema.
    existing = _existing_tables()

    if 'expenses' in existing:
        _reconcile_expenses()
    else:
        _create_expenses()

    if 'budgets' in existing:
        _reconcile_budgets()
    else:
        _create_budgets()


def _reconcile_expenses() -> None:
    op.alter_column(
        'expenses', 'thread_id',
        existing_type=sa.String(length=100), nullable=False,
    )

    indexes = _index_names('expenses')

    if 'ix_expenses_thread_id' not in indexes:
        op.create_index(
            op.f('ix_expenses_thread_id'), 'expenses', ['thread_id'], unique=False
        )

    if 'ix_expenses_user_id' not in indexes:
        op.create_index(
            op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False
        )


def _reconcile_budgets() -> None:
    op.alter_column(
        'budgets', 'thread_id',
        existing_type=sa.String(length=100), nullable=False,
    )

    indexes = _index_names('budgets')

    for name, column in (
        ('ix_budgets_thread_id', 'thread_id'),
        ('ix_budgets_user_id', 'user_id'),
        ('ix_budgets_period_start', 'period_start'),
        ('ix_budgets_period_end', 'period_end'),
    ):
        if name not in indexes:
            op.create_index(op.f(name), 'budgets', [column], unique=False)


def _create_expenses() -> None:
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('expense_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False
    )
    op.create_index(
        op.f('ix_expenses_thread_id'), 'expenses', ['thread_id'], unique=False
    )


def _create_budgets() -> None:
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_budgets_user_id'), 'budgets', ['user_id'], unique=False
    )
    op.create_index(
        op.f('ix_budgets_thread_id'), 'budgets', ['thread_id'], unique=False
    )
    op.create_index(
        op.f('ix_budgets_period_start'), 'budgets', ['period_start'], unique=False
    )
    op.create_index(
        op.f('ix_budgets_period_end'), 'budgets', ['period_end'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_tables()

    if 'budgets' not in existing and 'expenses' not in existing:
        return

    op.drop_index(op.f('ix_budgets_period_end'), table_name='budgets')
    op.drop_index(op.f('ix_budgets_period_start'), table_name='budgets')
    op.drop_index(op.f('ix_budgets_thread_id'), table_name='budgets')
    op.drop_index(op.f('ix_budgets_user_id'), table_name='budgets')
    op.drop_table('budgets')

    op.drop_index(op.f('ix_expenses_thread_id'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_user_id'), table_name='expenses')
    op.drop_table('expenses')
