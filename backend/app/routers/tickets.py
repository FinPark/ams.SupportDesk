"""Ticket CRUD + Statusmaschine + Übernahme."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.kunde import Kunde
from app.models.ticket import Ticket
from app.models.ticket_tag import TicketTag
from app.models.chat_session import ChatSession
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse,
    TicketTagResponse, TicketStatusUpdate,
)
from app.services.connection_manager import manager

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])

# Erlaubte Status-Übergänge
VALID_TRANSITIONS = {
    "eingang": ["in_bearbeitung"],
    "in_bearbeitung": ["wartet", "geloest"],
    "wartet": ["eingang"],
    "geloest": ["bewertung"],
    "bewertung": ["geschlossen"],
    "geschlossen": ["eingang"],
}


def _ticket_response(ticket: Ticket) -> TicketResponse:
    return TicketResponse(
        id=str(ticket.id),
        nummer=ticket.nummer,
        kunde_id=str(ticket.kunde_id),
        supporter_id=str(ticket.supporter_id) if ticket.supporter_id else None,
        titel=ticket.titel,
        status=ticket.status,
        prioritaet=ticket.prioritaet,
        ki_bewertung=ticket.ki_bewertung,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        closed_at=ticket.closed_at,
        tags=[TicketTagResponse(id=str(t.id), tag=t.tag, created_at=t.created_at) for t in ticket.tags],
        kunde_name=ticket.kunde.name if ticket.kunde else None,
        supporter_kuerzel=ticket.supporter.kuerzel if ticket.supporter else None,
    )


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    status: str = "",
    supporter_id: str = "",
    kunde_id: str = "",
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde), selectinload(Ticket.supporter))
        .order_by(Ticket.updated_at.desc())
    )
    if status:
        stmt = stmt.where(Ticket.status == status)
    if supporter_id:
        stmt = stmt.where(Ticket.supporter_id == uuid.UUID(supporter_id))
    if kunde_id:
        stmt = stmt.where(Ticket.kunde_id == uuid.UUID(kunde_id))

    result = await db.execute(stmt)
    return [_ticket_response(t) for t in result.scalars().all()]


@router.post("", response_model=TicketResponse)
async def create_ticket(
    body: TicketCreate,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    ticket = Ticket(
        kunde_id=uuid.UUID(body.kunde_id),
        supporter_id=supporter.id,
        titel=body.titel,
        prioritaet=body.prioritaet,
        status="in_bearbeitung",
    )
    db.add(ticket)
    await db.flush()

    # Tags hinzufügen
    for tag_name in body.tags:
        tag = TicketTag(ticket_id=ticket.id, tag=tag_name.strip().lower())
        db.add(tag)

    # Chat-Session erstellen
    session = ChatSession(ticket_id=ticket.id, supporter_id=supporter.id, kanal="chat")
    db.add(session)

    await db.commit()

    # Neu laden mit Relations
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde), selectinload(Ticket.supporter))
        .where(Ticket.id == ticket.id)
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one()
    return _ticket_response(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde), selectinload(Ticket.supporter))
        .where(Ticket.id == uuid.UUID(ticket_id))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
    return _ticket_response(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    body: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde), selectinload(Ticket.supporter))
        .where(Ticket.id == uuid.UUID(ticket_id))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)

    # Status-Übergang validieren
    if "status" in update_data:
        new_status = update_data["status"]
        allowed = VALID_TRANSITIONS.get(ticket.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Ungültiger Status-Übergang: {ticket.status} → {new_status}. Erlaubt: {allowed}",
            )
        if new_status == "geschlossen":
            ticket.closed_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(ticket, field, value)

    await db.commit()
    await db.refresh(ticket)
    return _ticket_response(ticket)


@router.post("/{ticket_id}/uebernehmen", response_model=TicketResponse)
async def uebernehmen(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    """Supporter übernimmt ein Ticket aus dem Eingangskorb."""
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.tags), selectinload(Ticket.kunde), selectinload(Ticket.supporter))
        .where(Ticket.id == uuid.UUID(ticket_id))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")

    if ticket.status != "eingang":
        raise HTTPException(status_code=400, detail="Ticket ist nicht im Eingangskorb")

    ticket.supporter_id = supporter.id
    ticket.status = "in_bearbeitung"

    # Offene Session dem Supporter zuordnen
    sess_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.ticket_id == ticket.id, ChatSession.ended_at.is_(None))
    )
    for session in sess_result.scalars().all():
        session.supporter_id = supporter.id

    await db.commit()
    await db.refresh(ticket)

    # Eingangskorb-Update
    await manager.broadcast_eingangskorb({
        "type": "ticket_uebernommen",
        "ticket_id": str(ticket.id),
        "supporter_kuerzel": supporter.kuerzel,
    })

    return _ticket_response(ticket)
