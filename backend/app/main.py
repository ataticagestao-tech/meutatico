import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import api_router
from app.config import settings
from app.exceptions import AppException, app_exception_handler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import os
    from app.database import engine, Base
    from app import models  # noqa
    from app.services.google_calendar_service import refresh_all_expiring_google_tokens

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)

    # Background scheduler — refresca tokens Google a cada 30 min.
    # Renova qualquer token que vai expirar nos proximos 45 min, criando overlap
    # confortavel. Sem isso, tokens ficam stale enquanto ninguem usa Calendar.
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        refresh_all_expiring_google_tokens,
        IntervalTrigger(minutes=30),
        kwargs={"window_minutes": 45},
        id="google_token_refresh",
        max_instances=1,
        coalesce=True,
        next_run_time=None,  # primeira execucao apos 30 min — startup nao bloqueia
    )
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("Background scheduler started (Google token refresh every 30min)")

    yield

    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS — allow_credentials=True exige origens explícitas (não aceita "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"detail": "Registro duplicado ou violacao de constraint."},
    )

# Static files (uploads)
app.mount("/uploads", StaticFiles(directory=settings.STORAGE_LOCAL_PATH), name="uploads")

# API routes
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    """Health check com verificacao do banco de dados."""
    from sqlalchemy import text
    from app.database import async_session_factory

    db_ok = False
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass

    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected" if db_ok else "error",
    }
