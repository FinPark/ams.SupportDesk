import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useAuth } from "@/hooks/useAuth"
import SupporterLogin from "@/components/shared/SupporterLogin"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

interface HilfeSektion {
  id: string
  icon: string
  titel: string
  inhalt: string
}

// ---------------------------------------------------------------------------
// Hilfetexte
// ---------------------------------------------------------------------------

const HILFE_SEKTIONEN: HilfeSektion[] = [
  {
    id: "uebersicht",
    icon: "🏠",
    titel: "Übersicht — Was ist ams.SupportDesk?",
    inhalt: [
      "**ams.SupportDesk** ist ein modernes, KI-gestütztes Ticket-System für professionellen Kundensupport.",
      "Es verbindet klassische Helpdesk-Funktionen mit einem integrierten KI-Assistenten und ermöglicht",
      "damit eine schnelle, konsistente Bearbeitung von Kundenanfragen.",
      "",
      "## Kernfunktionen",
      "",
      "- **Ticket-Verwaltung** — Anlegen, Bearbeiten und Schließen von Support-Tickets mit Status-Workflow",
      "- **KI-Recherche** — Kontextbasierte Antwortvorschläge aus einer konfigurierbaren Wissensdatenbank (RAG)",
      "- **Kunden-Portal** — Eigenständiger Kunden-Login für direkte Kommunikation ohne E-Mail",
      "- **Eingangskorb** — Zentrales Postfach für neue, noch nicht zugewiesene Anfragen",
      "- **Statistik & Analytics** — Umfangreiche Auswertungen zu Ticketvolumen, Supporter-Performance und SLA",
      "- **Template-System** — Vordefinierte Antwortvorlagen mit dynamischen Variablen",
      "",
      "## Systemvoraussetzungen",
      "",
      "| Komponente | Anforderung |",
      "|------------|-------------|",
      "| Browser | Chrome, Firefox, Edge (aktuell) |",
      "| Netzwerk | Zugang zum internen Netzwerk / VPN |",
      "| Konto | Supporter-Kürzel (vom Administrator vergeben) |",
      "",
      "## Erste Anmeldung",
      "",
      "1. Rufe die Anwendungs-URL im Browser auf",
      "2. Gib dein **Supporter-Kürzel** ein (z. B. `MS`, `JH`)",
      "3. Klicke auf **Anmelden**",
      "4. Du siehst nun die Ticket-Übersicht als Startseite",
    ].join("\n"),
  },
  {
    id: "workspace",
    icon: "💻",
    titel: "Supporter-Arbeitsplatz (Workspace)",
    inhalt: [
      "Der **Workspace** öffnet sich, sobald du ein Ticket auswählst oder darauf klickst.",
      "Er ist das zentrale Arbeitswerkzeug für alle Supporter.",
      "",
      "## Layout: Split-Ansicht",
      "",
      "Der Workspace ist in zwei Bereiche aufgeteilt:",
      "",
      "**Linke Seite — Ticket-Details:**",
      "- Ticket-Nummer, Status, Erstellungsdatum",
      "- Kundendaten und Kontaktinformationen",
      "- Vollständige Nachrichten-Historie (Chat-Verlauf)",
      "- Eingabefeld für neue Nachrichten an den Kunden",
      "",
      "**Rechte Seite — KI-Recherche:**",
      "- Eigenes Eingabefeld für Recherche-Anfragen",
      "- Anzeige der KI-Antworten mit Quellenangaben",
      "- **Übernehmen**-Button zum Einfügen in die Ticket-Antwort",
      "",
      "## Ticket bearbeiten",
      "",
      "1. Klicke in der Ticket-Liste auf ein Ticket",
      "2. Der Workspace öffnet sich automatisch",
      "3. Lies die bisherige Konversation im linken Bereich",
      "4. Nutze die **KI-Recherche** rechts, um Informationen zu finden",
      "5. Klicke **Übernehmen**, um die KI-Antwort in das Antwortfeld zu übertragen",
      "6. Bearbeite und ergänze den Text nach Bedarf",
      "7. Sende die Antwort mit dem **Senden**-Button",
      "",
      "## Status ändern",
      "",
      "Über die Status-Auswahl im Workspace kannst du den Ticket-Status direkt setzen:",
      "**Offen** → In Bearbeitung → Warten auf Kunde → Gelöst → Geschlossen",
      "",
      "## Vorlagen (Templates) verwenden",
      "",
      "Tippe im Antwortfeld ein `/` (Schrägstrich), um den **Template-Picker** zu öffnen.",
      "Wähle eine Vorlage aus der Liste — sie wird automatisch in das Antwortfeld eingefügt.",
    ].join("\n"),
  },
  {
    id: "tickets",
    icon: "🎫",
    titel: "Ticket-System",
    inhalt: [
      "Das Ticket-System bildet das Herzstück von ams.SupportDesk. Jede Kundenanfrage wird als Ticket",
      "erfasst und durchläuft einen definierten Status-Workflow.",
      "",
      "## Status-Workflow",
      "",
      "```",
      "Neu → Offen → In Bearbeitung → Warten auf Kunde → Gelöst → Geschlossen",
      "```",
      "",
      "| Status | Bedeutung |",
      "|--------|-----------|",
      "| **Neu** | Ticket gerade erstellt, noch keinem Supporter zugewiesen |",
      "| **Offen** | Zugewiesen, wartet auf Bearbeitung |",
      "| **In Bearbeitung** | Supporter arbeitet aktiv daran |",
      "| **Warten auf Kunde** | Antwort des Kunden ausstehend |",
      "| **Gelöst** | Problem behoben, Kunde wurde informiert |",
      "| **Geschlossen** | Ticket abgeschlossen, keine weiteren Aktionen |",
      "",
      "## Ticket erstellen",
      "",
      "1. Klicke auf **+ Neues Ticket** (oben rechts in der Navigation)",
      "2. Fülle Pflichtfelder aus:",
      "   - **Betreff** — Kurze Beschreibung des Problems",
      "   - **Beschreibung** — Detaillierte Schilderung",
      "   - **Kunde** — Auswahl aus der Kundenliste",
      "3. Optionale Felder: Priorität, Tags, zugewiesener Supporter",
      "4. Klicke **Erstellen**",
      "",
      "## Tags und Kategorisierung",
      "",
      "Tags helfen bei der Filterung und Auswertung von Tickets:",
      "- Tags werden im Workspace dem Ticket zugewiesen",
      "- Mehrere Tags pro Ticket möglich",
      "- Tags können in der Admin-Oberfläche verwaltet werden",
      "",
      "## Ticket-Liste filtern",
      "",
      "Die Ticket-Liste unterstützt folgende Filter:",
      "- Nach **Status** (Dropdown oben)",
      "- Nach **Supporter** (zugewiesener Bearbeiter)",
      "- Nach **Zeitraum** (Erstellungsdatum)",
      "- **Freitextsuche** in Betreff und Beschreibung",
      "",
      "## Supporter-Nachrichten markieren",
      "",
      "Im Workspace kannst du eigene Nachrichten als **intern** markieren.",
      "Interne Nachrichten sind nur für Supporter sichtbar und erscheinen nicht im Kunden-Portal.",
    ].join("\n"),
  },
  {
    id: "eingangskorb",
    icon: "📥",
    titel: "Eingangskorb",
    inhalt: [
      "Der **Eingangskorb** ist die zentrale Sammelstelle für neue, noch nicht zugewiesene Support-Anfragen.",
      "Er ist über die Navigation oben erreichbar.",
      "",
      "## Ansicht wechseln",
      "",
      "In der oberen Navigation gibt es zwei Ansichten:",
      "- **Tickets** — Deine zugewiesenen und bearbeiteten Tickets",
      "- **Eingangskorb** — Neue, unbearbeitete Anfragen",
      "",
      "## Neue Anfragen übernehmen",
      "",
      "1. Wechsle zur Ansicht **Eingangskorb**",
      "2. Du siehst alle neuen Tickets, die noch keinem Supporter zugewiesen sind",
      "3. Klicke auf ein Ticket in der Liste",
      "4. Klicke auf **Übernehmen**, um das Ticket deinem Account zuzuweisen",
      "5. Das Ticket erscheint nun in deiner Ticket-Liste",
      "",
      "## Prioritäten beachten",
      "",
      "Im Eingangskorb sind Tickets nach Eingangszeit sortiert. Tickets mit hoher Priorität sind",
      "entsprechend markiert — diese sollten bevorzugt bearbeitet werden.",
      "",
      "## Automatische Zuweisung",
      "",
      "Wenn in den Admin-Einstellungen eine automatische Zuweisung konfiguriert ist, werden neue Tickets",
      "nach einem Round-Robin-Verfahren automatisch auf verfügbare Supporter verteilt.",
      "Diese erscheinen dann bereits in der persönlichen Ticket-Liste.",
    ].join("\n"),
  },
  {
    id: "ki-recherche",
    icon: "🤖",
    titel: "KI-Recherche",
    inhalt: [
      "Die **KI-Recherche** nutzt eine Retrieval Augmented Generation (RAG) Technologie,",
      "um kontextrelevante Antworten aus der konfigurierten Wissensdatenbank zu generieren.",
      "",
      "## Funktionsweise",
      "",
      "1. Du stellst eine Frage oder beschreibst ein Problem im rechten Panel des Workspace",
      "2. Das System durchsucht die RAG-Datenbank nach relevanten Dokumenten",
      "3. Die KI generiert eine Antwort auf Basis der gefundenen Quellen",
      "4. Die Antwort wird mit **Quellenangaben** angezeigt",
      "",
      "## Recherche starten",
      "",
      "1. Öffne einen Ticket im Workspace",
      "2. Klicke in das **Recherche-Eingabefeld** (rechte Seite)",
      "3. Gib deine Suchanfrage ein (möglichst konkret formulieren)",
      "4. Drücke **Enter** oder klicke auf **Suchen**",
      "5. Warte auf die KI-Antwort",
      "",
      "## Antwort übernehmen",
      "",
      "Der **Übernehmen**-Button kopiert die KI-Antwort in das Antwortfeld des Tickets:",
      "- Klicke auf **Übernehmen** unter der KI-Antwort",
      "- Die Antwort erscheint im linken Antwortfeld",
      "- Passe den Text nach Bedarf an, bevor du ihn absendest",
      "",
      "## Bubble-Transfer",
      "",
      "Der **Bubble-Transfer** ermöglicht es, einzelne Abschnitte der KI-Antwort gezielt zu übertragen:",
      "- Klicke auf eine einzelne Antwort-Bubble in der KI-Recherche",
      "- Wähle **In Antwort einfügen**",
      "- Nur dieser spezifische Abschnitt wird übertragen",
      "",
      "## Tipps für bessere Suchergebnisse",
      "",
      "- Formuliere Fragen in natürlicher Sprache: *\"Wie setze ich ein Passwort zurück?\"*",
      "- Verwende Fachbegriffe aus deiner Branche, wenn bekannt",
      "- Bei schlechten Ergebnissen: Umformulieren oder andere Schlüsselwörter verwenden",
      "- Die Qualität der Antworten hängt von der Vollständigkeit der RAG-Datenbank ab",
      "",
      "> **Hinweis:** Die KI-Recherche ersetzt keine eigene Prüfung. Überprüfe KI-generierte Antworten",
      "> stets auf Korrektheit, bevor du sie an Kunden sendest.",
    ].join("\n"),
  },
  {
    id: "portal",
    icon: "🌐",
    titel: "Kunden-Portal",
    inhalt: [
      "Das **Kunden-Portal** bietet Kunden eine eigenständige Oberfläche, um ihre Support-Anfragen",
      "einzusehen und direkt mit dem Support-Team zu kommunizieren.",
      "",
      "## Zugang für Kunden",
      "",
      "Das Portal ist unter der URL `/portal` erreichbar. Kunden identifizieren sich mit:",
      "- **E-Mail-Adresse** oder",
      "- **Kunden-ID** (die ihnen vom Support-Team mitgeteilt wurde)",
      "",
      "## Funktionen im Portal",
      "",
      "**Für Kunden:**",
      "- Eigene Tickets einsehen und den Status verfolgen",
      "- Neue Nachrichten zu bestehenden Tickets schreiben",
      "- Neue Tickets erstellen",
      "- Den Chat-Verlauf mit dem Support vollständig lesen",
      "",
      "**Für Supporter (Ansicht):**",
      "- Alle Kundennachrichten erscheinen in Echtzeit im Workspace",
      "- Antworten des Supporters sind sofort im Portal sichtbar",
      "- Interne Supporter-Notizen sind im Portal **nicht sichtbar**",
      "",
      "## Portal im Browser öffnen",
      "",
      "Klicke in der oberen Navigation auf **Kunden-Portal** — es öffnet sich in einem neuen Tab.",
      "",
      "## Neues Ticket über Portal",
      "",
      "Kunden können über das Portal eigenständig neue Tickets erstellen:",
      "1. Einloggen mit E-Mail",
      "2. **Neues Ticket** wählen",
      "3. Betreff und Beschreibung eingeben",
      "4. Absenden — das Ticket landet automatisch im Eingangskorb",
      "",
      "## Kunden-Portal konfigurieren",
      "",
      "Im **Admin-Bereich** unter **Einstellungen** kann das Portal angepasst werden:",
      "- Portal-Begrüßungstext",
      "- Erlaubte Kontaktmethoden",
      "- Automatische Bestätigungsnachrichten",
    ].join("\n"),
  },
  {
    id: "admin",
    icon: "⚙️",
    titel: "Admin-Bereich",
    inhalt: [
      "Der **Admin-Bereich** ist für Administratoren und erfahrene Supporter gedacht.",
      "Hier werden alle systemweiten Einstellungen verwaltet.",
      "",
      "Erreichbar über: **Navigation → Admin**",
      "",
      "## Übersicht der 7 Tabs",
      "",
      "### 1. Vorlagen",
      "Verwalte Antwort-Templates für wiederkehrende Anfragen:",
      "- Neue Vorlage erstellen mit **Titel** und **Inhalt**",
      "- Platzhalter wie `{{kundename}}`, `{{ticketnummer}}` werden beim Einfügen ersetzt",
      "- Vorlagen können aktiviert/deaktiviert werden",
      "- Im Workspace über `/` (Schrägstrich) aufrufbar",
      "",
      "### 2. Phasen-Texte",
      "Definiere automatische Texte für Status-Übergänge:",
      "- Jeder Ticket-Status kann einen eigenen Phasentext haben",
      "- Diese Texte werden optional automatisch an den Kunden gesendet",
      "- Hilfreich für konsistente Kommunikation bei Status-Änderungen",
      "",
      "### 3. Modelle",
      "Konfiguriere die verwendeten KI-Sprachmodelle:",
      "- Wähle das Haupt-Modell für die KI-Recherche",
      "- Wähle das Modell für Chat-Zusammenfassungen",
      "- Unterstützte Anbieter: OpenAI, Anthropic und lokale Modelle via ams-llm",
      "",
      "### 4. MCP-Server",
      "Verwalte Model Context Protocol (MCP) Server-Verbindungen:",
      "- Externe Tools und Datenquellen für den KI-Assistenten hinzufügen",
      "- Jeder MCP-Server erweitert die Fähigkeiten der KI-Recherche",
      "- Status-Anzeige (aktiv/inaktiv) für jede Verbindung",
      "",
      "### 5. RAG-Collections",
      "Pflege die Wissensdatenbank für die KI-Recherche:",
      "- Dokumente hochladen oder per URL importieren",
      "- Bestehende Collections einsehen und verwalten",
      "- Indizierungsstand und Dokument-Anzahl überwachen",
      "- Nicht mehr relevante Dokumente entfernen",
      "",
      "### 6. KI-Einstellungen",
      "Feineinstellungen für das KI-Verhalten:",
      "- System-Prompt anpassen (Ton, Sprache, Fokusbereich)",
      "- Maximale Antwortlänge konfigurieren",
      "- Schwellenwert für RAG-Relevanz einstellen",
      "- Hybride Suche aktivieren/deaktivieren",
      "",
      "### 7. Einstellungen",
      "Allgemeine System-Konfiguration:",
      "- Supporter-Konten verwalten (anlegen, deaktivieren)",
      "- Portal-Zugangsdaten und -texte",
      "- Benachrichtigungseinstellungen",
      "- Backup und Daten-Export",
      "",
      "> **Wichtig:** Änderungen im Admin-Bereich wirken sich sofort auf alle Nutzer aus.",
      "> Bitte mit Bedacht vorgehen.",
    ].join("\n"),
  },
  {
    id: "statistik",
    icon: "📊",
    titel: "Statistik & Analytics",
    inhalt: [
      "Die **Statistik-Seite** bietet umfangreiche Auswertungen zur Performance des Support-Teams.",
      "Erreichbar über **Navigation → Statistik**.",
      "",
      "## Zeitraum-Filter",
      "",
      "Oben auf der Statistik-Seite kannst du den Auswertungszeitraum wählen:",
      "- **Heute** — Nur der aktuelle Tag",
      "- **7 Tage** — Letzte Woche",
      "- **30 Tage** — Letzter Monat (Standard)",
      "- **90 Tage** — Letztes Quartal",
      "- **Jahr** — Letztes Jahr",
      "- **Gesamt** — Alle verfügbaren Daten",
      "- **Benutzerdefiniert** — Eigenen Zeitraum festlegen",
      "",
      "## Übersicht der 6 Statistik-Tabs",
      "",
      "### 1. Übersicht",
      "Wichtigste KPIs auf einen Blick:",
      "- Gesamtanzahl Tickets im Zeitraum",
      "- Durchschnittliche Bearbeitungszeit",
      "- Lösungsquote (%)",
      "- Ticket-Volumen als Zeitreihen-Diagramm",
      "- Verteilung nach Status",
      "",
      "### 2. Supporter",
      "Individuelle Performance-Kennzahlen pro Supporter:",
      "- Anzahl bearbeiteter Tickets",
      "- Durchschnittliche Reaktionszeit (Erstantwort)",
      "- Durchschnittliche Lösungszeit",
      "- Kundenzufriedenheitswert (falls bewertet)",
      "- Rangliste der Supporter nach Volumen",
      "",
      "### 3. Kunden",
      "Auswertungen auf Kunden-Ebene:",
      "- Kunden mit den meisten Tickets",
      "- Offene Tickets pro Kunde",
      "- Durchschnittliche Zufriedenheit je Kunde",
      "- Zeitliche Entwicklung der Ticket-Häufigkeit",
      "",
      "### 4. Zeiten & SLA",
      "Service Level Agreement Monitoring:",
      "- Einhaltung von Reaktionszeitzielen",
      "- Einhaltung von Lösungszeitzielen",
      "- Eskalationen (SLA-Verletzungen)",
      "- Durchschnittliche Wartezeiten nach Phase",
      "- Verteilung der Bearbeitungszeiten",
      "",
      "### 5. Qualität",
      "Qualitätsmessungen und Trends:",
      "- Wiedereröffnungsquote (Tickets die nach Lösung erneut geöffnet wurden)",
      "- Eskalationsquote",
      "- Durchschnittliche Nachrichtenanzahl pro Ticket",
      "- Qualitätstrends über Zeit",
      "",
      "### 6. KI-Nutzung",
      "Auswertung der KI-Assistenten-Nutzung:",
      "- Anzahl KI-Anfragen gesamt und pro Supporter",
      "- Übernahme-Rate (wie oft wurde die KI-Antwort übernommen)",
      "- Beliebteste Themen / Suchanfragen",
      "- Qualitätsbewertungen der KI-Antworten (falls aktiviert)",
      "",
      "## Daten exportieren",
      "",
      "Auf der Statistik-Seite steht ein **Export**-Button bereit (je nach Tab):",
      "- CSV-Export für eigene Analysen in Excel o. Ä.",
      "- Zeitraum-Filter gilt auch für den Export",
    ].join("\n"),
  },
  {
    id: "vorlagen",
    icon: "📝",
    titel: "Vorlagen (Templates)",
    inhalt: [
      "Das **Template-System** ermöglicht vordefinierte Antwortbausteine,",
      "die Supporter schnell in Tickets einfügen können.",
      "",
      "## Template-Picker aufrufen",
      "",
      "Im Antwortfeld des Workspace:",
      "1. Klicke in das Antwortfeld (linke Seite, unten)",
      "2. Tippe `/` (Schrägstrich)",
      "3. Der **Template-Picker** öffnet sich mit einer Liste aller aktiven Vorlagen",
      "4. Scrolle durch die Liste oder tippe weitere Zeichen zum Filtern",
      "5. Klicke auf eine Vorlage oder bestätige mit **Enter**",
      "",
      "## Vorlagen verwalten",
      "",
      "Im **Admin-Bereich → Vorlagen**:",
      "",
      "**Neue Vorlage erstellen:**",
      "1. Klicke auf **+ Neue Vorlage**",
      "2. Gib einen prägnanten **Titel** ein (erscheint im Picker)",
      "3. Schreibe den **Inhalt** (unterstützt Markdown-Formatierung)",
      "4. Füge optional **Platzhalter** ein",
      "5. Speichere mit **Erstellen**",
      "",
      "**Platzhalter-Syntax:**",
      "",
      "| Platzhalter | Ersetzt durch |",
      "|-------------|---------------|",
      "| `{{kundename}}` | Vollständiger Name des Kunden |",
      "| `{{ticketnummer}}` | Aktuelle Ticket-Nummer |",
      "| `{{supporter}}` | Kürzel des zugewiesenen Supporters |",
      "| `{{datum}}` | Aktuelles Datum |",
      "",
      "**Vorlage bearbeiten:**",
      "- Klicke auf das Bearbeiten-Symbol neben einer Vorlage",
      "- Ändere Titel oder Inhalt",
      "- Speichere die Änderungen",
      "",
      "**Vorlage deaktivieren:**",
      "- Deaktivierte Vorlagen erscheinen nicht mehr im Template-Picker",
      "- Sie bleiben aber in der Admin-Übersicht erhalten und können reaktiviert werden",
      "",
      "## Tipps für gute Vorlagen",
      "",
      "- Kurzer, beschreibender Titel (z. B. \"Passwort zurücksetzen\", \"Erstantwort Begrüßung\")",
      "- Vorlagen immer mit Platzhaltern personalisieren",
      "- Regelmäßig überprüfen, ob Vorlagen noch aktuell sind",
    ].join("\n"),
  },
  {
    id: "tipps",
    icon: "💡",
    titel: "Tipps & Tastenkürzel",
    inhalt: [
      "## Praktische Tipps für die tägliche Arbeit",
      "",
      "### Schneller arbeiten mit Tastaturkürzeln",
      "",
      "| Aktion | Kürzel |",
      "|--------|--------|",
      "| Template-Picker öffnen | `/` im Antwortfeld |",
      "| Nachricht senden | `Strg + Enter` |",
      "| KI-Recherche starten | `Enter` im Recherche-Feld |",
      "",
      "### KI-Recherche optimal nutzen",
      "",
      "- **Konkret formulieren:** \"Fehler beim Export als PDF\" statt nur \"Exportfehler\"",
      "- **Schritte beschreiben:** \"Kunde kann sich nicht einloggen nach Passwortänderung\"",
      "- **Kontext geben:** Nenne relevante Produkt- oder Versionsinformationen",
      "- **Mehrfach versuchen:** Bei unbefriedigenden Ergebnissen die Frage umformulieren",
      "",
      "### Effizienter Ticket-Workflow",
      "",
      "1. **Erst lesen, dann recherchieren** — Lies den vollständigen Chat-Verlauf, bevor du die KI befragst",
      "2. **KI als Ausgangspunkt** — Nutze KI-Antworten als Entwurf, nicht als fertige Antwort",
      "3. **Template-Picker für Standard-Antworten** — Spare Zeit bei wiederkehrenden Anfragen",
      "4. **Status immer aktuell halten** — Ändere den Status sofort wenn sich etwas ändert",
      "5. **Interne Notizen nutzen** — Dokumentiere Hintergrundinformationen als interne Notiz",
      "",
      "### Häufige Fragen",
      "",
      "**Wo finde ich das Kunden-Portal?**",
      "Klicke in der oberen Navigation auf **Kunden-Portal** — es öffnet sich in einem neuen Browser-Tab.",
      "",
      "**Wie öffne ich ein Ticket im Workspace?**",
      "Klicke in der Ticket-Liste auf die Ticket-Nummer oder den Betreff.",
      "",
      "**Wie wechsle ich zwischen Tickets und Eingangskorb?**",
      "Nutze die Buttons **Tickets** und **Eingangskorb** in der oberen Navigation.",
      "",
      "**Was passiert wenn ich auf 'Übernehmen' klicke?**",
      "Das Ticket wird dir zugewiesen und aus dem Eingangskorb entfernt.",
      "",
      "**Kann ich eine versendete Nachricht bearbeiten?**",
      "Nein. Versendete Nachrichten können nicht nachträglich geändert werden.",
      "Schreibe eine Folgenachricht mit dem Hinweis auf die Korrektur.",
      "",
      "**Wie erkenne ich ungelesene Nachrichten?**",
      "Tickets mit ungelesenen Nachrichten sind in der Ticket-Liste fett dargestellt.",
      "",
      "### Fehlerbehebung",
      "",
      "**Die Seite lädt nicht:**",
      "- Prüfe deine Netzwerkverbindung",
      "- Leere den Browser-Cache (Strg + F5)",
      "- Versuche einen anderen Browser",
      "",
      "**KI-Recherche antwortet nicht:**",
      "- Warte einige Sekunden — komplexe Anfragen brauchen länger",
      "- Prüfe, ob die RAG-Datenbank Dokumente enthält (Admin → RAG-Collections)",
      "- Wende dich an den Administrator, falls das Problem anhält",
      "",
      "**Ticket lässt sich nicht speichern:**",
      "- Prüfe ob alle Pflichtfelder ausgefüllt sind",
      "- Versuche die Seite neu zu laden (Dateneingabe geht dabei verloren)",
      "- Notiere deine Eingaben vorher als Sicherheit",
      "",
      "**Anmeldung funktioniert nicht:**",
      "- Stelle sicher, dass du das korrekte Supporter-Kürzel verwendest (Groß-/Kleinschreibung beachten)",
      "- Wende dich an deinen Administrator zum Zurücksetzen des Kontos",
    ].join("\n"),
  },
]

