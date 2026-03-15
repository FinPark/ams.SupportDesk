"""LLMClient — Hauptklasse fuer den Zugriff auf ams.Connections."""

from __future__ import annotations

import os
import re
from typing import Any, Iterator

import httpx
from ams_thoster import ThosterClient

from ams_llm.models import Connection

# Provider-spezifische Chat-Pfade
CHAT_PATHS: dict[str, str] = {
    "openai": "/chat/completions",
    "vllm": "/chat/completions",
    "aiva": "/chat/completions",
    "lmstudio": "/chat/completions",
    "mistral": "/chat/completions",
    "google": "/chat/completions",
    "custom": "/chat/completions",
    "ollama": "/v1/chat/completions",
    "anthropic": "/messages",
}

_INTERNAL_PATTERNS = [
    re.compile(r"^https?://192\.168\."),
    re.compile(r"^https?://10\."),
    re.compile(r"^https?://172\.(1[6-9]|2[0-9]|3[01])\."),
    re.compile(r"\.local(/|:|$)"),
    re.compile(r"\.internal(/|:|$)"),
    re.compile(r"host\.docker\.internal"),
]


def _is_internal(url: str) -> bool:
    """Prueft ob eine URL auf einen internen Host zeigt."""
    return any(p.search(url) for p in _INTERNAL_PATTERNS)


