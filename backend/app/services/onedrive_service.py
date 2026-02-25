"""
OneDrive Service — Microsoft Graph API integration.
Handles folder creation, file upload/download, and folder browsing.
All operations use app-only authentication (client credentials flow).
"""

import httpx

from app.config import settings

# Standard client folder structure
CLIENT_FOLDERS = [
    "01 - Contratos",
    "02 - Termos",
    "03 - Notas Fiscais",
    "04 - Comprovantes",
    "05 - Relatórios Mensais",
    "06 - Documentos Fiscais",
    "07 - Diversos",
]

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class OneDriveService:
    """Manages OneDrive operations via Microsoft Graph API."""

    def __init__(self):
        self.client_id = settings.MICROSOFT_CLIENT_ID
        self.client_secret = settings.MICROSOFT_CLIENT_SECRET
        self.tenant_id = settings.MICROSOFT_TENANT_ID
        self.root_folder = settings.ONEDRIVE_ROOT_FOLDER
        self._token: str | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.tenant_id)

    async def _get_token(self) -> str:
        """Get an access token using client credentials flow."""
        if self._token:
            return self._token

        url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            return self._token

    def _headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def _ensure_folder(
        self, client: httpx.AsyncClient, headers: dict, parent_path: str, folder_name: str
    ) -> dict:
        """Create a folder if it doesn't exist, return folder metadata."""
        url = f"{GRAPH_BASE}/me/drive/root:/{parent_path}/{folder_name}"
        resp = await client.get(url, headers=headers)

        if resp.status_code == 200:
            return resp.json()

        # Create folder
        parent_url = f"{GRAPH_BASE}/me/drive/root:/{parent_path}:/children"
        resp = await client.post(
            parent_url,
            headers=headers,
            json={
                "name": folder_name,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "fail",
            },
        )
        if resp.status_code in (201, 200):
            return resp.json()

        # If conflict (already exists), just get it
        if resp.status_code == 409:
            resp2 = await client.get(url, headers=headers)
            resp2.raise_for_status()
            return resp2.json()

        resp.raise_for_status()
        return resp.json()

    async def create_client_folders(self, client_name: str) -> dict:
        """Create the standard folder structure for a new client."""
        if not self.is_configured:
            return {"status": "not_configured", "folders": []}

        token = await self._get_token()
        headers = self._headers(token)
        created = []

        async with httpx.AsyncClient(timeout=30) as client:
            # Ensure root path exists
            parts = self.root_folder.split("/")
            current_path = ""
            for part in parts:
                if current_path:
                    await self._ensure_folder(client, headers, current_path, part)
                    current_path = f"{current_path}/{part}"
                else:
                    # Create at root
                    url = f"{GRAPH_BASE}/me/drive/root:/children"
                    resp = await client.post(
                        url,
                        headers=headers,
                        json={
                            "name": part,
                            "folder": {},
                            "@microsoft.graph.conflictBehavior": "fail",
                        },
                    )
                    current_path = part

            # Create client folder
            client_folder_path = f"{self.root_folder}/{client_name}"
            await self._ensure_folder(client, headers, self.root_folder, client_name)

            # Create subfolders
            for folder_name in CLIENT_FOLDERS:
                result = await self._ensure_folder(
                    client, headers, client_folder_path, folder_name
                )
                created.append({"name": folder_name, "id": result.get("id")})

        return {"status": "created", "client_name": client_name, "folders": created}

    async def list_folder(self, folder_path: str) -> list[dict]:
        """List contents of a folder."""
        if not self.is_configured:
            return []

        token = await self._get_token()
        headers = self._headers(token)

        url = f"{GRAPH_BASE}/me/drive/root:/{folder_path}:/children"
        params = {"$orderby": "name asc", "$top": "200"}

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            data = resp.json()

        items = []
        for item in data.get("value", []):
            items.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "is_folder": "folder" in item,
                "size": item.get("size", 0),
                "mime_type": item.get("file", {}).get("mimeType"),
                "last_modified": item.get("lastModifiedDateTime"),
                "web_url": item.get("webUrl"),
                "download_url": item.get("@microsoft.graph.downloadUrl"),
                "child_count": item.get("folder", {}).get("childCount", 0),
            })

        return items

    async def list_client_folder(self, client_name: str, subfolder: str = "") -> list[dict]:
        """List contents of a client's folder (or subfolder)."""
        path = f"{self.root_folder}/{client_name}"
        if subfolder:
            path = f"{path}/{subfolder}"
        return await self.list_folder(path)

    async def upload_file(
        self, folder_path: str, filename: str, content: bytes, content_type: str
    ) -> dict:
        """Upload a file to a specific folder."""
        if not self.is_configured:
            return {"status": "not_configured"}

        token = await self._get_token()

        url = f"{GRAPH_BASE}/me/drive/root:/{folder_path}/{filename}:/content"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.put(url, headers=headers, content=content)
            resp.raise_for_status()
            data = resp.json()

        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "web_url": data.get("webUrl"),
            "size": data.get("size"),
        }

    async def download_file(self, item_id: str) -> tuple[bytes, str, str]:
        """Download a file by its OneDrive item ID. Returns (content, filename, content_type)."""
        if not self.is_configured:
            raise RuntimeError("OneDrive not configured")

        token = await self._get_token()
        headers = self._headers(token)

        async with httpx.AsyncClient(timeout=60) as client:
            # Get file metadata
            meta_resp = await client.get(
                f"{GRAPH_BASE}/me/drive/items/{item_id}", headers=headers
            )
            meta_resp.raise_for_status()
            meta = meta_resp.json()

            filename = meta.get("name", "file")
            content_type = meta.get("file", {}).get("mimeType", "application/octet-stream")

            # Download content
            dl_url = f"{GRAPH_BASE}/me/drive/items/{item_id}/content"
            resp = await client.get(dl_url, headers=headers, follow_redirects=True)
            resp.raise_for_status()

        return resp.content, filename, content_type

    async def get_status(self) -> dict:
        """Check OneDrive integration status."""
        if not self.is_configured:
            return {"connected": False, "reason": "Credenciais não configuradas"}

        try:
            token = await self._get_token()
            headers = self._headers(token)

            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{GRAPH_BASE}/me/drive", headers=headers)
                resp.raise_for_status()
                data = resp.json()

            return {
                "connected": True,
                "drive_type": data.get("driveType"),
                "quota_total": data.get("quota", {}).get("total"),
                "quota_used": data.get("quota", {}).get("used"),
            }
        except Exception as e:
            return {"connected": False, "reason": str(e)}
