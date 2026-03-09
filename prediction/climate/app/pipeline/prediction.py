"""Daily batch prediction pipeline for flood risk across 774 LGAs.

Runs daily, fetches latest climate data, generates predictions,
computes compound risk, and stores results.
"""

import os
import logging
from datetime import date, timedelta

import numpy as np

from ..data.chirps import fetch_chirps_daily, compute_cumulative_rainfall
from ..data.era5 import fetch_era5_soil_moisture
from ..data.glofas import fetch_glofas_forecast, load_glofas_discharge, extract_station_discharge, check_lagdo_dam_risk, BENUE_STATIONS
from ..data.openmeteo import (
    fetch_forecast,
    compute_forecast_risk_signal,
)
from ..models.xgboost_flood import FloodXGBoost
from ..models.prophet_anomaly import RainfallAnomalyDetector
from ..models.ensemble import FloodEnsemble
from ..models.compound_risk import batch_compound_risk
from .features import build_dynamic_features, FEATURE_NAMES
from .training import (
    fetch_lga_metadata,
    fetch_irix_scores,
    store_predictions,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
MODEL_DIR = os.getenv("MODEL_DIR", "/app/models_store")

# Benue basin LGA IDs that are affected by Lagdo Dam releases
LAGDO_AFFECTED_LGAS = os.getenv("LAGDO_AFFECTED_LGAS", "").split(",")


async def run_daily_prediction() -> dict:
    """Run daily flood prediction for all LGAs."""
    logger.info("Starting daily flood prediction")

    today = date.today()

    # Load trained model
    xgb_model = FloodXGBoost()
    model_path = f"{MODEL_DIR}/flood_xgb.json"
    if not os.path.exists(model_path):
        logger.error("No trained model found at %s", model_path)
        return {"error": "Model not found. Run training first."}

    xgb_model.load(model_path, FEATURE_NAMES)

    # Fetch current data
    lga_metadata = await fetch_lga_metadata(DATABASE_URL)
    irix_scores = await fetch_irix_scores(DATABASE_URL)

    # CHIRPS rainfall — download daily files for last 30 days
    chirps_files = []
    for day_offset in range(30):
        target = today - timedelta(days=day_offset)
        filepath = await fetch_chirps_daily(target)
        if filepath:
            chirps_files.append(filepath)

    cumulative = {}
    if chirps_files:
        cumulative = compute_cumulative_rainfall(chirps_files)

    # ERA5 soil moisture (single date)
    era5 = None
    try:
        era5_path = fetch_era5_soil_moisture(today - timedelta(days=1))
        if era5_path is not None:
            from ..data.era5 import load_era5_soil_moisture
            era5_ds = load_era5_soil_moisture(era5_path)
            era5 = {}
            for _, lga in lga_metadata.iterrows():
                try:
                    val = float(era5_ds["swvl1"].sel(
                        latitude=lga.get("lat", 9.0),
                        longitude=lga.get("lon", 7.5),
                        method="nearest",
                    ).values)
                    era5[lga["lga_id"]] = val
                except (KeyError, ValueError):
                    era5[lga["lga_id"]] = 0.3
    except Exception as e:
        logger.warning("ERA5 fetch failed: %s", e)

    # GloFAS discharge
    glofas = None
    lagdo_risk = None
    try:
        glofas_path = fetch_glofas_forecast(today)
        if glofas_path:
            glofas_ds = load_glofas_discharge(glofas_path)
            benue_discharge = extract_station_discharge(glofas_ds, BENUE_STATIONS)
            lagdo_risk = check_lagdo_dam_risk(benue_discharge)
    except Exception as e:
        logger.warning("GloFAS fetch failed: %s", e)

    # Open-Meteo forecast
    forecast_signals = {}
    try:
        for _, lga in lga_metadata.iterrows():
            forecast = await fetch_forecast(
                lga.get("lat", 9.0), lga.get("lon", 7.5)
            )
            if forecast is not None:
                signal = compute_forecast_risk_signal(forecast)
                forecast_signals[lga["lga_id"]] = signal
    except Exception as e:
        logger.warning("Open-Meteo fetch failed: %s", e)

    # Build features and predict
    dynamic = build_dynamic_features(cumulative, era5, glofas, forecast_signals)

    # Load static features (precomputed)
    static_path = f"{MODEL_DIR}/static_features.parquet"
    if os.path.exists(static_path):
        import pandas as pd

        static = pd.read_parquet(static_path)
        from .features import merge_features

        features = merge_features(static, dynamic)
    else:
        features = dynamic

    # Ensure all feature columns exist
    for col in FEATURE_NAMES:
        if col not in features.columns:
            features[col] = 0

    X = features[FEATURE_NAMES].values

    # XGBoost predictions
    xgb_preds = xgb_model.predict(X)

    # Prophet anomaly signals
    prophet = RainfallAnomalyDetector()
    prophet_scores = np.zeros(len(features))
    # Prophet models would be loaded per-LGA if trained

    # Ensemble
    ensemble = FloodEnsemble()
    flood_probs = ensemble.predict(xgb_preds, None, prophet_scores)
    risk_levels = ensemble.classify_risk(flood_probs)

    # Compound risk (combine flood + IRIX health vulnerability)
    compound_data = []
    for i, (_, row) in enumerate(features.iterrows()):
        lga_id = row.get("lga_id", f"lga_{i}")
        health_vuln = irix_scores.get(lga_id, 0.3)

        compound_data.append({
            "lga_id": lga_id,
            "flood_risk": float(flood_probs[i]),
            "health_vulnerability": health_vuln,
            "exposure": 0.5,  # default, would come from population data
            "adaptive_capacity": 0.5,  # default, would come from facility data
        })

    compound_results = batch_compound_risk(compound_data)

    # Merge predictions
    predictions = []
    for i, compound in enumerate(compound_results):
        predictions.append({
            "lga_id": compound["lga_id"],
            "flood_probability": float(flood_probs[i]),
            "risk_level": risk_levels[i],
            "compound_score": compound["compound_score"],
            "compound_risk_level": compound["risk_level"],
        })

    # Store
    await store_predictions(DATABASE_URL, predictions, today)

    # Lagdo Dam special alert
    alerts_generated = 0
    if lagdo_risk and lagdo_risk.get("risk_level") in ("high", "critical"):
        alerts_generated = await generate_lagdo_alerts(lagdo_risk)

    # Generate alerts for high-risk LGAs
    high_risk = [p for p in predictions if p["risk_level"] in ("warning", "emergency")]
    if high_risk:
        alerts_generated += await generate_flood_alerts(high_risk)

    logger.info(
        "Prediction complete: %d LGAs, %d high-risk, %d alerts",
        len(predictions),
        len(high_risk),
        alerts_generated,
    )

    return {
        "date": str(today),
        "n_predictions": len(predictions),
        "n_high_risk": len(high_risk),
        "n_alerts": alerts_generated,
        "lagdo_risk": lagdo_risk,
    }


async def generate_flood_alerts(high_risk_predictions: list[dict]) -> int:
    """Generate alerts for high-risk LGAs and store in the database."""
    import asyncpg

    conn = await asyncpg.connect(DATABASE_URL)
    count = 0
    try:
        for pred in high_risk_predictions:
            await conn.execute(
                """
                INSERT INTO alerts (type, risk_level, message, metadata, created_at)
                VALUES ('climate', $1, $2, $3, NOW())
                """,
                pred["risk_level"],
                f"Flood {pred['risk_level']} for LGA {pred['lga_id']}: "
                f"probability {pred['flood_probability']:.1%}",
                f'{{"lga_id": "{pred["lga_id"]}", '
                f'"flood_prob": {pred["flood_probability"]:.4f}, '
                f'"compound_score": {pred["compound_score"]:.4f}}}',
            )
            count += 1
    finally:
        await conn.close()
    return count


async def generate_lagdo_alerts(lagdo_risk: dict) -> int:
    """Generate Lagdo Dam release alerts for downstream LGAs."""
    import asyncpg

    if not LAGDO_AFFECTED_LGAS or LAGDO_AFFECTED_LGAS == [""]:
        return 0

    conn = await asyncpg.connect(DATABASE_URL)
    count = 0
    try:
        for lga_id in LAGDO_AFFECTED_LGAS:
            lga_id = lga_id.strip()
            if not lga_id:
                continue
            await conn.execute(
                """
                INSERT INTO alerts (type, risk_level, message, metadata, created_at)
                VALUES ('climate', $1, $2, $3, NOW())
                """,
                lagdo_risk["risk_level"],
                f"Lagdo Dam release warning for LGA {lga_id}: "
                f"discharge {lagdo_risk.get('discharge_m3s', 'N/A')} m³/s",
                f'{{"lga_id": "{lga_id}", "source": "lagdo_dam", '
                f'"discharge_m3s": {lagdo_risk.get("discharge_m3s", 0)}}}',
            )
            count += 1
    finally:
        await conn.close()
    return count
