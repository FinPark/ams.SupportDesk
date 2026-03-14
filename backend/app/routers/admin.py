"""Admin-Bereich: Templates, Phasen-Texte, MCP-Server, RAG, Settings."""

import logging
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.models.template import Template
from app.models.phasen_text import PhasenText
from app.models.mcp_server_registry import MCPServerRegistry
from app.models.app_setting import AppSetting
from app.services.connections_client import get_connections

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ──────────────────────────────────────────────
# Templates CRUD
# ──────────────────────────────────────────────

@router.get("/templates")
async def list_templates(
    kategorie: str = "",
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle Templates auflisten, optional gefiltert nach Kategorie."""
    stmt = select(Template).order_by(Template.name)
    if kategorie:
        stmt = stmt.where(Template.kategorie == kategorie)
    result = await db.execute(stmt)
    templates = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "beschreibung": t.beschreibung,
            "inhalt": t.inhalt,
            "kategorie": t.kategorie,
            "is_aktiv": t.is_aktiv,
            "usage_count": t.usage_count,
            "created_at": t.created_at,
        }
        for t in templates
    ]


@router.post("/templates")
async def create_template(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Neues Template erstellen."""
    if not body.get("name") or not body.get("inhalt") or not body.get("kategorie"):
        raise HTTPException(status_code=400, detail="name, inhalt und kategorie sind erforderlich")

    template = Template(
        name=body["name"],
        beschreibung=body.get("beschreibung"),
        inhalt=body["inhalt"],
        kategorie=body["kategorie"],
        is_aktiv=body.get("is_aktiv", True),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return {
        "id": str(template.id),
        "name": template.name,
        "beschreibung": template.beschreibung,
        "inhalt": template.inhalt,
        "kategorie": template.kategorie,
        "is_aktiv": template.is_aktiv,
        "usage_count": template.usage_count,
        "created_at": template.created_at,
    }


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Template aktualisieren."""
    result = await db.execute(
        select(Template).where(Template.id == uuid.UUID(template_id))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")

    for field in ("name", "beschreibung", "inhalt", "kategorie", "is_aktiv", "usage_count"):
        if field in body:
            setattr(template, field, body[field])

    await db.commit()
    await db.refresh(template)
    return {
        "id": str(template.id),
        "name": template.name,
        "beschreibung": template.beschreibung,
        "inhalt": template.inhalt,
        "kategorie": template.kategorie,
        "is_aktiv": template.is_aktiv,
        "usage_count": template.usage_count,
        "created_at": template.created_at,
    }


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Template löschen."""
    result = await db.execute(
        select(Template).where(Template.id == uuid.UUID(template_id))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")

    await db.delete(template)
    await db.commit()
    return {"status": "ok"}


# ──────────────────────────────────────────────
# Phasen-Texte CRUD
# ──────────────────────────────────────────────

DEFAULT_PHASEN = [
    {
        "phase": "initial",
        "titel": "Willkommen",
        "inhalt": "Willkommen beim ams.SupportDesk! Wie können wir Ihnen helfen?",
    },
    {
        "phase": "erste_nachricht",
        "titel": "Nachricht eingegangen",
        "inhalt": "Vielen Dank für Ihre Nachricht. Ein Supporter wird sich in Kürze bei Ihnen melden.",
    },
    {
        "phase": "supporter_timeout",
        "titel": "Wartezeit-Hinweis",
        "inhalt": "Entschuldigen Sie die Wartezeit. Ihr Anliegen wird bearbeitet.",
        "timeout_sekunden": 300,
    },
    {
        "phase": "ticket_geschlossen",
        "titel": "Ticket geschlossen",
        "inhalt": "Ihr Ticket wurde geschlossen. Bei weiteren Fragen können Sie jederzeit eine neue Nachricht senden.",
    },
    {
        "phase": "bewertung_anfrage",
        "titel": "Bewertung",
        "inhalt": "Wie zufrieden waren Sie mit unserem Support? Bitte bewerten Sie Ihre Erfahrung.",
    },
]


@router.get("/phasen-texte")
async def list_phasen_texte(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle Phasen-Texte auflisten."""
    result = await db.execute(select(PhasenText).order_by(PhasenText.phase))
    texte = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "phase": t.phase,
            "titel": t.titel,
            "inhalt": t.inhalt,
            "is_aktiv": t.is_aktiv,
            "timeout_sekunden": t.timeout_sekunden,
            "created_at": t.created_at,
        }
        for t in texte
    ]


@router.put("/phasen-texte/{phasen_text_id}")
async def update_phasen_text(
    phasen_text_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Phasen-Text aktualisieren."""
    result = await db.execute(
        select(PhasenText).where(PhasenText.id == uuid.UUID(phasen_text_id))
    )
    phasen_text = result.scalar_one_or_none()
    if not phasen_text:
        raise HTTPException(status_code=404, detail="Phasen-Text nicht gefunden")

    for field in ("titel", "inhalt", "is_aktiv", "timeout_sekunden"):
        if field in body:
            setattr(phasen_text, field, body[field])

    await db.commit()
    await db.refresh(phasen_text)
    return {
        "id": str(phasen_text.id),
        "phase": phasen_text.phase,
        "titel": phasen_text.titel,
        "inhalt": phasen_text.inhalt,
        "is_aktiv": phasen_text.is_aktiv,
        "timeout_sekunden": phasen_text.timeout_sekunden,
        "created_at": phasen_text.created_at,
    }


@router.post("/phasen-texte/seed")
async def seed_phasen_texte(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Standard-Phasen-Texte anlegen (nur wenn sie noch nicht existieren)."""
    created = 0
    for default in DEFAULT_PHASEN:
        result = await db.execute(
            select(PhasenText).where(PhasenText.phase == default["phase"])
        )
        existing = result.scalar_one_or_none()
        if not existing:
            phasen_text = PhasenText(
                phase=default["phase"],
                titel=default["titel"],
                inhalt=default["inhalt"],
                timeout_sekunden=default.get("timeout_sekunden"),
            )
            db.add(phasen_text)
            created += 1

    await db.commit()
    return {"status": "ok", "created": created, "total": len(DEFAULT_PHASEN)}


# ──────────────────────────────────────────────
# Modelle (Proxy zu ams-connections)
# ──────────────────────────────────────────────

@router.get("/modelle")
async def list_modelle(
    _: Supporter = Depends(get_current_supporter),
):
    """KI-Modelle von ams-connections abrufen."""
    connections = await get_connections()
    return connections


# ──────────────────────────────────────────────
# MCP-Server CRUD
# ──────────────────────────────────────────────

@router.get("/mcp-server")
async def list_mcp_servers(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle MCP-Server auflisten mit Health-Status."""
    result = await db.execute(select(MCPServerRegistry).order_by(MCPServerRegistry.name))
    servers = result.scalars().all()

    server_list = []
    for s in servers:
        health = "unknown"
        if s.url and s.is_active:
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.get(s.url.rstrip("/") + "/health")
                    health = "healthy" if resp.status_code < 400 else "unhealthy"
            except Exception:
                health = "unreachable"
        elif not s.is_active:
            health = "disabled"

        server_list.append({
            "id": str(s.id),
            "name": s.name,
            "description": s.description,
            "url": s.url,
            "transport_type": s.transport_type,
            "command": s.command,
            "args": s.args,
            "auth_config": s.auth_config,
            "is_active": s.is_active,
            "is_rag": s.is_rag,
            "thoster_tool_name": s.thoster_tool_name,
            "created_at": s.created_at,
            "health": health,
        })

    return server_list


@router.post("/mcp-server")
async def create_mcp_server(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Neuen MCP-Server registrieren."""
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name ist erforderlich")

    # Prüfen ob Name schon existiert
    result = await db.execute(
        select(MCPServerRegistry).where(MCPServerRegistry.name == body["name"])
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="MCP-Server mit diesem Namen existiert bereits")

    server = MCPServerRegistry(
        name=body["name"],
        description=body.get("description"),
        url=body.get("url", ""),
        transport_type=body.get("transport_type", "streamable_http"),
        command=body.get("command"),
        args=body.get("args"),
        auth_config=body.get("auth_config", {}),
        is_active=body.get("is_active", True),
        is_rag=body.get("is_rag", False),
        thoster_tool_name=body.get("thoster_tool_name"),
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)
    return {
        "id": str(server.id),
        "name": server.name,
        "description": server.description,
        "url": server.url,
        "transport_type": server.transport_type,
        "command": server.command,
        "args": server.args,
        "auth_config": server.auth_config,
        "is_active": server.is_active,
        "is_rag": server.is_rag,
        "thoster_tool_name": server.thoster_tool_name,
        "created_at": server.created_at,
    }


@router.put("/mcp-server/{server_id}")
async def update_mcp_server(
    server_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """MCP-Server aktualisieren."""
    result = await db.execute(
        select(MCPServerRegistry).where(MCPServerRegistry.id == uuid.UUID(server_id))
    )
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP-Server nicht gefunden")

    for field in (
        "name", "description", "url", "transport_type", "command",
        "args", "auth_config", "is_active", "is_rag", "thoster_tool_name",
    ):
        if field in body:
            setattr(server, field, body[field])

    await db.commit()
    await db.refresh(server)
    return {
        "id": str(server.id),
        "name": server.name,
        "description": server.description,
        "url": server.url,
        "transport_type": server.transport_type,
        "command": server.command,
        "args": server.args,
        "auth_config": server.auth_config,
        "is_active": server.is_active,
        "is_rag": server.is_rag,
        "thoster_tool_name": server.thoster_tool_name,
        "created_at": server.created_at,
    }


@router.delete("/mcp-server/{server_id}")
async def delete_mcp_server(
    server_id: str,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """MCP-Server löschen."""
    result = await db.execute(
        select(MCPServerRegistry).where(MCPServerRegistry.id == uuid.UUID(server_id))
    )
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP-Server nicht gefunden")

    await db.delete(server)
    await db.commit()
    return {"status": "ok"}


@router.post("/mcp-server/sync")
async def sync_mcp_servers(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """MCP-Server vom THoster synchronisieren.

    Fragt beim THoster nach registrierten Tools mit MCP-Endpoints
    und erstellt/aktualisiert lokale Registry-Einträge.
    """
    urls = [
        "http://thoster-backend:8001/api/v1/tools",
        f"http://{settings.server_domain}/api/v1/tools",
    ]

    tools = []
    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    tools = resp.json()
                    break
        except Exception as e:
            logger.debug(f"THoster nicht erreichbar ({url}): {e}")
            continue

    if not tools:
        return {"status": "warning", "message": "THoster nicht erreichbar", "synced": 0}

    synced = 0
    for tool in tools:
        tool_name = tool.get("name", "")
        docker_project = tool.get("docker_project", "")
        if not tool_name or not docker_project:
            continue

        # MCP-URL aus Docker-Projekt-Konvention ableiten:
        # http://{docker_project}-mcp-server-1:8080/mcp
        mcp_url = f"http://{docker_project}-mcp-server-1:8080/mcp"

        # Health-Check: MCP-Server erreichbar?
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(mcp_url.rstrip("/mcp"))
                if resp.status_code >= 500:
                    continue
        except Exception:
            # MCP-Server nicht erreichbar — trotzdem registrieren
            pass

        # Prüfen ob bereits vorhanden
        result = await db.execute(
            select(MCPServerRegistry).where(MCPServerRegistry.thoster_tool_name == tool_name)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.url = mcp_url
            existing.description = tool.get("description", existing.description)
        else:
            server = MCPServerRegistry(
                name=tool_name,
                description=tool.get("description"),
                url=mcp_url,
                transport_type="streamable_http",
                is_active=True,
                thoster_tool_name=tool_name,
            )
            db.add(server)

        synced += 1

    await db.commit()
    return {"status": "ok", "synced": synced, "total_tools": len(tools)}


# ──────────────────────────────────────────────
# RAG-Collections
# ──────────────────────────────────────────────

@router.get("/rag-collections")
async def list_rag_collections(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """RAG-Collections vom RAG-Server abrufen.

    Sucht nach einem MCP-Server mit is_rag=True und
    fragt dessen /collections Endpoint ab.
    """
    result = await db.execute(
        select(MCPServerRegistry).where(
            MCPServerRegistry.is_rag == True,
            MCPServerRegistry.is_active == True,
        )
    )
    rag_server = result.scalar_one_or_none()

    if not rag_server:
        return {"collections": [], "message": "Kein RAG-Server konfiguriert"}

    if not rag_server.url:
        return {"collections": [], "message": "RAG-Server hat keine URL"}

    base_url = rag_server.url.rstrip("/")
    collections_url = f"{base_url}/collections"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(collections_url)
            if resp.status_code == 200:
                data = resp.json()
                # Unterstütze sowohl Liste als auch Dict-Antwort
                if isinstance(data, list):
                    return {"collections": data, "rag_server": rag_server.name}
                elif isinstance(data, dict) and "collections" in data:
                    return {"collections": data["collections"], "rag_server": rag_server.name}
                else:
                    return {"collections": data, "rag_server": rag_server.name}
            else:
                return {
                    "collections": [],
                    "message": f"RAG-Server Fehler: HTTP {resp.status_code}",
                }
    except Exception as e:
        logger.warning(f"RAG-Server nicht erreichbar ({collections_url}): {e}")
        return {"collections": [], "message": f"RAG-Server nicht erreichbar: {e}"}


# ──────────────────────────────────────────────
# App-Settings
# ──────────────────────────────────────────────

@router.get("/settings")
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Alle App-Settings auflisten."""
    result = await db.execute(select(AppSetting).order_by(AppSetting.key))
    settings_list = result.scalars().all()
    return [{"key": s.key, "value": s.value} for s in settings_list]


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Supporter = Depends(get_current_supporter),
):
    """Setting erstellen oder aktualisieren."""
    if "value" not in body:
        raise HTTPException(status_code=400, detail="value ist erforderlich")

    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = body["value"]
    else:
        setting = AppSetting(key=key, value=body["value"])
        db.add(setting)

    await db.commit()
    await db.refresh(setting)
    return {"key": setting.key, "value": setting.value}
