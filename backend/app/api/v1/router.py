from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.super_admin import router as super_admin_router
from app.api.v1.users import router as users_router
from app.api.v1.roles import router as roles_router
from app.api.v1.clients import router as clients_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.knowledge_base import router as kb_router
from app.api.v1.documents import router as documents_router
from app.api.v1.notifications import router as notifications_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(super_admin_router)
api_router.include_router(users_router)
api_router.include_router(roles_router)
api_router.include_router(clients_router)
api_router.include_router(tickets_router)
api_router.include_router(tasks_router)
api_router.include_router(kb_router)
api_router.include_router(documents_router)
api_router.include_router(notifications_router)
