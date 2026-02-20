import re
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
    tags: list[str]
    monthly_fee: float | None
    contracted_plan: str | None
    contacts: list[ClientContactResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    items: list[ClientResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
