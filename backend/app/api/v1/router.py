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
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.settings import router as settings_router
from app.api.v1.calendar import router as calendar_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.financeiro import router as financeiro_router
from app.api.v1.onedrive import router as onedrive_router
from app.api.v1.templates import router as templates_router
from app.api.v1.comunicacao import router as comunicacao_router
from app.api.v1.sla import router as sla_router
from app.api.v1.whatsapp import router as whatsapp_router
from app.api.v1.google_calendar import router as google_calendar_router
from app.api.v1.instagram import router as instagram_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.plano_contas import router as plano_contas_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(super_admin_router)
api_router.include_router(dashboard_router)
api_router.include_router(users_router)
api_router.include_router(roles_router)
api_router.include_router(clients_router)
api_router.include_router(tickets_router)
api_router.include_router(tasks_router)
api_router.include_router(kb_router)
api_router.include_router(documents_router)
api_router.include_router(notifications_router)
api_router.include_router(settings_router)
api_router.include_router(calendar_router)
api_router.include_router(onboarding_router)
api_router.include_router(financeiro_router)
api_router.include_router(onedrive_router)
api_router.include_router(templates_router)
api_router.include_router(comunicacao_router)
api_router.include_router(sla_router)
api_router.include_router(whatsapp_router)
api_router.include_router(google_calendar_router)
api_router.include_router(instagram_router)
api_router.include_router(audit_logs_router)
api_router.include_router(plano_contas_router)
