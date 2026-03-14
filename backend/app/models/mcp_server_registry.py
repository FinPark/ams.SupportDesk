import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MCPServerRegistry(Base):
    __tablename__ = "mcp_server_registry"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String(500), default="")
    transport_type: Mapped[str] = mapped_column(String(50), default="streamable_http")
    command: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    args: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    auth_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_rag: Mapped[bool] = mapped_column(Boolean, default=False)
    thoster_tool_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
