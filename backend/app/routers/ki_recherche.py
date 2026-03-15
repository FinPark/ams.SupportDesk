"""KI-Recherche: Chat mit LLM-Providern für Supporter."""

import json
import logging
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.ticket import Ticket
from app.models.chat_session import ChatSession
from app.models.ki_recherche_verlauf import KIRechercheVerlauf
from app.models.ki_nachricht import KINachricht
from app.models.app_setting import AppSetting
from app.services.connection_manager import manager
from app.services.connections_client import get_connection, get_connections
from app.services.llm_router import LLMRouter, CompletionResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ki-recherche", tags=["ki-recherche"])


DEFAULT_SYSTEM_PROMPT = """\
Du bist ein Support-Assistent. Beantworte NUR die konkrete Frage des Kunden.

Ticket: {ticket_titel} | Kunde: {kunde_name} | Tags: {tags}

## Strikte Regeln
- Beantworte AUSSCHLIESSLICH das, was der Kunde gefragt hat. Keine zusätzlichen Tipps, \
keine Sonderfälle, keine "Was tun wenn"-Abschnitte, keine Grußformeln.
- Nutze NUR Informationen aus der Wissensbasis (RAG). Erfinde nichts dazu.
- Wenn die Wissensbasis keine Antwort liefert, sage kurz: "Dazu habe ich leider keine Information."
- Antworte auf Deutsch, kurz und direkt.
- Formatiere mit Markdown. Keine Überschriften wenn die Antwort kurz ist.
- Der Text muss so formuliert sein, dass der Supporter ihn direkt an den Kunden senden kann.\
"""


def _build_system_prompt(ticket: Ticket, tags: list[str], custom_prompt: str | None = None) -> str:
    """System-Prompt für den Recherche-Assistenten aufbauen."""
    kunde_name = ticket.kunde.name if ticket.kunde else "Unbekannt"
    tags_str = ", ".join(tags) if tags else "keine"

    template = custom_prompt if custom_prompt else DEFAULT_SYSTEM_PROMPT

    return template.format(
        ticket_titel=ticket.titel,
        kunde_name=kunde_name,
        tags=tags_str,
    )


def _clean_rag_query(text: str) -> str:
    """Kontext-Wrapper und Markdown aus dem Text entfernen für bessere RAG-Suche.

    Bubble-Transfer sendet: 'Kontext aus dem Kundengespräch:\n\n**Kunde:**\nText...'
    RAG braucht einen kurzen, präzisen Query — nicht alle Nachrichten zusammen.
    Strategie: Alle Nachrichten extrahieren und zusammenfassen.
    """
    import re
    if not text.startswith("Kontext aus dem Kundengespräch"):
        return text
    # Markdown-Fettdruck entfernen
    cleaned = re.sub(r"\*\*", "", text)
    # Nachrichten extrahieren nach Rolle
    kunde_parts = []
    support_parts = []
    lines = cleaned.split("\n")
    current_role = None
    for line in lines:
        line = line.strip()
        if not line or line == "---":
            current_role = None
            continue
        if line.startswith("Kontext aus dem Kundengespräch"):
            continue
        if line.startswith("Kunde:"):
            current_role = "kunde"
            rest = line[6:].strip()
            if rest:
                kunde_parts.append(rest)
        elif line.startswith("Support:"):
            current_role = "support"
            rest = line[8:].strip()
            if rest:
                support_parts.append(rest)
        elif current_role == "kunde":
            kunde_parts.append(line)
        elif current_role == "support":
            support_parts.append(line)

    # RAG-Query: Nur Kundennachrichten (enthalten das Thema),
    # Support-Rückfragen weglassen (verwässern die Suche)
    return " ".join(kunde_parts) if kunde_parts else " ".join(support_parts) or text


def _ki_nachrichten_to_messages(nachrichten: list[KINachricht]) -> list[dict]:
    """KI-Nachrichten in LLM-Messages-Format umwandeln."""
    messages = []
    for n in nachrichten:
        role = "assistant" if n.rolle == "ki" else "user"
        messages.append({"role": role, "content": n.inhalt_markdown})
    return messages


