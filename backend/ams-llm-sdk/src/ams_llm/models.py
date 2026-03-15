"""Datenmodelle fuer ams.Connections Verbindungen."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Capabilities:
    vision: bool = False
    tool_use: bool = False
    web_search: bool = False
    extended_thinking: bool = False
    code_execution: bool = False

    @classmethod
    def from_dict(cls, data: dict) -> Capabilities:
        return cls(
            vision=data.get("vision", False),
            tool_use=data.get("tool_use", False),
            web_search=data.get("web_search", False),
            extended_thinking=data.get("extended_thinking", False),
            code_execution=data.get("code_execution", False),
        )


@dataclass
class Connection:
    """Eine LLM-Verbindung aus ams.Connections."""

    id: str
    name: str
    provider_type: str
    endpoint_url: str
    model_name: str
    is_active: bool = True
    security_level: str = "internal"
    context_window: int = 4096
    capabilities: Capabilities = field(default_factory=Capabilities)
    has_api_key: bool = False
    cost_per_1k_input: float | None = None
    cost_per_1k_output: float | None = None

    @classmethod
    def from_dict(cls, data: dict) -> Connection:
        caps = data.get("capabilities") or {}
        return cls(
            id=data["id"],
            name=data["name"],
            provider_type=data["provider_type"],
            endpoint_url=data["endpoint_url"],
            model_name=data["model_name"],
            is_active=data.get("is_active", True),
            security_level=data.get("security_level", "internal"),
            context_window=data.get("context_window", 4096),
            capabilities=Capabilities.from_dict(caps) if isinstance(caps, dict) else Capabilities(),
            has_api_key=data.get("has_api_key", False),
            cost_per_1k_input=data.get("cost_per_1k_input"),
            cost_per_1k_output=data.get("cost_per_1k_output"),
        )
