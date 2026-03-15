"""FastAPI-Router fuer THoster-Pflicht-Endpoints.

Stellt /registered und /api/health automatisch bereit,
sodass Tools diese nicht selbst implementieren muessen.

Beispiel:
    from fastapi import FastAPI
    from ams_thoster.routes import thoster_routes

    app = FastAPI()
    app.include_router(thoster_routes(
        name="mein-tool",
        description="Beschreibung",
        developer="Max Mustermann",
        developer_email="max@example.com",
    ))
"""

from __future__ import annotations

from typing import Any, Callable


def thoster_routes(
    name: str,
    description: str = "",
    developer: str | None = None,
    developer_email: str | None = None,
    openapi_path: str | None = None,
    docker_project: str | None = None,
    health_check_url: str | None = None,
    email_if_down: bool = False,
    all_users: bool = False,
    health_fn: Callable[[], dict[str, str]] | None = None,
    extra_fields: dict[str, Any] | None = None,
) -> Any:
    """Erzeugt einen FastAPI-Router mit /registered und /api/health.

    Args:
        name: Tool-Name (muss mit der THoster-Registrierung uebereinstimmen).
        description: Kurzbeschreibung.
        developer: Name des Entwicklers.
        developer_email: E-Mail des Entwicklers.
        openapi_path: Relativer Pfad zur OpenAPI-Spec.
        docker_project: Docker Compose Project-Name.
        health_check_url: Interne Docker-URL fuer Health-Checks.
        email_if_down: Bei Ausfall E-Mail senden.
        all_users: Tool fuer alle Benutzer sichtbar.
        health_fn: Optionale Funktion die den Health-Status bestimmt.
                   Muss dict mit mindestens {"status": "ok"} zurueckgeben.
                   Wenn None, wird immer {"status": "ok"} zurueckgegeben.
        extra_fields: Zusaetzliche Felder fuer /registered (landen in extra_properties).

    Returns:
        FastAPI APIRouter mit /registered und /api/health Endpoints.
    """
    from fastapi import APIRouter

    router = APIRouter()

    # Metadaten fuer /registered (THoster liest diese bei jedem Health-Check)
    metadata: dict[str, Any] = {
        "name": name,
        "description": description,
    }
    if developer is not None:
        metadata["developer"] = developer
    if developer_email is not None:
        metadata["developer_email"] = developer_email
    if openapi_path is not None:
        metadata["openapi_path"] = openapi_path
    if docker_project is not None:
        metadata["docker_project"] = docker_project
    if health_check_url is not None:
        metadata["health_check_url"] = health_check_url
    metadata["email_if_down"] = email_if_down
    metadata["all_users"] = all_users
    if extra_fields:
        metadata.update(extra_fields)

    @router.get("/registered")
    async def registered() -> dict:
        """Metadaten fuer THoster (wird automatisch bei Health-Checks abgerufen)."""
        return metadata

    @router.get("/api/health")
    async def health() -> dict:
        """Health-Check-Endpoint fuer THoster."""
        if health_fn is not None:
            return health_fn()
        return {"status": "ok"}

    return router
