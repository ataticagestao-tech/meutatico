import logging
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Cookie, Depends, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshResponse,
    ResetPasswordRequest,
)
from app.services.auth_service import AuthService
from app.services.google_auth_service import GoogleAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def _set_session_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Helper compartilhado: seta os cookies httpOnly de access + refresh."""
    is_production = not settings.DEBUG
    same_site: str = "none" if is_production else "lax"

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite=same_site,
        max_age=7 * 24 * 60 * 60,
        path="/api/v1/auth",
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite=same_site,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/v1",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    result = await service.login(data.email, data.password)

    _set_session_cookies(response, result["access_token"], result["refresh_token"])

    return {
        "access_token": result["access_token"],
        "token_type": "bearer",
        "user": result["user"],
        "tenant": result.get("tenant"),
    }


@router.get("/google/authorize-redirect")
async def google_authorize_redirect():
    """Redireciona para a tela de consentimento do Google.
    Endpoint publico — usuario ainda nao esta autenticado.
    """
    google_svc = GoogleAuthService()

    if not google_svc.is_configured:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason=not_configured"
        )

    url = google_svc.get_authorize_url()
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    code: str | None = Query(None),
    error: str | None = Query(None),
):
    """Callback do Google OAuth. Faz login (ou cria usuario) e redireciona pro frontend."""
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason={quote(error)}"
        )
    if not code:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason=missing_code"
        )

    google_svc = GoogleAuthService()
    if not google_svc.is_configured:
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason=not_configured"
        )

    try:
        google_user = await google_svc.exchange_code(code)
    except Exception as exc:
        logger.warning("Google OAuth exchange falhou: %s", exc)
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason=exchange_failed"
        )

    auth_service = AuthService(db)
    try:
        result = await auth_service.login_or_create_via_google(
            email=google_user["email"],
            name=google_user["name"],
            avatar_url=google_user.get("picture"),
        )
    except Exception as exc:
        logger.exception("Falha ao logar/criar usuario via Google")
        return RedirectResponse(
            url=f"{settings.FRONTEND_BASE_URL}/login?google=error&reason=session_failed"
        )

    redirect = RedirectResponse(url=f"{settings.FRONTEND_BASE_URL}/auth/callback?google=ok")
    _set_session_cookies(redirect, result["access_token"], result["refresh_token"])
    return redirect


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: str | None = Cookie(None),
):
    if not refresh_token:
        from app.exceptions import UnauthorizedException
        raise UnauthorizedException("Refresh token não encontrado")

    service = AuthService(db)
    result = await service.refresh_token(refresh_token)

    # Atualiza o access_token no cookie httpOnly
    is_production = not settings.DEBUG
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/v1",
    )

    return {"access_token": result["access_token"], "token_type": "bearer"}


@router.post("/logout")
async def logout(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: str | None = Cookie(None),
):
    if refresh_token:
        service = AuthService(db)
        await service.logout(refresh_token)

    is_production = not settings.DEBUG
    response.delete_cookie(
        key="refresh_token", path="/api/v1/auth",
        secure=is_production, samesite="none" if is_production else "lax",
    )
    response.delete_cookie(
        key="access_token", path="/api/v1",
        secure=is_production, samesite="none" if is_production else "lax",
    )
    return {"message": "Logout realizado com sucesso"}


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "avatar_url": None,
        "phone": None,
        "roles": current_user["roles"],
        "permissions": current_user["permissions"],
        "tenant": {
            "id": current_user.get("tenant_id", ""),
            "name": "",
            "slug": "",
            "schema_name": current_user.get("tenant_schema", ""),
        } if current_user.get("tenant_schema") else None,
    }


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    return await service.forgot_password(data.email)


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    return await service.reset_password(data.token, data.new_password)
