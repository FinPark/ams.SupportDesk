from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Datenbank
    db_host: str = "db"
    db_port: int = 5432
    db_name: str = "supportdesk"
    db_user: str = "supportdesk"
    db_password: str = "changeme"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Sicherheit
    secret_key: str = "dev-secret-change-in-production"

    # THoster
    server_domain: str = "localhost"

    # Internes Service-Token (MCP-Server → Backend)
    internal_api_key: str = ""

    # API-Keys (optional, wenn nicht über ams-connections verwaltet)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
