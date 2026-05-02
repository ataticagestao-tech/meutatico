"""
Google OAuth login service.
Distinto do GoogleCalendarService — este só pede userinfo (email/nome) e
nao salva refresh tokens. E usado para autenticar usuarios no SaaS.
"""

import logging
import secrets
from urllib.parse import urlencode

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Apenas userinfo — nao precisamos de calendar/drive pra fazer login.
LOGIN_SCOPES = "openid email profile"


class GoogleAuthService:
    """Login OAuth via Google. Stateless."""

    @property
    def is_configured(self) -> bool:
        return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    @property
    def redirect_uri(self) -> str:
        return f"{settings.BACKEND_BASE_URL}/api/v1/auth/google/callback"

    def get_authorize_url(self, state: str | None = None) -> str:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": LOGIN_SCOPES,
            "access_type": "online",
            "prompt": "select_account",
            "state": state or secrets.token_urlsafe(32),
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        """Troca o authorization code por dados do usuario Google.

        Retorna {"email": str, "name": str, "picture": str | None}.
        Levanta httpx.HTTPError se a troca falhar.
        """
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")

            if not access_token:
                raise ValueError("Google nao retornou access_token")

            user_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_resp.raise_for_status()
            data = user_resp.json()

        email = data.get("email")
        if not email:
            raise ValueError("Google nao retornou email do usuario")

        return {
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
        }
