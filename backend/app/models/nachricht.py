import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Nachricht(Base):
    __tablename__ = "nachrichten"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    rolle: Mapped[str] = mapped_column(String(20))  # kunde, supporter
    inhalt_markdown: Mapped[str] = mapped_column(Text)
    kanal: Mapped[str] = mapped_column(String(50), default="chat")
    audio_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    markiert: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    session: Mapped["ChatSession"] = relationship(back_populates="nachrichten")
