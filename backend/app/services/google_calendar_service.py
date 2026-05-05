"""
Google Calendar API v3 service.
Handles OAuth2 Authorization Code Flow (per-user) and Calendar operations.
Uses httpx for HTTP calls (no Google SDK dependency).
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.tenant.google_oauth_token import GoogleOAuthToken

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"

SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email"


class GoogleCalendarService:
    """Google Calendar API v3 client with per-user OAuth2."""

    def __init__(self, db: AsyncSession, user_id: UUID):
        self.db = db
        self.user_id = user_id
        self._token: GoogleOAuthToken | None = None

    @property
    def is_configured(self) -> bool:
        return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    @property
    def redirect_uri(self) -> str:
        return f"{settings.BACKEND_BASE_URL}/api/v1/google-calendar/callback"

    # ── OAuth2 Flow ──────────────────────────────────

    def get_authorize_url(self, state: str | None = None) -> str:
        """Generate Google OAuth consent URL."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent",
            "state": state or secrets.token_urlsafe(32),
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def handle_callback(self, code: str) -> dict:
        """Exchange authorization code for tokens and save to DB."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        access_token = data["access_token"]
        refresh_token = data.get("refresh_token", "")
        expires_in = data.get("expires_in", 3600)
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Get user email
        email = await self._fetch_email(access_token)

        # Upsert token
        result = await self.db.execute(
            select(GoogleOAuthToken).where(
                GoogleOAuthToken.user_id == self.user_id
            )
        )
        token = result.scalar_one_or_none()

        if token:
            token.access_token = access_token
            if refresh_token:
                token.refresh_token = refresh_token
            token.token_expires_at = expires_at
            token.scopes = SCOPES
            token.email = email
        else:
            token = GoogleOAuthToken(
                user_id=self.user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=expires_at,
                scopes=SCOPES,
                email=email,
            )
            self.db.add(token)

        await self.db.flush()
        self._token = token

        return {"connected": True, "email": email}

    async def _fetch_email(self, access_token: str) -> str | None:
        """Fetch Google user email from userinfo endpoint."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                resp.raise_for_status()
                return resp.json().get("email")
        except Exception as e:
            logger.warning("Failed to fetch Google email: %s", e)
            return None

    async def _load_token(self) -> GoogleOAuthToken | None:
        """Load stored token from DB."""
        if self._token:
            return self._token
        result = await self.db.execute(
            select(GoogleOAuthToken).where(
                GoogleOAuthToken.user_id == self.user_id
            )
        )
        self._token = result.scalar_one_or_none()
        return self._token

    async def _get_access_token(self) -> str | None:
        """Get a valid access token, refreshing if needed."""
        token = await self._load_token()
        if not token:
            return None

        # Refresh if expiring within 5 minutes
        if token.token_expires_at <= datetime.utcnow() + timedelta(minutes=5):
            refreshed = await self._refresh_token(token)
            if not refreshed:
                return None

        return token.access_token

    async def _refresh_token(self, token: GoogleOAuthToken) -> bool:
        """Refresh the access token using the refresh token."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "refresh_token": token.refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            token.access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            token.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            await self.db.flush()
            return True
        except Exception as e:
            logger.error("Google token refresh failed: %s", e)
            return False

    # ── Status / Disconnect ──────────────────────────

    async def get_status(self) -> dict:
        """Check if user has a valid Google connection."""
        if not self.is_configured:
            return {"configured": False, "connected": False, "email": None}

        token = await self._load_token()
        if not token:
            return {"configured": True, "connected": False, "email": None}

        # Verify token is still valid by trying to refresh
        access = await self._get_access_token()
        if not access:
            return {"configured": True, "connected": False, "email": token.email}

        return {
            "configured": True,
            "connected": True,
            "email": token.email,
        }

    async def disconnect(self) -> dict:
        """Revoke token and remove from DB."""
        token = await self._load_token()
        if not token:
            return {"disconnected": True}

        # Try to revoke at Google
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    GOOGLE_REVOKE_URL,
                    params={"token": token.access_token},
                )
        except Exception as e:
            logger.warning("Google token revocation failed (continuing): %s", e)

        await self.db.delete(token)
        await self.db.flush()
        self._token = None
        return {"disconnected": True}

    # ── Calendar API ─────────────────────────────────

    async def _api_get(self, path: str, params: dict | None = None) -> dict | None:
        """Authenticated GET to Google Calendar API."""
        access = await self._get_access_token()
        if not access:
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{CALENDAR_BASE}{path}",
                    headers={"Authorization": f"Bearer {access}"},
                    params=params,
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Google Calendar GET %s failed: %s", path, e)
            return None

    async def _api_post(self, path: str, json_data: dict, params: dict | None = None) -> dict | None:
        """Authenticated POST to Google Calendar API."""
        access = await self._get_access_token()
        if not access:
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{CALENDAR_BASE}{path}",
                    headers={"Authorization": f"Bearer {access}"},
                    json=json_data,
                    params=params,
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Google Calendar POST %s failed: %s", path, e)
            return None

    async def _api_patch(self, path: str, json_data: dict, params: dict | None = None) -> dict | None:
        """Authenticated PATCH to Google Calendar API."""
        access = await self._get_access_token()
        if not access:
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.patch(
                    f"{CALENDAR_BASE}{path}",
                    headers={"Authorization": f"Bearer {access}"},
                    json=json_data,
                    params=params,
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Google Calendar PATCH %s failed: %s", path, e)
            return None

    async def _api_delete(self, path: str) -> bool:
        """Authenticated DELETE to Google Calendar API."""
        access = await self._get_access_token()
        if not access:
            return False
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.delete(
                    f"{CALENDAR_BASE}{path}",
                    headers={"Authorization": f"Bearer {access}"},
                )
                resp.raise_for_status()
                return True
        except Exception as e:
            logger.warning("Google Calendar DELETE %s failed: %s", path, e)
            return False

    async def list_events(
        self, time_min: datetime, time_max: datetime
    ) -> list[dict]:
        """Fetch events from Google Calendar primary."""
        data = await self._api_get(
            "/calendars/primary/events",
            params={
                "timeMin": time_min.isoformat(),
                "timeMax": time_max.isoformat(),
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": "250",
            },
        )
        if not data:
            return []
        return data.get("items", [])

    async def create_event(
        self,
        summary: str,
        start: datetime,
        end: datetime,
        description: str | None = None,
        location: str | None = None,
        all_day: bool = False,
        with_meet: bool = False,
        attendees: list[dict] | None = None,
    ) -> dict | None:
        """Create an event on Google Calendar. Optionally with Google Meet."""
        body: dict = {
            "summary": summary,
            "description": description or "",
            "location": location or "",
        }

        if all_day:
            body["start"] = {"date": start.strftime("%Y-%m-%d")}
            body["end"] = {"date": end.strftime("%Y-%m-%d")}
        else:
            body["start"] = {"dateTime": start.isoformat(), "timeZone": "America/Sao_Paulo"}
            body["end"] = {"dateTime": end.isoformat(), "timeZone": "America/Sao_Paulo"}

        if attendees:
            body["attendees"] = [{"email": a["email"]} for a in attendees]

        if with_meet:
            body["conferenceData"] = {
                "createRequest": {
                    "requestId": secrets.token_urlsafe(16),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                },
            }

        params = {}
        if with_meet:
            params["conferenceDataVersion"] = "1"
        if attendees:
            params["sendUpdates"] = "all"
        return await self._api_post("/calendars/primary/events", body, params=params or None)

    async def update_event(
        self,
        google_event_id: str,
        summary: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        description: str | None = None,
        location: str | None = None,
        all_day: bool = False,
        attendees: list[dict] | None = None,
    ) -> dict | None:
        """Update an existing Google Calendar event."""
        body: dict = {}
        if summary is not None:
            body["summary"] = summary
        if description is not None:
            body["description"] = description
        if location is not None:
            body["location"] = location

        if start and end:
            if all_day:
                body["start"] = {"date": start.strftime("%Y-%m-%d")}
                body["end"] = {"date": end.strftime("%Y-%m-%d")}
            else:
                body["start"] = {"dateTime": start.isoformat(), "timeZone": "America/Sao_Paulo"}
                body["end"] = {"dateTime": end.isoformat(), "timeZone": "America/Sao_Paulo"}

        if attendees is not None:
            body["attendees"] = [{"email": a["email"]} for a in attendees]

        if not body:
            return None

        params = {"sendUpdates": "all"} if attendees is not None else None
        return await self._api_patch(
            f"/calendars/primary/events/{google_event_id}", body, params=params
        )

    async def delete_event(self, google_event_id: str) -> bool:
        """Delete an event from Google Calendar."""
        return await self._api_delete(
            f"/calendars/primary/events/{google_event_id}"
        )

    async def sync_from_google(
        self, time_min: datetime, time_max: datetime
    ) -> dict:
        """Pull events from Google Calendar and upsert into local DB."""
        from app.models.tenant.calendar_event import CalendarEvent

        google_events = await self.list_events(time_min, time_max)
        created = 0
        updated = 0

        for ge in google_events:
            gid = ge.get("id")
            if not gid:
                continue

            # Parse dates
            start_raw = ge.get("start", {})
            end_raw = ge.get("end", {})
            all_day = "date" in start_raw

            if all_day:
                start_dt = datetime.fromisoformat(start_raw["date"])
                end_dt = datetime.fromisoformat(end_raw["date"])
            else:
                start_dt = datetime.fromisoformat(
                    start_raw.get("dateTime", start_raw.get("date", ""))
                )
                end_dt = datetime.fromisoformat(
                    end_raw.get("dateTime", end_raw.get("date", ""))
                )

            # Extract Meet link
            meet_link = None
            conf = ge.get("conferenceData")
            if conf:
                for ep in conf.get("entryPoints", []):
                    if ep.get("entryPointType") == "video":
                        meet_link = ep.get("uri")
                        break

            # Check if exists locally
            result = await self.db.execute(
                select(CalendarEvent).where(
                    CalendarEvent.google_event_id == gid
                )
            )
            existing = result.scalar_one_or_none()

            # Extract attendees
            raw_attendees = ge.get("attendees", [])
            attendees_list = [
                {"email": a["email"], "name": a.get("displayName", "")}
                for a in raw_attendees if a.get("email")
            ] or None

            if existing:
                existing.title = ge.get("summary", "(sem titulo)")
                existing.description = ge.get("description")
                existing.location = ge.get("location")
                existing.meet_link = meet_link
                existing.start_date = start_dt
                existing.end_date = end_dt
                existing.all_day = all_day
                existing.attendees = attendees_list
                updated += 1
            else:
                event = CalendarEvent(
                    title=ge.get("summary", "(sem titulo)"),
                    description=ge.get("description"),
                    type="meeting",
                    start_date=start_dt,
                    end_date=end_dt,
                    all_day=all_day,
                    google_event_id=gid,
                    sync_source="google",
                    location=ge.get("location"),
                    meet_link=meet_link,
                    attendees=attendees_list,
                    created_by=self.user_id,
                )
                self.db.add(event)
                created += 1

        await self.db.flush()
        return {"synced": True, "created": created, "updated": updated}


# ───────────────────────────────────────────────────────────────────────
# Module-level helper: refresh all tokens that are expiring soon.
# Used by the APScheduler job in app.main.lifespan.
# ───────────────────────────────────────────────────────────────────────

async def refresh_all_expiring_google_tokens(window_minutes: int = 30) -> dict:
    """Refresh every Google OAuth token that expires within `window_minutes`.

    Runs against ALL tenants (no tenant scoping needed — table is shared in this
    project's setup since set_tenant_schema is no-op).

    Returns: {"checked": N, "refreshed": M, "failed": K, "skipped": S}
    """
    from app.database import async_session_factory

    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        logger.info("Google OAuth not configured — skipping refresh job")
        return {"checked": 0, "refreshed": 0, "failed": 0, "skipped": 0}

    cutoff = datetime.utcnow() + timedelta(minutes=window_minutes)
    refreshed = 0
    failed = 0
    skipped = 0

    async with async_session_factory() as session:
        result = await session.execute(
            select(GoogleOAuthToken).where(GoogleOAuthToken.token_expires_at <= cutoff)
        )
        tokens = list(result.scalars().all())
        checked = len(tokens)

        for token in tokens:
            if not token.refresh_token:
                # Sem refresh_token nao da pra renovar — pular
                skipped += 1
                continue

            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        GOOGLE_TOKEN_URL,
                        data={
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "refresh_token": token.refresh_token,
                            "grant_type": "refresh_token",
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()

                token.access_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                token.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                refreshed += 1
                logger.info(
                    "Google token refreshed for user_id=%s email=%s expires_in=%ss",
                    token.user_id, token.email, expires_in,
                )
            except Exception as exc:
                failed += 1
                logger.warning(
                    "Google token refresh failed for user_id=%s: %s",
                    token.user_id, exc,
                )

        if refreshed:
            await session.commit()

    summary = {"checked": checked, "refreshed": refreshed, "failed": failed, "skipped": skipped}
    logger.info("Google token refresh job done: %s", summary)
    return summary
