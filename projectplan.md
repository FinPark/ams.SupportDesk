# ams.SupportDesk – Projektplan

**Erstellt:** 14.03.2026
**Stand:** 14.03.2026
**Phase:** Phase 1 abgeschlossen, Phase 1.1 Bugfixes & UI-Verbesserungen abgeschlossen, Phase 1.2 RAG-Collections Toggle

---

## Projektuebersicht

ams.SupportDesk ist ein KI-gestuetztes Support-Tool, das Supporter, Kunden und KI-Recherche in einer integrierten Plattform vereint. Das System laeuft vollstaendig in der THoster-Infrastruktur hinter einem Traefik Reverse Proxy.

---

## Meilensteine

| Meilenstein       | Zieldatum  | Status        |
|-------------------|------------|---------------|
| Phase 1: Grundsystem | 14.03.2026 | Abgeschlossen |
| Phase 2: Erweiterte KI-Integration | offen | Geplant |
| Phase 3: Reporting & Analytics | offen | Geplant |

---

## Phase 1 – Abgeschlossen

### Backend (FastAPI + SQLAlchemy 2.0 async)

- [x] Projektstruktur und Docker-Setup
- [x] PostgreSQL 16 mit asyncpg-Anbindung
- [x] Redis 7 fuer Session/Cache
- [x] Pydantic Settings und Konfigurationsmanagement
- [x] Auth-Middleware (Cookie-basiert, Kuerzel-Login)

**Datenmodelle (13 Stueck):**
- [x] Supporter (Kuerzel-basierte Authentifizierung)
- [x] Kunde (Kundenstammdaten)
- [x] Ticket (mit vollstaendiger Statusmaschine)
- [x] TicketTag (Kategorisierungs-Tags)
- [x] ChatSession (Verbindung Ticket <-> Chat)
- [x] Nachricht (Kunden- und Supporter-Nachrichten)
- [x] KIRechercheVerlauf (KI-Session pro Ticket)
- [x] KINachricht (Einzelne KI-Antworten)
- [x] Bewertung (Post-Close Kundenbewertung)
- [x] Template (Antwort-Vorlagen)
- [x] PhasenText (Automatische Statusuebergangstexte)
- [x] MCPServerRegistry (Registrierte MCP-Server)
- [x] AppSetting (Key-Value App-Einstellungen)

**API-Router (11 Stueck):**
- [x] auth (`/api/auth`) – Login, Logout, Session-Check
- [x] kunden (`/api/kunden`) – CRUD Kundenverwaltung
- [x] kunden_portal (`/api/portal`) – Kunden-seitige Endpunkte
- [x] tickets (`/api/tickets`) – Ticket-CRUD + Statusaenderungen
- [x] tags (`/api/tags`) – Tag-Verwaltung
- [x] chat_sessions (`/api/chat-sessions`) – Session-Verwaltung
- [x] nachrichten (`/api/nachrichten`) – Nachrichtenversand und -abruf
- [x] eingangskorb (`/api/eingangskorb`) – Neue/unzugewiesene Tickets
- [x] connections (`/api/connections`) – ams-connections/Agent Hub
- [x] ws (`/api/ws`) – WebSocket fuer Echtzeit-Updates
- [x] admin (`/api/admin`) – Templates, Phasen, MCP-Sync, RAG, Modelle

**Services:**
- [x] ConnectionManager (WebSocket-Verbindungsverwaltung)
- [x] ConnectionsClient (HTTP-Client fuer ams-connections API)

**Ticket-Statusmaschine:**
- [x] eingang → in_bearbeitung
- [x] in_bearbeitung → wartet / geloest
- [x] wartet → in_bearbeitung / geloest
- [x] geloest → bewertung
- [x] bewertung → geschlossen

---

### Frontend (React 18 + Vite + TypeScript + Chakra UI v3)

- [x] Vite-Projektsetup mit TypeScript-Konfiguration
- [x] Chakra UI v3 Theme mit Primaerfarbe #003459
- [x] React Router Setup
- [x] API-Client (`lib/api.ts`) mit Cookie-Handling
- [x] TypeScript-Typdefinitionen (`lib/types.ts`)

