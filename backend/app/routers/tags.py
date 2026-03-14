"""Tag CRUD + beliebte Tags."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.ticket import Ticket
from app.models.ticket_tag import TicketTag

router = APIRouter(prefix="/api/v1/tags", tags=["tags"])


@router.get("/popular")
async def popular_tags(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Beliebteste Tags nach Häufigkeit."""
    stmt = (
        select(TicketTag.tag, func.count(TicketTag.id).label("count"))
        .group_by(TicketTag.tag)
        .order_by(func.count(TicketTag.id).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [{"tag": row.tag, "count": row.count} for row in result.all()]


@router.post("/{ticket_id}")
async def add_tag(
    ticket_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Tag zu einem Ticket hinzufügen."""
    tag_name = body.get("tag", "").strip().lower()
    if not tag_name:
        raise HTTPException(status_code=400, detail="Tag ist erforderlich")

    # Prüfen ob Ticket existiert
    result = await db.execute(select(Ticket).where(Ticket.id == uuid.UUID(ticket_id)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")

    # Prüfen ob Tag schon existiert
    existing = await db.execute(
        select(TicketTag).where(
            TicketTag.ticket_id == uuid.UUID(ticket_id),
            TicketTag.tag == tag_name,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_exists"}

    tag = TicketTag(ticket_id=uuid.UUID(ticket_id), tag=tag_name)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return {"id": str(tag.id), "tag": tag.tag, "created_at": tag.created_at}


@router.delete("/{ticket_id}/{tag_id}")
async def remove_tag(
    ticket_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Tag von einem Ticket entfernen."""
    result = await db.execute(
        select(TicketTag).where(
            TicketTag.id == uuid.UUID(tag_id),
            TicketTag.ticket_id == uuid.UUID(ticket_id),
        )
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    await db.delete(tag)
    await db.commit()
    return {"status": "ok"}
