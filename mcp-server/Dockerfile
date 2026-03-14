FROM python:3.12-slim

WORKDIR /app

# uv installieren
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Dependencies installieren
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev 2>/dev/null || uv sync --no-dev

# Server kopieren
COPY server.py ./

EXPOSE 8080

CMD ["uv", "run", "python", "server.py"]
