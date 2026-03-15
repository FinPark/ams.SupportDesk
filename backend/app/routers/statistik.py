"""Statistik & Analytics — 6 Endpoints (1 pro Tab)."""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, extract, text, and_, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.kunde import Kunde
from app.models.ticket import Ticket
from app.models.ticket_tag import TicketTag
from app.models.chat_session import ChatSession
from app.models.nachricht import Nachricht
from app.models.bewertung import Bewertung
from app.models.ki_recherche_verlauf import KIRechercheVerlauf
from app.models.ki_nachricht import KINachricht

router = APIRouter(prefix="/api/v1/statistik", tags=["statistik"])


def _parse_filters(
    von: Optional[str],
    bis: Optional[str],
    supporter_id: Optional[str],
    kunde_id: Optional[str],
):
    """Parse common query filters."""
    date_from = None
    date_to = None
    sup_id = None
    kun_id = None

    if von:
        try:
            date_from = datetime.fromisoformat(von).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    if bis:
        try:
            date_to = datetime.fromisoformat(bis).replace(tzinfo=timezone.utc)
            # End of day
            if date_to.hour == 0 and date_to.minute == 0:
                date_to = date_to + timedelta(days=1)
        except ValueError:
            pass
    if supporter_id:
        try:
            sup_id = uuid.UUID(supporter_id)
        except ValueError:
            pass
    if kunde_id:
        try:
            kun_id = uuid.UUID(kunde_id)
        except ValueError:
            pass

    return date_from, date_to, sup_id, kun_id


def _ticket_date_filters(date_from, date_to, sup_id, kun_id):
    """Build WHERE conditions for tickets table."""
    conditions = []
    if date_from:
        conditions.append(Ticket.created_at >= date_from)
    if date_to:
        conditions.append(Ticket.created_at < date_to)
    if sup_id:
        conditions.append(Ticket.supporter_id == sup_id)
    if kun_id:
        conditions.append(Ticket.kunde_id == kun_id)
    return conditions


# ── Tab 1: Übersicht ──────────────────────────────────────────────