**Seiten & Hauptkomponenten:**
- [x] SupporterLogin – Kuerzel-basierter Login
- [x] TicketList – Tabs (Meine / Eingang / Alle)
- [x] TicketDetail – Detailansicht mit Statusaenderung
- [x] TicketCreate – Ticket-Erstellungsformular
- [x] TagEditor – Inline Tag-Bearbeitung
- [x] Eingangskorb + EingangskorbItem – WebSocket-Live-Updates
- [x] TicketWorkspace – Split-Layout Support-Arbeitsplatz
- [x] KundenChat – Chat-Bereich links im Workspace
- [x] KIChat – KI-Recherche-Bereich rechts im Workspace
- [x] PortalLogin – Kunden-Authentifizierung
- [x] PortalChat – Kunden-Chat-Interface
- [x] PortalMessageBubble – Chat-Nachrichtenblase
- [x] AdminPage – Tab-basierte Admin-Verwaltung
- [x] TemplateManager – Antwortvorlagen-Verwaltung
- [x] PhasenTexteManager – Phasenubergangs-Texte
- [x] ModelleManager – KI-Modellkonfiguration
- [x] MCPServerManager – MCP-Server-Registrierung und Sync
- [x] RAGCollectionManager – RAG-Collections
- [x] SettingsManager – App-Einstellungen
- [x] MarkdownRenderer – Markdown + Mermaid-Rendering

**Custom Hooks:**
- [x] useAuth – Authentifizierungsstatus und Login-Flow
- [x] useTickets – Ticket-Datenabruf und -mutationen
- [x] useWebSocket – WebSocket mit Auto-Reconnect

---

### MCP-Server (FastMCP 2.x)

- [x] FastMCP 2.x Setup mit Streamable HTTP
- [x] Traefik-Integration (Prio 40, /mcp Pfad)
- [x] Tool: `tickets_auflisten`
- [x] Tool: `ticket_details`
- [x] Tool: `ticket_suchen`
- [x] Tool: `eingangskorb_anzeigen`
- [x] Tool: `kunde_suchen`
- [x] Tool: `tags_auflisten`

---

### Infrastructure & DevOps

- [x] Docker Compose mit 5 Services
- [x] PostgreSQL 16 mit Health-Check
- [x] Redis 7 mit Health-Check
- [x] Traefik-Labels fuer alle 3 Applikations-Services
- [x] THoster-Netz-Integration (`thoster-net`)
- [x] .env.example mit allen noetigen Variablen
- [x] .gitignore (Python, Node, .env, IDE, OS)
- [x] THoster-Registrierungsdatei (`register-ams-supportdesk.json`)
- [x] Initialer Git-Commit

---

## Phase 1.1 – Bugfixes & UI-Verbesserungen (14.03.2026)

### Backend-Fixes

- [x] MCP-Server Sync: `mcp_server_address` aus THoster API statt Docker-Konvention ableiten
- [x] MCP-Server Sync: Neue Server werden deaktiviert angelegt (`is_active=False`)
- [x] MCP-Server Sync: Tools ohne `mcp_server_address` werden uebersprungen oder entfernt, nicht angelegt
- [x] MCP-Server Sync: Sync-Ergebnis liefert jetzt `synced`, `skipped`, `removed` und `total_tools`
- [x] RAG-Collections: Backend erkennt RAG-Backend-URL automatisch aus Docker-Konvention (mehrere Kandidaten-URLs werden probiert)
- [x] RAG-Collections: Robusteres Fehlerhandling, kein Abbruch bei nicht erreichbaren Kandidaten

### Frontend-Fixes & UI-Verbesserungen

- [x] MCPServerManager: Klick auf Server-Card oeffnet direkt den Bearbeiten-Dialog
- [x] MCPServerManager: Aktiv/Inaktiv-Toggle als separater Button statt Checkbox im Formular
- [x] MCPServerManager: Loeschen-Aktion mit Muelleimer-Symbol statt Textlink
- [x] MCPServerManager: Aktive Server werden oben sortiert (alphabetisch innerhalb der Gruppe)
- [x] MCPServerManager: Verzoegertes Umsortieren nach Toggle (kein sofortiges Springen in der Liste)
- [x] MCPServerManager: Standard-Transporttyp auf `streamable_http` geaendert
- [x] MCPServerManager: Neue Server werden standardmaessig deaktiviert angelegt
- [x] MarkdownRenderer: `children` prop korrekt an ReactMarkdown uebergeben (Bug behoben)
- [x] Verbesserte Fehlerbehandlung in Admin-Komponenten

