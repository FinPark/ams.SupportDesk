"""CRUD für Kunden (Supporter-Zugriff)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.kunde import Kunde
from app.models.supporter import Supporter
from app.schemas.kunde import KundeCreate, KundeUpdate, KundeResponse

router = APIRouter(prefix="/api/v1/kunden", tags=["kunden"])


@router.get("", response_model=list[KundeResponse])
async def list_kunden(
    q: str = "",
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    stmt = select(Kunde).order_by(Kunde.name)
    if q:
        stmt = stmt.where(
            Kunde.name.ilike(f"%{q}%") | Kunde.kundennummer.ilike(f"%{q}%")
        )
    result = await db.execute(stmt)
    kunden = result.scalars().all()
    return [
        KundeResponse(
            id=str(k.id), name=k.name, kundennummer=k.kundennummer,
            email=k.email, telefon=k.telefon, bewertung_avg=k.bewertung_avg,
            created_at=k.created_at,
        )
        for k in kunden
    ]


@router.post("", response_model=KundeResponse)
async def create_kunde(
    body: KundeCreate,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    kunde = Kunde(name=body.name, kundennummer=body.kundennummer, email=body.email, telefon=body.telefon)
    db.add(kunde)
    await db.commit()
    await db.refresh(kunde)
    return KundeResponse(
        id=str(kunde.id), name=kunde.name, kundennummer=kunde.kundennummer,
        email=kunde.email, telefon=kunde.telefon, bewertung_avg=kunde.bewertung_avg,
        created_at=kunde.created_at,
    )


@router.get("/{kunde_id}", response_model=KundeResponse)
async def get_kunde(
    kunde_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(select(Kunde).where(Kunde.id == uuid.UUID(kunde_id)))
    kunde = result.scalar_one_or_none()
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    return KundeResponse(
        id=str(kunde.id), name=kunde.name, kundennummer=kunde.kundennummer,
        email=kunde.email, telefon=kunde.telefon, bewertung_avg=kunde.bewertung_avg,
        created_at=kunde.created_at,
    )


@router.patch("/{kunde_id}", response_model=KundeResponse)
async def update_kunde(
    kunde_id: str,
    body: KundeUpdate,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    result = await db.execute(select(Kunde).where(Kunde.id == uuid.UUID(kunde_id)))
    kunde = result.scalar_one_or_none()
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(kunde, field, value)

    await db.commit()
    await db.refresh(kunde)
    return KundeResponse(
        id=str(kunde.id), name=kunde.name, kundennummer=kunde.kundennummer,
        email=kunde.email, telefon=kunde.telefon, bewertung_avg=kunde.bewertung_avg,
        created_at=kunde.created_at,
    )
