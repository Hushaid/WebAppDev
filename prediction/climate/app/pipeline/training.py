"""Training pipeline for flood prediction models.

Orchestrates data fetching, feature engineering, model training,
and result storage.
"""

import os
import logging
from datetime import date, timedelta

import numpy as np
import pandas as pd

from ..data.chirps import fetch_chirps_rainfall, compute_cumulative_rainfall
from ..data.era5 import fetch_era5_soil_moisture
from ..data.glofas import fetch_glofas_discharge
from ..data.openmeteo import fetch_openmeteo_forecast
from ..models.xgboost_flood import FloodXGBoost
from ..models.prophet_anomaly import RainfallAnomalyDetector
from ..models.ensemble import FloodEnsemble
from ..models.compound_risk import batch_compound_risk
from .features import (
    build_dynamic_features,
    build_static_features,
    merge_features,
    FEATURE_NAMES,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
MODEL_DIR = os.getenv("MODEL_DIR", "/app/models_store")


async def fetch_historical_floods(db_url: str) -> pd.DataFrame:
    """Fetch historical flood event labels from the database."""
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("""
            SELECT lga_id, event_date, severity
            FROM climate_flood_events
            ORDER BY event_date
        """)
        return pd.DataFrame(
            [dict(r) for r in rows],
            columns=["lga_id", "event_date", "severity"],
        )
    finally:
        await conn.close()


async def fetch_lga_metadata(db_url: str) -> pd.DataFrame:
    """Fetch LGA metadata for static features."""
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("""
            SELECT lga_id, name, population_density, distance_to_river,
                   historical_flood_count, land_cover
            FROM lga_metadata
        """)
        return pd.DataFrame([dict(r) for r in rows])
    finally:
        await conn.close()


async def fetch_irix_scores(db_url: str) -> dict[str, float]:
    """Fetch latest IRIX health vulnerability scores per LGA."""
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("""
            SELECT DISTINCT ON (lga_id) lga_id, irix_score
            FROM irix_scores
            ORDER BY lga_id, computed_at DESC
        """)
        return {r["lga_id"]: float(r["irix_score"]) for r in rows}
    finally:
        await conn.close()


async def store_predictions(
    db_url: str, predictions: list[dict], prediction_date: date
) -> None:
    """Store flood predictions in the database."""
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        await conn.executemany(
            """
            INSERT INTO climate_flood_predictions
                (lga_id, prediction_date, flood_probability, risk_level,
                 compound_score, compound_risk_level, model_version)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (lga_id, prediction_date) DO UPDATE SET
                flood_probability = EXCLUDED.flood_probability,
                risk_level = EXCLUDED.risk_level,
                compound_score = EXCLUDED.compound_score,
                compound_risk_level = EXCLUDED.compound_risk_level,
                model_version = EXCLUDED.model_version
            """,
            [
                (
                    p["lga_id"],
                    prediction_date,
                    p["flood_probability"],
                    p["risk_level"],
                    p.get("compound_score"),
                    p.get("compound_risk_level"),
                    "v1.0",
                )
                for p in predictions
            ],
        )
    finally:
        await conn.close()


async def run_training_pipeline() -> dict:
    """Full training pipeline: fetch data → build features → train models."""
    logger.info("Starting climate model training pipeline")

    today = date.today()
    start_date = today - timedelta(days=365 * 3)  # 3 years of history

    # Fetch data
    lga_metadata = await fetch_lga_metadata(DATABASE_URL)
    flood_events = await fetch_historical_floods(DATABASE_URL)

    # Build static features
    static_features = build_static_features({}, lga_metadata)

    # Train XGBoost
    xgb_model = FloodXGBoost()

    # Build training labels: 1 if flood occurred on that date for that LGA
    flood_dates = set(
        zip(flood_events["lga_id"], flood_events["event_date"].astype(str))
    )

    # For training, we build features for each historical date
    # (simplified: using current dynamic features as proxy)
    chirps_data = fetch_chirps_rainfall(today - timedelta(days=30), today)
    cumulative = {}
    if chirps_data is not None:
        for _, lga in lga_metadata.iterrows():
            cumulative[lga["lga_id"]] = compute_cumulative_rainfall(
                chirps_data, lga.get("lat", 9.0), lga.get("lon", 7.5)
            )

    dynamic_features = build_dynamic_features(cumulative, None, None, None)
    features = merge_features(static_features, dynamic_features)

    X = features[FEATURE_NAMES].values
    y = np.zeros(len(features))  # placeholder labels

    for i, row in features.iterrows():
        if (row["lga_id"], str(today)) in flood_dates:
            y[i] = 1

    xgb_result = xgb_model.train(X, y, FEATURE_NAMES)
    logger.info("XGBoost trained: AUC=%.4f", xgb_result["cv_auc_mean"])

    # Train Prophet anomaly detector
    prophet = RainfallAnomalyDetector()

    # Save models
    os.makedirs(MODEL_DIR, exist_ok=True)
    xgb_model.save(f"{MODEL_DIR}/flood_xgb.json")

    return {
        "xgb_metrics": xgb_result,
        "n_lgas": len(lga_metadata),
        "training_date": str(today),
    }
