"""Kunden-Portal: Identifikation, Nachrichten senden/empfangen, neues Ticket."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.kunde import Kunde
from app.models.ticket import Ticket
from app.models.ticket_tag import TicketTag
from app.models.chat_session import ChatSession
from app.models.nachricht import Nachricht
from app.schemas.kunde import KundeIdentify
from app.schemas.nachricht import NachrichtCreate, NachrichtResponse
from app.schemas.ticket import TicketResponse, TicketTagResponse
from app.services.connection_manager import manager

router = APIRouter(prefix="/api/v1/portal", tags=["portal"])


@router.post("/identify")
async def identify_kunde(body: KundeIdentify, db: AsyncSession = Depends(get_db)):
    """Kunde identifiziert sich mit Name (+ optional Ticket-Nr).
    Erstellt Kunde automatisch wenn nicht vorhanden."""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name ist erforderlich")

    # Kunde suchen oder erstellen
    result = await db.execute(select(Kunde).where(Kunde.name == name))
    kunde = result.scalar_one_or_none()

    if not kunde:
        kunde = Kunde(name=name)
        db.add(kunde)
        await db.commit()
        await db.refresh(kunde)

    response = {"kunde_id": str(kunde.id), "name": kunde.name, "ticket": None}

    # Wenn Ticket-Nr angegeben, Ticket laden
    if body.ticket_nr:
        try:
            ticket_uuid = uuid.UUID(body.ticket_nr)
            stmt = (
                select(Ticket)
                .options(selectinload(Ticket.tags))
                .where(Ticket.id == ticket_uuid, Ticket.kunde_id == kunde.id)
            )
            t_result = await db.execute(stmt)
            ticket = t_result.scalar_one_or_none()
            if ticket:
                response["ticket"] = {
                    "id": str(ticket.id),
                    "titel": ticket.titel,
                    "status": ticket.status,
                }
        except ValueError:
            pass

    return response


@router.post("/tickets")
async def create_portal_ticket(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Kunde erstellt ein neues Ticket über das Portal."""
    kunde_id = body.get("kunde_id")
    nachricht_text = body.get("nachricht", "").strip()
    titel = body.get("titel", "Neue Anfrage")

    if not kunde_id or not nachricht_text:
        raise HTTPException(status_code=400, detail="kunde_id und nachricht sind erforderlich")

    # Kunde prüfen
    result = await db.execute(select(Kunde).where(Kunde.id == uuid.UUID(kunde_id)))
    kunde = result.scalar_one_or_none()
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")

    # Ticket erstellen
    ticket = Ticket(kunde_id=kunde.id, titel=titel, status="eingang")
    db.add(ticket)
    await db.flush()

    # Chat-Session erstellen
    session = ChatSession(ticket_id=ticket.id, kanal="chat")
    db.add(session)
    await db.flush()

    # Erste Nachricht
    nachricht = Nachricht(
        session_id=session.id,
        rolle="kunde",
        inhalt_markdown=nachricht_text,
    )
    db.add(nachricht)
    await db.commit()
    await db.refresh(ticket)
    await db.refresh(session)
    await db.refresh(nachricht)

    # WebSocket: Eingangskorb benachrichtigen
    await manager.broadcast_eingangskorb({
        "type": "neues_ticket",
        "ticket_id": str(ticket.id),
        "kunde_name": kunde.name,
        "titel": ticket.titel,
        "vorschau": nachricht_text[:100],
    })

    return {
        "ticket_id": str(ticket.id),
        "session_id": str(session.id),
        "nachricht_id": str(nachricht.id),
    }


@router.get("/tickets/{ticket_id}/nachrichten")
async def get_portal_nachrichten(
    ticket_id: str,
    kunde_id: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Nachrichten eines Tickets laden (Kundensicht — nur sichtbare)."""
    if not kunde_id:
        raise HTTPException(status_code=400, detail="kunde_id Parameter erforderlich")

    # Ticket prüfen + Zugehörigkeit
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == uuid.UUID(ticket_id),
            Ticket.kunde_id == uuid.UUID(kunde_id),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")

    # Aktive Session finden
    sess_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.ticket_id == ticket.id)
        .order_by(ChatSession.started_at.desc())
    )
    sessions = sess_result.scalars().all()

    nachrichten = []
    for session in sessions:
        msg_result = await db.execute(
            select(Nachricht)
            .where(Nachricht.session_id == session.id)
            .order_by(Nachricht.created_at)
        )
        for msg in msg_result.scalars().all():
            nachrichten.append(NachrichtResponse(
                id=str(msg.id),
                session_id=str(msg.session_id),
                rolle=msg.rolle,
                inhalt_markdown=msg.inhalt_markdown,
                kanal=msg.kanal,
                audio_ref=msg.audio_ref,
                markiert=msg.markiert,
                created_at=msg.created_at,
            ))

    return nachrichten


@router.post("/tickets/{ticket_id}/nachrichten")
async def send_portal_nachricht(
    ticket_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Kunde sendet eine Nachricht."""
    kunde_id = body.get("kunde_id")
    inhalt = body.get("inhalt_markdown", "").strip()

    if not kunde_id or not inhalt:
        raise HTTPException(status_code=400, detail="kunde_id und inhalt_markdown sind erforderlich")

    # Ticket prüfen
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == uuid.UUID(ticket_id),
            Ticket.kunde_id == uuid.UUID(kunde_id),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")

    # Reopening: geschlossenes Ticket wieder öffnen
    if ticket.status == "geschlossen":
        ticket.status = "eingang"
        ticket.closed_at = None

    # Aktuelle Session finden oder neue erstellen
    sess_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.ticket_id == ticket.id, ChatSession.ended_at.is_(None))
        .order_by(ChatSession.started_at.desc())
    )
    session = sess_result.scalar_one_or_none()

    if not session:
        session = ChatSession(ticket_id=ticket.id, kanal="chat")
        db.add(session)
        await db.flush()

    nachricht = Nachricht(
        session_id=session.id,
        rolle="kunde",
        inhalt_markdown=inhalt,
    )
    db.add(nachricht)
    await db.commit()
    await db.refresh(nachricht)

    # WebSocket: Ticket-Channel + Eingangskorb
    msg_data = {
        "type": "neue_nachricht",
        "nachricht": NachrichtResponse(
            id=str(nachricht.id),
            session_id=str(nachricht.session_id),
            rolle=nachricht.rolle,
            inhalt_markdown=nachricht.inhalt_markdown,
            kanal=nachricht.kanal,
            audio_ref=nachricht.audio_ref,
            markiert=nachricht.markiert,
            created_at=nachricht.created_at,
        ).model_dump(mode="json"),
    }
    await manager.broadcast(f"ticket:{ticket_id}", msg_data)

    if ticket.status == "eingang":
        kunde_result = await db.execute(select(Kunde).where(Kunde.id == ticket.kunde_id))
        kunde = kunde_result.scalar_one()
        await manager.broadcast_eingangskorb({
            "type": "neue_nachricht",
            "ticket_id": str(ticket.id),
            "kunde_name": kunde.name,
            "vorschau": inhalt[:100],
        })

    return NachrichtResponse(
        id=str(nachricht.id),
        session_id=str(nachricht.session_id),
        rolle=nachricht.rolle,
        inhalt_markdown=nachricht.inhalt_markdown,
        kanal=nachricht.kanal,
        audio_ref=nachricht.audio_ref,
        markiert=nachricht.markiert,
        created_at=nachricht.created_at,
    )
