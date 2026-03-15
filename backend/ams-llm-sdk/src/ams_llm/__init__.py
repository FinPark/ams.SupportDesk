"""ams-llm — Python SDK fuer ams.Connections.

Einfacher Zugriff auf alle LLM-Verbindungen der THoster-Plattform.

Beispiel:
    from ams_llm import LLMClient

    llm = LLMClient(tool_name="mein-tool")
    antwort = llm.chat("Was ist eine API?")
    print(antwort)
"""

from ams_llm.client import LLMClient
from ams_llm.models import Connection

__all__ = ["LLMClient", "Connection"]
__version__ = "0.1.0"
