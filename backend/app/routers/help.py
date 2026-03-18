"""Hilfe-Endpoint fuer THoster KI-Hilfe-Widget.

GET /api/v1/help/content liefert den Hilfetext als Markdown.
Der THoster cached diesen und nutzt ihn als Kontext fuer den KI-Assistenten.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/help", tags=["help"])
router_compat = APIRouter(prefix="/api/help", tags=["help"])

HELP_CONTENT = """
# ams.SupportDesk – Hilfe-Dokumentation

## Was ist ams.SupportDesk?
ams.SupportDesk ist das KI-gestuetzte Support-Tool der ams Solution AG. Es ersetzt Telefon und E-Mail durch einen modernen Chat-Kanal mit integrierter KI-Recherche. Supporter, Kunden und KI arbeiten in einer Plattform zusammen.

Leitsatz: Der Supporter gibt die Antwort. Die KI bereitet sie vor.

## Supporter-Arbeitsplatz (Workspace)
Der Workspace ist in zwei Bereiche aufgeteilt:
- **Links: Kundengespräch** — Chat mit dem Kunden. Nachrichten können markiert und an die KI gesendet werden.
- **Rechts: KI-Recherche** — Interner Chat mit der KI. Antworten können per "Übernehmen" in den Kundenchat übertragen werden.

Oben wird das aktuelle Ticket mit Nummer, Kunde, Titel, Tags und Status angezeigt. Der Status kann über Buttons gewechselt werden (z.B. "→ Wartet", "→ Gelöst").

## Ticket-System
Tickets durchlaufen einen definierten Status-Workflow:
1. **Eingang** — Neue Kundenanfrage, erscheint im Eingangskorb
2. **In Bearbeitung** — Supporter hat das Ticket übernommen
3. **Wartet** — Warten auf Kunden-Rückmeldung
4. **Gelöst** — Supporter markiert als gelöst
5. **Bewertung** — Kunde kann Sterne und Kommentar abgeben
6. **Geschlossen** — Ticket ist abgeschlossen

Tickets können mit Tags versehen werden (z.B. #erp, #rechte, #artikel). Tags sind frei wählbar und filterbar.

## Eingangskorb
Der Eingangskorb zeigt alle neuen, unbearbeiteten Kundenanfragen. Jeder angemeldete Supporter sieht den Eingangskorb. Die Übernahme ist eine aktive Handlung — kein automatisches Routing.

Sortierung: Älteste Anfragen zuerst. Live-Updates per WebSocket.

## KI-Recherche
Die KI-Recherche nutzt die RAG-Wissensbasis (z.B. ams Online-Hilfe) um Fragen zu beantworten.

**So funktioniert es:**
1. Kundennachrichten im linken Chat markieren (Klick auf die Nachricht)
2. Button "X Nachrichten an KI senden →" klicken
3. Die KI sucht in der Wissensbasis und antwortet
4. Gute Antworten per "→ Übernehmen" in den Kundenchat senden

Auch Supporter-Nachrichten können markiert werden. Direkte Fragen an die KI sind über das Eingabefeld rechts möglich.

**Wissensbasis:** Die aktive RAG-Collection wird oben im KI-Bereich als Badge angezeigt (z.B. "ams OnlineHilfe (14)"). Die Collections werden im Admin-Bereich verwaltet.

## Kunden-Portal
Kunden öffnen das Portal über einen separaten Link. Sie identifizieren sich mit ihrem Namen. Bestehende Tickets können per Ticketnummer geöffnet werden, neue Anfragen erstellen automatisch ein Ticket.

Der Kunde sieht nur den Chat-Verlauf — niemals die interne KI-Recherche.

## Admin-Bereich
Der Admin-Bereich hat 7 Tabs:
1. **Vorlagen** — Antwort-Templates für Supporter (aufrufbar mit / im Chat)
2. **Phasen-Texte** — Automatische Texte bei Statusübergängen
3. **Modelle** — KI-Modelle aus ams-connections synchronisieren und Standard-Modell setzen
4. **MCP-Server** — Registrierte MCP-Server verwalten (Sync aus THoster)
5. **RAG-Collections** — Wissensbasis-Collections aktivieren/deaktivieren
6. **KI-Einstellungen** — System-Prompt für den KI-Recherche-Assistenten anpassen
7. **Einstellungen** — Allgemeine App-Einstellungen

## Statistik & Analytics
Die Statistik-Seite (/statistik) bietet 6 Tabs:
- **Übersicht** — KPI-Karten (Tickets, Bewertung), Trend-Charts, Status/Prioritäts-Verteilung, Top-Tags
- **Supporter** — Rangliste nach Tickets, Bewertung, Bearbeitungszeit, KI-Nutzung
- **Kunden** — Top-Kunden nach Ticketvolumen, Neue-Kunden-Trend
- **Zeiten & SLA** — Erste Antwortzeit, Bearbeitungsdauer, Heatmap (Wochentag x Stunde)
- **Qualität** — Sterne-Verteilung, Lösungsrate, Bewertungsquote, letzte Kommentare
- **KI-Nutzung** — Provider/Modell-Verteilung, Übernahmerate, Nutzung pro Supporter

Globale Filter: Zeitraum-Presets (Heute, 7/30/90 Tage, Jahr, Gesamt), Custom DateRange, Supporter-Filter.

## Vorlagen (Templates)
Templates sind vorgefertigte Antworten, die Supporter mit dem /-Kürzel aufrufen können. Im Chat-Eingabefeld "/" tippen öffnet die Template-Suche. Templates werden im Admin-Bereich erstellt und verwaltet.

## Tastenkombinationen und Tipps
- **/** im Chat-Eingabefeld: Template-Picker öffnen
- **Klick auf Kunden-/Supporter-Nachricht**: Für KI markieren
- **"→ Übernehmen"**: KI-Antwort in den Kundenchat übertragen
- **Status-Buttons**: Ticket-Status direkt im Workspace ändern
- **Tags**: Freitext-Tags über das Tag-Feld im Workspace hinzufügen
"""


@router.get("/content")
async def get_help_content():
    """Hilfetext als Markdown fuer den THoster KI-Hilfe-Assistenten."""
    return {
        "tool_name": "ams-supportdesk",
        "content": HELP_CONTENT,
    }


@router_compat.get("/content")
async def get_help_content_compat():
    """Kompatibilitaets-Route fuer THoster (erwartet /api/help/content)."""
    return {
        "tool_name": "ams-supportdesk",
        "content": HELP_CONTENT,
    }
