FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgeos-dev libproj-dev gdal-bin libgdal-dev libeccodes-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ app/
COPY scripts/ scripts/

# Seed trained model artifacts into the image so the service starts without
# a separate training step. The volume mount (climate-models) will overlay
# these with freshly retrained files after the first admin-triggered retrain.
COPY models_store/ models_store/

# nimet_data dir is populated via volume mount from admin CSV uploads
RUN mkdir -p /app/nimet_data

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
