from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

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

    # Seta refresh token como httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=False,  # True em produção
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 dias
        path="/api/v1/auth",
    )

    return {
        "access_token": result["access_token"],
        "token_type": "bearer",
        "user": result["user"],
        "tenant": result.get("tenant"),
    }


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: str | None = Cookie(None),
):
    if not refresh_token:
        from app.exceptions import UnauthorizedException
        raise UnauthorizedException("Refresh token não encontrado")

    service = AuthService(db)
    result = await service.refresh_token(refresh_token)
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

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
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
async def forgot_password(data: ForgotPasswordRequest):
    # TODO: Implementar envio de email
    return {"message": "Se o email existir, um link de recuperação será enviado"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    # TODO: Implementar reset de senha
    return {"message": "Senha alterada com sucesso"}
