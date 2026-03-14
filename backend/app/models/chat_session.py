import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    supporter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("supporters.id"), nullable=True
    )
    kanal: Mapped[str] = mapped_column(String(50), default="chat")
    started_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    kunde_bewertung: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    kunde_kommentar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    supporter_bewertung: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    supporter_notiz: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    ticket: Mapped["Ticket"] = relationship(back_populates="chat_sessions")
    supporter: Mapped[Optional["Supporter"]] = relationship(back_populates="chat_sessions")
    nachrichten: Mapped[list["Nachricht"]] = relationship(back_populates="session")
    ki_recherche: Mapped[Optional["KIRechercheVerlauf"]] = relationship(
        back_populates="session", uselist=False
    )
