from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(
    data: dict[str, Any],
    secret_key: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(
        to_encode,
        secret_key or settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    data: dict[str, Any],
    secret_key: str | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        to_encode,
        secret_key or settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(
    token: str,
    secret_key: str | None = None,
) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token,
            secret_key or settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.PyJWTError:
        return None


def create_reset_token(user_id: str, tenant_schema: str) -> str:
    """Cria token JWT para reset de senha (expira em 30 minutos)."""
    to_encode = {
        "sub": user_id,
        "tenant_schema": tenant_schema,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_reset_token(token: str) -> dict[str, Any] | None:
    """Decodifica e valida token de reset de senha."""
    payload = decode_token(token)
    if payload and payload.get("type") == "password_reset":
        return payload
    return None


def validate_password_strength(password: str) -> list[str]:
    """Valida requisitos de senha: min 8 chars, 1 maiuscula, 1 numero, 1 especial."""
    errors = []
    if len(password) < 8:
        errors.append("Senha deve ter no minimo 8 caracteres")
    if not any(c.isupper() for c in password):
        errors.append("Senha deve conter pelo menos 1 letra maiuscula")
    if not any(c.isdigit() for c in password):
        errors.append("Senha deve conter pelo menos 1 numero")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Senha deve conter pelo menos 1 caractere especial")
    return errors
