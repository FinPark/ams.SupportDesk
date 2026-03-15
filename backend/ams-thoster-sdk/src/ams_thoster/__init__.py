"""ams-thoster — Python SDK fuer THoster.

Tool-Registrierung, Service Discovery, Health-Management und Email-Versand
ueber die zentrale THoster-Plattform.

Beispiel:
    from ams_thoster import ThosterClient

    thoster = ThosterClient(tool_name="mein-tool")
    thoster.register(description="Mein Tool", developer="Max")

    # Anderes Tool finden
    info = thoster.discover("ams-connections")
    print(info.api_address)
"""

from ams_thoster.client import ThosterClient
from ams_thoster.models import ToolInfo, ConnectionInfo, CategoryInfo

__all__ = ["ThosterClient", "ToolInfo", "ConnectionInfo", "CategoryInfo"]
__version__ = "0.1.0"
