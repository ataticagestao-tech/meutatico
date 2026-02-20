import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.tenant.knowledge_base import KnowledgeBaseArticle, KnowledgeBaseCategory
from app.schemas.knowledge_base import (
    KBArticleCreate,
    KBArticleUpdate,
    KBCategoryCreate,
    KBCategoryUpdate,
)


class KnowledgeBaseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Categories ──────────────────────────────────────────────────────

    async def list_categories(
        self,
        parent_category_id: UUID | None = None,
        include_children: bool = False,
    ) -> list[dict]:
        query = select(KnowledgeBaseCategory)

        if parent_category_id:
            query = query.where(
                KnowledgeBaseCategory.parent_category_id == parent_category_id
            )
        elif not include_children:
            # Se nao filtramos por parent, retorna apenas raiz
            query = query.where(
                KnowledgeBaseCategory.parent_category_id.is_(None)
            )

        if include_children:
            query = query.options(
                selectinload(KnowledgeBaseCategory.children)
            )

        query = query.order_by(KnowledgeBaseCategory.sort_order.asc())
        result = await self.db.execute(query)
        categories = result.scalars().unique().all()

        items = []
        for c in categories:
            # Conta artigos publicados na categoria
            article_count_result = await self.db.execute(
                select(func.count())
                .select_from(KnowledgeBaseArticle)
                .where(
                    KnowledgeBaseArticle.category_id == c.id,
                    KnowledgeBaseArticle.status == "published",
                )
            )
            article_count = article_count_result.scalar()

            item = {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "icon": c.icon,
                "parent_category_id": c.parent_category_id,
                "sort_order": c.sort_order,
                "article_count": article_count,
                "created_at": c.created_at,
            }
            items.append(item)

        return items

    async def create_category(self, data: KBCategoryCreate) -> KnowledgeBaseCategory:
        # Verifica slug duplicado
        existing = await self.db.execute(
            select(KnowledgeBaseCategory).where(
                KnowledgeBaseCategory.slug == data.slug
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictException("J\u00e1 existe uma categoria com este slug")

        # Verifica parent se informado
        if data.parent_category_id:
            parent = await self.db.execute(
                select(KnowledgeBaseCategory).where(
                    KnowledgeBaseCategory.id == data.parent_category_id
                )
            )
            if not parent.scalar_one_or_none():
                raise BadRequestException("Categoria pai n\u00e3o encontrada")

        category = KnowledgeBaseCategory(**data.model_dump())
        self.db.add(category)
        await self.db.flush()
        return category

    async def update_category(
        self, category_id: UUID, data: KBCategoryUpdate
    ) -> KnowledgeBaseCategory:
        result = await self.db.execute(
            select(KnowledgeBaseCategory).where(
                KnowledgeBaseCategory.id == category_id
            )
        )
        category = result.scalar_one_or_none()
        if not category:
            raise NotFoundException("Categoria n\u00e3o encontrada")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)

        await self.db.flush()
        return category

    # ── Articles ────────────────────────────────────────────────────────

    async def list_articles(
        self,
        search: str | None = None,
        category_id: UUID | None = None,
        status: str | None = None,
        visibility: str | None = None,
        content_type: str | None = None,
        is_pinned: bool | None = None,
        client_id: UUID | None = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        query = select(KnowledgeBaseArticle)
        count_query = select(func.count()).select_from(KnowledgeBaseArticle)

        if search:
            search_filter = (
                KnowledgeBaseArticle.title.ilike(f"%{search}%")
                | KnowledgeBaseArticle.body.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if category_id:
            query = query.where(KnowledgeBaseArticle.category_id == category_id)
            count_query = count_query.where(
                KnowledgeBaseArticle.category_id == category_id
            )

        if status:
            query = query.where(KnowledgeBaseArticle.status == status)
            count_query = count_query.where(KnowledgeBaseArticle.status == status)

        if visibility:
            query = query.where(KnowledgeBaseArticle.visibility == visibility)
            count_query = count_query.where(
                KnowledgeBaseArticle.visibility == visibility
            )

        if content_type:
            query = query.where(KnowledgeBaseArticle.content_type == content_type)
            count_query = count_query.where(
                KnowledgeBaseArticle.content_type == content_type
            )

        if is_pinned is not None:
            query = query.where(KnowledgeBaseArticle.is_pinned == is_pinned)
            count_query = count_query.where(
                KnowledgeBaseArticle.is_pinned == is_pinned
            )

        if client_id:
            query = query.where(KnowledgeBaseArticle.client_id == client_id)
            count_query = count_query.where(
                KnowledgeBaseArticle.client_id == client_id
            )

        total = (await self.db.execute(count_query)).scalar()

        # Sorting (pinned first, then by sort_by)
        sort_col = getattr(KnowledgeBaseArticle, sort_by, KnowledgeBaseArticle.created_at)
        query = query.order_by(
            KnowledgeBaseArticle.is_pinned.desc(),
            sort_col.desc() if sort_order == "desc" else sort_col.asc(),
        )

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        articles = result.scalars().all()

        items = []
        for a in articles:
            category_name = None
            if a.category_id:
                cat_result = await self.db.execute(
                    select(KnowledgeBaseCategory.name).where(
                        KnowledgeBaseCategory.id == a.category_id
                    )
                )
                category_name = cat_result.scalar_one_or_none()

            items.append({
                "id": a.id,
                "category_id": a.category_id,
                "category_name": category_name,
                "title": a.title,
                "slug": a.slug,
                "content_type": a.content_type,
                "body": a.body,
                "video_url": a.video_url,
                "video_thumbnail_url": a.video_thumbnail_url,
                "attachments": a.attachments or [],
                "status": a.status,
                "is_pinned": a.is_pinned,
                "view_count": a.view_count,
                "visibility": a.visibility,
                "client_id": a.client_id,
                "tags": a.tags or [],
                "version": a.version,
                "last_edited_by": a.last_edited_by,
                "created_by": a.created_by,
                "created_at": a.created_at,
                "updated_at": a.updated_at,
                "published_at": a.published_at,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_article(self, article_id: UUID, increment_view: bool = True) -> dict:
        result = await self.db.execute(
            select(KnowledgeBaseArticle).where(
                KnowledgeBaseArticle.id == article_id
            )
        )
        article = result.scalar_one_or_none()
        if not article:
            raise NotFoundException("Artigo n\u00e3o encontrado")

        # Incrementa view_count
        if increment_view:
            article.view_count = (article.view_count or 0) + 1
            await self.db.flush()

        category_name = None
        if article.category_id:
            cat_result = await self.db.execute(
                select(KnowledgeBaseCategory.name).where(
                    KnowledgeBaseCategory.id == article.category_id
                )
            )
            category_name = cat_result.scalar_one_or_none()

        return {
            "id": article.id,
            "category_id": article.category_id,
            "category_name": category_name,
            "title": article.title,
            "slug": article.slug,
            "content_type": article.content_type,
            "body": article.body,
            "video_url": article.video_url,
            "video_thumbnail_url": article.video_thumbnail_url,
            "attachments": article.attachments or [],
            "status": article.status,
            "is_pinned": article.is_pinned,
            "view_count": article.view_count,
            "visibility": article.visibility,
            "client_id": article.client_id,
            "tags": article.tags or [],
            "version": article.version,
            "last_edited_by": article.last_edited_by,
            "created_by": article.created_by,
            "created_at": article.created_at,
            "updated_at": article.updated_at,
            "published_at": article.published_at,
        }

    async def create_article(
        self, data: KBArticleCreate, created_by: UUID
    ) -> dict:
        # Verifica slug duplicado
        existing = await self.db.execute(
            select(KnowledgeBaseArticle).where(
                KnowledgeBaseArticle.slug == data.slug
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictException("J\u00e1 existe um artigo com este slug")

        # Verifica categoria se informada
        if data.category_id:
            cat_result = await self.db.execute(
                select(KnowledgeBaseCategory).where(
                    KnowledgeBaseCategory.id == data.category_id
                )
            )
            if not cat_result.scalar_one_or_none():
                raise BadRequestException("Categoria n\u00e3o encontrada")

        article_data = data.model_dump()
        article_data["created_by"] = created_by
        article_data["last_edited_by"] = created_by

        # Se status \u00e9 published, marca published_at
        if article_data.get("status") == "published":
            article_data["published_at"] = datetime.now(timezone.utc)

        article = KnowledgeBaseArticle(**article_data)
        self.db.add(article)
        await self.db.flush()

        return await self.get_article(article.id, increment_view=False)

    async def update_article(
        self, article_id: UUID, data: KBArticleUpdate, edited_by: UUID
    ) -> dict:
        result = await self.db.execute(
            select(KnowledgeBaseArticle).where(
                KnowledgeBaseArticle.id == article_id
            )
        )
        article = result.scalar_one_or_none()
        if not article:
            raise NotFoundException("Artigo n\u00e3o encontrado")

        update_data = data.model_dump(exclude_unset=True)

        # Incrementa vers\u00e3o
        article.version = (article.version or 1) + 1
        article.last_edited_by = edited_by

        # Gerencia published_at
        new_status = update_data.get("status")
        if new_status == "published" and article.status != "published":
            article.published_at = datetime.now(timezone.utc)

        for key, value in update_data.items():
            setattr(article, key, value)

        await self.db.flush()
        return await self.get_article(article_id, increment_view=False)

    async def publish_article(self, article_id: UUID, published_by: UUID) -> dict:
        result = await self.db.execute(
            select(KnowledgeBaseArticle).where(
                KnowledgeBaseArticle.id == article_id
            )
        )
        article = result.scalar_one_or_none()
        if not article:
            raise NotFoundException("Artigo n\u00e3o encontrado")

        if article.status == "published":
            raise BadRequestException("Artigo j\u00e1 est\u00e1 publicado")

        article.status = "published"
        article.published_at = datetime.now(timezone.utc)
        article.last_edited_by = published_by
        await self.db.flush()

        return await self.get_article(article_id, increment_view=False)
