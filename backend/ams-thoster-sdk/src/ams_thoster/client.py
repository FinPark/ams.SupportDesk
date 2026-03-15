"""ThosterClient — Hauptklasse fuer den Zugriff auf THoster."""

from __future__ import annotations

import os
from typing import Any

import httpx

from ams_thoster.models import ToolInfo, ConnectionInfo, CategoryInfo


class ThosterClient:
    """Client fuer Tool-Registrierung, Service Discovery und Health-Management.

    Beispiel — Registrierung:
        thoster = ThosterClient(tool_name="mein-tool")
        thoster.register(description="Mein Tool", developer="Max")

    Beispiel — Service Discovery:
        info = thoster.discover("anderes-tool")
        print(info.api_address)  # https://anderes-tool.server.de/api

    Beispiel — Email senden:
        thoster.send_email("admin@firma.de", "Betreff", "<p>Inhalt</p>")
    """

    def __init__(
        self,
        tool_name: str = "",
        base_url: str | None = None,
    ):
        """
        Args:
            tool_name: Name des eigenen Tools (wird fuer register/discover verwendet).
            base_url: Basis-URL von THoster.
                      Default: Env THOSTER_URL oder http://192.168.0.52.sslip.io
        """
        self.tool_name = tool_name
        self.base_url = (
            base_url
            or os.getenv("THOSTER_URL")
            or "http://192.168.0.52.sslip.io"
        ).rstrip("/")
        self.api_base = f"{self.base_url}/api/v1"

    # ------------------------------------------------------------------
    # Registrierung
    # ------------------------------------------------------------------

    def register(
        self,
        description: str = "",
        developer: str | None = None,
        developer_email: str | None = None,
        docker_project: str | None = None,
        health_check_url: str | None = None,
        openapi_path: str | None = None,
        email_if_down: bool = False,
        all_users: bool = False,
        **extra: Any,
    ) -> ToolInfo:
        """Tool bei THoster registrieren (oder aktualisieren).

        Felder wie url, api_address, mcp_server_address werden von THoster
        automatisch aus dem Tool-Namen berechnet.

        Args:
            description: Kurzbeschreibung des Tools.
            developer: Name des Entwicklers.
            developer_email: E-Mail des Entwicklers.
            docker_project: Docker Compose Project-Name.
            health_check_url: Interne Docker-URL fuer Health-Checks.
            openapi_path: Relativer Pfad zur OpenAPI-Spec (z.B. "/api/openapi.json").
            email_if_down: Bei Ausfall E-Mail an developer_email senden.
            all_users: Tool fuer alle Benutzer sichtbar.
            **extra: Zusaetzliche Felder landen in extra_properties.

        Returns:
            ToolInfo mit den berechneten URLs.
        """
        payload: dict[str, Any] = {
            "name": self.tool_name,
            "description": description,
        }
        if developer is not None:
            payload["developer"] = developer
        if developer_email is not None:
            payload["developer_email"] = developer_email
        if docker_project is not None:
            payload["docker_project"] = docker_project
        if health_check_url is not None:
            payload["health_check_url"] = health_check_url
        if openapi_path is not None:
            payload["openapi_path"] = openapi_path
        payload["email_if_down"] = email_if_down
        payload["all_users"] = all_users
        payload.update(extra)

        data = self._post("/tools/register", json=payload)
        return ToolInfo.from_dict(data)

    # ------------------------------------------------------------------
    # Service Discovery
    # ------------------------------------------------------------------

    def discover(self, tool_name: str, live_check: bool = False) -> ConnectionInfo:
        """Ein anderes Tool finden (Service Discovery).

        Args:
            tool_name: Name des gesuchten Tools.
            live_check: Wenn True, wird das Tool live angepingt und
                        die OpenAPI-Spec abgerufen (~1-3s statt <50ms).

        Returns:
            ConnectionInfo mit URLs, Health-Status und optional OpenAPI-Spec.
        """
        params: dict[str, str] = {}
        if live_check:
            params["live_check"] = "true"

        data = self._get(f"/tools/{tool_name}/connect", params=params)
        return ConnectionInfo.from_dict(data)

    # ------------------------------------------------------------------
    # Tools auflisten
    # ------------------------------------------------------------------

    def list_tools(
        self,
        visible_only: bool = False,
        category: str | None = None,
    ) -> list[ToolInfo]:
        """Alle registrierten Tools abrufen.

        Args:
            visible_only: Nur Tools mit all_users=True.
            category: Nach Kategorie-Slug filtern.
        """
        params: dict[str, str] = {}
        if visible_only:
            params["visible_only"] = "true"
        if category:
            params["category"] = category

        data = self._get("/tools", params=params)
        return [ToolInfo.from_dict(t) for t in data]

    def get_tool(self, name: str) -> ToolInfo:
        """Details eines bestimmten Tools abrufen."""
        data = self._get(f"/tools/{name}")
        return ToolInfo.from_dict(data)

    # ------------------------------------------------------------------
    # Kategorien
    # ------------------------------------------------------------------

    def list_categories(self, visible_only: bool = False) -> list[CategoryInfo]:
        """Alle Tool-Kategorien abrufen."""
        path = "/categories?visible_only=true" if visible_only else "/categories"
        data = self._get(path)
        return [CategoryInfo.from_dict(c) for c in data]

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    def health_overview(self) -> dict:
        """Health-Uebersicht aller Tools (online/offline, Uptime)."""
        return self._get("/health/overview")

    def health_detail(self, tool_name: str) -> dict:
        """Detaillierter Health-Status eines Tools (24h/7d Uptime, Response-Zeiten)."""
        return self._get(f"/health/{tool_name}")

    # ------------------------------------------------------------------
    # Email
    # ------------------------------------------------------------------

    def send_email(
        self,
        to: str | list[str],
        subject: str,
        body_html: str,
    ) -> dict:
        """E-Mail ueber die THoster Email-API senden.

        Args:
            to: Empfaenger-Adresse(n).
            subject: Betreff.
            body_html: HTML-Body der E-Mail.

        Returns:
            API-Response mit Status.
        """
        recipients = [to] if isinstance(to, str) else to
        return self._post("/email/send", json={
            "to": recipients,
            "subject": subject,
            "body_html": body_html,
        })

    # ------------------------------------------------------------------
    # Private Helfer
    # ------------------------------------------------------------------

    def _get(self, path: str, params: dict | None = None) -> Any:
        resp = self._request("GET", path, params=params)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, **kwargs: Any) -> Any:
        resp = self._request("POST", path, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        url = f"{self.api_base}{path}"
        with httpx.Client(timeout=15) as client:
            return client.request(method, url, **kwargs)
