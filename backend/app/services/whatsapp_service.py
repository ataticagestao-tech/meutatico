"""Read-only WhatsApp data from Supabase Financeiro.

Reads from whatsapp_sessions, whatsapp_contacts, whatsapp_messages tables
in the external Supabase database. NEVER sends messages — send-only via
the financial system.

Real table schema (from Supabase):
- whatsapp_sessions: id, company_id, session_id, qr_code, status, phone_number,
    auth_state, last_connected_at, created_at, updated_at
- whatsapp_contacts: id, session_id, company_id, jid, name, notify_name,
    phone_number, profile_pic_url, is_group, custom_name, avatar_url
- whatsapp_messages: id, session_id, company_id, contact_id, message_id, jid,
    from_me, sender_jid, message_type, content, media_url, media_mime_type,
    timestamp, status
"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Supabase REST API client for WhatsApp tables (read-only)."""

    def __init__(self):
        self.base_url = settings.SUPABASE_FINANCEIRO_URL
        self.service_key = settings.SUPABASE_FINANCEIRO_SERVICE_KEY
        self.configured = bool(self.base_url and self.service_key)

    @property
    def _headers(self) -> dict:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }

    async def _get(
        self, table: str, params: list[tuple[str, str]] | dict | None = None
    ) -> list[dict]:
        if not self.configured:
            return []
        url = f"{self.base_url}/rest/v1/{table}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=self._headers, params=params or {})
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("WhatsApp Supabase read error (%s): %s", table, e)
            return []

    async def get_status(self) -> dict[str, Any]:
        """Get WhatsApp connection status."""
        if not self.configured:
            return {"configured": False, "connected": False, "phone_number": None}

        sessions = await self._get("whatsapp_sessions", [
            ("select", "id,session_id,status,phone_number,last_connected_at,company_id"),
            ("order", "last_connected_at.desc.nullslast"),
            ("limit", "5"),
        ])
        if sessions:
            connected = [s for s in sessions if s.get("status") == "connected"]
            s = connected[0] if connected else sessions[0]
            return {
                "configured": True,
                "connected": s.get("status") == "connected",
                "phone_number": s.get("phone_number"),
                "session_id": s.get("session_id"),
                "company_id": s.get("company_id"),
                "updated_at": s.get("last_connected_at"),
                "total_sessions": len(sessions),
            }
        return {"configured": True, "connected": False, "phone_number": None}

    async def list_contacts(
        self, search: str | None = None, limit: int = 50, offset: int = 0
    ) -> dict:
        """List WhatsApp contacts (non-group)."""
        params: list[tuple[str, str]] = [
            ("select", "id,jid,name,notify_name,phone_number,custom_name,avatar_url,is_group,company_id"),
            ("is_group", "eq.false"),
            ("order", "name.asc.nullslast"),
            ("limit", str(limit)),
            ("offset", str(offset)),
        ]
        if search:
            params.append(
                ("or", f"(name.ilike.*{search}*,phone_number.ilike.*{search}*,custom_name.ilike.*{search}*,notify_name.ilike.*{search}*)")
            )

        contacts = await self._get("whatsapp_contacts", params)

        return {
            "items": [
                {
                    "id": c.get("id"),
                    "jid": c.get("jid"),
                    "name": c.get("custom_name") or c.get("name") or c.get("notify_name") or c.get("phone_number"),
                    "phone_number": c.get("phone_number"),
                    "avatar_url": c.get("avatar_url"),
                    "company_id": c.get("company_id"),
                }
                for c in contacts
            ],
            "total": len(contacts),
        }

    async def get_messages(
        self, contact_id: str, limit: int = 50, offset: int = 0
    ) -> dict:
        """Get message history for a contact by contact_id."""
        messages = await self._get("whatsapp_messages", [
            ("select", "id,message_id,from_me,sender_jid,message_type,content,media_url,media_mime_type,timestamp,status"),
            ("contact_id", f"eq.{contact_id}"),
            ("order", "timestamp.desc"),
            ("limit", str(limit)),
            ("offset", str(offset)),
        ])
        return {
            "items": messages,
            "total": len(messages),
            "contact_id": contact_id,
        }

    async def search_messages(self, query: str, limit: int = 30) -> list[dict]:
        """Search across all messages by content."""
        return await self._get("whatsapp_messages", [
            ("select", "id,contact_id,jid,from_me,message_type,content,timestamp"),
            ("content", f"ilike.*{query}*"),
            ("order", "timestamp.desc"),
            ("limit", str(limit)),
        ])

    async def list_groups(self) -> list[dict]:
        """List WhatsApp groups (contacts where is_group=true)."""
        contacts = await self._get("whatsapp_contacts", [
            ("select", "id,jid,name,phone_number,company_id"),
            ("is_group", "eq.true"),
            ("order", "name.asc"),
        ])
        return contacts
