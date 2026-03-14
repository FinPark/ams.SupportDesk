# ams.SupportDesk

KI-gestütztes Support-Tool auf Basis von FastAPI, React und FastMCP. Das System verbindet Supporter, Kunden und KI-Assistenz in einer integrierten Plattform und ist vollstaendig in die THoster-Infrastruktur integriert.

---

## Inhaltsverzeichnis

- [Uebersicht](#uebersicht)
- [Architektur](#architektur)
- [Voraussetzungen](#voraussetzungen)
- [Installation & Start](#installation--start)
- [Konfiguration](#konfiguration)
- [Dienste & Routen](#dienste--routen)
- [Backend](#backend)
- [Frontend](#frontend)
- [MCP-Server](#mcp-server)
- [Ticket-Statusmaschine](#ticket-statusmaschine)
- [Projektstruktur](#projektstruktur)

---

## Uebersicht

ams.SupportDesk ist ein mehrschichtiges Support-System mit folgenden Kernfunktionen:

- **Supporter-Arbeitsplatz**: Split-Layout mit Kunden-Chat und KI-Recherche
- **Kunden-Portal**: Webbasiertes Chat-Interface fuer Kunden
- **KI-Assistenz**: Echtzeit-Recherche ueber ams-connections / Agent Hub
- **Eingangskorb**: Live-Updates per WebSocket fuer neue Tickets
- **Admin-Bereich**: Verwaltung von Templates, Phasen-Texten, Modellen, MCP-Servern und RAG-Collections
- **MCP-Server**: Tools fuer Claude Code / Agent Hub zur Ticket-Abfrage

**Primaerfarbe**: `#003459` (dunkles Blau)

---

## Architektur

```
ams-supportdesk.{SERVER_DOMAIN}
        |
   [Traefik Reverse Proxy]
        |
   -----+------+----------+
   |           |          |
[Frontend]  [Backend]  [MCP-Server]
 React 18    FastAPI     FastMCP 2.x
 Nginx        |              |
           [PostgreSQL 16] [Redis 7]
```

**5 Docker-Services:**

| Service     | Image/Build      | Port intern | Traefik-Pfad         |
|-------------|------------------|-------------|----------------------|
| frontend    | ./frontend       | 80          | `/` (Prio 1)         |
| backend     | ./backend        | 8000        | `/api` (Prio 20)     |
| mcp-server  | ./mcp-server     | 8080        | `/mcp` (Prio 40)     |
| db          | postgres:16      | 5432        | intern               |
| redis       | redis:7          | 6379        | intern               |

---

## Voraussetzungen

- Docker und Docker Compose (v2)
- THoster-Netzwerk `thoster-net` muss existieren
- Traefik laeuft als Reverse Proxy im THoster-Netz

---

## Installation & Start

### 1. Repository klonen

```bash
git clone <repository-url>
cd ams.SupportDesk
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# .env anpassen (Datenbankpasswort, SECRET_KEY, SERVER_DOMAIN)
```

### 3. Docker-Container bauen und starten

```bash
docker compose up -d --build
```

### 4. Erreichbarkeit pruefen

```bash
curl -I http://ams-supportdesk.192.168.x.x.sslip.io/
curl -I http://ams-supportdesk.192.168.x.x.sslip.io/api/health
```

---

## Konfiguration

Alle Konfiguration erfolgt ueber die `.env` Datei (Vorlage: `.env.example`):

| Variable      | Beschreibung                          | Beispielwert                    |
|---------------|---------------------------------------|---------------------------------|
| DB_HOST       | Datenbankhost (Docker-Service-Name)   | `db`                            |
| DB_PORT       | Datenbankport                         | `5432`                          |
| DB_NAME       | Datenbankname                         | `supportdesk`                   |
| DB_USER       | Datenbankbenutzer                     | `supportdesk`                   |
| DB_PASSWORD   | Datenbankpasswort (sicheres Passwort) | `CHANGE_ME_secure_password`     |
| REDIS_URL     | Redis-Verbindungs-URL                 | `redis://redis:6379/0`          |
| SECRET_KEY        | JWT/Session-Secret (langer Zufallsstring)      | `CHANGE_ME_random_long_string`   |
| SERVER_DOMAIN     | THoster-Domain fuer Traefik                    | `192.168.x.x.sslip.io`          |
| OPENAI_API_KEY    | API-Key fuer OpenAI (optional)                 | `sk-...`                         |
| ANTHROPIC_API_KEY | API-Key fuer Anthropic Claude (optional)       | `sk-ant-...`                     |

---

## Dienste & Routen

| Route                          | Beschreibung                    |
|--------------------------------|---------------------------------|
| `/`                            | Supporter-Login & Dashboard     |
| `/workspace/:id`               | Support-Workspace (Split-Layout)|
| `/portal`                      | Kunden-Portal                   |
| `/admin`                       | Admin-Bereich                   |
| `/api/...`                     | Backend REST-API                |
| `/api/ws/...`                  | WebSocket-Endpunkte             |
| `/mcp/...`                     | MCP-Server (SSE/Streamable HTTP)|

---

## Backend

**Technologien:** FastAPI 0.115 | SQLAlchemy 2.0 async | asyncpg | Pydantic 2 | Redis 5 | WebSockets | httpx (LLM-Aufrufe)

### Datenmodelle (13)

| Modell               | Beschreibung                              |
|----------------------|-------------------------------------------|
| Supporter            | Support-Mitarbeiter (Kuerzel-basiert)     |
| Kunde                | Kundenstammdaten                          |
| Ticket               | Support-Ticket mit Statusmaschine         |
| TicketTag            | Tags zur Ticket-Kategorisierung           |
| ChatSession          | Chat-Sitzung (Kunde <-> Supporter)        |
| Nachricht            | Einzelne Chat-Nachricht                   |
| KIRechercheVerlauf   | KI-Recherche-Session pro Ticket           |
| KINachricht          | Einzelne KI-Nachricht/Antwort             |
| Bewertung            | Kundenbewertung nach Abschluss            |
| Template             | Antwort-Vorlagen fuer Supporter           |
| PhasenText           | Automatische Texte je Ticket-Phase        |
| MCPServerRegistry    | Registrierte MCP-Server                   |
| AppSetting           | Anwendungseinstellungen (Key-Value)       |

### API-Router (12)

| Router          | Prefix                   | Beschreibung                             |
|-----------------|--------------------------|------------------------------------------|
| auth            | `/api/auth`              | Supporter-Authentifizierung              |
| kunden          | `/api/kunden`            | Kundenverwaltung                         |
| kunden_portal   | `/api/portal`            | Kunden-Portal-Endpunkte                  |
| tickets         | `/api/tickets`           | Ticket-CRUD und Statusaenderungen        |
| tags            | `/api/tags`              | Tag-Verwaltung                           |
| chat_sessions   | `/api/chat-sessions`     | Chat-Session-Verwaltung                  |
| nachrichten     | `/api/nachrichten`       | Nachrichten-CRUD inkl. Delete            |
| eingangskorb    | `/api/eingangskorb`      | Eingangskorb-Abfrage                     |
| connections     | `/api/connections`       | ams-connections Integration              |
| ki_recherche    | `/api/v1/ki-recherche`   | KI-Recherche-Chat (Verlauf, Nachrichten, LLM) |
| ws              | `/api/ws`                | WebSocket (Ticket-Chat + Eingangskorb)   |
| admin           | `/api/admin`             | Admin-Verwaltung inkl. Systemprompt      |

---

## Frontend

**Technologien:** React 18 | Vite | TypeScript | Chakra UI v3 | Tailwind CSS 3

### Seiten & Komponenten

| Pfad              | Komponente            | Beschreibung                              |
|-------------------|-----------------------|-------------------------------------------|
| `/`               | SupporterLogin        | Kuerzel-basierter Login                   |
| `/tickets`        | TicketList            | Tabs: Meine / Eingang / Alle              |
| `/workspace/:id`  | TicketWorkspace       | Split: KundenChat + KIChat                |
| `/portal`         | PortalLogin + Chat    | Kunden-Portal                             |
| `/admin`          | AdminPage             | Tab-basierte Admin-Verwaltung             |

### Admin-Manager-Komponenten

- **TemplateManager** – Antwort-Vorlagen erstellen und verwalten
- **PhasenTexteManager** – Automatische Texte je Ticket-Status (eingeklappt/aufklappbar, hellblaue Eingabefelder)
- **ModelleManager** – KI-Modelle konfigurieren und als Standard setzen
- **MCPServerManager** – MCP-Server registrieren und synchronisieren; Klick auf Card oeffnet Bearbeitungsformular, aktive Server werden oben sortiert, Toggle-Button fuer Aktiv/Inaktiv, verzoegertes Umsortieren nach Toggle
- **RAGCollectionManager** – RAG-Collections verwalten; Toggle zum Aktivieren/Deaktivieren pro Collection (analog zu MCP-Server), aktive Collections werden oben sortiert, Aktivierungszustand wird in App-Settings persistiert (`rag_active_collections`)
- **KISettingsManager** (Phase 2) – KI-spezifische Einstellungen: konfigurierbarer Systemprompt fuer den Recherche-Assistenten
- **SettingsManager** – Allgemeine App-Einstellungen (ohne KI-Prompt, separater Tab)

### Shared-Komponenten

- **TemplatePicker** (Phase 2) – Wiederverwendbarer Template-Picker mit `/`-Trigger-Suche; wird in KundenChat und KIChat eingesetzt

### Custom Hooks

| Hook            | Beschreibung                              |
|-----------------|-------------------------------------------|
| useAuth         | Authentifizierungsstatus und Login-Flow   |
| useTickets      | Ticket-Datenabruf und -verwaltung         |
| useWebSocket    | WebSocket-Verbindung mit Auto-Reconnect   |

---

## MCP-Server

**Technologien:** FastMCP 2.x | httpx

Der MCP-Server stellt 6 Tools fuer Claude Code und den Agent Hub bereit:

| Tool                 | Beschreibung                                    |
|----------------------|-------------------------------------------------|
| `tickets_auflisten`  | Alle offenen/zugewiesenen Tickets auflisten     |
| `ticket_details`     | Detailinformationen zu einem Ticket abrufen     |
| `ticket_suchen`      | Tickets nach Stichwort/Kriterien suchen         |
| `eingangskorb_anzeigen` | Eingangskorb-Tickets anzeigen               |
| `kunde_suchen`       | Kunden nach Name/Kuerzel suchen                 |
| `tags_auflisten`     | Alle verfuegbaren Tags auflisten                |

**Endpunkt:** `http://ams-supportdesk.{SERVER_DOMAIN}/mcp` (Streamable HTTP)

---

## KI-Recherche (Phase 2)

Der Supporter-Arbeitsplatz verfuegt ueber einen vollstaendigen KI-Recherche-Chat:

- **LLM-Router** (`services/llm_router.py`) – Abstraktion fuer OpenAI-kompatible Provider (OpenAI, Ollama, vLLM, Groq, Mistral) und Anthropic Claude; automatische Erkennung per `provider_type`
- **KI-Recherche-API** (`/api/v1/ki-recherche`) – Verwaltet Recherche-Verlaeufe pro Ticket, speichert Konversationen, ruft LLM auf, integriert RAG-Kontext
- **RAG-Integration** – Collections koennen pro Anfrage gezielt ausgewaehlt werden; Fallback auf `rag_active_collections` aus Settings
- **Konfigurierbarer Systemprompt** – Prompt fuer den Recherche-Assistenten wird in `AppSetting` (Key: `ki_system_prompt`) gespeichert und ist im Admin-Bereich editierbar
- **WebSocket-Broadcast** – KI-Antworten werden per WebSocket an alle verbundenen Clients gesendet (`type: ki_nachricht`)

### KI-Recherche-API-Endpunkte

| Methode  | Pfad                                              | Beschreibung                             |
|----------|---------------------------------------------------|------------------------------------------|
| GET      | `/api/v1/ki-recherche/{ticket_id}`               | Aktiven Verlauf laden                    |
| POST     | `/api/v1/ki-recherche/{ticket_id}`               | Neuen Verlauf starten                    |
| GET      | `/api/v1/ki-recherche/{verlauf_id}/nachrichten`  | Nachrichten eines Verlaufs laden         |
| POST     | `/api/v1/ki-recherche/{verlauf_id}/nachrichten`  | Nachricht senden + KI-Antwort erhalten   |
| PATCH    | `/api/v1/ki-recherche/{verlauf_id}/nachrichten/{id}/uebernehmen` | Als uebernommen markieren |
| DELETE   | `/api/v1/ki-recherche/{verlauf_id}/nachrichten/{id}` | KI-Nachricht loeschen              |

---

## Ticketnummern

Tickets erhalten beim Anlegen eine fortlaufende, lesbare `nummer` (auto-increment, nicht die UUID). Diese wird im Kunden-Portal zum Einloggen verwendet und in allen Listen/Komponenten angezeigt.

---

## Ticket-Statusmaschine

```
eingang
   |
   v
in_bearbeitung
   |
   +---------> wartet (auf Kunden-Antwort)
   |              |
   v              v
geloest <---------+
   |
   v
bewertung
   |
   v
geschlossen
```

---

## Projektstruktur

```
ams.SupportDesk/
├── .env.example             # Konfigurationsvorlage
├── .gitignore
├── docker-compose.yml       # 5-Service-Stack
├── register-ams-supportdesk.json  # THoster-Registrierung
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml       # FastAPI + SQLAlchemy + asyncpg
│   └── app/
│       ├── main.py          # FastAPI-App, CORS, Router-Registrierung
│       ├── config.py        # Pydantic Settings
│       ├── database.py      # Async SQLAlchemy Engine
│       ├── middleware/      # Auth-Middleware
│       ├── models/          # 13 SQLAlchemy-Modelle
│       ├── routers/         # 12 API-Router (inkl. ki_recherche)
│       ├── schemas/         # Pydantic-Schemas
│       └── services/        # ConnectionManager, ConnectionsClient, LLMRouter
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json         # React 18 + Vite + Chakra UI v3
│   └── src/
│       ├── App.tsx          # Routing
│       ├── main.tsx
│       ├── components/      # Admin, Eingangskorb, Portal, Tickets, Workspace
│       ├── hooks/           # useAuth, useTickets, useWebSocket
│       ├── lib/             # api.ts, types.ts
│       └── theme/           # Chakra UI Theme (#003459)
│
└── mcp-server/
    ├── Dockerfile
    ├── pyproject.toml       # FastMCP 2.x + httpx
    └── server.py            # 6 MCP-Tools
```

---

## THoster-Integration

Das Projekt registriert sich ueber `register-ams-supportdesk.json` am THoster-System. Die Konfiguration fuer Claude Code / Agent Hub ist unter `http://192.168.0.52.sslip.io/admin/claude` abrufbar.

### MCP-Server Sync

Der Admin-Bereich synchronisiert MCP-Server automatisch aus der THoster-Tool-Liste. Dabei gilt:

- Die URL des MCP-Servers wird direkt aus dem Feld `mcp_server_address` der THoster API bezogen
- Tools ohne `mcp_server_address` werden uebersprungen oder bestehende Eintraege entfernt
- Neu synchronisierte Server werden standardmaessig **deaktiviert** angelegt (manuelle Aktivierung erforderlich)
- Das Sync-Ergebnis liefert Zaehler fuer `synced`, `skipped`, `removed` und `total_tools`

### RAG-Collections

Der Backend-Router probiert beim Abruf von RAG-Collections mehrere Kandidaten-URLs in dieser Reihenfolge:

1. `http://{docker_name}-backend-1:8000/api/v1/collections` (Docker-interne Konvention)
2. `http://{tool-name}.{SERVER_DOMAIN}/api/v1/collections` (Traefik-Hostname)
3. Konfigurierte URL aus `rag_server.url` (falls vorhanden)

---

## Lizenz

Intern – ams.projects
