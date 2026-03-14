"""WebSocket-Endpoints: Ticket-Chat + Eingangskorb."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ws", tags=["websocket"])


@router.websocket("/ticket/{ticket_id}")
async def ws_ticket(websocket: WebSocket, ticket_id: str):
    """WebSocket für Live-Updates eines Tickets."""
    channel = f"ticket:{ticket_id}"
    await manager.connect(channel, websocket)
    try:
        while True:
            # Keep-alive: Client kann Pings senden
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
    except Exception:
        manager.disconnect(channel, websocket)


@router.websocket("/eingangskorb")
async def ws_eingangskorb(websocket: WebSocket):
    """WebSocket für Live-Updates des Eingangskorbs."""
    await manager.connect("eingangskorb", websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect("eingangskorb", websocket)
    except Exception:
        manager.disconnect("eingangskorb", websocket)
