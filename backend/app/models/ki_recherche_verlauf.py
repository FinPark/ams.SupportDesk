import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KIRechercheVerlauf(Base):
    __tablename__ = "ki_recherche_verlaeufe"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_sessions.id"), unique=True, index=True
    )
    provider: Mapped[str] = mapped_column(String(100), default="")
    model_used: Mapped[str] = mapped_column(String(200), default="")
    gestartet_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    zuletzt_aktiv: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    verwaist: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["ChatSession"] = relationship(back_populates="ki_recherche")
    nachrichten: Mapped[list["KINachricht"]] = relationship(back_populates="verlauf")