@router.get("/uebersicht")
async def statistik_uebersicht(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)
    filters = _ticket_date_filters(date_from, date_to, sup_id, kun_id)

    # KPI: Offene Tickets
    offene_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status.notin_(["geschlossen", "geloest", "bewertung"]),
            *filters
        )
    )
    offene = offene_result.scalar() or 0

    # KPI: Neue heute
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    neue_heute_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.created_at >= today_start,
            *filters
        )
    )
    neue_heute = neue_heute_result.scalar() or 0

    # KPI: Gelöst (im Zeitraum)
    geloest_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status.in_(["geloest", "bewertung", "geschlossen"]),
            *filters
        )
    )
    geloest = geloest_result.scalar() or 0

    # KPI: Durchschnittsbewertung
    bew_filters = []
    if date_from:
        bew_filters.append(Bewertung.created_at >= date_from)
    if date_to:
        bew_filters.append(Bewertung.created_at < date_to)
    avg_bew_result = await db.execute(
        select(func.avg(Bewertung.sterne)).where(
            Bewertung.typ == "kunde",
            Bewertung.sterne > 0,
            *bew_filters,
        )
    )
    avg_bewertung = avg_bew_result.scalar()
    avg_bewertung = round(float(avg_bewertung), 1) if avg_bewertung else 0

    # Ticket-Trend (letzte 30 Tage oder Zeitraum, gruppiert nach Tag)
    trend_from = date_from or (datetime.now(timezone.utc) - timedelta(days=30))
    trend_to = date_to or datetime.now(timezone.utc)

    # Eingang pro Tag
    eingang_result = await db.execute(
        select(
            func.date_trunc("day", Ticket.created_at).label("tag"),
            func.count(Ticket.id).label("anzahl"),
        )
        .where(Ticket.created_at >= trend_from, Ticket.created_at < trend_to, *filters)
        .group_by("tag")
        .order_by("tag")
    )
    eingang_trend = [{"datum": str(r.tag.date()), "anzahl": r.anzahl} for r in eingang_result]

    # Geschlossen pro Tag
    close_filters = list(filters)
    geschlossen_result = await db.execute(
        select(
            func.date_trunc("day", Ticket.closed_at).label("tag"),
            func.count(Ticket.id).label("anzahl"),
        )
        .where(
            Ticket.closed_at.isnot(None),
            Ticket.closed_at >= trend_from,
            Ticket.closed_at < trend_to,
            *close_filters,
        )
        .group_by("tag")
        .order_by("tag")
    )
    geschlossen_trend = [{"datum": str(r.tag.date()), "anzahl": r.anzahl} for r in geschlossen_result]

    # Status-Verteilung
    status_result = await db.execute(
        select(Ticket.status, func.count(Ticket.id).label("anzahl"))
        .where(*filters)
        .group_by(Ticket.status)
    )
    status_verteilung = [{"status": r.status, "anzahl": r.anzahl} for r in status_result]

    # Prioritäts-Verteilung
    prio_result = await db.execute(
        select(Ticket.prioritaet, func.count(Ticket.id).label("anzahl"))
        .where(*filters)
        .group_by(Ticket.prioritaet)
    )
    prioritaet_verteilung = [{"prioritaet": r.prioritaet, "anzahl": r.anzahl} for r in prio_result]

    # Top Tags
    tag_filters = []
    if date_from:
        tag_filters.append(TicketTag.created_at >= date_from)
    if date_to:
        tag_filters.append(TicketTag.created_at < date_to)
    tags_result = await db.execute(
        select(TicketTag.tag, func.count(TicketTag.id).label("anzahl"))
        .where(*tag_filters)
        .group_by(TicketTag.tag)
        .order_by(func.count(TicketTag.id).desc())
        .limit(10)
    )
    top_tags = [{"tag": r.tag, "anzahl": r.anzahl} for r in tags_result]

    # Tickets gesamt
    gesamt_result = await db.execute(
        select(func.count(Ticket.id)).where(*filters)
    )
    gesamt = gesamt_result.scalar() or 0

    return {
        "kpis": {
            "offene": offene,
            "neue_heute": neue_heute,
            "geloest": geloest,
            "avg_bewertung": avg_bewertung,
            "gesamt": gesamt,
        },
        "ticket_trend": {
            "eingang": eingang_trend,
            "geschlossen": geschlossen_trend,
        },
        "status_verteilung": status_verteilung,
        "prioritaet_verteilung": prioritaet_verteilung,
        "top_tags": top_tags,
    }


# ── Tab 2: Supporter ──────────────────────────────────────────────

