from datetime import datetime
from pydantic import BaseModel


class SupporterLogin(BaseModel):
    kuerzel: str


class SupporterResponse(BaseModel):
    id: str
    kuerzel: str
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