---

## Phase 1.2 – RAG-Collections Toggle (14.03.2026)

### Frontend-Erweiterungen

- [x] RAGCollectionManager: Toggle zum Aktivieren/Deaktivieren pro Collection (analog zu MCPServerManager)
- [x] RAGCollectionManager: Aktive Collections werden oben sortiert, inaktive alphabetisch darunter
- [x] RAGCollectionManager: Aktivierungszustand wird in App-Settings unter Key `rag_active_collections` (JSON-Array) persistiert
- [x] RAGCollectionManager: Badge zeigt Anzahl aktiver Collections in der Ueberschrift
- [x] RAGCollectionManager: State wird beim Laden parallel aus `/admin/rag-collections` und `/admin/settings` bezogen

---

## Phase 2 – Geplant

### KI-Integration vertiefen

- [ ] Vollstaendige ams-connections Streaming-Integration
- [ ] RAG-Recherche direkt im KI-Chat-Bereich
- [ ] KI-gestuetzte Ticket-Kategorisierung beim Eingang
- [ ] Automatische Template-Vorschlaege basierend auf Ticket-Inhalt
- [ ] Sentiment-Analyse fuer Kundennachrichten

### Supporter-Funktionen

- [ ] Ticket-Zuweisung zwischen Supportern
- [ ] Interne Notizen / Kommentare an Tickets
- [ ] Bulk-Aktionen im Eingangskorb
- [ ] Suchfunktion ueber alle Tickets
- [ ] Filter und Sortierung erweitern

### Kunden-Portal

- [ ] Ticket-Historie fuer Kunden einsehbar
- [ ] Dateianhang-Upload
- [ ] E-Mail-Benachrichtigungen bei Status-Updates
- [ ] Bewertungsformular verfeinern

---

## Phase 3 – Geplant

### Reporting & Analytics

- [ ] Ticket-Statistiken (Volumen, Loesungszeit, Kategorien)
- [ ] Supporter-Performance-Dashboard
- [ ] Bewertungs-Auswertung
- [ ] KI-Nutzungsstatistiken
- [ ] Export-Funktionen (CSV, PDF)

### Technische Verbesserungen

- [ ] Alembic-Datenbankmigrationen einrichten
- [ ] Automatisierte Tests (pytest, vitest)
- [ ] CI/CD-Pipeline
- [ ] Logging und Monitoring (strukturiertes Logging)
- [ ] Rate-Limiting fuer API-Endpunkte

---

## Technische Entscheidungen

| Entscheidung | Begruendung |
|---|---|
| FastAPI + SQLAlchemy 2.0 async | Hohe Performance durch asynchrone Datenbankzugriffe |
| asyncpg statt psycopg2 | Nativer async PostgreSQL-Treiber, besser fuer FastAPI |
| Chakra UI v3 | Konsistentes Design-System, gute TypeScript-Unterstuetzung |
| Tailwind CSS v3 | Bewusste Wahl von v3 (v4 hat bekannte PostCSS-Probleme) |
| FastMCP 2.x | Aktuellste MCP-Server-Implementierung fuer SSE/Streamable HTTP |
| Redis fuer Sessions | Schneller In-Memory-Store, skalierbar |
| Traefik als Reverse Proxy | THoster-Standard, einfache Label-basierte Konfiguration |
| Kuerzel-basierter Login | Schneller Workspace-Zugang fuer Supporter ohne Passwort-Friction |
| #003459 Primaerfarbe | THoster/ams.projects Unternehmensfarbe |

---

## Bekannte Einschraenkungen (Phase 1)

- Datenbankmigrationen noch nicht mit Alembic verwaltet (direkte CREATE TABLE bei Start)
- Keine automatisierten Tests vorhanden
- E-Mail-Benachrichtigungen noch nicht implementiert
- Dateianhang-Upload noch nicht unterstuetzt

---

## Notizen

- THoster-Konfiguration immer unter `http://192.168.0.52.sslip.io/admin/claude` pruefen
- Bei Server-Problemen `--host` Flag verwenden: `npm run dev -- --host`
- Docker-Ports: Belegter Port nicht wechseln, sondern freigeben
- Commit-Workflow: readme.md und projectplan.md immer vor dem Commit aktualisieren
