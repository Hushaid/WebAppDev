"""IRIX API routes — /predict, /retrain, /scores, /hotspots, /trends."""

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Query
from sqlalchemy import create_engine, text

from app.api.schemas import (
    HotspotResponse,
    IrixFilters,
    IrixScoreResponse,
    IrixTrendPoint,
    IrixTrendResponse,
    PredictRequest,
    PredictResponse,
    RetrainRequest,
    RetrainResponse,
)

router = APIRouter(tags=["irix"])

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/srhr",
)


def get_engine():
    return create_engine(DATABASE_URL)


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
    engine = get_engine()

    query = """
        SELECT geographic_unit_id, computed_at, model_version,
               sti_avg_score, sti_risk_level,
               maternal_avg_score, maternal_risk_level,
               community_wellbeing_avg_score, community_wellbeing_risk_level,
               overall_irix_score, overall_risk_level,
               submission_count, hotspot_flag,
               confidence_lower, confidence_upper
        FROM irix_scores
        WHERE computed_at = (SELECT MAX(computed_at) FROM irix_scores)
    """
    conditions = []
    params: dict = {}

    if risk_level:
        conditions.append("overall_risk_level = :risk_level")
        params["risk_level"] = risk_level
    if hotspots_only:
        conditions.append("hotspot_flag = true")

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY overall_irix_score DESC LIMIT :limit"
    params["limit"] = limit

    with engine.connect() as conn:
        rows = conn.execute(text(query), params).mappings().all()

    def row_to_score(r: dict) -> IrixScoreResponse:
        return IrixScoreResponse(
            geographic_unit_id=r["geographic_unit_id"],
            computed_at=str(r["computed_at"]),
            model_version=r.get("model_version"),
            sti_avg_score=float(r["sti_avg_score"]) if r["sti_avg_score"] else None,
            sti_risk_level=r["sti_risk_level"],
            maternal_avg_score=float(r["maternal_avg_score"]) if r["maternal_avg_score"] else None,
            maternal_risk_level=r["maternal_risk_level"],
            community_wellbeing_avg_score=float(r["community_wellbeing_avg_score"]) if r["community_wellbeing_avg_score"] else None,
            community_wellbeing_risk_level=r["community_wellbeing_risk_level"],
            overall_irix_score=float(r["overall_irix_score"]),
            overall_risk_level=r["overall_risk_level"],
            submission_count=r["submission_count"],
            hotspot_flag=r["hotspot_flag"],
            confidence_lower=float(r["confidence_lower"]) if r["confidence_lower"] else None,
            confidence_upper=float(r["confidence_upper"]) if r["confidence_upper"] else None,
        )

    return [row_to_score(r) for r in rows]


@router.get("/scores/{geographic_unit_id}", response_model=IrixScoreResponse | None)
async def get_score_for_unit(geographic_unit_id: str):
    """Retrieve IRIX score for a specific geographic unit."""
    engine = get_engine()

    query = """
        SELECT geographic_unit_id, computed_at, model_version,
               sti_avg_score, sti_risk_level,
               maternal_avg_score, maternal_risk_level,
               community_wellbeing_avg_score, community_wellbeing_risk_level,
               overall_irix_score, overall_risk_level,
               submission_count, hotspot_flag,
               confidence_lower, confidence_upper
        FROM irix_scores
        WHERE geographic_unit_id = :unit_id
        ORDER BY computed_at DESC
        LIMIT 1
    """

    with engine.connect() as conn:
        row = conn.execute(text(query), {"unit_id": geographic_unit_id}).mappings().first()

    if not row:
        return None

    return IrixScoreResponse(
        geographic_unit_id=row["geographic_unit_id"],
        computed_at=str(row["computed_at"]),
        model_version=row.get("model_version"),
        sti_avg_score=float(row["sti_avg_score"]) if row["sti_avg_score"] else None,
        sti_risk_level=row["sti_risk_level"],
        maternal_avg_score=float(row["maternal_avg_score"]) if row["maternal_avg_score"] else None,
        maternal_risk_level=row["maternal_risk_level"],
        community_wellbeing_avg_score=float(row["community_wellbeing_avg_score"]) if row["community_wellbeing_avg_score"] else None,
        community_wellbeing_risk_level=row["community_wellbeing_risk_level"],
        overall_irix_score=float(row["overall_irix_score"]),
        overall_risk_level=row["overall_risk_level"],
        submission_count=row["submission_count"],
        hotspot_flag=row["hotspot_flag"],
        confidence_lower=float(row["confidence_lower"]) if row["confidence_lower"] else None,
        confidence_upper=float(row["confidence_upper"]) if row["confidence_upper"] else None,
    )


@router.get("/hotspots", response_model=list[HotspotResponse])
async def get_hotspots(
    disease_group: str | None = Query(None),
    p_value_threshold: float = Query(0.05),
):
    """Retrieve detected hotspots from Local Moran's I / Getis-Ord Gi*."""
    engine = get_engine()

    query = """
        SELECT geographic_unit_id, computed_at,
               overall_irix_score, overall_risk_level,
               submission_count, confidence_lower, confidence_upper
        FROM irix_scores
        WHERE hotspot_flag = true
          AND computed_at = (SELECT MAX(computed_at) FROM irix_scores)
        ORDER BY overall_irix_score DESC
    """

    with engine.connect() as conn:
        rows = conn.execute(text(query)).mappings().all()

    return [
        HotspotResponse(
            geographic_unit_id=r["geographic_unit_id"],
            overall_irix_score=float(r["overall_irix_score"]),
            overall_risk_level=r["overall_risk_level"],
            submission_count=r["submission_count"],
            confidence_lower=float(r["confidence_lower"]) if r.get("confidence_lower") else None,
            confidence_upper=float(r["confidence_upper"]) if r.get("confidence_upper") else None,
        )
        for r in rows
    ]


@router.get("/trends/{geographic_unit_id}", response_model=IrixTrendResponse | None)
async def get_trends(
    geographic_unit_id: str,
    periods: int = Query(12, description="Number of trend periods to return"),
):
    """Retrieve IRIX trend time series for a geographic unit."""
    engine = get_engine()

    query = """
        SELECT geographic_unit_id, computed_at, model_version,
               overall_irix_score, overall_risk_level,
               sti_avg_score, maternal_avg_score,
               community_wellbeing_avg_score, submission_count
        FROM irix_scores
        WHERE geographic_unit_id = :unit_id
        ORDER BY computed_at DESC
        LIMIT :periods
    """

    with engine.connect() as conn:
        rows = conn.execute(
            text(query), {"unit_id": geographic_unit_id, "periods": periods}
        ).mappings().all()

    if not rows:
        return None

    return IrixTrendResponse(
        geographic_unit_id=geographic_unit_id,
        periods=[
            IrixTrendPoint(
                computed_at=str(r["computed_at"]),
                overall_irix_score=float(r["overall_irix_score"]),
                overall_risk_level=r["overall_risk_level"],
                sti_avg_score=float(r["sti_avg_score"]) if r["sti_avg_score"] else None,
                maternal_avg_score=float(r["maternal_avg_score"]) if r["maternal_avg_score"] else None,
                community_wellbeing_avg_score=float(r["community_wellbeing_avg_score"]) if r["community_wellbeing_avg_score"] else None,
                submission_count=r["submission_count"],
            )
            for r in reversed(rows)
        ],
    )
