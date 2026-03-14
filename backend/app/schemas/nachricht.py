from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NachrichtCreate(BaseModel):
    session_id: str
    rolle: str  # kunde, supporter
    inhalt_markdown: str
    kanal: str = "chat"


class NachrichtResponse(BaseModel):
    id: str
    session_id: str
    rolle: str
    inhalt_markdown: str
    kanal: str
    audio_ref: Optional[str]
    markiert: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NachrichtMarkieren(BaseModel):
    markiert: bool
