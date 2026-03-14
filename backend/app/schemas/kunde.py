from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class KundeCreate(BaseModel):
    name: str
    kundennummer: str = ""
    email: str = ""
    telefon: str = ""


class KundeUpdate(BaseModel):
    name: Optional[str] = None
    kundennummer: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None


class KundeResponse(BaseModel):
    id: str
    name: str
    kundennummer: str
    email: str
    telefon: str
    bewertung_avg: float
    created_at: datetime

    class Config:
        from_attributes = True


class KundeIdentify(BaseModel):
    name: str
    ticket_nr: Optional[str] = None
