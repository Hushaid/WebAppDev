#!/bin/sh
set -e

# Seed persistent disk from bundled image artifacts on first deploy (disk starts empty)
if [ ! -f "/app/models_store/flood_xgb.json" ]; then
  echo "[entrypoint] Seeding model store from image seed..."
  cp /app/models_store_seed/flood_xgb.json         /app/models_store/
  cp /app/models_store_seed/static_features.parquet /app/models_store/
  cp /app/models_store_seed/lga_metadata.parquet    /app/models_store/
  cp /app/models_store_seed/training_metrics.json   /app/models_store/
  echo "[entrypoint] Seed complete."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8002}"
