"""Climate API routes.

Endpoints: /flood-risk, /compound-risk, /alerts, /lagdo-dam.
All flood-risk predictions are served directly from the trained XGBoost model
and static parquet files — no database required.
"""

import os
import time
import logging
from datetime import date

import numpy as np
import pandas as pd
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
from ..models.xgboost_flood import FloodXGBoost
from ..models.ensemble import FloodEnsemble
from ..models.compound_risk import batch_compound_risk
from ..pipeline.features import FEATURE_NAMES, merge_features, build_dynamic_features
from ..data.nimet import load_nimet_features

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["climate"])

MODEL_DIR = os.getenv("MODEL_DIR", "models_store")
NIMET_RAINFALL_CSV = os.getenv("NIMET_RAINFALL_CSV", "")
NIMET_ET_CSV = os.getenv("NIMET_ET_CSV", "")

# Zone-relative rainfall scaling factors (relative to middle-belt Karu)
_ZONE_FACTORS = {"south": 1.8, "middle": 1.0, "north": 0.45}

# Lazy-loaded singletons (populated on first request)
_model: FloodXGBoost | None = None
_static_features: pd.DataFrame | None = None
_lga_metadata: pd.DataFrame | None = None

# In-memory prediction cache — 5 min TTL matches Next.js revalidate: 300
_cache: list[dict] | None = None
_cache_ts: float = 0.0
_CACHE_TTL = 300


def _load_artifacts() -> None:
    """Load model and parquet files once, raising if missing."""
    global _model, _static_features, _lga_metadata

    if _model is not None:
        return

    model_path = os.path.join(MODEL_DIR, "flood_xgb.json")
    static_path = os.path.join(MODEL_DIR, "static_features.parquet")
    meta_path = os.path.join(MODEL_DIR, "lga_metadata.parquet")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Trained model not found at {model_path}. "
            "Run scripts/train_local.py first."
        )

    _model = FloodXGBoost()
    _model.load(model_path, FEATURE_NAMES)

    if os.path.exists(static_path):
        _static_features = pd.read_parquet(static_path)
    else:
        raise FileNotFoundError(f"Static features not found at {static_path}.")

    if os.path.exists(meta_path):
        _lga_metadata = pd.read_parquet(meta_path)
    else:
        raise FileNotFoundError(f"LGA metadata not found at {meta_path}.")


def _get_karu_features() -> dict:
    """Return Karu dynamic features from NIMET files, or seasonal defaults."""
    if NIMET_RAINFALL_CSV and os.path.exists(NIMET_RAINFALL_CSV):
        et_path = NIMET_ET_CSV if NIMET_ET_CSV and os.path.exists(NIMET_ET_CSV) else None
        return load_nimet_features(NIMET_RAINFALL_CSV, et_path)

    # Fallback: mid-dry-season defaults
    return {
        "rain_1d": 0.0,
        "rain_3d": 0.0,
        "rain_7d": 0.0,
        "rain_14d": 2.0,
        "rain_30d": 8.0,
        "soil_moisture": 0.25,
        "water_balance_7d": -12.0,
        "water_balance_30d": -35.0,
    }


def _build_dynamic(lga_metadata: pd.DataFrame, karu: dict) -> pd.DataFrame:
    """Scale Karu's dynamic features to all LGAs by geographic zone."""
    chirps: dict[str, dict[str, float]] = {}
    era5_soil: dict[str, float] = {}
    wb_map: dict[str, tuple[float, float]] = {}

    rain_keys = ["rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d"]

    for _, lga in lga_metadata.iterrows():
        lga_id = str(lga["lga_id"])
        is_karu = str(lga.get("name", "")).lower() == "karu"
        factor = 1.0 if is_karu else _ZONE_FACTORS.get(str(lga.get("zone", "middle")), 1.0)

        chirps[lga_id] = {k: karu[k] * factor for k in rain_keys}

        sm = karu.get("soil_moisture", 0.3)
        era5_soil[lga_id] = float(np.clip(sm + (sm - 0.3) * (factor - 1.0), 0.05, 0.95))

        wb_map[lga_id] = (
            karu.get("water_balance_7d", 0.0) * factor,
            karu.get("water_balance_30d", 0.0) * factor,
        )

    dynamic = build_dynamic_features(chirps, era5_soil, None, None)

    # Inject water balance columns (not produced by build_dynamic_features)
    wb7 = dynamic["lga_id"].map(lambda lid: wb_map.get(str(lid), (0.0, 0.0))[0])
    wb30 = dynamic["lga_id"].map(lambda lid: wb_map.get(str(lid), (0.0, 0.0))[1])
    dynamic["water_balance_7d"] = wb7.values
    dynamic["water_balance_30d"] = wb30.values

    return dynamic


