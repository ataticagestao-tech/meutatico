from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.dependencies import get_current_user, get_db
from app.schemas.task import (
    TaskCreate, TaskListResponse, TaskMoveRequest,
    TaskResponse, TaskTemplateApply, TaskTemplateCreate, TaskTemplateResponse, TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tarefas"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "read"),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_user_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
):
    service = TaskService(db)
    return await service.list_tasks(
        search=search, status=status, priority=priority,
        assigned_user_id=assigned_user_id, client_id=client_id,
        page=page, per_page=per_page,
    )


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "create"),
):
    service = TaskService(db)
    return await service.create_task(data, created_by=current_user["id"])


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "read"),
):
    service = TaskService(db)
    return await service.get_task(task_id)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "update"),
):
    service = TaskService(db)
    return await service.update_task(task_id, data)


@router.patch("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    task_id: UUID,
    data: TaskMoveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "update"),
):
    service = TaskService(db)
    return await service.move_task(task_id, data)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "delete"),
):
    service = TaskService(db)
    await service.delete_task(task_id)


# ── Templates ────────────────────────────────────────
@router.get("/templates/list")
async def list_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "read"),
):
    service = TaskService(db)
    return await service.list_templates()


@router.post("/templates", response_model=TaskTemplateResponse, status_code=201)
async def create_template(
    data: TaskTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "manage"),
):
    service = TaskService(db)
    return await service.create_template(data, created_by=current_user["id"])


@router.post("/templates/seed")
async def seed_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "manage"),
):
    service = TaskService(db)
    return await service.seed_default_templates(created_by=current_user["id"])


@router.post("/templates/{template_id}/apply", response_model=list[TaskResponse])
async def apply_template(
    template_id: UUID,
    data: TaskTemplateApply,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("tasks", "create"),
):
    service = TaskService(db)
    return await service.apply_template(
        template_id=template_id,
        client_id=data.client_id,
        assigned_user_id=data.assigned_user_id,
        created_by=current_user["id"],
    )
