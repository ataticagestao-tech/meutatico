import math
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password, validate_password_strength
from app.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.tenant.role import Role
from app.models.tenant.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users(
        self,
        search: str | None = None,
        is_active: bool | None = None,
        role_id: UUID | None = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        query = select(User).options(
            selectinload(User.user_roles).selectinload(UserRole.role)
        )
        count_query = select(func.count()).select_from(User)

        if search:
            search_filter = User.name.ilike(f"%{search}%") | User.email.ilike(
                f"%{search}%"
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        if role_id:
            query = query.where(
                User.id.in_(
                    select(UserRole.user_id).where(UserRole.role_id == role_id)
                )
            )
            count_query = count_query.where(
                User.id.in_(
                    select(UserRole.user_id).where(UserRole.role_id == role_id)
                )
            )

        total = (await self.db.execute(count_query)).scalar()

        # Sorting
        sort_col = getattr(User, sort_by, User.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        users = result.scalars().unique().all()

        items = []
        for u in users:
            roles = [
                {
                    "id": ur.role.id,
                    "name": ur.role.name,
                    "slug": ur.role.slug,
                    "color": ur.role.color,
                }
                for ur in u.user_roles
                if ur.role
            ]
            items.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "avatar_url": u.avatar_url,
                "phone": u.phone,
                "is_active": u.is_active,
                "roles": roles,
                "last_login_at": u.last_login_at,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_user(self, user_id: UUID) -> User:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException("Usu\u00e1rio n\u00e3o encontrado")
        return user

    async def create_user(
        self, data: UserCreate, tenant_id: UUID, created_by: UUID | None = None
    ) -> User:
        # Valida senha
        password_errors = validate_password_strength(data.password)
        if password_errors:
            raise BadRequestException("Senha inv\u00e1lida", errors=password_errors)

        # Verifica email duplicado
        existing = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("J\u00e1 existe um usu\u00e1rio com este email")

        # Valida roles
        if data.role_ids:
            roles_result = await self.db.execute(
                select(func.count())
                .select_from(Role)
                .where(Role.id.in_(data.role_ids))
            )
            if roles_result.scalar() != len(data.role_ids):
                raise BadRequestException("Um ou mais cargos informados n\u00e3o existem")

        # Cria usu\u00e1rio
        user = User(
            tenant_id=tenant_id,
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            phone=data.phone,
        )
        self.db.add(user)
        await self.db.flush()

        # Atribui roles
        for role_id in data.role_ids:
            user_role = UserRole(
                user_id=user.id,
                role_id=role_id,
                assigned_by=created_by,
            )
            self.db.add(user_role)

        await self.db.flush()
        return await self.get_user(user.id)

    async def update_user(
        self, user_id: UUID, data: UserUpdate, updated_by: UUID | None = None
    ) -> User:
        user = await self.get_user(user_id)
        update_data = data.model_dump(exclude_unset=True, exclude={"role_ids"})

        # Verifica email duplicado se estiver alterando
        if "email" in update_data and update_data["email"] != user.email:
            existing = await self.db.execute(
                select(User).where(
                    User.email == update_data["email"], User.id != user_id
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictException("J\u00e1 existe um usu\u00e1rio com este email")

        for key, value in update_data.items():
            setattr(user, key, value)

        # Atualiza roles se informado
        if data.role_ids is not None:
            # Valida roles
            if data.role_ids:
                roles_result = await self.db.execute(
                    select(func.count())
                    .select_from(Role)
                    .where(Role.id.in_(data.role_ids))
                )
                if roles_result.scalar() != len(data.role_ids):
                    raise BadRequestException(
                        "Um ou mais cargos informados n\u00e3o existem"
                    )

            # Remove roles atuais
            existing_roles = await self.db.execute(
                select(UserRole).where(UserRole.user_id == user_id)
            )
            for ur in existing_roles.scalars().all():
                await self.db.delete(ur)

            # Adiciona novas roles
            for role_id in data.role_ids:
                user_role = UserRole(
                    user_id=user_id,
                    role_id=role_id,
                    assigned_by=updated_by,
                )
                self.db.add(user_role)

        await self.db.flush()
        return await self.get_user(user_id)

    async def deactivate_user(self, user_id: UUID) -> User:
        user = await self.get_user(user_id)
        if not user.is_active:
            raise BadRequestException("Usu\u00e1rio j\u00e1 est\u00e1 desativado")
        user.is_active = False
        await self.db.flush()
        return user
