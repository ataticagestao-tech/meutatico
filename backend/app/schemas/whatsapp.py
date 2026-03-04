from pydantic import BaseModel, Field


class SendTextRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=30)
    message: str = Field(..., min_length=1, max_length=4096)


class SendDocumentRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=30)
    file_url: str = Field(..., min_length=5)
    filename: str = Field(..., min_length=1, max_length=255)


class ChatbotRuleCreate(BaseModel):
    trigger_keyword: str = Field(..., min_length=1, max_length=100)
    response_message: str = Field(..., min_length=1, max_length=4096)


class ChatbotRuleUpdate(BaseModel):
    trigger_keyword: str | None = None
    response_message: str | None = None
    is_active: bool | None = None
