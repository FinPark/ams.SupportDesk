"""Proxy für ams-connections (THoster Provider-Registry)."""

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_supporter
from app.models.supporter import Supporter
from app.services.connections_client import get_connections, get_connection

router = APIRouter(prefix="/api/v1/connections", tags=["connections"])


@router.get("")
async def list_connections(_: Supporter = Depends(get_current_supporter)):
    return await get_connections()


@router.get("/{connection_id}")
async def get_connection_detail(
    connection_id: str,
    _: Supporter = Depends(get_current_supporter),
):
    conn = await get_connection(connection_id)
    if conn is None:
        return {"error": "Connection nicht gefunden"}
    return conn
