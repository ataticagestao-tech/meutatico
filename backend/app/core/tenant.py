from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class TenantMiddleware:
    """
    Gerencia o isolamento de dados por tenant via schema do PostgreSQL.
    """

    @staticmethod
    async def set_tenant_schema(db_session: AsyncSession, schema_name: str) -> None:
        """Define o schema do PostgreSQL para a sessão atual."""
        safe_schema = (
            schema_name.replace('"', "").replace("'", "").replace(";", "")
        )
        if safe_schema != schema_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant schema",
            )
        await db_session.execute(
            text(f'SET search_path TO "{safe_schema}", public')
        )

    @staticmethod
    def get_schema_from_token(token_payload: dict) -> str:
        """Extrai o schema name do payload JWT."""
        schema = token_payload.get("tenant_schema")
        if not schema:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tenant not found in token",
            )
        return schema
