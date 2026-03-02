import logging

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Tatica Gestap"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./tatica_gestap.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # JWT
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SuperAdmin
    SUPER_ADMIN_SECRET_KEY: str = "dev-super-admin-secret-change-in-production!!"

    # Storage
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_PATH: str = "./uploads"
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "auto"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@taticagestap.com.br"
    SMTP_FROM_NAME: str = "Tatica Gestap"

    # Supabase Financeiro (ataticagestao.com) — READ-ONLY, SERVER-SIDE ONLY
    SUPABASE_FINANCEIRO_URL: str = ""
    SUPABASE_FINANCEIRO_SERVICE_KEY: str = ""
    FINANCIAL_BASE_URL: str = "https://ataticagestao.com/auth"

    # Microsoft Graph / OneDrive
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = ""
    ONEDRIVE_ROOT_FOLDER: str = "Tatica Gestap/Clientes"

    # Google API (Gmail + Calendar)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # URLs (for OAuth callbacks)
    BACKEND_BASE_URL: str = "http://localhost:8000"
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # Instagram Graph API (Facebook Graph API v21.0)
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_PAGE_ACCESS_TOKEN: str = ""
    INSTAGRAM_BUSINESS_ACCOUNT_ID: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v

    @model_validator(mode="after")
    def validate_production_secrets(self):
        """Alerta se secrets padrão estiverem em uso fora do modo DEBUG."""
        if not self.DEBUG:
            if "dev-secret" in self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
                logger.warning(
                    "ALERTA DE SEGURANCA: JWT_SECRET_KEY usa valor padrao ou muito curto! "
                    "Defina uma chave segura no .env para producao."
                )
            if "dev-super-admin" in self.SUPER_ADMIN_SECRET_KEY:
                logger.warning(
                    "ALERTA DE SEGURANCA: SUPER_ADMIN_SECRET_KEY usa valor padrao! "
                    "Defina uma chave segura no .env para producao."
                )
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