@router.get("/supporter")
async def statistik_supporter(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)

    # Alle Supporter laden
    supporters_result = await db.execute(select(Supporter))
    supporters = {s.id: s for s in supporters_result.scalars().all()}

    rangliste = []
    for sid, sup in supporters.items():
        if sup_id and sid != sup_id:
            continue

        t_filters = [Ticket.supporter_id == sid]
        if date_from:
            t_filters.append(Ticket.created_at >= date_from)
        if date_to:
            t_filters.append(Ticket.created_at < date_to)
        if kun_id:
            t_filters.append(Ticket.kunde_id == kun_id)

        # Tickets gesamt
        total = await db.execute(select(func.count(Ticket.id)).where(*t_filters))
        total_count = total.scalar() or 0

        # Aktive Tickets
        aktiv = await db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.supporter_id == sid,
                Ticket.status.notin_(["geschlossen"]),
            )
        )
        aktive_count = aktiv.scalar() or 0

        # Durchschnittliche Bearbeitungsdauer (Stunden)
        dur = await db.execute(
            select(
                func.avg(
                    extract("epoch", Ticket.closed_at - Ticket.created_at) / 3600
                )
            ).where(
                Ticket.supporter_id == sid,
                Ticket.closed_at.isnot(None),
                *t_filters[1:],  # ohne supporter filter (schon gesetzt)
            )
        )
        avg_duration = dur.scalar()
        avg_duration = round(float(avg_duration), 1) if avg_duration else None

        # Bewertung
        bew_stmt = (
            select(func.avg(Bewertung.sterne))
            .join(Ticket, Bewertung.ticket_id == Ticket.id)
            .where(
                Ticket.supporter_id == sid,
                Bewertung.typ == "kunde",
                Bewertung.sterne > 0,
            )
        )
        if date_from:
            bew_stmt = bew_stmt.where(Bewertung.created_at >= date_from)
        if date_to:
            bew_stmt = bew_stmt.where(Bewertung.created_at < date_to)
        bew_result = await db.execute(bew_stmt)
        avg_bew = bew_result.scalar()
        avg_bew = round(float(avg_bew), 1) if avg_bew else None

        # Lösungsrate
        solved_filters = list(t_filters)
        solved = await db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.status.in_(["geloest", "bewertung", "geschlossen"]),
                *solved_filters,
            )
        )
        solved_count = solved.scalar() or 0
        loesungsrate = round(solved_count / total_count * 100, 1) if total_count > 0 else 0

        # KI-Nutzungsrate
        ki_stmt = (
            select(func.count(KIRechercheVerlauf.id))
            .join(ChatSession, KIRechercheVerlauf.session_id == ChatSession.id)
            .where(ChatSession.supporter_id == sid)
        )
        if date_from:
            ki_stmt = ki_stmt.where(KIRechercheVerlauf.gestartet_at >= date_from)
        if date_to:
            ki_stmt = ki_stmt.where(KIRechercheVerlauf.gestartet_at < date_to)
        ki_result = await db.execute(ki_stmt)
        ki_count = ki_result.scalar() or 0

        rangliste.append({
            "supporter_id": str(sid),
            "kuerzel": sup.kuerzel,
            "name": sup.name,
            "tickets_gesamt": total_count,
            "aktive_tickets": aktive_count,
            "avg_bearbeitungsdauer_h": avg_duration,
            "avg_bewertung": avg_bew,
            "loesungsrate": loesungsrate,
            "ki_sessions": ki_count,
        })

    # Nach Tickets absteigend sortieren
    rangliste.sort(key=lambda x: x["tickets_gesamt"], reverse=True)

    return {
        "rangliste": rangliste,
    }


# ── Tab 3: Kunden ─────────────────────────────────────────────────

@router.get("/kunden")
async def statistik_kunden(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)

    # Top Kunden nach Ticketvolumen
    top_stmt = (
        select(
            Kunde.id,
            Kunde.name,
            func.count(Ticket.id).label("tickets"),
        )
        .join(Ticket, Ticket.kunde_id == Kunde.id)
        .group_by(Kunde.id, Kunde.name)
        .order_by(func.count(Ticket.id).desc())
        .limit(20)
    )
    t_filters = []
    if date_from:
        t_filters.append(Ticket.created_at >= date_from)
    if date_to:
        t_filters.append(Ticket.created_at < date_to)
    if sup_id:
        t_filters.append(Ticket.supporter_id == sup_id)
    if kun_id:
        top_stmt = top_stmt.where(Kunde.id == kun_id)
    if t_filters:
        top_stmt = top_stmt.where(*t_filters)

    top_result = await db.execute(top_stmt)
    top_kunden = []
    for r in top_result:
        # Bewertung
        bew_stmt = (
            select(func.avg(Bewertung.sterne))
            .join(Ticket, Bewertung.ticket_id == Ticket.id)
            .where(Ticket.kunde_id == r.id, Bewertung.typ == "kunde", Bewertung.sterne > 0)
        )
        bew_result = await db.execute(bew_stmt)
        avg_bew = bew_result.scalar()

        # Nachrichten pro Ticket
        msg_stmt = (
            select(func.count(Nachricht.id))
            .join(ChatSession, Nachricht.session_id == ChatSession.id)
            .join(Ticket, ChatSession.ticket_id == Ticket.id)
            .where(Ticket.kunde_id == r.id)
        )
        msg_result = await db.execute(msg_stmt)
        msg_count = msg_result.scalar() or 0
        avg_msgs = round(msg_count / r.tickets, 1) if r.tickets > 0 else 0

        top_kunden.append({
            "kunde_id": str(r.id),
            "name": r.name,
            "tickets": r.tickets,
            "avg_bewertung": round(float(avg_bew), 1) if avg_bew else None,
            "avg_nachrichten_pro_ticket": avg_msgs,
        })

    # Neue Kunden pro Monat
    neue_kunden_result = await db.execute(
        select(
            func.date_trunc("month", Kunde.created_at).label("monat"),
            func.count(Kunde.id).label("anzahl"),
        )
        .group_by("monat")
        .order_by("monat")
        .limit(24)
    )
    neue_kunden_trend = [
        {"monat": str(r.monat.date()), "anzahl": r.anzahl}
        for r in neue_kunden_result
    ]

    return {
        "top_kunden": top_kunden,
        "neue_kunden_trend": neue_kunden_trend,
    }


