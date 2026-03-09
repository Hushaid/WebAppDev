"""Climate API routes.

Endpoints: /flood-risk, /compound-risk, /alerts, /retrain, /lagdo-dam.
"""

import os
import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Query

from .schemas import (
    FloodRiskListResponse,
    FloodRiskResponse,
    CompoundRiskRequest,
    CompoundRiskListResponse,
    CompoundRiskResponse,
    ClimateAlertListResponse,
    ClimateAlertResponse,
    TrainingResponse,
    LagdoDamResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["climate"])

DATABASE_URL = os.getenv("DATABASE_URL", "")


@router.get("/flood-risk", response_model=FloodRiskListResponse)
async def get_flood_risk(
    target_date: date | None = None,
    lga_id: str | None = None,
    risk_level: str | None = None,
):
    """Get flood risk predictions for LGAs."""
    import asyncpg

    target = target_date or date.today()

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        query = """
            SELECT lga_id, prediction_date, flood_probability, risk_level,
                   compound_score, compound_risk_level
            FROM climate_flood_predictions
            WHERE prediction_date = $1
        """
        params: list = [target]

        if lga_id:
            query += f" AND lga_id = ${len(params) + 1}"
            params.append(lga_id)
        if risk_level:
            query += f" AND risk_level = ${len(params) + 1}"
            params.append(risk_level)

        query += " ORDER BY flood_probability DESC"
        rows = await conn.fetch(query, *params)

        predictions = [
            FloodRiskResponse(
                lga_id=r["lga_id"],
                prediction_date=r["prediction_date"],
                flood_probability=float(r["flood_probability"]),
                risk_level=r["risk_level"],
                compound_score=float(r["compound_score"]) if r["compound_score"] else None,
                compound_risk_level=r["compound_risk_level"],
            )
            for r in rows
        ]

        return FloodRiskListResponse(
            predictions=predictions, date=target, total=len(predictions)
        )
    finally:
        await conn.close()


@router.post("/compound-risk", response_model=CompoundRiskListResponse)
async def get_compound_risk(request: CompoundRiskRequest):
    """Get compound vulnerability scores (flood + health)."""
    import asyncpg

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if request.lga_ids:
            rows = await conn.fetch(
                """
                SELECT p.lga_id, p.flood_probability, p.compound_score,
                       p.compound_risk_level
                FROM climate_flood_predictions p
                WHERE p.lga_id = ANY($1)
                  AND p.prediction_date = (
                      SELECT MAX(prediction_date) FROM climate_flood_predictions
                  )
                """,
                request.lga_ids,
            )
        else:
            rows = await conn.fetch("""
                SELECT p.lga_id, p.flood_probability, p.compound_score,
                       p.compound_risk_level
                FROM climate_flood_predictions p
                WHERE p.prediction_date = (
                    SELECT MAX(prediction_date) FROM climate_flood_predictions
                )
                ORDER BY p.compound_score DESC NULLS LAST
                LIMIT 100
            """)

        results = [
            CompoundRiskResponse(
                lga_id=r["lga_id"],
                compound_score=float(r["compound_score"] or 0),
                risk_level=r["compound_risk_level"] or "unknown",
                components={
                    "flood_probability": float(r["flood_probability"]),
                },
            )
            for r in rows
        ]

        return CompoundRiskListResponse(results=results, total=len(results))
    finally:
        await conn.close()


@router.get("/alerts", response_model=ClimateAlertListResponse)
async def get_climate_alerts(
    limit: int = Query(50, le=200),
    risk_level: str | None = None,
):
    """Get recent climate alerts."""
    import asyncpg

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        query = """
            SELECT id::text, type, risk_level, message, metadata, created_at::text
            FROM alerts
            WHERE type = 'climate'
        """
        params: list = []

        if risk_level:
            query += f" AND risk_level = ${len(params) + 1}"
            params.append(risk_level)

        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)

        rows = await conn.fetch(query, *params)

        alerts = [
            ClimateAlertResponse(
                id=r["id"],
                type=r["type"],
                risk_level=r["risk_level"],
                message=r["message"],
                lga_id=None,  # extracted from metadata if needed
                created_at=r["created_at"],
            )
            for r in rows
        ]

        return ClimateAlertListResponse(alerts=alerts, total=len(alerts))
    finally:
        await conn.close()


@router.post("/retrain", response_model=TrainingResponse)
async def trigger_retrain():
    """Trigger model retraining (admin only)."""
    from ..tasks.scheduled import retrain_climate_model

    task = retrain_climate_model.delay()
    return TrainingResponse(
        status="queued",
        message=f"Retraining task queued: {task.id}",
    )


@router.get("/lagdo-dam", response_model=LagdoDamResponse)
async def get_lagdo_dam_status():
    """Get current Lagdo Dam risk status."""
    from ..data.glofas import (
        fetch_glofas_forecast,
        load_glofas_discharge,
        extract_station_discharge,
        check_lagdo_dam_risk,
        BENUE_STATIONS,
    )

    glofas_path = fetch_glofas_forecast(date.today())
    if not glofas_path:
        raise HTTPException(status_code=503, detail="GloFAS data unavailable")

    glofas_ds = load_glofas_discharge(glofas_path)
    benue_discharge = extract_station_discharge(glofas_ds, BENUE_STATIONS)
    risk = check_lagdo_dam_risk(benue_discharge)

    affected = os.getenv("LAGDO_AFFECTED_LGAS", "").split(",")
    affected = [a.strip() for a in affected if a.strip()]

    return LagdoDamResponse(
        risk_level=risk.get("risk_level", "unknown"),
        discharge_m3s=risk.get("yola_discharge_m3s", 0),
        threshold_m3s=3000,
        affected_lgas=affected,
    )
