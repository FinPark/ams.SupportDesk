"""Eingangskorb: Tickets ohne Supporter, älteste zuerst."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.ticket import Ticket
from app.models.nachricht import Nachricht
from app.models.chat_session import ChatSession

router = APIRouter(prefix="/api/v1/eingangskorb", tags=["eingangskorb"])


@router.get("")
async def get_eingangskorb(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle Tickets im Eingangskorb (Status=eingang, kein Supporter zugeordnet)."""
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde))
        .where(Ticket.status == "eingang")
        .order_by(Ticket.created_at.asc())
    )
    result = await db.execute(stmt)
    tickets = result.scalars().all()

    items = []
    for ticket in tickets:
        # Letzte Nachricht als Vorschau
        vorschau = ""
        sess_result = await db.execute(
            select(ChatSession)
            .where(ChatSession.ticket_id == ticket.id)
            .order_by(ChatSession.started_at.desc())
            .limit(1)
        )
        session = sess_result.scalar_one_or_none()
        if session:
            msg_result = await db.execute(
                select(Nachricht)
                .where(Nachricht.session_id == session.id)
                .order_by(Nachricht.created_at.desc())
                .limit(1)
            )
            msg = msg_result.scalar_one_or_none()
            if msg:
                vorschau = msg.inhalt_markdown[:150]

        items.append({
            "ticket_id": str(ticket.id),
            "kunde_name": ticket.kunde.name if ticket.kunde else "Unbekannt",
            "titel": ticket.titel,
            "prioritaet": ticket.prioritaet,
            "tags": [t.tag for t in ticket.tags],
            "vorschau": vorschau,
            "created_at": ticket.created_at.isoformat(),
        })

    return items
