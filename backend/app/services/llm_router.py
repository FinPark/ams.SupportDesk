"""LLM-Router via ams-llm SDK.

Nutzt das SDK fuer Connection-Management, URL-Aufbau und Auth-Header.
Eigener httpx-Call fuer System-Prompt + Message-History Support.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import httpx

from app.services.connections_client import get_client

logger = logging.getLogger(__name__)

ANTHROPIC_PROVIDERS = {"anthropic", "claude"}


@dataclass
class CompletionResult:
    content: str
    tokens_in: int = 0
    tokens_out: int = 0
    model: str = ""
    provider: str = ""


async def complete(
    connection_dict: dict,
    messages: list[dict],
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> CompletionResult:
    """LLM-Completion mit SDK-basierter URL/Auth und eigenem httpx-Call.

    Args:
        connection_dict: Connection als dict (aus connections_client).
        messages: Chat-History als OpenAI-Format messages.
        system_prompt: Optionaler System-Prompt.
        temperature: Sampling-Temperatur.
        max_tokens: Max. Ausgabe-Tokens.
    """
    client = get_client()

    # SDK Connection-Objekt holen fuer URL/Header-Aufbau
    conn_id = connection_dict.get("id", "")
    try:
        sdk_conn = client.get_connection(conn_id)
    except Exception:
        # Fallback: erste verfuegbare Connection
        sdk_conn = client.match()

    chat_url = client.build_chat_url(sdk_conn)
    headers = client.build_headers(sdk_conn)

    provider_type = sdk_conn.provider_type.lower()
    model_name = sdk_conn.model_name

    logger.info(f"LLM-Anfrage an {chat_url} (Modell: {model_name}, Provider: {provider_type})")

    if provider_type in ANTHROPIC_PROVIDERS:
        payload = _build_anthropic_payload(messages, model_name, system_prompt, temperature, max_tokens)
    else:
        payload = _build_openai_payload(messages, model_name, system_prompt, temperature, max_tokens)

    async with httpx.AsyncClient(timeout=120, verify=False) as http:
        resp = await http.post(chat_url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if provider_type in ANTHROPIC_PROVIDERS:
        return _parse_anthropic_response(data, model_name, provider_type)
    else:
        return _parse_openai_response(data, model_name, provider_type)


def _build_openai_payload(
    messages: list[dict], model: str, system_prompt: Optional[str],
    temperature: float, max_tokens: int,
) -> dict:
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    return {
        "model": model,
        "messages": full_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }


def _build_anthropic_payload(
    messages: list[dict], model: str, system_prompt: Optional[str],
    temperature: float, max_tokens: int,
) -> dict:
    anthropic_messages = [m for m in messages if m.get("role") != "system"]
    payload = {
        "model": model,
        "messages": anthropic_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if system_prompt:
        payload["system"] = system_prompt
    return payload


def _parse_openai_response(data: dict, model: str, provider: str) -> CompletionResult:
    choice = data["choices"][0]
    usage = data.get("usage", {})
    return CompletionResult(
        content=choice["message"]["content"],
        tokens_in=usage.get("prompt_tokens", 0),
        tokens_out=usage.get("completion_tokens", 0),
        model=model,
        provider=provider,
    )


def _parse_anthropic_response(data: dict, model: str, provider: str) -> CompletionResult:
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
        provider=provider,
    )


# Legacy-Kompatibilitaet: LLMRouter Klasse (wird in ki_recherche.py nicht mehr gebraucht)
class LLMRouter:
    ANTHROPIC_PROVIDERS = ANTHROPIC_PROVIDERS

    @staticmethod
    def create_provider(provider_type: str, endpoint_url: str, api_key: str):
        raise NotImplementedError(
            "LLMRouter.create_provider() ist veraltet. "
            "Nutze stattdessen: from app.services.llm_router import complete"
        )
