"""Nachrichten CRUD + Markieren."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.nachricht import Nachricht
from app.schemas.nachricht import NachrichtCreate, NachrichtResponse, NachrichtMarkieren
from app.services.connection_manager import manager

router = APIRouter(prefix="/api/v1/nachrichten", tags=["nachrichten"])


@router.get("/{session_id}", response_model=list[NachrichtResponse])
async def list_nachrichten(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(
        select(Nachricht)
        .where(Nachricht.session_id == uuid.UUID(session_id))
        .order_by(Nachricht.created_at)
    )
    return [
        NachrichtResponse(
            id=str(n.id), session_id=str(n.session_id), rolle=n.rolle,
            inhalt_markdown=n.inhalt_markdown, kanal=n.kanal,
            audio_ref=n.audio_ref, markiert=n.markiert, created_at=n.created_at,
        )
        for n in result.scalars().all()
    ]


@router.post("", response_model=NachrichtResponse)
async def create_nachricht(
    body: NachrichtCreate,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    nachricht = Nachricht(
        session_id=uuid.UUID(body.session_id),
        rolle=body.rolle,
        inhalt_markdown=body.inhalt_markdown,
        kanal=body.kanal,
    )
    db.add(nachricht)
    await db.commit()
    await db.refresh(nachricht)

    resp = NachrichtResponse(
        id=str(nachricht.id), session_id=str(nachricht.session_id),
        rolle=nachricht.rolle, inhalt_markdown=nachricht.inhalt_markdown,
        kanal=nachricht.kanal, audio_ref=nachricht.audio_ref,
        markiert=nachricht.markiert, created_at=nachricht.created_at,
    )

    # WebSocket-Broadcast an Ticket-Channel
    # Session → Ticket-ID ermitteln
    from app.models.chat_session import ChatSession
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == uuid.UUID(body.session_id))
    )
    session = sess_result.scalar_one_or_none()
    if session:
        await manager.broadcast(f"ticket:{session.ticket_id}", {
            "type": "neue_nachricht",
            "nachricht": resp.model_dump(mode="json"),
        })

    return resp


@router.patch("/{nachricht_id}/markieren", response_model=NachrichtResponse)
async def markieren(
    nachricht_id: str,
    body: NachrichtMarkieren,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(select(Nachricht).where(Nachricht.id == uuid.UUID(nachricht_id)))
    nachricht = result.scalar_one_or_none()
    if not nachricht:
        raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")

    nachricht.markiert = body.markiert
    await db.commit()
    await db.refresh(nachricht)
    return NachrichtResponse(
        id=str(nachricht.id), session_id=str(nachricht.session_id),
        rolle=nachricht.rolle, inhalt_markdown=nachricht.inhalt_markdown,
        kanal=nachricht.kanal, audio_ref=nachricht.audio_ref,
        markiert=nachricht.markiert, created_at=nachricht.created_at,
    )
