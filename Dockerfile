# ==============================================================================
# BRIDGE AI Engine: Multi-Stage Production Dockerfile
# Stage 1: Build Dispatch Desk React Frontend (Vite 6 + React 19 + TypeScript)
# Stage 2: Build Python dependencies with GCC
# Stage 3: Minimal, secure, non-root runtime image with libgomp1 OpenMP support
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Build Stage
# ------------------------------------------------------------------------------
FROM node:22-slim AS frontend-builder
WORKDIR /frontend

# Enable corepack to provision pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies with frozen lockfile
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy frontend source and compile static production distribution
COPY frontend/ ./
RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 2: Python Build Stage
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS python-builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 3: Final Production Runtime Stage
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner
WORKDIR /app

# Install runtime OpenMP support for LightGBM and create non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r bridgeuser && useradd -r -g bridgeuser bridgeuser

# Copy installed Python packages from builder
COPY --from=python-builder /root/.local /home/bridgeuser/.local
ENV PATH=/home/bridgeuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000

# Copy application source code, models, and reference data
COPY --chown=bridgeuser:bridgeuser app/ ./app/
COPY --chown=bridgeuser:bridgeuser src/ ./src/
COPY --chown=bridgeuser:bridgeuser models/ ./models/
COPY --chown=bridgeuser:bridgeuser static/ ./static/
COPY --chown=bridgeuser:bridgeuser data/sample_test_deliveries.csv ./data/sample_test_deliveries.csv
COPY --chown=bridgeuser:bridgeuser run.py ./run.py
COPY --chown=bridgeuser:bridgeuser requirements.txt ./requirements.txt

# Copy production built frontend from frontend-builder stage
COPY --from=frontend-builder --chown=bridgeuser:bridgeuser /frontend/dist ./frontend/dist

USER bridgeuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["python", "run.py"]
