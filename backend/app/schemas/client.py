import re
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Contatos ────────────────────────────────────────

class ClientContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    role: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    is_primary: bool = False
    notes: str | None = None


class ClientContactUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    is_primary: bool | None = None
    notes: str | None = None


class ClientContactResponse(BaseModel):
    id: UUID
    name: str
    role: str | None
    email: str | None
    phone: str | None
    whatsapp: str | None
    is_primary: bool
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Sócios (Partners) ──────────────────────────────

class ClientPartnerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    document_number: str | None = Field(None, max_length=20)
    document_type: str | None = Field(None, pattern=r"^(CPF|CNPJ)$")
    role: str | None = Field(None, max_length=255)
    role_code: int | None = None
    partner_type: int = Field(default=2, ge=1, le=3)
    partner_type_label: str | None = Field(None, max_length=50)
    entry_date: date | None = None
    age_range: str | None = Field(None, max_length=100)
    country: str | None = Field(default="Brasil", max_length=100)
    legal_representative_name: str | None = Field(None, max_length=255)
    legal_representative_document: str | None = Field(None, max_length=20)
    legal_representative_role: str | None = Field(None, max_length=255)
    source: str = Field(default="api", pattern=r"^(api|manual)$")


class ClientPartnerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    document_number: str | None = None
    document_type: str | None = Field(None, pattern=r"^(CPF|CNPJ)$")
    role: str | None = None
    role_code: int | None = None
    partner_type: int | None = Field(None, ge=1, le=3)
    partner_type_label: str | None = None
    entry_date: date | None = None
    age_range: str | None = None
    country: str | None = None
    legal_representative_name: str | None = None
    legal_representative_document: str | None = None
    legal_representative_role: str | None = None
    source: str | None = Field(None, pattern=r"^(api|manual)$")


class ClientPartnerResponse(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    document_number: str | None
    document_type: str | None
    role: str | None
    role_code: int | None
    partner_type: int
    partner_type_label: str | None
    entry_date: date | None
    age_range: str | None
    country: str | None
    legal_representative_name: str | None
    legal_representative_document: str | None
    legal_representative_role: str | None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Clientes ────────────────────────────────────────

class ClientCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    trade_name: str | None = Field(None, max_length=255)
    document_type: str = Field(default="CNPJ", pattern=r"^(CNPJ|CPF)$")
    document_number: str = Field(..., min_length=11, max_length=20)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    secondary_phone: str | None = None

    # Endereço
    address_street: str | None = None
    address_number: str | None = None
    address_complement: str | None = None
    address_neighborhood: str | None = None
    address_city: str | None = None
    address_state: str | None = Field(None, max_length=2)
    address_zip: str | None = None

    # Gestão
    status: str = Field(default="active")
    responsible_user_id: UUID | None = None
    financial_company_id: str | None = Field(None, max_length=100)
    contracted_plan: str | None = None
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    monthly_fee: float | None = None
    tax_regime: str | None = None
    systems_used: list[str] = []
    notes: str | None = None
    tags: list[str] = []

    # Contatos iniciais
    contacts: list[ClientContactCreate] = []

    # Sócios iniciais
    partners: list[ClientPartnerCreate] = []

    @field_validator("document_number")
    @classmethod
    def validate_document(cls, v: str, info) -> str:
        cleaned = re.sub(r"\D", "", v)
        doc_type = info.data.get("document_type", "CNPJ")
        if doc_type == "CNPJ" and len(cleaned) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        if doc_type == "CPF" and len(cleaned) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return cleaned


class ClientUpdate(BaseModel):
    company_name: str | None = Field(None, min_length=2, max_length=255)
    trade_name: str | None = None
    document_type: str | None = Field(None, pattern=r"^(CNPJ|CPF)$")
    document_number: str | None = None
    email: str | None = None
    phone: str | None = None
    secondary_phone: str | None = None
    address_street: str | None = None
    address_number: str | None = None
    address_complement: str | None = None
    address_neighborhood: str | None = None
    address_city: str | None = None
    address_state: str | None = Field(None, max_length=2)
    address_zip: str | None = None
    status: str | None = None
    responsible_user_id: UUID | None = None
    financial_company_id: str | None = None
    contracted_plan: str | None = None
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    monthly_fee: float | None = None
    tax_regime: str | None = None
    systems_used: list[str] | None = None
    notes: str | None = None
    tags: list[str] | None = None


class ClientResponse(BaseModel):
    id: UUID
    company_name: str
    trade_name: str | None
    document_type: str
    document_number: str
    email: str | None
    phone: str | None
    secondary_phone: str | None
    status: str
    responsible_user_id: UUID | None
    responsible_user_name: str | None = None
    financial_company_id: str | None = None
    tags: list[str]
    monthly_fee: float | None
    contracted_plan: str | None
    tax_regime: str | None = None
    logo_url: str | None = None
    logo_source: str | None = None
    contacts: list[ClientContactResponse] = []
    partners: list[ClientPartnerResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    items: list[ClientResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
