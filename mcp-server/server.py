"""ams.SupportDesk MCP-Server – Tools für Agent Hub / Claude Code."""

import os

import httpx
from fastmcp import FastMCP
from fastmcp.server.context import Context, AcceptedElicitation, DeclinedElicitation
from pydantic import BaseModel, Field

mcp = FastMCP(
    "ams-supportdesk",
    instructions=(
        "Du bist der ams.SupportDesk-Assistent. Du hilfst Support-Mitarbeitern "
        "dabei, Tickets zu verwalten und Kunden zu unterstützen.\n\n"
        "**Wann welches Tool verwenden:**\n"
        "- `tickets_auflisten`: Übersicht aller Tickets – optional nach Status filtern "
        "(eingang, in_bearbeitung, wartet, geloest, geschlossen). Starte immer hier, "
        "wenn du einen Überblick brauchst.\n"
        "- `ticket_suchen`: Gezielt nach einem Ticket suchen (Titel oder Kundenname). "
        "Nutze dies, wenn der Nutzer nach einem bestimmten Thema oder Kunden fragt.\n"
        "- `ticket_details`: Volldetails zu einem einzelnen Ticket abrufen – übergib "
        "die Ticketnummer (z.B. 1042). Nutze dies nach tickets_auflisten oder "
        "ticket_suchen, um Details anzuzeigen.\n"
        "- `ticket_status_aendern`: Status eines Tickets ändern (Statusmaschine beachten: "
        "eingang→in_bearbeitung, in_bearbeitung→wartet|geloest, wartet→eingang, "
        "geloest→bewertung, bewertung→geschlossen). Fragt immer zur Bestätigung.\n"
        "- `ticket_uebernehmen`: Ticket aus dem Eingangskorb übernehmen und einem "
        "Supporter zuweisen. Fragt immer zur Bestätigung.\n"
        "- `eingangskorb_anzeigen`: Alle eingehenden, noch nicht zugewiesenen Anfragen "
        "anzeigen. Nutze dies am Anfang einer Schicht oder bei Fragen nach neuen "
        "Kundenanfragen.\n"
        "- `kunde_suchen`: Kunden per Name oder Kundennummer finden.\n"
        "- `tags_auflisten`: Beliebte Tags über alle Tickets anzeigen – nützlich für "
        "Kategorisierungs-Übersichten.\n\n"
        "**Wichtige Hinweise:**\n"
        "- Bei Schreiboperationen (Status ändern, Ticket übernehmen) immer zuerst "
        "die Aktion mit dem Nutzer bestätigen.\n"
        "- Ticketnummern (z.B. #1042) sind für den Menschen lesbar; intern werden "
        "UUIDs verwendet – das Tool übersetzt automatisch.\n"
        "- Status-Übergänge werden serverseitig validiert; ungültige Übergänge "
        "werden mit einer Fehlermeldung abgelehnt."
    ),
)
API = os.getenv("BACKEND_URL", "http://backend:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def _headers() -> dict:
    """Auth-Header für interne Backend-Aufrufe."""
    if INTERNAL_API_KEY:
        return {"X-Internal-Token": INTERNAL_API_KEY}
    return {}


async def _find_ticket_by_nummer(client: httpx.AsyncClient, nummer: int) -> dict | None:
    """Ticket anhand der Ticketnummer finden (lädt nur bis zu 200 Tickets)."""
    r = await client.get(f"{API}/api/v1/tickets", params={"limit": 200})
    if r.status_code != 200:
        return None
    for t in r.json():
        if t.get("nummer") == nummer:
            return t
    return None


@mcp.tool()
async def tickets_auflisten(status: str = "", limit: int = 20) -> str:
    """Liste alle Support-Tickets auf. Optional nach Status filtern (eingang, in_bearbeitung, wartet, geloest, geschlossen). Gibt Ticketnummern zurück, die für ticket_details verwendet werden können."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        params = {"limit": limit}
        if status:
            params["status"] = status
        r = await client.get(f"{API}/api/v1/tickets", params=params)
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        tickets = r.json()

    if not tickets:
        return "Keine Tickets gefunden."

    lines = []
    for t in tickets[:limit]:
        tags = ", ".join(f"#{tag['tag']}" for tag in t.get("tags", []))
        created = t.get("created_at", "")[:19].replace("T", " ")
        updated = t.get("updated_at", "")[:19].replace("T", " ")
        supporter = t.get("supporter_kuerzel") or "–"
        line = (
            f"- **#{t['nummer']} {t['titel']}** ({t['status']})"
            f" · Kunde: {t.get('kunde_name', 'k.A.')}"
            f" · Supporter: {supporter}"
            f" · Erstellt: {created}"
            f" · Aktualisiert: {updated}"
        )
        if tags:
            line += f" · {tags}"
        lines.append(line)
    return "\n".join(lines)


@mcp.tool()
async def ticket_details(ticket_nummer: int) -> str:
    """Zeige Details eines bestimmten Tickets anhand der Ticketnummer (z.B. 1001). Gibt Status, Tags, Kunde, Supporter, Erstell- und Änderungsdatum zurück."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        ticket = await _find_ticket_by_nummer(client, ticket_nummer)
        if not ticket:
            return f"Fehler: Ticket #{ticket_nummer} nicht gefunden."

    tags = ", ".join(f"#{tag['tag']}" for tag in ticket.get("tags", []))
    return (
        f"**#{ticket['nummer']} — {ticket['titel']}**\n"
        f"Status: {ticket['status']} | Priorität: {ticket['prioritaet']}\n"
        f"Kunde: {ticket.get('kunde_name', 'k.A.')} | Supporter: {ticket.get('supporter_kuerzel', 'k.A.')}\n"
        f"Tags: {tags or 'keine'}\n"
        f"Erstellt: {ticket['created_at']} | Aktualisiert: {ticket['updated_at']}\n"
        f"Geschlossen: {ticket['closed_at'] or 'noch offen'}"
    )


@mcp.tool()
async def ticket_suchen(query: str, limit: int = 10) -> str:
    """Durchsuche Tickets nach Titel oder Kundennamen. Gibt Ticketnummern zurück, die für ticket_details verwendet werden können."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        # Lade nur eine begrenzte Menge Tickets – Backend hat keinen Volltext-Suchendpunkt
        r = await client.get(f"{API}/api/v1/tickets", params={"limit": 200})
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        tickets = r.json()

    q = query.lower()
    matches = [
        t for t in tickets
        if q in t["titel"].lower() or q in (t.get("kunde_name") or "").lower()
    ]

    if not matches:
        return f"Keine Tickets gefunden für '{query}'."

    lines = []
    for t in matches[:limit]:
        tags = ", ".join(f"#{tag['tag']}" for tag in t.get("tags", []))
        line = (
            f"- **#{t['nummer']} {t['titel']}** ({t['status']})"
            f" · Kunde: {t.get('kunde_name', 'k.A.')}"
        )
        if tags:
            line += f" · {tags}"
        lines.append(line)
    return "\n".join(lines)


@mcp.tool()
async def ticket_status_aendern(
    ticket_nummer: int,
    neuer_status: str,
    ctx: Context = None,
) -> str:
    """Ändere den Status eines Tickets. Erlaubte Übergänge: eingang→in_bearbeitung, in_bearbeitung→wartet|geloest, wartet→eingang, geloest→bewertung, bewertung→geschlossen. Fragt zur Bestätigung."""

    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        ticket = await _find_ticket_by_nummer(client, ticket_nummer)
        if not ticket:
            return f"Fehler: Ticket #{ticket_nummer} nicht gefunden."

        ticket_id = ticket["id"]
        alter_status = ticket["status"]
        titel = ticket["titel"]

        # Bestätigung einholen
        if ctx:
            class StatusForm(BaseModel):
                bestaetigen: bool = Field(
                    default=False,
                    description=(
                        f"Ticket #{ticket_nummer} «{titel}» von '{alter_status}' "
                        f"auf '{neuer_status}' setzen?"
                    ),
                )

            result = await ctx.elicit(
                f"Status-Änderung bestätigen:",
                response_type=StatusForm,
            )
            if not isinstance(result, AcceptedElicitation) or not result.data.bestaetigen:
                return "Status-Änderung abgebrochen."

        r = await client.patch(
            f"{API}/api/v1/tickets/{ticket_id}",
            json={"status": neuer_status},
        )
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        updated = r.json()

    return (
        f"Ticket #{updated['nummer']} «{updated['titel']}» erfolgreich auf "
        f"Status **{updated['status']}** gesetzt."
    )


@mcp.tool()
async def ticket_uebernehmen(
    ticket_nummer: int,
    ctx: Context = None,
) -> str:
    """Übernimm ein Ticket aus dem Eingangskorb. Das Ticket wird dem aktuellen Supporter zugewiesen und auf 'in_bearbeitung' gesetzt. Fragt zur Bestätigung."""

    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        ticket = await _find_ticket_by_nummer(client, ticket_nummer)
        if not ticket:
            return f"Fehler: Ticket #{ticket_nummer} nicht gefunden."

        ticket_id = ticket["id"]
        titel = ticket["titel"]
        kunde = ticket.get("kunde_name", "k.A.")

        # Bestätigung einholen
        if ctx:
            class UebernahmeForm(BaseModel):
                bestaetigen: bool = Field(
                    default=False,
                    description=(
                        f"Ticket #{ticket_nummer} «{titel}» (Kunde: {kunde}) "
                        f"übernehmen und in Bearbeitung nehmen?"
                    ),
                )

            result = await ctx.elicit(
                "Ticket-Übernahme bestätigen:",
                response_type=UebernahmeForm,
            )
            if not isinstance(result, AcceptedElicitation) or not result.data.bestaetigen:
                return "Ticket-Übernahme abgebrochen."

        r = await client.post(
            f"{API}/api/v1/tickets/{ticket_id}/uebernehmen",
        )
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        updated = r.json()

    supporter = updated.get("supporter_kuerzel") or "k.A."
    return (
        f"Ticket #{updated['nummer']} «{updated['titel']}» erfolgreich übernommen. "
        f"Supporter: {supporter} | Status: {updated['status']}"
    )


@mcp.tool()
async def eingangskorb_anzeigen() -> str:
    """Zeige alle unbearbeiteten Anfragen im Eingangskorb."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        r = await client.get(f"{API}/api/v1/eingangskorb")
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        items = r.json()

    if not items:
        return "Eingangskorb ist leer."

    lines = []
    for item in items:
        tags = ", ".join(f"#{t}" for t in item.get("tags", []))
        lines.append(
            f"- **#{item['nummer']} {item['kunde_name']}**: {item['titel']} {tags}\n"
            f"  Vorschau: {item['vorschau'][:80]}..."
        )
    return "\n".join(lines)


@mcp.tool()
async def kunde_suchen(query: str) -> str:
    """Suche nach Kunden per Name oder Kundennummer."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        r = await client.get(f"{API}/api/v1/kunden", params={"q": query})
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        kunden = r.json()

    if not kunden:
        return f"Keine Kunden gefunden für '{query}'."

    lines = []
    for k in kunden:
        lines.append(f"- **{k['name']}** ({k['kundennummer'] or 'keine Nr.'}) · Bewertung: {k['bewertung_avg']:.1f}")
    return "\n".join(lines)


@mcp.tool()
async def tags_auflisten(limit: int = 20) -> str:
    """Zeige die beliebtesten Tags über alle Tickets."""
    async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
        r = await client.get(f"{API}/api/v1/tags/popular", params={"limit": limit})
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        tags = r.json()

    if not tags:
        return "Noch keine Tags vergeben."

    lines = [f"- #{t['tag']} ({t['count']}×)" for t in tags]
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8080)
