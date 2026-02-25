"""
Instagram Graph API service.
Reads profile metrics, media posts, and insights for the agency's
Instagram Business account. Read-only. Credentials configured via
INSTAGRAM_* environment variables.

Base URL: https://graph.facebook.com/v21.0
Token lifetime: Long-lived Page Access Token (60 days, refreshable).
"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.facebook.com/v21.0"


class InstagramService:
    """Facebook Graph API v21.0 client for Instagram Business account."""

    def __init__(self):
        self.app_id = settings.INSTAGRAM_APP_ID
        self.app_secret = settings.INSTAGRAM_APP_SECRET
        self.access_token = settings.INSTAGRAM_PAGE_ACCESS_TOKEN
        self.ig_user_id = settings.INSTAGRAM_BUSINESS_ACCOUNT_ID

    @property
    def is_configured(self) -> bool:
        return bool(
            self.app_id
            and self.app_secret
            and self.access_token
            and self.ig_user_id
        )

    def _params(self, extra: dict | None = None) -> dict:
        base = {"access_token": self.access_token}
        if extra:
            base.update(extra)
        return base

    async def _get(self, path: str, params: dict | None = None) -> dict | list | None:
        if not self.is_configured:
            return None
        url = f"{GRAPH_BASE}/{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, params=self._params(params))
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                "Instagram API HTTP %s [%s]: %s",
                e.response.status_code, path, e.response.text[:200],
            )
            return None
        except Exception as e:
            logger.warning("Instagram API error [%s]: %s", path, e)
            return None

    # ── Public methods ──────────────────────────────────────

    async def get_status(self) -> dict[str, Any]:
        if not self.is_configured:
            return {"configured": False, "connected": False, "username": None}

        data = await self._get(
            self.ig_user_id,
            {"fields": "id,username,name"},
        )
        if data and "id" in data:
            return {
                "configured": True,
                "connected": True,
                "username": data.get("username"),
                "name": data.get("name"),
                "ig_user_id": data.get("id"),
            }
        return {
            "configured": True,
            "connected": False,
            "username": None,
            "error": "Token inválido ou conta não encontrada",
        }

    async def get_profile(self) -> dict[str, Any]:
        if not self.is_configured:
            return {}

        data = await self._get(
            self.ig_user_id,
            {
                "fields": (
                    "id,username,name,profile_picture_url,"
                    "followers_count,follows_count,media_count"
                )
            },
        )
        return data or {}

    async def get_media(self, limit: int = 12) -> list[dict]:
        if not self.is_configured:
            return []

        data = await self._get(
            f"{self.ig_user_id}/media",
            {
                "fields": (
                    "id,caption,media_type,media_url,thumbnail_url,"
                    "permalink,timestamp,like_count,comments_count"
                ),
                "limit": str(limit),
            },
        )
        if not data:
            return []
        return data.get("data", []) if isinstance(data, dict) else []

    async def get_insights(self, period: str = "day") -> dict[str, Any]:
        if not self.is_configured:
            return {}

        data = await self._get(
            f"{self.ig_user_id}/insights",
            {
                "metric": "reach,impressions,profile_views,website_clicks",
                "period": period,
            },
        )
        if not data or not isinstance(data, dict):
            return {}

        result: dict[str, Any] = {"period": period}
        for item in data.get("data", []):
            name = item.get("name")
            values = item.get("values", [])
            total = sum(v.get("value", 0) for v in values)
            result[name] = total
        return result

    async def refresh_token(self) -> dict[str, Any]:
        """Refresh the long-lived token. Returns new token for admin to save to .env."""
        if not self.is_configured:
            return {"error": "not_configured"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{GRAPH_BASE}/oauth/access_token",
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": self.app_id,
                        "client_secret": self.app_secret,
                        "fb_exchange_token": self.access_token,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "new_token": data.get("access_token"),
                    "token_type": data.get("token_type"),
                    "expires_in": data.get("expires_in"),
                }
        except Exception as e:
            logger.error("Instagram token refresh failed: %s", e)
            return {"error": str(e)}