async def _get_setting(db: AsyncSession, key: str) -> str | None:
    """App-Setting lesen."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def _resolve_connection(db: AsyncSession, model_id: str | None) -> dict | None:
    """Connection (Modell-Config) auflösen: explizite ID oder Default aus Settings."""
    # Explizite ID
    if model_id:
        return await get_connection(model_id)

    # Default aus Settings
    default_id = await _get_setting(db, "default_model_id")
    if default_id:
        return await get_connection(default_id)

    # Fallback: erste verfügbare Connection
    connections = await get_connections()
    if connections:
        return connections[0]

    return None


# ──────────────────────────────────────────────
# Verlauf laden / erstellen
# ──────────────────────────────────────────────

@router.get("/{ticket_id}")
async def get_verlauf(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Aktiven KI-Recherche-Verlauf für ein Ticket laden (oder null)."""
    # Über ChatSession → KIRechercheVerlauf
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.ticket_id == uuid.UUID(ticket_id))
        .options(selectinload(ChatSession.ki_recherche))
        .order_by(ChatSession.started_at.desc())
    )
    sessions = result.scalars().all()

    for sess in sessions:
        if sess.ki_recherche and not sess.ki_recherche.verwaist:
            verlauf = sess.ki_recherche
            return {
                "id": str(verlauf.id),
                "session_id": str(verlauf.session_id),
                "provider": verlauf.provider,
                "model_used": verlauf.model_used,
                "gestartet_at": verlauf.gestartet_at,
                "zuletzt_aktiv": verlauf.zuletzt_aktiv,
            }

    return None


