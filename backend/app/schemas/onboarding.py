from datetime import datetime
from pydantic import BaseModel


class OnboardingStepResponse(BaseModel):
    id: str
    client_id: str
    step: str
    label: str
    is_done: bool
    done_at: datetime | None = None
    done_by: str | None = None
    done_by_name: str | None = None
    order: str

    class Config:
        from_attributes = True


class OnboardingStepToggle(BaseModel):
    is_done: bool


class ClientOnboardingResponse(BaseModel):
    client_id: str
    client_name: str
    client_trade_name: str | None = None
    client_status: str
    steps: list[OnboardingStepResponse]
    total_steps: int
    completed_steps: int
