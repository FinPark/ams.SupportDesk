"""Authentifizierung: Supporter (Cookie) + Kunde (Header).

Supporter: Kürzel-Login mit Auto-Create, Session in Cookie.
Kunde: X-Kunde-Id Header (Phase 1, einfach).
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.supporter import Supporter
from app.models.kunde import Kunde
from app.schemas.supporter import SupporterLogin, SupporterResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

SESSION_COOKIE = "supportdesk_session"


# --- Supporter Auth ---

async def get_current_supporter(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Supporter:
    """Dependency: Aktuellen Supporter aus Session-Cookie lesen."""
    supporter_id = request.cookies.get(SESSION_COOKIE)
    if not supporter_id:
        raise HTTPException(status_code=401, detail="Nicht angemeldet")
    try:
        uid = uuid.UUID(supporter_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Ungültige Session")

    result = await db.execute(select(Supporter).where(Supporter.id == uid))
    supporter = result.scalar_one_or_none()
    if not supporter:
        raise HTTPException(status_code=401, detail="Supporter nicht gefunden")
    return supporter


# --- Kunden Auth ---

async def get_current_kunde(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Kunde:
    """Dependency: Kunden-ID aus X-Kunde-Id Header lesen."""
    kunde_id = request.headers.get("X-Kunde-Id")
    if not kunde_id:
        raise HTTPException(status_code=401, detail="Kunden-Identifikation fehlt")
    try:
        uid = uuid.UUID(kunde_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Ungültige Kunden-ID")

    result = await db.execute(select(Kunde).where(Kunde.id == uid))
    kunde = result.scalar_one_or_none()
    if not kunde:
        raise HTTPException(status_code=401, detail="Kunde nicht gefunden")
    return kunde


# --- Auth Endpoints ---

@router.post("/login", response_model=SupporterResponse)
async def login(body: SupporterLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login mit Kürzel. Erstellt Supporter automatisch wenn nicht vorhanden."""
    kuerzel = body.kuerzel.strip().upper()
    if not kuerzel or len(kuerzel) > 10:
        raise HTTPException(status_code=400, detail="Kürzel ungültig (1-10 Zeichen)")

    result = await db.execute(select(Supporter).where(Supporter.kuerzel == kuerzel))
    supporter = result.scalar_one_or_none()

    if not supporter:
        supporter = Supporter(kuerzel=kuerzel, name=kuerzel)
        db.add(supporter)
        await db.commit()
        await db.refresh(supporter)

    response.set_cookie(
        key=SESSION_COOKIE,
        value=str(supporter.id),
        httponly=True,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 30,  # 30 Tage
    )
    return SupporterResponse(
        id=str(supporter.id),
        kuerzel=supporter.kuerzel,
        name=supporter.name,
        email=supporter.email,
        created_at=supporter.created_at,
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=SupporterResponse)
async def me(supporter: Supporter = Depends(get_current_supporter)):
    return SupporterResponse(
        id=str(supporter.id),
        kuerzel=supporter.kuerzel,
        name=supporter.name,
        email=supporter.email,
        created_at=supporter.created_at,
    )
