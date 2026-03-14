from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BewertungCreate(BaseModel):
    ticket_id: str
    session_id: Optional[str] = None
    typ: str  # kunde, supporter
    sterne: int = 0
    kommentar: Optional[str] = None
    geloest: bool = False


class BewertungResponse(BaseModel):
    id: str
    ticket_id: str
    session_id: Optional[str]
    typ: str
    sterne: int
    kommentar: Optional[str]
    geloest: bool
    created_at: datetime

    class Config:
        from_attributes = True
