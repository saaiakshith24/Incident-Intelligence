FROM python:3.13-slim

WORKDIR /app

# Install production dependencies first (layer caching)
# Exclude test deps — use requirements-dev.txt for local development
COPY requirements.txt .
RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    pydantic \
    sqlalchemy \
    aiosqlite \
    httpx \
    numpy \
    python-dotenv \
    "beautifulsoup4>=4.12.0" \
    "lxml>=5.2.0"

# Copy backend source under /app/backend/ so imports like `backend.app.main` resolve
COPY . /app/backend/

# Set PYTHONPATH so `backend.*` imports work from /app
ENV PYTHONPATH=/app

# Create data directory for SQLite DB persistence
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