# ── Tab 4: Zeiten & SLA ───────────────────────────────────────────

@router.get("/zeiten")
async def statistik_zeiten(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)
    filters = _ticket_date_filters(date_from, date_to, sup_id, kun_id)

    # Erste Antwortzeit: Ticket.created_at → erste Nachricht mit rolle=supporter
    # Subquery: Früheste Supporter-Nachricht pro Ticket
    first_response_sub = (
        select(
            ChatSession.ticket_id,
            func.min(Nachricht.created_at).label("first_response"),
        )
        .join(Nachricht, Nachricht.session_id == ChatSession.id)
        .where(Nachricht.rolle == "supporter")
        .group_by(ChatSession.ticket_id)
        .subquery()
    )

    frt_stmt = (
        select(
            func.avg(
                extract("epoch", first_response_sub.c.first_response - Ticket.created_at) / 60
            )
        )
        .join(first_response_sub, first_response_sub.c.ticket_id == Ticket.id)
        .where(*filters)
    )
    frt_result = await db.execute(frt_stmt)
    avg_first_response_min = frt_result.scalar()
    avg_first_response_min = round(float(avg_first_response_min), 1) if avg_first_response_min else 0

    # Durchschnittliche Bearbeitungsdauer (Stunden)
    dur_stmt = (
        select(
            func.avg(extract("epoch", Ticket.closed_at - Ticket.created_at) / 3600)
        )
        .where(Ticket.closed_at.isnot(None), *filters)
    )
    dur_result = await db.execute(dur_stmt)
    avg_duration_h = dur_result.scalar()
    avg_duration_h = round(float(avg_duration_h), 1) if avg_duration_h else 0

    # Median Bearbeitungsdauer
    median_stmt = text("""
        SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM closed_at - created_at) / 3600
        ) as median
        FROM tickets
        WHERE closed_at IS NOT NULL
    """)
    median_result = await db.execute(median_stmt)
    median_h = median_result.scalar()
    median_h = round(float(median_h), 1) if median_h else 0

    # Durchschnittliche Session-Dauer (Minuten)
    sess_filters = []
    if date_from:
        sess_filters.append(ChatSession.started_at >= date_from)
    if date_to:
        sess_filters.append(ChatSession.started_at < date_to)
    if sup_id:
        sess_filters.append(ChatSession.supporter_id == sup_id)
    sess_dur_stmt = (
        select(
            func.avg(extract("epoch", ChatSession.ended_at - ChatSession.started_at) / 60)
        )
        .where(ChatSession.ended_at.isnot(None), *sess_filters)
    )
    sess_dur_result = await db.execute(sess_dur_stmt)
    avg_session_min = sess_dur_result.scalar()
    avg_session_min = round(float(avg_session_min), 1) if avg_session_min else 0

    # Bearbeitungsdauer-Verteilung (Buckets: 0-1h, 1-4h, 4-8h, 8-24h, 24-72h, >72h)
    buckets_stmt = (
        select(
            case(
                (extract("epoch", Ticket.closed_at - Ticket.created_at) < 3600, "< 1h"),
                (extract("epoch", Ticket.closed_at - Ticket.created_at) < 14400, "1-4h"),
                (extract("epoch", Ticket.closed_at - Ticket.created_at) < 28800, "4-8h"),
                (extract("epoch", Ticket.closed_at - Ticket.created_at) < 86400, "8-24h"),
                (extract("epoch", Ticket.closed_at - Ticket.created_at) < 259200, "1-3d"),
                else_="> 3d",
            ).label("bucket"),
            func.count(Ticket.id).label("anzahl"),
        )
        .where(Ticket.closed_at.isnot(None), *filters)
        .group_by("bucket")
    )
    buckets_result = await db.execute(buckets_stmt)
    bearbeitungsdauer_verteilung = [
        {"bucket": r.bucket, "anzahl": r.anzahl} for r in buckets_result
    ]

    # Antwortzeit-Trend (pro Woche)
    trend_from = date_from or (datetime.now(timezone.utc) - timedelta(days=90))
    frt_trend_stmt = (
        select(
            func.date_trunc("week", Ticket.created_at).label("woche"),
            func.avg(
                extract("epoch", first_response_sub.c.first_response - Ticket.created_at) / 60
            ).label("avg_min"),
        )
        .join(first_response_sub, first_response_sub.c.ticket_id == Ticket.id)
        .where(Ticket.created_at >= trend_from, *filters)
        .group_by("woche")
        .order_by("woche")
    )
    frt_trend_result = await db.execute(frt_trend_stmt)
    antwortzeit_trend = [
        {"woche": str(r.woche.date()), "avg_min": round(float(r.avg_min), 1) if r.avg_min else 0}
        for r in frt_trend_result
    ]

    # Heatmap: Ticket-Eingang nach Wochentag + Stunde
    heatmap_stmt = (
        select(
            extract("dow", Ticket.created_at).label("wochentag"),
            extract("hour", Ticket.created_at).label("stunde"),
            func.count(Ticket.id).label("anzahl"),
        )
        .where(*filters)
        .group_by("wochentag", "stunde")
        .order_by("wochentag", "stunde")
    )
    heatmap_result = await db.execute(heatmap_stmt)
    heatmap = [
        {"wochentag": int(r.wochentag), "stunde": int(r.stunde), "anzahl": r.anzahl}
        for r in heatmap_result
    ]

    return {
        "kpis": {
            "avg_first_response_min": avg_first_response_min,
            "avg_bearbeitungsdauer_h": avg_duration_h,
            "median_bearbeitungsdauer_h": median_h,
            "avg_session_dauer_min": avg_session_min,
        },
        "bearbeitungsdauer_verteilung": bearbeitungsdauer_verteilung,
        "antwortzeit_trend": antwortzeit_trend,
        "heatmap": heatmap,
    }


