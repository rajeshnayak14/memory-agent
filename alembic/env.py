from logging.config import fileConfig
import os

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from dotenv import load_dotenv

from app.database import Base
from app import model  # noqa: F401  (registers every table on Base.metadata)


config = context.config

load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise ValueError("DATABASE_URL is not set")

alembic_url = database_url.replace(
    "postgresql://",
    "postgresql+psycopg://",
    1,
)

config.set_main_option(
    "sqlalchemy.url",
    alembic_url.replace("%", "%%"),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = Base.metadata


# LangGraph's PostgresSaver/PostgresStore create and migrate these themselves.
# Alembic must never try to manage or drop them.
EXTERNAL_TABLES = {
    "checkpoints",
    "checkpoint_blobs",
    "checkpoint_writes",
    "checkpoint_migrations",
    "store",
    "store_migrations",
    "store_vectors",
    "vector_migrations",
}


def include_object(
    object,
    name,
    type_,
    reflected,
    compare_to,
):
    # Let Alembic manage every application table, but leave the tables owned
    # by LangGraph alone. Previously this allowed only "users", which is why
    # `expenses` and `budgets` never got a migration generated for them.
    if type_ == "table" and reflected:
        return name not in EXTERNAL_TABLES

    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(
            config.config_ini_section,
            {},
        ),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()