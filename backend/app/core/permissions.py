from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user


class PermissionChecker:
    """
    Verifica se o usuário atual tem a permissão necessária.

    Uso:
        @router.post("/clients")
        async def create_client(
            current_user=Depends(get_current_user),
            _perm=Depends(PermissionChecker("clients", "create")),
        ):
    """

    def __init__(self, module: str, action: str):
        self.module = module
        self.action = action

    async def __call__(self, current_user: Annotated[dict, Depends(get_current_user)]):
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Não autenticado",
            )

        user_permissions = current_user.get("permissions", [])
        required = f"{self.module}.{self.action}"

        # Admin do tenant tem acesso total
        if "admin" in current_user.get("roles", []):
            return True

        if required not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {required}",
            )
        return True


def require_permission(module: str, action: str):
    return Depends(PermissionChecker(module, action))