# ── Tab 5: Qualität ───────────────────────────────────────────────

@router.get("/qualitaet")
async def statistik_qualitaet(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)
    filters = _ticket_date_filters(date_from, date_to, sup_id, kun_id)

    bew_filters = []
    if date_from:
        bew_filters.append(Bewertung.created_at >= date_from)
    if date_to:
        bew_filters.append(Bewertung.created_at < date_to)

    # KPI: Durchschnittsbewertung
    avg_stmt = select(func.avg(Bewertung.sterne)).where(
        Bewertung.typ == "kunde", Bewertung.sterne > 0, *bew_filters
    )
    avg_result = await db.execute(avg_stmt)
    avg_sterne = avg_result.scalar()
    avg_sterne = round(float(avg_sterne), 1) if avg_sterne else 0

    # KPI: Lösungsrate
    total_tickets = await db.execute(select(func.count(Ticket.id)).where(*filters))
    total_count = total_tickets.scalar() or 0

    geloest_tickets = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status.in_(["geloest", "bewertung", "geschlossen"]),
            *filters,
        )
    )
    geloest_count = geloest_tickets.scalar() or 0
    loesungsrate = round(geloest_count / total_count * 100, 1) if total_count > 0 else 0

    # KPI: Bewertungsquote
    tickets_mit_bewertung = await db.execute(
        select(func.count(func.distinct(Bewertung.ticket_id))).where(
            Bewertung.typ == "kunde", *bew_filters
        )
    )
    bew_count = tickets_mit_bewertung.scalar() or 0
    bewertungsquote = round(bew_count / total_count * 100, 1) if total_count > 0 else 0

    # Sterne-Verteilung
    sterne_stmt = (
        select(Bewertung.sterne, func.count(Bewertung.id).label("anzahl"))
        .where(Bewertung.typ == "kunde", Bewertung.sterne > 0, *bew_filters)
        .group_by(Bewertung.sterne)
        .order_by(Bewertung.sterne)
    )
    sterne_result = await db.execute(sterne_stmt)
    sterne_verteilung = [{"sterne": r.sterne, "anzahl": r.anzahl} for r in sterne_result]

    # Bewertungs-Trend (pro Woche)
    trend_stmt = (
        select(
            func.date_trunc("week", Bewertung.created_at).label("woche"),
            func.avg(Bewertung.sterne).label("avg_sterne"),
            func.count(Bewertung.id).label("anzahl"),
        )
        .where(Bewertung.typ == "kunde", Bewertung.sterne > 0, *bew_filters)
        .group_by("woche")
        .order_by("woche")
    )
    trend_result = await db.execute(trend_stmt)
    bewertung_trend = [
        {
            "woche": str(r.woche.date()),
            "avg_sterne": round(float(r.avg_sterne), 1),
            "anzahl": r.anzahl,
        }
        for r in trend_result
    ]

    # Letzte Kommentare
    kommentare_stmt = (
        select(Bewertung.sterne, Bewertung.kommentar, Bewertung.geloest, Bewertung.created_at)
        .where(
            Bewertung.typ == "kunde",
            Bewertung.kommentar.isnot(None),
            Bewertung.kommentar != "",
            *bew_filters,
        )
        .order_by(Bewertung.created_at.desc())
        .limit(10)
    )
    kommentare_result = await db.execute(kommentare_stmt)
    letzte_kommentare = [
        {
            "sterne": r.sterne,
            "kommentar": r.kommentar,
            "geloest": r.geloest,
            "created_at": r.created_at.isoformat(),
        }
        for r in kommentare_result
    ]

    return {
        "kpis": {
            "avg_sterne": avg_sterne,
            "loesungsrate": loesungsrate,
            "bewertungsquote": bewertungsquote,
        },
        "sterne_verteilung": sterne_verteilung,
        "bewertung_trend": bewertung_trend,
        "letzte_kommentare": letzte_kommentare,
    }


