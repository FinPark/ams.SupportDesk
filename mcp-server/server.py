"""ams.SupportDesk MCP-Server – Tools für Agent Hub / Claude Code."""

import os

import httpx
from fastmcp import FastMCP

mcp = FastMCP("ams-supportdesk")
API = os.getenv("BACKEND_URL", "http://backend:8000")


@mcp.tool()
async def tickets_auflisten(status: str = "", limit: int = 20) -> str:
    """Liste alle Support-Tickets auf. Optional nach Status filtern (eingang, in_bearbeitung, wartet, geloest, geschlossen)."""
    async with httpx.AsyncClient(timeout=10) as client:
        params = {"limit": limit}
        if status:
            params["status"] = status
        r = await client.get(f"{API}/api/v1/tickets", params=params)
        if r.status_code == 401:
            return "Fehler: Nicht authentifiziert. MCP-Server benötigt Supporter-Session."
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        tickets = r.json()

    if not tickets:
        return "Keine Tickets gefunden."

    lines = []
    for t in tickets[:limit]:
        tags = ", ".join(f"#{tag['tag']}" for tag in t.get("tags", []))
        line = f"- **{t['titel']}** ({t['status']}) · {t.get('kunde_name', 'k.A.')} · {tags}"
        lines.append(line)
    return "\n".join(lines)


@mcp.tool()
async def ticket_details(ticket_id: str) -> str:
    """Zeige Details eines bestimmten Tickets inkl. Status, Tags und Verlauf."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{API}/api/v1/tickets/{ticket_id}")
        if r.status_code != 200:
            return f"Fehler: {r.text}"
        t = r.json()

    tags = ", ".join(f"#{tag['tag']}" for tag in t.get("tags", []))
    return (
        f"**{t['titel']}**\n"
        f"Status: {t['status']} | Priorität: {t['prioritaet']}\n"
        f"Kunde: {t.get('kunde_name', 'k.A.')} | Supporter: {t.get('supporter_kuerzel', 'k.A.')}\n"
        f"Tags: {tags or 'keine'}\n"
        f"Erstellt: {t['created_at']} | Aktualisiert: {t['updated_at']}"
    )


@mcp.tool()
async def ticket_suchen(query: str, limit: int = 10) -> str:
    """Durchsuche Tickets nach Titel oder Kundennamen."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{API}/api/v1/tickets")
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
        lines.append(f"- **{t['titel']}** ({t['status']}) · {t.get('kunde_name', 'k.A.')} · ID: {t['id'][:8]}...")
    return "\n".join(lines)


@mcp.tool()
async def eingangskorb_anzeigen() -> str:
    """Zeige alle unbearbeiteten Anfragen im Eingangskorb."""
    async with httpx.AsyncClient(timeout=10) as client:
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
            f"- **{item['kunde_name']}**: {item['titel']} {tags}\n"
            f"  Vorschau: {item['vorschau'][:80]}..."
        )
    return "\n".join(lines)


@mcp.tool()
async def kunde_suchen(query: str) -> str:
    """Suche nach Kunden per Name oder Kundennummer."""
    async with httpx.AsyncClient(timeout=10) as client:
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
    async with httpx.AsyncClient(timeout=10) as client:
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
