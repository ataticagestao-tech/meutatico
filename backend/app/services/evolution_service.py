"""Evolution API integration for WhatsApp messaging.

Handles instance management, message sending/receiving, and chatbot logic
via the Evolution API (self-hosted WhatsApp gateway).
"""

import logging
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.tenant.whatsapp import WhatsAppChatbotRule, WhatsAppInstance, WhatsAppMessage

logger = logging.getLogger(__name__)


class EvolutionService:
    def __init__(self, db: AsyncSession, tenant_id: str | None = None):
        self.db = db
        self.tenant_id = tenant_id
        self.base_url = settings.EVOLUTION_API_URL.rstrip("/")
        self.api_key = settings.EVOLUTION_API_KEY
        self.instance = settings.EVOLUTION_INSTANCE_NAME

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    @property
    def _headers(self) -> dict:
        return {"apikey": self.api_key, "Content-Type": "application/json"}

    async def _api_get(self, path: str) -> dict | list | None:
        if not self.is_configured:
            return None
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Evolution API GET %s error: %s", path, e)
            return None

    async def _api_post(self, path: str, body: dict | None = None) -> dict | None:
        if not self.is_configured:
            return None
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, headers=self._headers, json=body or {})
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Evolution API POST %s error: %s", path, e)
            return None

    async def _api_delete(self, path: str) -> dict | None:
        if not self.is_configured:
            return None
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.delete(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("Evolution API DELETE %s error: %s", path, e)
            return None

    # ── Instance Management ─────────────────────────────

    async def create_instance(self) -> dict:
        """Create a new WhatsApp instance on Evolution API."""
        if not self.is_configured:
            return {"error": "Evolution API not configured"}

        body = {
            "instanceName": self.instance,
            "integration": "WHATSAPP-BAILEYS",
            "qrcode": True,
            "webhook": {
                "url": f"{settings.BACKEND_BASE_URL}/api/v1/whatsapp/webhook",
                "events": ["messages.upsert", "connection.update"],
                "webhook_by_events": False,
            },
        }
        result = await self._api_post("/instance/create", body)
        if result and self.tenant_id:
            # Save instance locally
            instance = WhatsAppInstance(
                tenant_id=self.tenant_id,
                instance_name=self.instance,
                status="connecting",
            )
            self.db.add(instance)
            await self.db.flush()
        return result or {"error": "Failed to create instance"}

    async def get_instance_status(self) -> dict:
        """Get connection status of the WhatsApp instance."""
        if not self.is_configured:
            return {"configured": False, "status": "not_configured"}

        result = await self._api_get(f"/instance/connectionState/{self.instance}")
        if result:
            state = result.get("state") or result.get("instance", {}).get("state", "unknown")
            return {
                "configured": True,
                "status": state,
                "instance_name": self.instance,
            }
        return {"configured": True, "status": "unknown"}

    async def get_qr_code(self) -> dict:
        """Get QR code to connect WhatsApp."""
        if not self.is_configured:
            return {"error": "Evolution API not configured"}

        result = await self._api_get(f"/instance/connect/{self.instance}")
        if result:
            return {
                "qr_code": result.get("base64") or result.get("qrcode", {}).get("base64"),
                "code": result.get("code") or result.get("qrcode", {}).get("code"),
            }
        return {"error": "Failed to get QR code"}

    async def disconnect_instance(self) -> dict:
        """Disconnect/logout the WhatsApp instance."""
        result = await self._api_delete(f"/instance/logout/{self.instance}")
        if self.tenant_id:
            stmt = select(WhatsAppInstance).where(
                WhatsAppInstance.tenant_id == self.tenant_id,
                WhatsAppInstance.instance_name == self.instance,
            )
            res = await self.db.execute(stmt)
            inst = res.scalar_one_or_none()
            if inst:
                inst.status = "disconnected"
                await self.db.flush()
        return result or {"status": "disconnected"}

    # ── Messaging ───────────────────────────────────────

    async def send_text(self, phone: str, message: str) -> dict:
        """Send a text message via WhatsApp."""
        # Normalize phone: remove non-digits, ensure country code
        phone_clean = "".join(c for c in phone if c.isdigit())
        if not phone_clean.startswith("55"):
            phone_clean = f"55{phone_clean}"

        body = {
            "number": phone_clean,
            "text": message,
        }
        result = await self._api_post(f"/message/sendText/{self.instance}", body)

        # Save outbound message locally
        if self.tenant_id:
            msg = WhatsAppMessage(
                tenant_id=self.tenant_id,
                direction="outbound",
                from_phone="me",
                to_phone=phone_clean,
                message_type="text",
                content=message,
                status="sent" if result else "failed",
            )
            self.db.add(msg)
            await self.db.flush()

        return result or {"error": "Failed to send message"}

    async def send_document(self, phone: str, file_url: str, filename: str) -> dict:
        """Send a document/file via WhatsApp."""
        phone_clean = "".join(c for c in phone if c.isdigit())
        if not phone_clean.startswith("55"):
            phone_clean = f"55{phone_clean}"

        body = {
            "number": phone_clean,
            "media": file_url,
            "fileName": filename,
        }
        result = await self._api_post(f"/message/sendMedia/{self.instance}", body)

        if self.tenant_id:
            msg = WhatsAppMessage(
                tenant_id=self.tenant_id,
                direction="outbound",
                from_phone="me",
                to_phone=phone_clean,
                message_type="document",
                content=filename,
                status="sent" if result else "failed",
                extra_data={"file_url": file_url},
            )
            self.db.add(msg)
            await self.db.flush()

        return result or {"error": "Failed to send document"}

    # ── Webhook Processing ──────────────────────────────

    async def _resolve_tenant_id(self) -> None:
        """Resolve tenant_id from instance name if not set."""
        if self.tenant_id:
            return
        stmt = select(WhatsAppInstance).where(
            WhatsAppInstance.instance_name == self.instance,
        )
        res = await self.db.execute(stmt)
        inst = res.scalar_one_or_none()
        if inst:
            self.tenant_id = str(inst.tenant_id)

    async def process_webhook(self, payload: dict) -> None:
        """Process incoming webhook from Evolution API."""
        # Resolve tenant_id from instance (webhook has no auth context)
        await self._resolve_tenant_id()

        event = payload.get("event")

        if event == "messages.upsert":
            await self._handle_incoming_message(payload.get("data", {}))
        elif event == "connection.update":
            await self._handle_connection_update(payload.get("data", {}))

    async def _handle_incoming_message(self, data: dict) -> None:
        """Process incoming message and trigger chatbot if applicable."""
        key = data.get("key", {})
        from_me = key.get("fromMe", False)

        remote_jid = key.get("remoteJid", "")
        # Skip status broadcasts and group messages
        if remote_jid == "status@broadcast" or "@g.us" in remote_jid:
            return

        phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
        message_data = data.get("message", {}) or {}
        content = (
            message_data.get("conversation")
            or message_data.get("extendedTextMessage", {}).get("text")
            or message_data.get("imageMessage", {}).get("caption")
            or message_data.get("documentMessage", {}).get("fileName")
            or ""
        )
        msg_type = "text"

        if message_data.get("imageMessage"):
            msg_type = "image"
        elif message_data.get("documentMessage"):
            msg_type = "document"
        elif message_data.get("audioMessage"):
            msg_type = "audio"
        elif message_data.get("videoMessage"):
            msg_type = "video"

        # Save message to local database
        if self.tenant_id:
            msg = WhatsAppMessage(
                tenant_id=self.tenant_id,
                direction="outbound" if from_me else "inbound",
                from_phone="me" if from_me else phone,
                to_phone=phone if from_me else "me",
                message_type=msg_type,
                content=content or f"[{msg_type}]",
                status="sent" if from_me else "received",
            )
            self.db.add(msg)
            await self.db.flush()

        # Check chatbot rules for inbound messages
        if content and self.tenant_id and not from_me:
            await self._check_chatbot(phone, content)

    async def _handle_connection_update(self, data: dict) -> None:
        """Update local instance status on connection change."""
        if not self.tenant_id:
            return
        state = data.get("state", "unknown")
        stmt = select(WhatsAppInstance).where(
            WhatsAppInstance.tenant_id == self.tenant_id,
            WhatsAppInstance.instance_name == self.instance,
        )
        res = await self.db.execute(stmt)
        inst = res.scalar_one_or_none()
        if inst:
            inst.status = "connected" if state == "open" else "disconnected"
            if state == "open":
                from datetime import datetime, timezone
                inst.connected_at = datetime.now(timezone.utc)
            await self.db.flush()

    async def _check_chatbot(self, phone: str, content: str) -> None:
        """Check if message matches any chatbot rule and auto-reply."""
        stmt = select(WhatsAppChatbotRule).where(
            WhatsAppChatbotRule.tenant_id == self.tenant_id,
            WhatsAppChatbotRule.is_active == True,
        )
        result = await self.db.execute(stmt)
        rules = result.scalars().all()

        content_lower = content.lower().strip()
        for rule in rules:
            if rule.trigger_keyword.lower() in content_lower:
                await self.send_text(phone, rule.response_message)
                break

    # ── Chat / Message Fetching (local DB) ───────────────

    async def fetch_chats(self, search: str | None = None) -> list[dict]:
        """Fetch chat list from local WhatsAppMessage table."""
        from sqlalchemy import case, func, literal_column

        if not self.tenant_id:
            return []

        # Get distinct contacts with last message info
        # A "contact" is the phone number that is NOT "me"
        phone_col = case(
            (WhatsAppMessage.direction == "inbound", WhatsAppMessage.from_phone),
            else_=WhatsAppMessage.to_phone,
        )

        stmt = (
            select(
                phone_col.label("phone"),
                func.max(WhatsAppMessage.created_at).label("last_at"),
                func.count().label("msg_count"),
            )
            .where(WhatsAppMessage.tenant_id == self.tenant_id)
            .group_by(literal_column("phone"))
            .order_by(func.max(WhatsAppMessage.created_at).desc())
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        chats = []
        for row in rows:
            phone = row.phone
            if not phone or phone == "me":
                continue

            if search:
                if search.lower() not in phone:
                    continue

            # Get last message content
            last_msg_stmt = (
                select(WhatsAppMessage.content)
                .where(
                    WhatsAppMessage.tenant_id == self.tenant_id,
                    (
                        (WhatsAppMessage.from_phone == phone)
                        | (WhatsAppMessage.to_phone == phone)
                    ),
                )
                .order_by(WhatsAppMessage.created_at.desc())
                .limit(1)
            )
            last_msg_result = await self.db.execute(last_msg_stmt)
            last_content = last_msg_result.scalar_one_or_none() or ""

            chats.append({
                "id": phone,
                "name": phone,
                "phone_number": phone,
                "custom_name": None,
                "avatar_url": None,
                "last_message": last_content[:80] if last_content else None,
                "last_message_at": row.last_at.isoformat() if row.last_at else None,
                "unread_count": 0,
            })

        return chats

    async def fetch_messages(self, phone: str, limit: int = 50) -> list[dict]:
        """Fetch messages for a specific contact from local DB."""
        if not self.tenant_id:
            return []

        # Remove @s.whatsapp.net suffix if present
        phone_clean = phone.split("@")[0] if "@" in phone else phone

        stmt = (
            select(WhatsAppMessage)
            .where(
                WhatsAppMessage.tenant_id == self.tenant_id,
                (
                    (WhatsAppMessage.from_phone == phone_clean)
                    | (WhatsAppMessage.to_phone == phone_clean)
                ),
            )
            .order_by(WhatsAppMessage.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        messages = []
        for msg in rows:
            messages.append({
                "id": str(msg.id),
                "content": msg.content or "",
                "from_me": msg.direction == "outbound",
                "message_type": msg.message_type or "text",
                "media_url": None,
                "timestamp": msg.created_at.isoformat() if msg.created_at else "",
                "status": msg.status or "",
            })

        return messages

    # ── Chatbot Rules CRUD ──────────────────────────────

    async def list_chatbot_rules(self) -> list[dict]:
        stmt = select(WhatsAppChatbotRule).where(
            WhatsAppChatbotRule.tenant_id == self.tenant_id,
        ).order_by(WhatsAppChatbotRule.created_at.desc())
        result = await self.db.execute(stmt)
        rules = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "trigger_keyword": r.trigger_keyword,
                "response_message": r.response_message,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rules
        ]

    async def create_chatbot_rule(self, keyword: str, response: str) -> dict:
        rule = WhatsAppChatbotRule(
            tenant_id=self.tenant_id,
            trigger_keyword=keyword,
            response_message=response,
        )
        self.db.add(rule)
        await self.db.flush()
        return {
            "id": str(rule.id),
            "trigger_keyword": rule.trigger_keyword,
            "response_message": rule.response_message,
            "is_active": rule.is_active,
        }

    async def update_chatbot_rule(self, rule_id: str, data: dict) -> dict | None:
        stmt = select(WhatsAppChatbotRule).where(
            WhatsAppChatbotRule.id == rule_id,
            WhatsAppChatbotRule.tenant_id == self.tenant_id,
        )
        result = await self.db.execute(stmt)
        rule = result.scalar_one_or_none()
        if not rule:
            return None
        for key, value in data.items():
            if value is not None and hasattr(rule, key):
                setattr(rule, key, value)
        await self.db.flush()
        return {
            "id": str(rule.id),
            "trigger_keyword": rule.trigger_keyword,
            "response_message": rule.response_message,
            "is_active": rule.is_active,
        }

    async def delete_chatbot_rule(self, rule_id: str) -> bool:
        stmt = select(WhatsAppChatbotRule).where(
            WhatsAppChatbotRule.id == rule_id,
            WhatsAppChatbotRule.tenant_id == self.tenant_id,
        )
        result = await self.db.execute(stmt)
        rule = result.scalar_one_or_none()
        if not rule:
            return False
        await self.db.delete(rule)
        await self.db.flush()
        return True
