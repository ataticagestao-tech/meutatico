from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import set_tenant_schema
from app.exceptions import BadRequestException, NotFoundException, UnauthorizedException
from app.models.public.super_admin import SuperAdmin
from app.models.public.tenant import Tenant
from app.models.tenant.permission import Permission
from app.models.tenant.role import Role, RolePermission
from app.models.tenant.user import User, UserRole


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, email: str, password: str) -> dict:
        """Login de usuário do tenant."""
        # Busca o usuário em todos os tenants (via search em public.tenants)
        tenants_result = await self.db.execute(select(Tenant).where(Tenant.status == "active"))
        tenants = tenants_result.scalars().all()

        for tenant in tenants:
            await set_tenant_schema(self.db, tenant.schema_name)
            result = await self.db.execute(
                select(User).where(User.email == email, User.is_active == True)
            )
            user = result.scalar_one_or_none()
            if user and verify_password(password, user.password_hash):
                # Busca roles e permissões
                roles_result = await self.db.execute(
                    select(Role)
                    .join(UserRole, UserRole.role_id == Role.id)
                    .where(UserRole.user_id == user.id)
                )
                roles = roles_result.scalars().all()
                role_slugs = [r.slug for r in roles]

                perms_result = await self.db.execute(
                    select(Permission)
                    .join(RolePermission, RolePermission.permission_id == Permission.id)
                    .join(Role, Role.id == RolePermission.role_id)
                    .join(UserRole, UserRole.role_id == Role.id)
                    .where(UserRole.user_id == user.id)
                )
                permissions = perms_result.scalars().all()
                perm_keys = list({f"{p.module_key}.{p.action}" for p in permissions})

                # Atualiza último login
                user.last_login_at = datetime.now(timezone.utc)
                await self.db.flush()

                token_data = {
                    "sub": str(user.id),
                    "tenant_id": str(tenant.id),
                    "tenant_schema": tenant.schema_name,
                    "roles": role_slugs,
                    "permissions": perm_keys,
                }

                access_token = create_access_token(token_data)
                refresh_token = create_refresh_token(token_data)

                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "user": {
                        "id": str(user.id),
                        "name": user.name,
                        "email": user.email,
                        "roles": role_slugs,
                        "permissions": perm_keys,
                    },
                    "tenant": {
                        "id": str(tenant.id),
                        "name": tenant.name,
                        "slug": tenant.slug,
                        "schema_name": tenant.schema_name,
                    },
                }

        raise UnauthorizedException("Email ou senha inválidos")

    async def refresh_token(self, refresh_token_str: str) -> dict:
        """Gera novo access token a partir do refresh token."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Refresh token inválido")

        # Blacklist desabilitada (sem Redis no modo SQLite local)

        token_data = {
            "sub": payload.get("sub"),
            "tenant_id": payload.get("tenant_id"),
            "tenant_schema": payload.get("tenant_schema"),
            "roles": payload.get("roles", []),
            "permissions": payload.get("permissions", []),
        }

        new_access = create_access_token(token_data)
        return {"access_token": new_access}

    async def logout(self, refresh_token_str: str) -> None:
        """Logout (sem Redis, apenas invalida no client-side)."""
        pass

    async def super_admin_login(self, email: str, password: str) -> dict:
        """Login do SuperAdmin."""
        result = await self.db.execute(
            select(SuperAdmin).where(
                SuperAdmin.email == email, SuperAdmin.is_active == True
            )
        )
        admin = result.scalar_one_or_none()

        if not admin or not verify_password(password, admin.password_hash):
            raise UnauthorizedException("Email ou senha inválidos")

        admin.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        token_data = {
            "sub": str(admin.id),
            "email": admin.email,
            "is_super_admin": True,
        }

        access_token = create_access_token(
            token_data, secret_key=settings.SUPER_ADMIN_SECRET_KEY
        )
        refresh_token = create_refresh_token(
            token_data, secret_key=settings.SUPER_ADMIN_SECRET_KEY
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": str(admin.id),
                "name": admin.name,
                "email": admin.email,
                "roles": ["super_admin"],
                "permissions": [],
            },
        }
