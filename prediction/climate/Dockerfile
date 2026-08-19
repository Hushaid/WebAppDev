FROM python:3.11-slim

WORKDIR /app

# gcc/g++ needed for some Python extension compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ app/
COPY scripts/ scripts/

# Persistent Disk mounts on Render overlay these at runtime:
#   /app/models_store  ← trained model artifacts (populated by admin retrain)
#   /app/nimet_data    ← NIMET CSV uploads
RUN mkdir -p /app/models_store /app/nimet_data

RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8002

CMD ["/app/scripts/entrypoint.sh"]
