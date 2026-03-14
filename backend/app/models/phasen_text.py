import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PhasenText(Base):
    __tablename__ = "phasen_texte"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    phase: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    titel: Mapped[str] = mapped_column(String(200))
    inhalt: Mapped[str] = mapped_column(Text)
    is_aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
    timeout_sekunden: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
