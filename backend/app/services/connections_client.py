"""Connections via ams-llm SDK.

Ersetzt den manuellen HTTP-Client durch das SDK, das Service Discovery,
API-Key-Abruf und Caching automatisch uebernimmt.
"""

import logging
from typing import Optional

from ams_llm import LLMClient, Connection

logger = logging.getLogger(__name__)

_client: LLMClient | None = None


def get_client() -> LLMClient:
    """Singleton LLMClient-Instanz."""
    global _client
    if _client is None:
        _client = LLMClient(tool_name="ams-supportdesk")
        logger.info(f"LLMClient initialisiert: {_client.base_url}")
    return _client


def _conn_to_dict(c: Connection) -> dict:
    """Connection-Objekt in dict konvertieren (fuer API-Kompatibilitaet)."""
    return {
        "id": c.id,
        "name": c.name,
        "provider_type": c.provider_type,
        "endpoint_url": c.endpoint_url,
        "model_name": c.model_name,
        "is_active": c.is_active,
        "security_level": c.security_level,
        "context_window": c.context_window,
        "has_api_key": c.has_api_key,
        "capabilities": {
            "vision": c.capabilities.vision,
            "tool_use": c.capabilities.tool_use,
            "web_search": c.capabilities.web_search,
            "extended_thinking": c.capabilities.extended_thinking,
            "code_execution": c.capabilities.code_execution,
        },
        "cost_per_1k_input": c.cost_per_1k_input,
        "cost_per_1k_output": c.cost_per_1k_output,
    }


async def get_connections() -> list[dict]:
    """Alle aktiven Connections als dict-Liste."""
    try:
        client = get_client()
        return [_conn_to_dict(c) for c in client.list_connections()]
    except Exception as e:
        logger.warning(f"Connections konnten nicht geladen werden: {e}")
        return []


async def get_connection(connection_id: str) -> Optional[dict]:
    """Einzelne Connection als dict."""
    try:
        client = get_client()
        conn = client.get_connection(connection_id)
        return _conn_to_dict(conn)
    except Exception as e:
        logger.debug(f"Connection {connection_id} nicht gefunden: {e}")
        return None
