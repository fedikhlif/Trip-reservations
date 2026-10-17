"""Alembic environment configured from application settings and model metadata."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from database import Database, database_url_from_environment
from models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
shared_connection = config.attributes.get("connection")
database_url = (
    shared_connection.engine.url
    if shared_connection is not None
    else database_url_from_environment()
)
config.set_main_option(
    "sqlalchemy.url",
    database_url.render_as_string(hide_password=False).replace("%", "%%"),
)


def run_migrations_offline() -> None:
    """Generate migration SQL without opening a connection."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=database_url.drivername.startswith("sqlite"),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a short-lived engine from the configured URL."""
    if shared_connection is not None:
        context.configure(
            connection=shared_connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=shared_connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    connectable = create_engine(
        database_url,
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args=Database._connection_options(database_url),
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
