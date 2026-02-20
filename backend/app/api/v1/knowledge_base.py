from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.knowledge_base import (
    KBArticleCreate, KBArticleListResponse, KBArticleResponse, KBArticleUpdate,
    KBCategoryCreate, KBCategoryResponse, KBCategoryUpdate,
)
from app.services.knowledge_base_service import KnowledgeBaseService

router = APIRouter(prefix="/knowledge-base", tags=["Base de Conhecimento"])


# ── Categorias ───────────────────────────────────────
@router.get("/categories")
async def list_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "read"),
):
    service = KnowledgeBaseService(db)
    return await service.list_categories()


@router.post("/categories", response_model=KBCategoryResponse, status_code=201)
async def create_category(
    data: KBCategoryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "create"),
):
    service = KnowledgeBaseService(db)
    return await service.create_category(data)


@router.put("/categories/{category_id}", response_model=KBCategoryResponse)
async def update_category(
    category_id: UUID,
    data: KBCategoryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "update"),
):
    service = KnowledgeBaseService(db)
    return await service.update_category(category_id, data)


# ── Artigos ──────────────────────────────────────────
@router.get("/articles", response_model=KBArticleListResponse)
async def list_articles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "read"),
    search: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    service = KnowledgeBaseService(db)
    return await service.list_articles(
        search=search, category_id=category_id, status=status,
        content_type=content_type, visibility=visibility,
        page=page, per_page=per_page,
    )


@router.post("/articles", response_model=KBArticleResponse, status_code=201)
async def create_article(
    data: KBArticleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "create"),
):
    service = KnowledgeBaseService(db)
    return await service.create_article(data, created_by=current_user["id"])


@router.get("/articles/{article_id}", response_model=KBArticleResponse)
async def get_article(
    article_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "read"),
):
    service = KnowledgeBaseService(db)
    return await service.get_article(article_id)


@router.put("/articles/{article_id}", response_model=KBArticleResponse)
async def update_article(
    article_id: UUID,
    data: KBArticleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "update"),
):
    service = KnowledgeBaseService(db)
    return await service.update_article(article_id, data, edited_by=current_user["id"])


@router.patch("/articles/{article_id}/publish")
async def publish_article(
    article_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("knowledge_base", "publish"),
):
    service = KnowledgeBaseService(db)
    article = await service.publish_article(article_id)
    return {"message": "Artigo publicado", "id": str(article.id)}
