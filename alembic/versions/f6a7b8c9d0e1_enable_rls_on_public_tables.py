"""enable row level security on all public tables

This project's Postgres happens to be hosted on Supabase, which auto-exposes
every table in the `public` schema through its PostgREST REST API (reachable
with the project's public `anon` key) unless Row Level Security is enabled.
Nothing in this app is meant to be reached that way - all access goes
through the FastAPI backend's own auth - so this was a real, unintended
exposure of every table (including revoked_tokens, email_otps, and users)
flagged by Supabase's own security linter.

Enabling RLS with no policies denies the `anon`/`authenticated` PostgREST
roles entirely (RLS defaults to deny-all with zero policies), while leaving
this app fully working: the backend's own DATABASE_URL connects as the
`postgres` role, which has BYPASSRLS in Supabase by default, so none of its
queries are affected.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Every table the Supabase linter flagged as public-with-RLS-disabled.
# store/store_vectors/store_migrations are langgraph's PostgresStore tables
# and checkpoint(s)/checkpoint_blobs/checkpoint_writes/checkpoint_migrations
# are its PostgresSaver tables - not created by our own Alembic migrations,
# but still real tables in `public` that PostgREST exposes the same way.
_TABLES = [
    'alembic_version',
    'users',
    'conversations',
    'expenses',
    'budgets',
    'recurring_expenses',
    'recurring_budgets',
    'notifications',
    'categories',
    'goals',
    'email_otps',
    'revoked_tokens',
    'audit_logs',
    'store',
    'store_vectors',
    'store_migrations',
    'vector_migrations',
    'checkpoints',
    'checkpoint_blobs',
    'checkpoint_writes',
    'checkpoint_migrations',
]


def _existing_tables() -> set:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_tables()

    for table in _TABLES:
        if table in existing:
            op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY;')


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_tables()

    for table in _TABLES:
        if table in existing:
            op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY;')
