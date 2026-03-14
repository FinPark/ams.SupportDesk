from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    ticket_id: str
    kanal: str = "chat"


class ChatSessionResponse(BaseModel):
    id: str
    ticket_id: str
    supporter_id: Optional[str]
    kanal: str
    started_at: datetime
    ended_at: Optional[datetime]
    kunde_bewertung: Optional[float]
    kunde_kommentar: Optional[str]
    supporter_bewertung: Optional[float]
    supporter_notiz: Optional[str]

    class Config:
        from_attributes = True
