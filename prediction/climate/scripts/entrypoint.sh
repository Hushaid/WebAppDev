#!/bin/sh
set -e

# On first deploy the Persistent Disk at /app/models_store is empty.
# The service will start fine and return 503 on prediction endpoints until
# an admin triggers the first retrain from the Data Sources page.
if [ ! -f "/app/models_store/flood_xgb.json" ]; then
  echo "[entrypoint] No trained model found — service will start in degraded mode."
  echo "[entrypoint] Upload NIMET CSVs and trigger a retrain from the admin panel."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8002}"
