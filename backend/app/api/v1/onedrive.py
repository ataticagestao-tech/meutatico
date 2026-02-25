from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.permissions import require_permission
from app.dependencies import get_current_user
from app.services.onedrive_service import OneDriveService

router = APIRouter(prefix="/onedrive", tags=["OneDrive"])


@router.get("/status")
async def onedrive_status(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Check OneDrive integration status."""
    svc = OneDriveService()
    return await svc.get_status()


@router.post("/create-folders/{client_name}")
async def create_client_folders(
    client_name: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "manage_folders"),
):
    """Create the standard folder structure for a client in OneDrive."""
    svc = OneDriveService()
    return await svc.create_client_folders(client_name)


@router.get("/browse")
async def browse_folder(
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    path: str = Query(""),
):
    """Browse OneDrive folder contents."""
    svc = OneDriveService()
    if not path:
        path = svc.root_folder
    return await svc.list_folder(path)


@router.get("/browse/{client_name}")
async def browse_client_folder(
    client_name: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
    subfolder: Optional[str] = Query(None),
):
    """Browse a specific client's folder in OneDrive."""
    svc = OneDriveService()
    return await svc.list_client_folder(client_name, subfolder or "")


@router.get("/download/{item_id}")
async def download_file(
    item_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    _perm=require_permission("documents", "read"),
):
    """Download a file from OneDrive."""
    svc = OneDriveService()
    content, filename, content_type = await svc.download_file(item_id)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