@router.post("/{ticket_id}")
async def create_verlauf(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    """Neuen KI-Recherche-Verlauf für ein Ticket starten."""
    # Aktive Session finden
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.ticket_id == uuid.UUID(ticket_id),
            ChatSession.ended_at.is_(None),
        )
        .order_by(ChatSession.started_at.desc())
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Keine aktive Chat-Session gefunden")

    # Prüfen ob schon ein aktiver Verlauf existiert
    existing = await db.execute(
        select(KIRechercheVerlauf).where(
            KIRechercheVerlauf.session_id == session.id,
            KIRechercheVerlauf.verwaist == False,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Es existiert bereits ein aktiver Verlauf")

    verlauf = KIRechercheVerlauf(
        session_id=session.id,
        provider="",
        model_used="",
    )
    db.add(verlauf)
    await db.commit()
    await db.refresh(verlauf)

    return {
        "id": str(verlauf.id),
        "session_id": str(verlauf.session_id),
        "provider": verlauf.provider,
        "model_used": verlauf.model_used,
        "gestartet_at": verlauf.gestartet_at,
        "zuletzt_aktiv": verlauf.zuletzt_aktiv,
    }


# ──────────────────────────────────────────────
# Nachrichten
# ──────────────────────────────────────────────

@router.get("/{verlauf_id}/nachrichten")
async def list_nachrichten(
    verlauf_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle KI-Nachrichten eines Verlaufs laden."""
    result = await db.execute(
        select(KINachricht)
        .where(KINachricht.verlauf_id == uuid.UUID(verlauf_id))
        .order_by(KINachricht.created_at)
    )
    nachrichten = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "verlauf_id": str(n.verlauf_id),
            "rolle": n.rolle,
            "inhalt_markdown": n.inhalt_markdown,
            "uebernommen_in_chat": n.uebernommen_in_chat,
            "created_at": n.created_at,
        }
        for n in nachrichten
    ]


@router.post("/{verlauf_id}/nachrichten")
async def send_nachricht(
    verlauf_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    supporter: Supporter = Depends(get_current_supporter),
):
    """Nachricht senden und KI-Antwort generieren.

    Body:
        inhalt_markdown: str - Die Nachricht des Supporters
        model_id: str (optional) - Explizite Connection-ID für Modell-Override
        collection_ids: list[str] (optional) - RAG-Collections für diese Anfrage
    """
    inhalt = body.get("inhalt_markdown", "").strip()
    if not inhalt:
        raise HTTPException(status_code=400, detail="inhalt_markdown ist erforderlich")

    model_id = body.get("model_id")
    collection_ids = body.get("collection_ids")  # Optional: Liste von Collection-IDs/Names

    # Verlauf laden
    result = await db.execute(
        select(KIRechercheVerlauf)
        .where(KIRechercheVerlauf.id == uuid.UUID(verlauf_id))
        .options(selectinload(KIRechercheVerlauf.nachrichten))
    )
    verlauf = result.scalar_one_or_none()
    if not verlauf:
        raise HTTPException(status_code=404, detail="Verlauf nicht gefunden")

    # 1. Supporter-Nachricht speichern
    supporter_msg = KINachricht(
        verlauf_id=verlauf.id,
        rolle="supporter",
        inhalt_markdown=inhalt,
    )
    db.add(supporter_msg)
    await db.flush()

    # 2. Connection/Modell auflösen
    connection = await _resolve_connection(db, model_id)
    if not connection:
        # Keine KI-Connection verfügbar — Fehler als KI-Nachricht speichern
        error_msg = KINachricht(
            verlauf_id=verlauf.id,
            rolle="ki",
            inhalt_markdown=(
                "**Keine KI-Verbindung konfiguriert.**\n\n"
                "Bitte konfiguriere ein Modell unter Admin → Modelle (ams-connections)."
            ),
        )
        db.add(error_msg)
        verlauf.zuletzt_aktiv = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(supporter_msg)
        await db.refresh(error_msg)

        return _build_response(supporter_msg, error_msg)

    # 3. Ticket-Kontext laden für System-Prompt
    session_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == verlauf.session_id)
        .options(
            selectinload(ChatSession.ticket).selectinload(Ticket.kunde),
            selectinload(ChatSession.ticket).selectinload(Ticket.tags),
        )
    )
    session = session_result.scalar_one_or_none()

    system_prompt = ""
    ticket_id = None
    if session and session.ticket:
        ticket = session.ticket
        ticket_id = ticket.id
        tag_names = [t.tag for t in ticket.tags]
        # Konfigurierbaren System-Prompt aus Settings laden
        custom_prompt = await _get_setting(db, "ki_system_prompt")
        system_prompt = _build_system_prompt(ticket, tag_names, custom_prompt)

    # 4. RAG-Kontext laden (aktive Collections)
    # RAG-Query: Kontext-Wrapper und Markdown entfernen für bessere Suche
    rag_query = _clean_rag_query(inhalt)
    rag_context = await _load_rag_context(db, rag_query, collection_ids)
    if rag_context:
        system_prompt += f"\n\n--- Wissensbasis (RAG) ---\n{rag_context}"
    elif collection_ids:
        # RAG war gewünscht, aber keine Ergebnisse → abbrechen
        error_msg = KINachricht(
            verlauf_id=verlauf.id,
            rolle="ki",
            inhalt_markdown="**Keine Informationen aus dem RAG ermittelt.**\n\nDie Wissensbasis hat zu dieser Anfrage keine relevanten Ergebnisse geliefert.",
        )
        db.add(error_msg)
        verlauf.zuletzt_aktiv = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(supporter_msg)
        await db.refresh(error_msg)
        return _build_response(supporter_msg, error_msg)

    # 5. Chat-History aufbauen
    existing_messages = _ki_nachrichten_to_messages(
        sorted(verlauf.nachrichten, key=lambda n: n.created_at)
    )
    # Neue Supporter-Nachricht hinzufügen
    existing_messages.append({"role": "user", "content": inhalt})

    # 6. LLM aufrufen
    provider_type = connection.get("provider_type", connection.get("type", "openai"))
    endpoint_url = connection.get("endpoint_url", connection.get("endpoint", ""))
    api_key = connection.get("api_key", connection.get("key", ""))
    model_name = connection.get("model_name", connection.get("model", connection.get("name", "unknown")))

    try:
        provider = LLMRouter.create_provider(provider_type, endpoint_url, api_key)
        result = await provider.complete(
            messages=existing_messages,
            model=model_name,
            system_prompt=system_prompt,
        )
        ki_content = result.content
        used_provider = result.provider
        used_model = result.model
    except Exception as e:
        logger.error(f"LLM-Aufruf fehlgeschlagen: {e}")
        ki_content = (
            f"**Fehler bei der KI-Anfrage:**\n\n"
            f"`{type(e).__name__}: {e}`\n\n"
            f"Provider: {provider_type}, Modell: {model_name}"
        )
        used_provider = provider_type
        used_model = model_name

    # 7. KI-Antwort speichern
    ki_msg = KINachricht(
        verlauf_id=verlauf.id,
        rolle="ki",
        inhalt_markdown=ki_content,
    )
    db.add(ki_msg)

    # Verlauf aktualisieren
    verlauf.provider = used_provider
    verlauf.model_used = used_model
    verlauf.zuletzt_aktiv = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(supporter_msg)
    await db.refresh(ki_msg)

    # 8. WebSocket-Broadcast
    if ticket_id:
        await manager.broadcast(f"ticket:{ticket_id}", {
            "type": "ki_nachricht",
            "nachricht": {
                "id": str(ki_msg.id),
                "verlauf_id": str(ki_msg.verlauf_id),
                "rolle": ki_msg.rolle,
                "inhalt_markdown": ki_msg.inhalt_markdown,
                "uebernommen_in_chat": ki_msg.uebernommen_in_chat,
                "created_at": ki_msg.created_at.isoformat(),
            },
        })

    return _build_response(supporter_msg, ki_msg)


@router.patch("/{verlauf_id}/nachrichten/{nachricht_id}/uebernehmen")
async def mark_uebernommen(
    verlauf_id: str,
    nachricht_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """KI-Nachricht als 'in Chat übernommen' markieren."""
    result = await db.execute(
        select(KINachricht).where(
            KINachricht.id == uuid.UUID(nachricht_id),
            KINachricht.verlauf_id == uuid.UUID(verlauf_id),
        )
    )
    nachricht = result.scalar_one_or_none()
    if not nachricht:
        raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")

    nachricht.uebernommen_in_chat = True
    await db.commit()
    await db.refresh(nachricht)

    return {
        "id": str(nachricht.id),
        "uebernommen_in_chat": nachricht.uebernommen_in_chat,
    }


@router.delete("/{verlauf_id}/nachrichten/{nachricht_id}")
async def delete_ki_nachricht(
    verlauf_id: str,
    nachricht_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """KI-Nachricht löschen."""
    result = await db.execute(
        select(KINachricht).where(
            KINachricht.id == uuid.UUID(nachricht_id),
            KINachricht.verlauf_id == uuid.UUID(verlauf_id),
        )
    )
    nachricht = result.scalar_one_or_none()
    if not nachricht:
        raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")

    await db.delete(nachricht)
    await db.commit()
    return {"status": "ok"}


# ──────────────────────────────────────────────
# Hilfsfunktionen
# ──────────────────────────────────────────────

def _build_response(supporter_msg: KINachricht, ki_msg: KINachricht) -> dict:
    """Antwort-Objekt mit beiden Nachrichten bauen."""
    return {
        "supporter_nachricht": {
            "id": str(supporter_msg.id),
            "verlauf_id": str(supporter_msg.verlauf_id),
            "rolle": supporter_msg.rolle,
            "inhalt_markdown": supporter_msg.inhalt_markdown,
            "uebernommen_in_chat": supporter_msg.uebernommen_in_chat,
            "created_at": supporter_msg.created_at,
        },
        "ki_nachricht": {
            "id": str(ki_msg.id),
            "verlauf_id": str(ki_msg.verlauf_id),
            "rolle": ki_msg.rolle,
            "inhalt_markdown": ki_msg.inhalt_markdown,
            "uebernommen_in_chat": ki_msg.uebernommen_in_chat,
            "created_at": ki_msg.created_at,
        },
    }


async def _load_rag_context(
    db: AsyncSession, query: str, request_collections: list[str] | None = None
) -> str:
    """RAG-Kontext aus Collections laden.

    Priorisierung:
    1. request_collections (pro Anfrage vom Supporter gewählt)
    2. Fallback: rag_active_collections aus Settings
    """
    from app.config import settings
    from app.models.mcp_server_registry import MCPServerRegistry

    # Collections bestimmen: Request > Settings
    active_collections = request_collections
    if not active_collections:
        active_collections_str = await _get_setting(db, "rag_active_collections")
        if not active_collections_str:
            return ""
        try:
            active_collections = json.loads(active_collections_str)
        except (json.JSONDecodeError, TypeError):
            return ""

    if not active_collections:
        return ""

    # RAG-Server finden
    result = await db.execute(
        select(MCPServerRegistry).where(
            MCPServerRegistry.is_rag == True,
            MCPServerRegistry.is_active == True,
        )
    )
    rag_server = result.scalar_one_or_none()
    if not rag_server:
        return ""

    # RAG-Server abfragen
    tool_name = rag_server.thoster_tool_name or rag_server.name
    docker_name = tool_name.replace("-", "").replace(".", "")
    candidate_urls = [
        f"http://{docker_name}-backend-1:8000/api/v1/search",
        f"http://{tool_name.replace('.', '-')}.{settings.server_domain}/api/v1/search",
    ]
    if rag_server.url:
        base = rag_server.url.rstrip("/")
        candidate_urls.append(f"{base}/search")

    for url in candidate_urls:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json={
                    "query": query,
                    "collections": active_collections,
                    "top_k": 10,
                    "mode": "hybrid",
                })
                if resp.status_code == 200:
                    data = resp.json()
                    results = data if isinstance(data, list) else data.get("results", [])
                    if results:
                        # Alle Chunks sammeln mit Score
                        all_chunks: list[tuple[float, str]] = []
                        for r in results:
                            source = r.get("original_filename", r.get("source", ""))
                            # Direkte text/content Felder (flaches Format)
                            text = r.get("text", r.get("content", ""))
                            if text:
                                score = r.get("relevance_score", r.get("score", 0))
                                entry = text
                                if source:
                                    entry += f"\n(Quelle: {source})"
                                all_chunks.append((score, entry))
                            # Verschachtelte chunks (ams-rag Format)
                            for chunk in r.get("chunks", []):
                                ctext = chunk.get("content", chunk.get("text", ""))
                                if ctext:
                                    cscore = chunk.get("score", r.get("relevance_score", 0))
                                    entry = ctext
                                    if source:
                                        entry += f"\n(Quelle: {source})"
                                    all_chunks.append((cscore, entry))
                        # Nach Score sortieren und Top 8 nehmen
                        all_chunks.sort(key=lambda x: x[0], reverse=True)
                        best = [text for _, text in all_chunks[:8]]
                        return "\n\n---\n\n".join(best)
        except Exception as e:
            logger.debug(f"RAG-Suche fehlgeschlagen ({url}): {e}")
            continue

    return ""
