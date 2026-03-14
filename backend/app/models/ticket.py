import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Float, ForeignKey, Identity, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nummer: Mapped[int] = mapped_column(
        Integer, Identity(start=1001, increment=1), unique=True, index=True
    )
    kunde_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kunden.id"), index=True)
    supporter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("supporters.id"), nullable=True, index=True
    )
    titel: Mapped[str] = mapped_column(String(500), default="Neue Anfrage")
    status: Mapped[str] = mapped_column(String(50), default="eingang", index=True)
    prioritaet: Mapped[str] = mapped_column(String(20), default="normal")
    ki_bewertung: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    kunde: Mapped["Kunde"] = relationship(back_populates="tickets")
    supporter: Mapped[Optional["Supporter"]] = relationship(back_populates="tickets")
    tags: Mapped[list["TicketTag"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="ticket")
    bewertungen: Mapped[list["Bewertung"]] = relationship(back_populates="ticket")
