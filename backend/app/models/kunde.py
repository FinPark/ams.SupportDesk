import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Kunde(Base):
    __tablename__ = "kunden"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(300), index=True)
    kundennummer: Mapped[str] = mapped_column(String(50), default="", index=True)
    email: Mapped[str] = mapped_column(String(300), default="")
    telefon: Mapped[str] = mapped_column(String(50), default="")
    bewertung_avg: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    tickets: Mapped[list["Ticket"]] = relationship(back_populates="kunde")
