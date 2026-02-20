from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"
    tenant: "TenantInfo | None" = None


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    roles: list[str]
    permissions: list[str]


class TenantInfo(BaseModel):
    id: str
    name: str
    slug: str
    schema_name: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class MeResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: str | None = None
    phone: str | None = None
    roles: list[str]
    permissions: list[str]
    tenant: TenantInfo | None = None
