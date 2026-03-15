"""Datenmodelle fuer THoster SDK."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ToolInfo:
    """Ein registriertes Tool in THoster."""

    name: str
    description: str
    url: str
    developer: str | None = None
    developer_email: str | None = None
    api_address: str | None = None
    mcp_server_address: str | None = None
    openapi_url: str | None = None
    openapi_path: str | None = None
    icon: str | None = None
    docker_project: str | None = None
    health_check_url: str | None = None
    custom_url: str | None = None
    custom_api_url: str | None = None
    custom_mcp_url: str | None = None
    email_if_down: bool = False
    all_users: bool = False
    is_manual: bool = False
    is_healthy: bool | None = None
    last_seen: str | None = None
    extra_properties: dict | None = None
    categories: list[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> ToolInfo:
        return cls(
            name=data["name"],
            description=data.get("description", ""),
            url=data.get("url", ""),
            developer=data.get("developer"),
            developer_email=data.get("developer_email"),
            api_address=data.get("api_address"),
            mcp_server_address=data.get("mcp_server_address"),
            openapi_url=data.get("openapi_url"),
            openapi_path=data.get("openapi_path"),
            icon=data.get("icon"),
            docker_project=data.get("docker_project"),
            health_check_url=data.get("health_check_url"),
            custom_url=data.get("custom_url"),
            custom_api_url=data.get("custom_api_url"),
            custom_mcp_url=data.get("custom_mcp_url"),
            email_if_down=data.get("email_if_down", False),
            all_users=data.get("all_users", False),
            is_manual=data.get("is_manual", False),
            is_healthy=data.get("is_healthy"),
            last_seen=data.get("last_seen"),
            extra_properties=data.get("extra_properties"),
            categories=data.get("categories", []),
        )


@dataclass
class ConnectionInfo:
    """Service-Discovery-Ergebnis fuer ein Tool."""

    name: str
    description: str
    url: str
    api_address: str | None = None
    mcp_server_address: str | None = None
    openapi_url: str | None = None
    is_healthy: bool | None = None
    openapi_spec: dict | None = None

    @classmethod
    def from_dict(cls, data: dict) -> ConnectionInfo:
        return cls(
            name=data["name"],
            description=data.get("description", ""),
            url=data.get("url", ""),
            api_address=data.get("api_address"),
            mcp_server_address=data.get("mcp_server_address"),
            openapi_url=data.get("openapi_url"),
            is_healthy=data.get("is_healthy"),
            openapi_spec=data.get("openapi_spec"),
        )


@dataclass
class CategoryInfo:
    """Eine Tool-Kategorie in THoster."""

    id: int
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    visible: bool = True
    sort_order: int = 0
    tool_count: int = 0

    @classmethod
    def from_dict(cls, data: dict) -> CategoryInfo:
        return cls(
            id=data["id"],
            name=data["name"],
            slug=data["slug"],
            description=data.get("description"),
            icon=data.get("icon"),
            visible=data.get("visible", True),
            sort_order=data.get("sort_order", 0),
            tool_count=data.get("tool_count", 0),
        )
