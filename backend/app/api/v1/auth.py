from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response
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

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    result = await service.login(data.email, data.password)

    is_production = not settings.DEBUG
    # Cross-domain (frontend e backend em dominios diferentes) exige SameSite=None + Secure
    same_site: str = "none" if is_production else "lax"

    # Seta refresh token como httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=is_production,
        samesite=same_site,
        max_age=7 * 24 * 60 * 60,  # 7 dias
        path="/api/v1/auth",
    )

    # Seta access token como httpOnly cookie (mais seguro que localStorage)
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=is_production,
        samesite=same_site,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/v1",
    )

    return {
        "access_token": result["access_token"],
        "token_type": "bearer",
        "user": result["user"],
        "tenant": result.get("tenant"),
    }


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
