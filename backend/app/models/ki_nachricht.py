import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KINachricht(Base):
    __tablename__ = "ki_nachrichten"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    verlauf_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ki_recherche_verlaeufe.id"), index=True
    )
    rolle: Mapped[str] = mapped_column(String(20))  # supporter, ki
    inhalt_markdown: Mapped[str] = mapped_column(Text)
    uebernommen_in_chat: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    verlauf: Mapped["KIRechercheVerlauf"] = relationship(back_populates="nachrichten")