class LLMClient:
    """Client fuer LLM-Zugriffe ueber ams.Connections.

    Beispiel — einfachster Aufruf:
        llm = LLMClient(tool_name="mein-tool")
        antwort = llm.chat("Hallo!")

    Beispiel — mit Verbindungsauswahl:
        llm = LLMClient(tool_name="mein-tool")
        conn = llm.match(capability="vision")
        antwort = llm.chat("Beschreibe das Bild.", connection=conn)

    Beispiel — Streaming:
        for chunk in llm.stream("Erzaehle eine Geschichte."):
            print(chunk, end="", flush=True)
    """

    def __init__(
        self,
        tool_name: str = "",
        base_url: str | None = None,
        default_provider: str | None = None,
        default_capability: str | None = None,
    ):
        """
        Args:
            tool_name: Name des aufrufenden Tools (fuer Usage-Tracking).
            base_url: Basis-URL von ams.Connections.
                      Default: Per THoster Service Discovery ermittelt.
            default_provider: Standard-Provider fuer match() (z.B. "openai", "ollama").
            default_capability: Standard-Capability fuer match() (z.B. "vision", "tool_use").
        """
        self.tool_name = tool_name
        self.base_url = (
            base_url
            or os.getenv("AMS_CONNECTIONS_URL")
            or self._discover_url()
        ).rstrip("/")
        self.api_base = f"{self.base_url}/api/v1"
        self.default_provider = default_provider
        self.default_capability = default_capability
        self._key_cache: dict[str, str] = {}

    @staticmethod
    def _discover_url() -> str:
        """Base-URL von ams.Connections per THoster Service Discovery ermitteln."""
        try:
            thoster = ThosterClient()
            info = thoster.discover("ams-connections")
            return info.url
        except Exception:
            return "http://ams-connections.192.168.0.52.sslip.io"

    # ------------------------------------------------------------------
    # Verbindungen
    # ------------------------------------------------------------------

    def list_connections(self, active_only: bool = True) -> list[Connection]:
        """Alle Verbindungen abrufen."""
        path = "/connections" if active_only else "/connections/all"
        data = self._get(path)
        return [Connection.from_dict(c) for c in data]

    def get_connection(self, connection_id: str) -> Connection:
        """Eine bestimmte Verbindung abrufen."""
        data = self._get(f"/connections/{connection_id}")
        return Connection.from_dict(data)

    def match(
        self,
        provider: str | None = None,
        capability: str | None = None,
        model: str | None = None,
        security: str | None = None,
    ) -> Connection:
        """Beste passende Verbindung finden.

        Args:
            provider: z.B. "openai", "ollama", "aiva"
            capability: z.B. "vision", "tool_use", "web_search"
            model: Modellname oder Teilstring, z.B. "gpt-4", "qwen"
            security: "internal" oder "external"

        Raises:
            LookupError: Wenn keine passende Verbindung gefunden wird.
        """
        params: dict[str, str] = {}
        if self.tool_name:
            params["tool_name"] = self.tool_name
        if provider or self.default_provider:
            params["provider"] = provider or self.default_provider  # type: ignore
        if capability or self.default_capability:
            params["capability"] = capability or self.default_capability  # type: ignore
        if model:
            params["model"] = model
        if security:
            params["security"] = security

        # Ohne Filter: erste aktive Verbindung zurueckgeben
        if len(params) <= 1:  # nur tool_name, kein echter Filter
            conns = self.list_connections(active_only=True)
            if not conns:
                raise LookupError("Keine aktive Verbindung gefunden.")
            return conns[0]

        resp = self._request("GET", "/connections/match", params=params)
        if resp.status_code == 404:
            raise LookupError("Keine passende Verbindung gefunden.")
        resp.raise_for_status()
        return Connection.from_dict(resp.json())

    def by_provider(self, provider: str) -> list[Connection]:
        """Alle Verbindungen eines Providers."""
        data = self._get(f"/connections/by-provider/{provider}")
        return [Connection.from_dict(c) for c in data]

    def by_capability(self, capability: str) -> list[Connection]:
        """Alle Verbindungen mit einer bestimmten Capability."""
        data = self._get(f"/connections/by-capability/{capability}")
        return [Connection.from_dict(c) for c in data]

    # ------------------------------------------------------------------
    # API-Key
    # ------------------------------------------------------------------

    def get_api_key(self, connection_id: str) -> str:
        """API-Key einer Verbindung abrufen (wird gecacht pro Session).

        Raises:
            RuntimeError: Wenn der Key nicht abgerufen werden kann.
        """
        if connection_id in self._key_cache:
            return self._key_cache[connection_id]

        params: dict[str, str] = {}
        if self.tool_name:
            params["tool_name"] = self.tool_name

        resp = self._request("GET", f"/connections/{connection_id}/key", params=params)
        if resp.status_code != 200:
            raise RuntimeError(
                f"API-Key konnte nicht abgerufen werden (HTTP {resp.status_code}). "
                "Ist der Zugriff aus dem internen Netzwerk?"
            )
        key = resp.json().get("api_key", "")
        self._key_cache[connection_id] = key
        return key

    def clear_key_cache(self) -> None:
        """Key-Cache leeren (z.B. bei Token-Rotation)."""
        self._key_cache.clear()

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------

    def chat(
        self,
        message: str | list[dict[str, Any]],
        connection: Connection | None = None,
        **kwargs: Any,
    ) -> str:
        """Sende eine Chat-Nachricht und erhalte die Antwort als String.

        Args:
            message: Entweder ein einfacher String oder eine messages-Liste.
            connection: Optionale Verbindung. Wenn nicht angegeben, wird match() verwendet.
            **kwargs: Zusaetzliche Parameter fuer den LLM-Request (temperature, max_tokens, ...).

        Returns:
            Die Antwort des LLMs als String.
        """
        conn = connection or self.match()
        messages = self._to_messages(message)
        payload = self._build_payload(conn, messages, stream=False, **kwargs)
        headers = self._build_headers(conn)
        chat_url = self.build_chat_url(conn)

        with self._chat_client(chat_url) as client:
            resp = client.post(chat_url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        return self._extract_content(conn.provider_type, data)

    def stream(
        self,
        message: str | list[dict[str, Any]],
        connection: Connection | None = None,
        **kwargs: Any,
    ) -> Iterator[str]:
        """Sende eine Chat-Nachricht und streame die Antwort Token fuer Token.

        Args:
            message: Entweder ein einfacher String oder eine messages-Liste.
            connection: Optionale Verbindung.
            **kwargs: Zusaetzliche Parameter fuer den LLM-Request.

        Yields:
            Einzelne Text-Chunks der Antwort.
        """
        import json

        conn = connection or self.match()
        messages = self._to_messages(message)
        payload = self._build_payload(conn, messages, stream=True, **kwargs)
        headers = self._build_headers(conn)
        chat_url = self.build_chat_url(conn)

        with self._chat_client(chat_url) as client:
            with client.stream("POST", chat_url, json=payload, headers=headers) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    text = self._extract_stream_content(conn.provider_type, chunk)
                    if text:
                        yield text

    # ------------------------------------------------------------------
    # URL- und Header-Builder (oeffentlich, falls Tools sie einzeln brauchen)
    # ------------------------------------------------------------------

    def build_chat_url(self, connection: Connection) -> str:
        """Chat-Completions-URL fuer eine Verbindung zusammenbauen."""
        path = CHAT_PATHS.get(connection.provider_type, "/chat/completions")
        return connection.endpoint_url.rstrip("/") + path

    def build_headers(self, connection: Connection) -> dict[str, str]:
        """HTTP-Header fuer eine Verbindung bauen (inkl. API-Key-Abruf)."""
        return self._build_headers(connection)

    # ------------------------------------------------------------------
    # Private Helfer
    # ------------------------------------------------------------------

    def _get(self, path: str, params: dict | None = None) -> Any:
        resp = self._request("GET", path, params=params)
        resp.raise_for_status()
        return resp.json()

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        url = f"{self.api_base}{path}"
        with httpx.Client(timeout=15) as client:
            return client.request(method, url, **kwargs)

    def _build_headers(self, conn: Connection) -> dict[str, str]:
        api_key = self.get_api_key(conn.id) if conn.has_api_key else ""
        if conn.provider_type == "anthropic":
            headers = {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            }
            if api_key:
                headers["x-api-key"] = api_key
            return headers

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    def _build_payload(
        self,
        conn: Connection,
        messages: list[dict[str, Any]],
        stream: bool = False,
        **kwargs: Any,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": conn.model_name,
            "messages": messages,
            "stream": stream,
        }
        payload.update(kwargs)
        return payload

    def _chat_client(self, url: str) -> httpx.Client:
        verify = not _is_internal(url)
        return httpx.Client(timeout=httpx.Timeout(120.0), verify=verify)

    @staticmethod
    def _to_messages(message: str | list[dict[str, Any]]) -> list[dict[str, Any]]:
        if isinstance(message, str):
            return [{"role": "user", "content": message}]
        return message

    @staticmethod
    def _extract_content(provider: str, data: dict) -> str:
        if provider == "anthropic":
            content = data.get("content", [])
            return "".join(c.get("text", "") for c in content if c.get("type") == "text")
        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return ""

    @staticmethod
    def _extract_stream_content(provider: str, chunk: dict) -> str | None:
        if provider == "anthropic":
            if chunk.get("type") == "content_block_delta":
                return chunk.get("delta", {}).get("text", "")
            return None
        choices = chunk.get("choices", [])
        if choices:
            delta = choices[0].get("delta", {})
            return delta.get("content")
        return None
