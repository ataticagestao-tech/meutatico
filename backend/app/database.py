from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,
)

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
    """Define o search_path do PostgreSQL para o schema do tenant."""
    safe_schema = schema_name.replace('"', "").replace("'", "").replace(";", "")
    if safe_schema != schema_name:
        raise ValueError("Invalid tenant schema name")
    await session.execute(text(f'SET search_path TO "{safe_schema}", public'))


async def create_schema(session: AsyncSession, schema_name: str) -> None:
    """Cria um novo schema no PostgreSQL."""
    safe_schema = schema_name.replace('"', "").replace("'", "").replace(";", "")
    if safe_schema != schema_name:
        raise ValueError("Invalid schema name")
    await session.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{safe_schema}"'))
