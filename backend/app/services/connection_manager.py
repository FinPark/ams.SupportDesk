"""WebSocket Connection Manager mit Redis pub/sub."""

import json
import logging
from typing import Optional

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(settings.redis_url)
        return self._redis

    async def connect(self, channel: str, websocket: WebSocket):
        await websocket.accept()
        if channel not in self._connections:
            self._connections[channel] = []
        self._connections[channel].append(websocket)

    def disconnect(self, channel: str, websocket: WebSocket):
        if channel in self._connections:
            self._connections[channel] = [
                ws for ws in self._connections[channel] if ws != websocket
            ]
            if not self._connections[channel]:
                del self._connections[channel]

    async def broadcast(self, channel: str, data: dict):
        """Broadcast an alle lokalen Connections UND via Redis pub/sub."""
        message = json.dumps(data, default=str)

        # Lokale Connections
        if channel in self._connections:
            dead = []
            for ws in self._connections[channel]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(channel, ws)

        # Redis publish für Multi-Instance
        try:
            r = await self._get_redis()
            await r.publish(f"ws:{channel}", message)
        except Exception as e:
            logger.debug(f"Redis publish failed: {e}")

    async def broadcast_eingangskorb(self, data: dict):
        """Broadcast an alle Eingangskorb-Listener."""
        await self.broadcast("eingangskorb", data)


manager = ConnectionManager()
