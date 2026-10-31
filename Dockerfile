# ================================================================
# Multi-Stage Production Dockerfile for CivicAgent
# Single container serving Frontend + FastAPI + Playwright
# ================================================================

# Stage 1: Build Modern React Frontend Cockpit
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python & Playwright Runtime
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies for Chromium Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    "pydantic>=2" \
    pydantic-settings \
    "sqlalchemy[asyncio]>=2" \
    asyncpg \
    redis \
    "temporalio>=1.10,<2" \
    cryptography \
    httpx \
    "playwright>=1.50" \
    "playwright-stealth>=2,<3" \
    pypdf \
    instructor \
    litellm \
    pgvector \
    boto3 \
    websockets \
    fakeredis \
    aiosqlite \
    python-dotenv

# Install Playwright Chromium browser binary
RUN playwright install chromium

# Copy application source
COPY app ./app
COPY config ./config
COPY scripts ./scripts

# Copy built frontend from Stage 1
COPY --from=frontend-builder /build/dist ./dist

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
