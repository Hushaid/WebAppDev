FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgeos-dev libproj-dev gdal-bin libgdal-dev libeccodes-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ app/
COPY scripts/ scripts/

# Seed model artifacts under a different path so the Persistent Disk mount
# at /app/models_store doesn't shadow them on Render.
# entrypoint.sh copies these into /app/models_store if the disk is empty.
COPY models_store/ models_store_seed/

# nimet_data and models_store dirs are populated by Persistent Disk mounts on Render
RUN mkdir -p /app/nimet_data /app/models_store

RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8002

CMD ["/app/scripts/entrypoint.sh"]
