import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Bewertung(Base):
    __tablename__ = "bewertungen"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("chat_sessions.id"), nullable=True
    )
    typ: Mapped[str] = mapped_column(String(20))  # kunde, supporter
    sterne: Mapped[int] = mapped_column(Integer, default=0)
    kommentar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    geloest: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    ticket: Mapped["Ticket"] = relationship(back_populates="bewertungen")