def _run_prediction() -> list[dict]:
    """Run full prediction pipeline and return sorted list of prediction dicts."""
    _load_artifacts()

    karu = _get_karu_features()
    dynamic = _build_dynamic(_lga_metadata, karu)

    features = merge_features(_static_features, dynamic)
    for col in FEATURE_NAMES:
        if col not in features.columns:
            features[col] = 0.0

    X = features[FEATURE_NAMES].to_numpy(dtype=float)
    xgb_preds = _model.predict(X)

    ensemble = FloodEnsemble()
    flood_probs = ensemble.predict(xgb_preds, None, np.zeros(len(X)))
    risk_levels = ensemble.classify_risk(flood_probs)

    compound_input = [
        {
            "lga_id": str(features.iloc[i]["lga_id"]),
            "flood_risk": float(flood_probs[i]),
            "health_vulnerability": 0.3,
            "exposure": 0.5,
            "adaptive_capacity": 0.5,
        }
        for i in range(len(features))
    ]
    compound_results = batch_compound_risk(compound_input)

    today = str(date.today())
    predictions = [
        {
            "lga_id": compound["lga_id"],
            "prediction_date": today,
            "flood_probability": float(flood_probs[i]),
            "risk_level": risk_levels[i],
            "compound_score": compound["compound_score"],
            "compound_risk_level": compound["risk_level"],
        }
        for i, compound in enumerate(compound_results)
    ]

    return sorted(predictions, key=lambda p: p["flood_probability"], reverse=True)


def _get_cached_predictions() -> list[dict]:
    global _cache, _cache_ts
    if _cache is not None and (time.time() - _cache_ts) < _CACHE_TTL:
        return _cache
    _cache = _run_prediction()
    _cache_ts = time.time()
    return _cache


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/flood-risk", response_model=FloodRiskListResponse)
async def get_flood_risk(
    target_date: date | None = None,
    lga_id: str | None = None,
    risk_level: str | None = None,
):
    """Get flood risk predictions for all LGAs (model-served, no DB)."""
    try:
        predictions = _get_cached_predictions()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction pipeline failed")
        raise HTTPException(status_code=500, detail="Prediction failed") from exc

    if lga_id:
        predictions = [p for p in predictions if p["lga_id"] == lga_id]
    if risk_level:
        predictions = [p for p in predictions if p["risk_level"] == risk_level]

    target = target_date or date.today()
    results = [
        FloodRiskResponse(
            lga_id=p["lga_id"],
            prediction_date=target,
            flood_probability=p["flood_probability"],
            risk_level=p["risk_level"],
            compound_score=p["compound_score"],
            compound_risk_level=p["compound_risk_level"],
        )
        for p in predictions
    ]

    return FloodRiskListResponse(predictions=results, date=target, total=len(results))


@router.post("/compound-risk", response_model=CompoundRiskListResponse)
async def get_compound_risk(request: CompoundRiskRequest):
    """Get compound vulnerability scores (flood + health proxy)."""
    try:
        predictions = _get_cached_predictions()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Compound risk pipeline failed")
        raise HTTPException(status_code=500, detail="Prediction failed") from exc

    if request.lga_ids:
        lga_set = set(request.lga_ids)
        predictions = [p for p in predictions if p["lga_id"] in lga_set]
    else:
        predictions = predictions[:100]

    results = [
        CompoundRiskResponse(
            lga_id=p["lga_id"],
            compound_score=p["compound_score"] or 0.0,
            risk_level=p["compound_risk_level"] or "unknown",
            components={"flood_probability": p["flood_probability"]},
        )
        for p in predictions
    ]

    return CompoundRiskListResponse(results=results, total=len(results))


@router.get("/alerts", response_model=ClimateAlertListResponse)
async def get_climate_alerts(
    limit: int = Query(50, le=200),
    risk_level: str | None = None,
):
    """Return alerts derived from current high-risk predictions."""
    try:
        predictions = _get_cached_predictions()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    high_risk = [
        p for p in predictions
        if p["risk_level"] in ("warning", "emergency")
        and (risk_level is None or p["risk_level"] == risk_level)
    ][:limit]

    alerts = [
        ClimateAlertResponse(
            id=f"alert_{p['lga_id']}_{date.today().isoformat()}",
            type="climate",
            risk_level=p["risk_level"],
            message=(
                f"Flood {p['risk_level']} for LGA {p['lga_id']}: "
                f"probability {p['flood_probability']:.1%}"
            ),
            lga_id=p["lga_id"],
            created_at=date.today().isoformat(),
        )
        for p in high_risk
    ]

    return ClimateAlertListResponse(alerts=alerts, total=len(alerts))


@router.post("/retrain", response_model=TrainingResponse)
async def trigger_retrain():
    """Clear prediction cache so next request re-runs the pipeline."""
    global _cache, _cache_ts, _model, _static_features, _lga_metadata
    _cache = None
    _cache_ts = 0.0
    _model = None
    _static_features = None
    _lga_metadata = None
    return TrainingResponse(status="ok", message="Cache cleared — next request will reload model.")


@router.get("/lagdo-dam", response_model=LagdoDamResponse)
async def get_lagdo_dam_status():
    """Get current Lagdo Dam risk status from GloFAS."""
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

    affected = [a.strip() for a in os.getenv("LAGDO_AFFECTED_LGAS", "").split(",") if a.strip()]

    return LagdoDamResponse(
        risk_level=risk.get("risk_level", "unknown"),
        discharge_m3s=risk.get("yola_discharge_m3s", 0),
        threshold_m3s=3000,
        affected_lgas=affected,
    )
