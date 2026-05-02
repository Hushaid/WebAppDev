"""Climate & Flood Disaster Prediction Service."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="Climate & Flood Risk Prediction",
    description="XGBoost flood risk prediction for Karu LGA, Nasarawa State",
    version="0.1.0",
)

# ALLOWED_ORIGINS: comma-separated list set via Render env var in production.
# Falls back to localhost for local development.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "climate"}
