"""LLM-Router: Abstraktion für verschiedene KI-Provider."""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class CompletionResult:
    content: str
    tokens_in: int = 0
    tokens_out: int = 0
    model: str = ""
    provider: str = ""


class LLMProvider(ABC):
    """Basis-Klasse für LLM-Provider."""

    def __init__(self, endpoint_url: str, api_key: str, provider_type: str):
        self.endpoint_url = endpoint_url.rstrip("/")
        self.api_key = api_key
        self.provider_type = provider_type

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> CompletionResult:
        ...


class OpenAICompatibleProvider(LLMProvider):
    """Provider für OpenAI, Ollama, vLLM, Groq, Mistral etc."""

    async def complete(
        self,
        messages: list[dict],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> CompletionResult:
        # Endpoint kann bereits /v1 enthalten — nicht doppelt anhängen
        base = self.endpoint_url.rstrip("/")
        if base.endswith("/v1"):
            url = f"{base}/chat/completions"
        else:
            url = f"{base}/v1/chat/completions"

        # System-Prompt als erste Nachricht einfügen
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        logger.info(f"LLM-Anfrage an {url} (Modell: {model})")

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        choice = data["choices"][0]
        usage = data.get("usage", {})

        return CompletionResult(
            content=choice["message"]["content"],
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
            model=model,
            provider=self.provider_type,
        )


class AnthropicProvider(LLMProvider):
    """Provider für Anthropic Claude."""

    async def complete(
        self,
        messages: list[dict],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> CompletionResult:
        url = f"{self.endpoint_url}/v1/messages"

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

        # Anthropic: System-Prompt als separates Feld
        # Messages müssen role "user" / "assistant" haben
        anthropic_messages = []
        for msg in messages:
            role = msg["role"]
            if role == "system":
                continue  # wird über system-Feld gehandelt
            anthropic_messages.append({"role": role, "content": msg["content"]})

        payload = {
            "model": model,
            "messages": anthropic_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            payload["system"] = system_prompt

        logger.info(f"LLM-Anfrage an Anthropic (Modell: {model})")

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        content = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                content += block["text"]

        usage = data.get("usage", {})

        return CompletionResult(
            content=content,
            tokens_in=usage.get("input_tokens", 0),
            tokens_out=usage.get("output_tokens", 0),
            model=model,
            provider="anthropic",
        )


class LLMRouter:
    """Factory für LLM-Provider basierend auf Provider-Typ."""

    # Provider-Typen die Anthropic-API nutzen
    ANTHROPIC_PROVIDERS = {"anthropic", "claude"}

    @staticmethod
    def create_provider(
        provider_type: str,
        endpoint_url: str,
        api_key: str,
    ) -> LLMProvider:
        provider_type_lower = provider_type.lower()

        if provider_type_lower in LLMRouter.ANTHROPIC_PROVIDERS:
            return AnthropicProvider(
                endpoint_url=endpoint_url or "https://api.anthropic.com",
                api_key=api_key,
                provider_type=provider_type_lower,
            )

        # Alles andere: OpenAI-kompatibel (OpenAI, Ollama, vLLM, Groq, Mistral)
        return OpenAICompatibleProvider(
            endpoint_url=endpoint_url,
            api_key=api_key,
            provider_type=provider_type_lower,
        )
