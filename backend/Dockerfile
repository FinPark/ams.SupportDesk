FROM python:3.12-slim

WORKDIR /app

# uv + git installieren (git wird fuer pip install aus GitHub benoetigt)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Dependencies installieren
COPY pyproject.toml uv.lock* ./
COPY ams-thoster-sdk/ ./ams-thoster-sdk/
COPY ams-llm-sdk/ ./ams-llm-sdk/
RUN uv sync --frozen --no-dev 2>/dev/null || uv sync --no-dev
RUN uv pip install ./ams-thoster-sdk ./ams-llm-sdk

# App kopieren
COPY app/ ./app/

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
