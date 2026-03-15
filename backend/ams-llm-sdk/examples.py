"""ams-llm SDK — Beispiele.

Installation:
    pip install "ams-llm @ git+https://github.com/FinPark/ams.Connection.git#subdirectory=sdk"

Die Base-URL von ams.Connections wird automatisch per THoster Service Discovery ermittelt.
"""

from ams_llm import LLMClient

# --- Einfachster Aufruf (Base-URL wird automatisch gefunden) ---
llm = LLMClient(tool_name="mein-tool")
conn = llm.match(provider="aiva")
print(llm.chat("Was ist eine API?", connection=conn, max_tokens=100))


# --- Streaming ---
for chunk in llm.stream("Zaehle von 1 bis 10.", connection=conn, max_tokens=50):
    print(chunk, end="", flush=True)
print()


# --- Verbindung mit bestimmter Capability ---
# conn = llm.match(capability="vision")
# print(llm.chat("Beschreibe dieses Bild.", connection=conn))


# --- Alle Verbindungen auflisten ---
for c in llm.list_connections():
    print(f"{c.name} ({c.provider_type}) — {c.model_name}")


# --- Manueller Zugriff auf URL/Headers/Key ---
# conn = llm.match(provider="openai")
# chat_url = llm.build_chat_url(conn)
# headers = llm.build_headers(conn)
# api_key = llm.get_api_key(conn.id)
