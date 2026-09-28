# Multi-stage production Dockerfile for BRIDGE AI Engine
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Stage
FROM python:3.11-slim AS runner

WORKDIR /app

# Create non-root user for enterprise container security compliance
RUN groupadd -r bridgeuser && useradd -r -g bridgeuser bridgeuser

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/bridgeuser/.local
ENV PATH=/home/bridgeuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Copy application source code and models
COPY --chown=bridgeuser:bridgeuser app/ ./app/
COPY --chown=bridgeuser:bridgeuser src/ ./src/
COPY --chown=bridgeuser:bridgeuser models/ ./models/
COPY --chown=bridgeuser:bridgeuser static/ ./static/
COPY --chown=bridgeuser:bridgeuser data/sample_test_deliveries.csv ./data/sample_test_deliveries.csv
COPY --chown=bridgeuser:bridgeuser run.py ./run.py
COPY --chown=bridgeuser:bridgeuser requirements.txt ./requirements.txt

USER bridgeuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["python", "run.py"]
