"""Chat-Session CRUD."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.chat_session import ChatSession
from app.schemas.chat_session import ChatSessionCreate, ChatSessionResponse

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.get("/{ticket_id}", response_model=list[ChatSessionResponse])
async def list_sessions(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.ticket_id == uuid.UUID(ticket_id))
        .order_by(ChatSession.started_at.desc())
    )
    return [
        ChatSessionResponse(
            id=str(s.id), ticket_id=str(s.ticket_id),
            supporter_id=str(s.supporter_id) if s.supporter_id else None,
            kanal=s.kanal, started_at=s.started_at, ended_at=s.ended_at,
            kunde_bewertung=s.kunde_bewertung, kunde_kommentar=s.kunde_kommentar,
            supporter_bewertung=s.supporter_bewertung, supporter_notiz=s.supporter_notiz,
        )
        for s in result.scalars().all()
    ]


@router.post("", response_model=ChatSessionResponse)
async def create_session(
    body: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    session = ChatSession(
        ticket_id=uuid.UUID(body.ticket_id),
        supporter_id=supporter.id,
        kanal=body.kanal,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ChatSessionResponse(
        id=str(session.id), ticket_id=str(session.ticket_id),
        supporter_id=str(session.supporter_id) if session.supporter_id else None,
        kanal=session.kanal, started_at=session.started_at, ended_at=session.ended_at,
        kunde_bewertung=session.kunde_bewertung, kunde_kommentar=session.kunde_kommentar,
        supporter_bewertung=session.supporter_bewertung, supporter_notiz=session.supporter_notiz,
    )


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(select(ChatSession).where(ChatSession.id == uuid.UUID(session_id)))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok"}