// ---------------------------------------------------------------------------
// Hilfreich: baseDomain berechnen
// ---------------------------------------------------------------------------

function getBaseDomain(): string {
  const hostname = window.location.hostname
  const parts = hostname.split(".")
  if (parts.length > 1) {
    // Entferne erste Subdomain: "ams-supportdesk.192.168.0.52.sslip.io" → "192.168.0.52.sslip.io"
    return parts.slice(1).join(".")
  }
  return hostname
}

// ---------------------------------------------------------------------------
// IFrame-Sektion (aufklappbar)
// ---------------------------------------------------------------------------

interface IFrameSektionProps {
  titel: string
  icon: string
  url: string
  iframeHeight: string
  borderColor: string
  defaultOpen?: boolean
}

function IFrameSektion({
  titel,
  icon,
  url,
  iframeHeight,
  borderColor,
  defaultOpen = false,
}: IFrameSektionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Box
      borderWidth={1}
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      mb={4}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        bg="blue.500"
        cursor="pointer"
        onClick={() => setOpen((v) => !v)}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <HStack gap={2}>
          <Text fontSize="lg">{icon}</Text>
          <Text fontWeight="semibold" color="white">
            {titel}
          </Text>
        </HStack>
        <Text color="white" fontSize="lg">
          {open ? "▲" : "▼"}
        </Text>
      </Box>

      {/* Content */}
      {open && (
        <Box p={2}>
          <iframe
            src={url}
            style={{
              width: "100%",
              height: iframeHeight,
              border: "none",
              display: "block",
              background: "transparent",
            }}
            title={titel}
            allowTransparency={true}
          />
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Hilfe-Sektion (aufklappbar)
// ---------------------------------------------------------------------------

interface HilfeSektionComponentProps {
  sektion: HilfeSektion
  isOpen: boolean
  onToggle: () => void
}

function HilfeSektionComponent({
  sektion,
  isOpen,
  onToggle,
}: HilfeSektionComponentProps) {
  return (
    <Box
      borderWidth={1}
      borderColor="gray.200"
      borderRadius="lg"
      overflow="hidden"
      mb={3}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        bg={isOpen ? "blue.500" : "white"}
        cursor="pointer"
        onClick={onToggle}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        _hover={{ bg: isOpen ? "blue.600" : "gray.50" }}
        transition="background 0.15s"
      >
        <HStack gap={3}>
          <Text fontSize="xl">{sektion.icon}</Text>
          <Text
            fontWeight="semibold"
            color={isOpen ? "white" : "gray.700"}
            fontSize="md"
          >
            {sektion.titel}
          </Text>
        </HStack>
        <Text color={isOpen ? "white" : "gray.400"} fontSize="lg">
          {isOpen ? "▲" : "▼"}
        </Text>
      </Box>

      {/* Content */}
      {isOpen && (
        <Box px={5} py={4} bg="white">
          <MarkdownRenderer content={sektion.inhalt} />
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

function HilfePageContent() {
  const { supporter, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["uebersicht"])
  )

  const protocol = window.location.protocol
  const baseDomain = getBaseDomain()
  const kiHilfeUrl = `${protocol}//${baseDomain}/embed/help?tool=ams-supportdesk`
  const supportTicketsUrl = `${protocol}//${baseDomain}/embed/tickets?tool=ams-supportdesk`

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const alleAufklappen = () => {
    setExpandedSections(new Set(HILFE_SEKTIONEN.map((s) => s.id)))
  }

  const alleZuklappen = () => {
    setExpandedSections(new Set())
  }

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.400">Laden...</Text>
      </Box>
    )
  }

  if (!supporter) {
    return <SupporterLogin onLogin={login} />
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* ------------------------------------------------------------------ */}
      {/* Header — identisch mit AdminPage / StatistikPage                   */}
      {/* ------------------------------------------------------------------ */}
      <Box
        bg="blue.500"
        color="white"
        px={4}
        py={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
      >
        <HStack gap={4}>
          <Heading
            size="md"
            cursor="pointer"
            onClick={() => navigate("/")}
          >
            ams.SupportDesk
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            onClick={() => navigate("/")}
          >
            ← Tickets
          </Button>
          <Box w="1px" h="20px" bg="whiteAlpha.400" />
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => navigate("/statistik")}
          >
            Statistik
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => navigate("/admin")}
          >
            Admin
          </Button>
        </HStack>
        <HStack gap={3}>
          <Text fontSize="sm" color="whiteAlpha.800">
            Hilfe
          </Text>
          <Text fontSize="sm">{supporter.kuerzel}</Text>
          <Button variant="ghost" size="sm" color="white" onClick={logout}>
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Seiteninhalt                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Box flex={1} overflow="auto" bg="gray.50">
        <Box maxW="1100px" mx="auto" px={6} py={6}>

          {/* Seiten-Titel */}
          <VStack align="start" mb={6} gap={1}>
            <Heading size="xl" color="blue.500">
              Hilfe & Dokumentation
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Vollständige Anleitung für ams.SupportDesk — alle Funktionen erklärt
            </Text>
          </VStack>

          {/* ---------------------------------------------------------------- */}
          {/* IFrame-Sektionen: KI-Hilfe-Assistent & Support-Tickets          */}
          {/* ---------------------------------------------------------------- */}
          <IFrameSektion
            titel="KI-Hilfe-Assistent"
            icon="🤖"
            url={kiHilfeUrl}
            iframeHeight="600px"
            borderColor="blue.200"
            defaultOpen={false}
          />

          <IFrameSektion
            titel="Support-Tickets"
            icon="🎫"
            url={supportTicketsUrl}
            iframeHeight="800px"
            borderColor="orange.300"
            defaultOpen={false}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Hilfe-Sektionen                                                  */}
          {/* ---------------------------------------------------------------- */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={4}
            mt={2}
          >
            <Heading size="md" color="gray.700">
              Dokumentation
            </Heading>
            <HStack gap={2}>
              <Button
                variant="ghost"
                size="sm"
                colorPalette="blue"
                onClick={alleAufklappen}
              >
                Alle aufklappen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={alleZuklappen}
              >
                Alle zuklappen
              </Button>
            </HStack>
          </Box>

          {HILFE_SEKTIONEN.map((sektion) => (
            <HilfeSektionComponent
              key={sektion.id}
              sektion={sektion}
              isOpen={expandedSections.has(sektion.id)}
              onToggle={() => toggleSection(sektion.id)}
            />
          ))}

          {/* Footer */}
          <Box
            mt={8}
            pt={4}
            borderTopWidth={1}
            borderColor="gray.200"
            textAlign="center"
          >
            <Text fontSize="xs" color="gray.400">
              ams.SupportDesk Hilfe-Dokumentation — Stand: März 2026
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default function HilfePage() {
  return <HilfePageContent />
}
