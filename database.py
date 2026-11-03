"""SQLAlchemy engine and transaction-scoped session management."""

from contextlib import contextmanager
import os
from pathlib import Path
from typing import Iterator

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from sqlalchemy import URL, create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

# Absolute path to the project root (directory that contains this file).
_PROJECT_ROOT = Path(__file__).parent.resolve()


def database_url_from_environment():
    """Build a SQLAlchemy URL from DATABASE_URL or the DB_* variables.

    The .env file is loaded relative to this file's directory so the Flask
    debug-mode reloader (which may run from a different working directory on
    Windows) always finds it.

    For SQLite, a relative ``database`` path is resolved to an absolute path
    anchored at the project root so every process in the reloader process group
    connects to the same database file.
    """
    load_dotenv(dotenv_path=_PROJECT_ROOT / ".env")
    configured_url = os.getenv("DATABASE_URL")
    if configured_url:
        url = make_url(configured_url)
        # Make relative SQLite paths absolute so debug reloader uses same file.
        if (
            url.drivername.startswith("sqlite")
            and url.database
            and not Path(url.database).is_absolute()
        ):
            abs_db = str(_PROJECT_ROOT / url.database)
            return make_url(f"sqlite:///{abs_db}")
        return url

    missing = [
        name for name in ("DB_NAME", "DB_USER", "DB_PASSWORD")
        if os.getenv(name) is None
    ]
    if missing:
        raise RuntimeError(
            "Database configuration is missing: " + ", ".join(missing)
        )
    return URL.create(
        "mysql+pymysql",
        username=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.environ["DB_NAME"],
        query={"charset": "utf8mb4"},
    )


class Database:
    """Own a SQLAlchemy engine and a transaction-safe session factory."""

    def __init__(self, url=None, engine: Engine | None = None) -> None:
        self.url = make_url(url) if isinstance(url, str) else url
        if self.url is None:
            self.url = database_url_from_environment()
        self.engine = engine or create_engine(
            self.url,
            pool_pre_ping=True,
            pool_recycle=1800,
            connect_args=self._connection_options(self.url),
        )
        self.session_factory = sessionmaker(
            bind=self.engine,
            class_=Session,
            autoflush=False,
            expire_on_commit=False,
        )
        if self.engine.dialect.name == "sqlite":
            self._enable_sqlite_foreign_keys(self.engine)

    @staticmethod
    def _connection_options(url) -> dict[str, object]:
        """Set connection timeouts for the supported MySQL and SQLite drivers."""
        if url.drivername.startswith("mysql"):
            return {"connect_timeout": 10}
        if url.drivername.startswith("sqlite"):
            return {"timeout": 10, "check_same_thread": False}
        return {}

    @staticmethod
    def _enable_sqlite_foreign_keys(engine: Engine) -> None:
        """Enable SQLite foreign keys for isolated development/test databases."""
        @event.listens_for(engine, "connect")
        def set_foreign_keys(dbapi_connection, connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    @contextmanager
    def session_scope(self) -> Iterator[Session]:
        """Commit on success, roll back on failure, and always close the session."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except BaseException:
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        """Close pooled DBAPI connections."""
        self.engine.dispose()


def upgrade_schema(database: Database) -> None:
    """Apply checked-in Alembic migrations to the supplied database engine."""
    config = Config(str(Path(__file__).with_name("alembic.ini")))
    with database.engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
