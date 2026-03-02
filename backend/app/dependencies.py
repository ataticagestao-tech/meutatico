from typing import Annotated, Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.security import decode_token
from app.core.tenant import TenantMiddleware
from app.database import async_session_factory, set_tenant_schema
from app.models.tenant.user import User, UserRole
from app.models.tenant.role import Role, RolePermission
from app.models.tenant.permission import Permission

security_scheme = HTTPBearer(auto_error=False)
tenant_middleware = TenantMiddleware()


async def get_db():
    """Fornece uma sessão de banco de dados."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Optional[str] = Cookie(None),
) -> dict:
    """Extrai e valida o usuário atual do JWT token.
    Aceita token via header Authorization OU cookie httpOnly (mais seguro).
    """
    # Prioridade: 1) Header Authorization, 2) Cookie httpOnly
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Configura o schema do tenant
    tenant_schema = payload.get("tenant_schema")
    if tenant_schema:
        await set_tenant_schema(db, tenant_schema)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    # Busca o usuário com roles e permissões
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
        )

    # Busca roles do usuário
    roles_result = await db.execute(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    roles = roles_result.scalars().all()
    role_slugs = [r.slug for r in roles]

    # Busca permissões de todas as roles do usuário
    permissions_result = await db.execute(
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    permissions = permissions_result.scalars().all()
    permission_keys = list({f"{p.module_key}.{p.action}" for p in permissions})

    return {
        "id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "tenant_schema": tenant_schema,
        "name": user.name,
        "email": user.email,
        "roles": role_slugs,
        "permissions": permission_keys,
    }


async def get_current_super_admin(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
) -> dict:
    """Valida o token do SuperAdmin."""
    token = credentials.credentials
    payload = decode_token(token, secret_key=settings.SUPER_ADMIN_SECRET_KEY)

    if not payload or payload.get("type") != "access" or not payload.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de SuperAdmin inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "is_super_admin": True,
    }
