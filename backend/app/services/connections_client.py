"""HTTP-Client für ams-connections (THoster Provider-Registry)."""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def get_connections() -> list[dict]:
    """Verfügbare KI-Connections von ams-connections abrufen."""
    urls = [
        "http://amsconnections-backend-1:8000/api/v1/connections",
        f"http://ams-connections.{settings.server_domain}/api/v1/connections",
    ]

    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.debug(f"ams-connections nicht erreichbar ({url}): {e}")
            continue

    return []


async def get_connection(connection_id: str) -> Optional[dict]:
    """Einzelne Connection abrufen."""
    urls = [
        f"http://amsconnections-backend-1:8000/api/v1/connections/{connection_id}",
        f"http://ams-connections.{settings.server_domain}/api/v1/connections/{connection_id}",
    ]

    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.debug(f"ams-connections nicht erreichbar ({url}): {e}")
            continue

    return None
