from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TicketCreate(BaseModel):
    kunde_id: str
    titel: str = "Neue Anfrage"
    prioritaet: str = "normal"
    tags: list[str] = []


class TicketUpdate(BaseModel):
    titel: Optional[str] = None
    status: Optional[str] = None
    prioritaet: Optional[str] = None


class TicketTagResponse(BaseModel):
    id: str
    tag: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: str
    kunde_id: str
    supporter_id: Optional[str]
    titel: str
    status: str
    prioritaet: str
    ki_bewertung: Optional[float]
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]
    tags: list[TicketTagResponse] = []
    kunde_name: Optional[str] = None
    supporter_kuerzel: Optional[str] = None

    class Config:
        from_attributes = True


class TicketStatusUpdate(BaseModel):
    status: str
