import uuid as uuid_module

from sqlalchemy import JSON, String, TypeDecorator, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ── Tipos compatíveis com SQLite ──────────────────

class GUID(TypeDecorator):
    """UUID armazenado como String(36) no SQLite."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return uuid_module.UUID(str(value))
            except (ValueError, AttributeError):
                return value
        return value


# ── Engine e Session ──────────────────────────────

engine_kwargs = {"echo": settings.DEBUG}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = settings.DATABASE_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DATABASE_MAX_OVERFLOW

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Habilita foreign keys no SQLite."""
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency que fornece uma sessão de banco de dados."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def set_tenant_schema(session: AsyncSession, schema_name: str) -> None:
    """No-op para SQLite (sem schemas)."""
    pass


async def create_schema(session: AsyncSession, schema_name: str) -> None:
    """No-op para SQLite (sem schemas)."""
    pass
