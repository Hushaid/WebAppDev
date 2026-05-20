#!/bin/bash
# Start the Climate & Flood Risk Prediction API on port 8002.
# Usage: bash scripts/start.sh [--reload]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Load .env if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

export MODEL_DIR="${MODEL_DIR:-models_store}"
export NIMET_RAINFALL_CSV="${NIMET_RAINFALL_CSV:-}"
export NIMET_ET_CSV="${NIMET_ET_CSV:-}"

PYTHON=/Users/elvke/.browser-use-env/bin/python3
UVICORN=/Users/elvke/.browser-use-env/bin/uvicorn

RELOAD_FLAG=""
if [ "$1" = "--reload" ]; then
  RELOAD_FLAG="--reload"
fi

echo "Starting climate service on :8002 (MODEL_DIR=$MODEL_DIR)"
PYTHONPATH=. exec "$UVICORN" app.main:app \
  --host 0.0.0.0 \
  --port 8002 \
  --log-level info \
  $RELOAD_FLAG