# ── Tab 6: KI-Nutzung ─────────────────────────────────────────────

@router.get("/ki")
async def statistik_ki(
    von: Optional[str] = None,
    bis: Optional[str] = None,
    supporter_id: Optional[str] = None,
    kunde_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    date_from, date_to, sup_id, kun_id = _parse_filters(von, bis, supporter_id, kunde_id)

    ki_filters = []
    if date_from:
        ki_filters.append(KIRechercheVerlauf.gestartet_at >= date_from)
    if date_to:
        ki_filters.append(KIRechercheVerlauf.gestartet_at < date_to)

    # KPI: KI-Sessions gesamt
    ki_total = await db.execute(
        select(func.count(KIRechercheVerlauf.id)).where(*ki_filters)
    )
    ki_sessions = ki_total.scalar() or 0

    # KPI: Gesamt-Sessions
    sess_filters = []
    if date_from:
        sess_filters.append(ChatSession.started_at >= date_from)
    if date_to:
        sess_filters.append(ChatSession.started_at < date_to)
    if sup_id:
        sess_filters.append(ChatSession.supporter_id == sup_id)
    total_sessions_result = await db.execute(
        select(func.count(ChatSession.id)).where(*sess_filters)
    )
    total_sessions = total_sessions_result.scalar() or 0
    ki_nutzungsrate = round(ki_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0

    # KPI: Übernahmerate
    ki_msg_total = await db.execute(
        select(func.count(KINachricht.id))
        .join(KIRechercheVerlauf, KINachricht.verlauf_id == KIRechercheVerlauf.id)
        .where(KINachricht.rolle == "ki", *ki_filters)
    )
    ki_msg_count = ki_msg_total.scalar() or 0

    uebernommen_result = await db.execute(
        select(func.count(KINachricht.id))
        .join(KIRechercheVerlauf, KINachricht.verlauf_id == KIRechercheVerlauf.id)
        .where(
            KINachricht.rolle == "ki",
            KINachricht.uebernommen_in_chat == True,
            *ki_filters,
        )
    )
    uebernommen_count = uebernommen_result.scalar() or 0
    uebernahmerate = round(uebernommen_count / ki_msg_count * 100, 1) if ki_msg_count > 0 else 0

    # KPI: Nachrichten pro Recherche
    avg_msgs = round(ki_msg_count / ki_sessions, 1) if ki_sessions > 0 else 0

    # Provider-Verteilung
    provider_result = await db.execute(
        select(
            KIRechercheVerlauf.provider,
            func.count(KIRechercheVerlauf.id).label("anzahl"),
        )
        .where(KIRechercheVerlauf.provider != "", *ki_filters)
        .group_by(KIRechercheVerlauf.provider)
    )
    provider_verteilung = [{"provider": r.provider, "anzahl": r.anzahl} for r in provider_result]

    # Modell-Verteilung
    modell_result = await db.execute(
        select(
            KIRechercheVerlauf.model_used,
            func.count(KIRechercheVerlauf.id).label("anzahl"),
        )
        .where(KIRechercheVerlauf.model_used != "", *ki_filters)
        .group_by(KIRechercheVerlauf.model_used)
    )
    modell_verteilung = [{"modell": r.model_used, "anzahl": r.anzahl} for r in modell_result]

    # KI-Nutzung über Zeit (pro Woche)
    trend_stmt = (
        select(
            func.date_trunc("week", KIRechercheVerlauf.gestartet_at).label("woche"),
            func.count(KIRechercheVerlauf.id).label("anzahl"),
        )
        .where(*ki_filters)
        .group_by("woche")
        .order_by("woche")
    )
    trend_result = await db.execute(trend_stmt)
    nutzung_trend = [
        {"woche": str(r.woche.date()), "anzahl": r.anzahl}
        for r in trend_result
    ]

    # KI-Nutzung pro Supporter
    ki_supporter_stmt = (
        select(
            Supporter.kuerzel,
            func.count(KIRechercheVerlauf.id).label("anzahl"),
        )
        .join(ChatSession, KIRechercheVerlauf.session_id == ChatSession.id)
        .join(Supporter, ChatSession.supporter_id == Supporter.id)
        .where(*ki_filters)
        .group_by(Supporter.kuerzel)
        .order_by(func.count(KIRechercheVerlauf.id).desc())
    )
    ki_supporter_result = await db.execute(ki_supporter_stmt)
    nutzung_pro_supporter = [
        {"kuerzel": r.kuerzel, "anzahl": r.anzahl}
        for r in ki_supporter_result
    ]

    return {
        "kpis": {
            "ki_sessions": ki_sessions,
            "ki_nutzungsrate": ki_nutzungsrate,
            "uebernahmerate": uebernahmerate,
            "avg_nachrichten_pro_recherche": avg_msgs,
        },
        "provider_verteilung": provider_verteilung,
        "modell_verteilung": modell_verteilung,
        "nutzung_trend": nutzung_trend,
        "nutzung_pro_supporter": nutzung_pro_supporter,
    }
