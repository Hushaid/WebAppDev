"""IRIX API routes — /predict, /retrain, /scores, /hotspots, /trends."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Query

from app.api.schemas import (
    HotspotResponse,
    IrixFilters,
    IrixScoreResponse,
    IrixTrendResponse,
    PredictRequest,
    PredictResponse,
    RetrainRequest,
    RetrainResponse,
)

router = APIRouter(tags=["irix"])


@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """Trigger IRIX prediction pipeline (async via Celery)."""
    job_id = str(uuid.uuid4())
    # TODO: dispatch Celery task
    # from app.tasks.batch import run_irix_prediction
    # run_irix_prediction.delay(job_id, request.filters, request.force_retrain)
    return PredictResponse(job_id=job_id)


@router.post("/retrain", response_model=RetrainResponse)
async def retrain(request: RetrainRequest):
    """Trigger BYM2 model retraining (async via Celery)."""
    job_id = str(uuid.uuid4())
    # TODO: dispatch Celery task
    # from app.tasks.batch import retrain_model
    # retrain_model.delay(job_id, request.filters, request.model_version)
    return RetrainResponse(job_id=job_id)


@router.get("/scores", response_model=list[IrixScoreResponse])
async def get_scores(
    disease_group: str | None = Query(None),
    risk_level: str | None = Query(None),
    hotspots_only: bool = Query(False),
    limit: int = Query(100, le=1000),
):
    """Retrieve latest IRIX scores for all geographic units."""
    # TODO: query irix_scores table with filters
    return []


@router.get("/scores/{geographic_unit_id}", response_model=IrixScoreResponse | None)
async def get_score_for_unit(geographic_unit_id: str):
    """Retrieve IRIX score for a specific geographic unit."""
    # TODO: query irix_scores for specific unit
    return None


@router.get("/hotspots", response_model=list[HotspotResponse])
async def get_hotspots(
    disease_group: str | None = Query(None),
    p_value_threshold: float = Query(0.05),
):
    """Retrieve detected hotspots from Local Moran's I / Getis-Ord Gi*."""
    # TODO: query hotspot results
    return []


@router.get("/trends/{geographic_unit_id}", response_model=IrixTrendResponse | None)
async def get_trends(
    geographic_unit_id: str,
    periods: int = Query(12, description="Number of trend periods to return"),
):
    """Retrieve IRIX trend time series for a geographic unit."""
    # TODO: query irix_trends
    return None
