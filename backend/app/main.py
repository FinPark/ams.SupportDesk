"""ams.SupportDesk Backend – FastAPI Application."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ams_thoster import ThosterClient
from ams_thoster.routes import thoster_routes

from app.database import Base, engine
from app.models import (
    Supporter, Kunde, Ticket, TicketTag,
    ChatSession, Nachricht, KIRechercheVerlauf,
    KINachricht, Bewertung,
    Template, PhasenText, MCPServerRegistry, AppSetting,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB-Tabellen erstellen (idempotent)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Beim THoster registrieren (best-effort, im Hintergrund)
    asyncio.create_task(_register_at_thoster())

    yield

    await engine.dispose()


async def _register_at_thoster():
    """Auto-Registrierung beim THoster via SDK (best-effort, mit Retry)."""
    for attempt in range(3):
        try:
            thoster = ThosterClient(tool_name="ams-supportdesk")
            thoster.register(
                description="KI-gestuetztes Support-Tool – Chat statt Telefon & E-Mail",
                developer="Andre Finken",
                developer_email="a.Finken@ams-erp.com",
                openapi_path="/api/openapi.json",
                docker_project="amssupportdesk",
                health_check_url="http://amssupportdesk-frontend-1:80",
                email_if_down=True,
                all_users=True,
                tech_stack="React/Chakra UI + FastAPI + PostgreSQL + Redis + FastMCP",
                version="1.0.0",
            )
            logger.info("THoster-Registrierung erfolgreich")
            return
        except Exception as e:
            logger.debug(f"THoster-Registrierung Versuch {attempt + 1}/3: {e}")
            if attempt < 2:
                await asyncio.sleep(5)

    logger.warning("THoster-Registrierung fehlgeschlagen nach 3 Versuchen")


app = FastAPI(
    title="ams.SupportDesk API",
    description="KI-gestuetztes Support-Tool",
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

# --- THoster Pflicht-Endpoints (via SDK) ---

_thoster_router = thoster_routes(
    name="ams-supportdesk",
    description="KI-gestuetztes Support-Tool – Chat statt Telefon & E-Mail",
    developer="Andre Finken",
    developer_email="a.Finken@ams-erp.com",
    openapi_path="/api/openapi.json",
    docker_project="amssupportdesk",
    health_check_url="http://amssupportdesk-frontend-1:80",
    email_if_down=True,
    all_users=True,
    extra_fields={
        "tech_stack": "React/Chakra UI + FastAPI + PostgreSQL + Redis + FastMCP",
        "version": "1.0.0",
    },
)
app.include_router(_thoster_router)
# Traefik routet /api/* ans Backend — /registered braucht auch /api/registered Alias
app.include_router(_thoster_router, prefix="/api")


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
from app.routers.ki_recherche import router as ki_recherche_router
from app.routers.statistik import router as statistik_router
from app.routers.help import router as help_router, router_compat as help_router_compat

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
app.include_router(ki_recherche_router)
app.include_router(statistik_router)
app.include_router(help_router)
app.include_router(help_router_compat)
