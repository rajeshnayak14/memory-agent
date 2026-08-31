"""add email to users

Revision ID: 660056c6a1ab
Revises: a97bb285d622
Create Date: 2026-08-20 10:25:29.788506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '660056c6a1ab'
down_revision: Union[str, Sequence[str], None] = 'a97bb285d622'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Autogenerate emitted `None` here, which let Postgres pick the name on the way
# up but made the downgrade fail to compile ("no name"). Pin the name Postgres
# already assigns so both directions work, on new and existing databases alike.
EMAIL_UNIQUE_CONSTRAINT = "users_email_key"


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    op.create_unique_constraint(EMAIL_UNIQUE_CONSTRAINT, 'users', ['email'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(EMAIL_UNIQUE_CONSTRAINT, 'users', type_='unique')
    op.drop_column('users', 'email')
