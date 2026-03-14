"""ams.SupportDesk Backend – FastAPI Application."""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import (
    Supporter, Kunde, Ticket, TicketTag,
    ChatSession, Nachricht, KIRechercheVerlauf,
    KINachricht, Bewertung,
    Template, PhasenText, MCPServerRegistry, AppSetting,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB-Tabellen erstellen (idempotent)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Beim THoster registrieren
    await _register_at_thoster()

    yield

    await engine.dispose()


async def _register_at_thoster():
    """Auto-Registrierung beim THoster (best-effort, mit Retry)."""
    import asyncio
    import logging

    logger = logging.getLogger(__name__)
    payload = {
        "name": "ams-supportdesk",
        "description": "KI-gestütztes Support-Tool – Chat statt Telefon & E-Mail",
        "developer": "André Finken",
        "developer_email": "a.Finken@ams-erp.com",
        "openapi_path": "/api/openapi.json",
        "docker_project": "amssupportdesk",
        "health_check_url": "http://amssupportdesk-frontend-1:80",
        "email_if_down": True,
        "all_users": True,
        "tech_stack": "React/Chakra UI + FastAPI + PostgreSQL + Redis + FastMCP",
        "version": "1.0.0",
    }

    register_urls = [
        "http://thoster-backend:8001/api/v1/tools/register",
        f"http://{settings.server_domain}/api/v1/tools/register",
    ]

    for attempt in range(3):
        for url in register_urls:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code < 400:
                        logger.info(f"THoster-Registrierung erfolgreich via {url}")
                        return
                    logger.warning(f"THoster-Registrierung fehlgeschlagen ({url}): HTTP {resp.status_code}")
            except Exception as e:
                logger.debug(f"THoster nicht erreichbar ({url}): {e}")
                continue

        if attempt < 2:
            logger.info(f"THoster-Registrierung: Retry in 5s (Versuch {attempt + 2}/3)")
            await asyncio.sleep(5)

    logger.warning("THoster-Registrierung fehlgeschlagen nach 3 Versuchen")


app = FastAPI(
    title="ams.SupportDesk API",
    description="KI-gestütztes Support-Tool",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pflicht-Endpoints (THoster-Standard) ---

@app.get("/registered")
@app.get("/api/registered")
async def get_registration():
    return {
        "name": "ams-supportdesk",
        "description": "KI-gestütztes Support-Tool – Chat statt Telefon & E-Mail",
        "developer": "André Finken",
        "developer_email": "a.Finken@ams-erp.com",
        "openapi_path": "/api/openapi.json",
        "docker_project": "amssupportdesk",
        "health_check_url": "http://amssupportdesk-frontend-1:80",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# --- Router einbinden ---

from app.middleware.auth import router as auth_router
from app.routers.kunden import router as kunden_router
from app.routers.kunden_portal import router as kunden_portal_router
from app.routers.tickets import router as tickets_router
from app.routers.tags import router as tags_router
from app.routers.chat_sessions import router as chat_sessions_router
from app.routers.nachrichten import router as nachrichten_router
from app.routers.eingangskorb import router as eingangskorb_router
from app.routers.connections import router as connections_router
from app.routers.ws import router as ws_router
from app.routers.admin import router as admin_router

app.include_router(auth_router)
app.include_router(kunden_router)
app.include_router(kunden_portal_router)
app.include_router(tickets_router)
app.include_router(tags_router)
app.include_router(chat_sessions_router)
app.include_router(nachrichten_router)
app.include_router(eingangskorb_router)
app.include_router(connections_router)
app.include_router(ws_router)
app.include_router(admin_router)
