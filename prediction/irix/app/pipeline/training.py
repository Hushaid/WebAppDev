"""IRIX training pipeline: data ingestion → aggregation → BYM2 fit → prediction → store.

Orchestrates the full IRIX computation flow:
1. Pull risk_classifications + GPS from PostgreSQL
2. Assign H3 cells, aggregate features
3. Build spatial weights (queen contiguity)
4. Fit BYM2 model (or load cached)
5. Predict risk for ALL cells (including sparse-data areas)
6. Detect hotspots (LISA + Gi*)
7. Store results to irix_scores / irix_trends
"""

import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

from app.pipeline.aggregation import assign_h3_cells, aggregate_by_h3
from app.pipeline.spatial_weights import build_h3_adjacency, weights_to_sparse
from app.pipeline.hotspot import detect_lisa_hotspots, detect_getis_hotspots, classify_hotspot_type
from app.models.bym2 import fit_bym2, predict_risk
from app.models.registry import log_model_run

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/srhr",
)

# Risk thresholds (matching frontend scoring engine)
STI_HIGH = 13
MATERNAL_HIGH = 15
COMMUNITY_HIGH = 7


def classify_risk_level(score: float, max_score: float) -> str:
    """Classify a score into low/medium/high based on thirds."""
    third = max_score / 3
    if score >= 2 * third:
        return "high"
    if score >= third:
        return "medium"
    return "low"


def fetch_submissions(
    engine,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    disease_group: str | None = None,
) -> pd.DataFrame:
    """Fetch risk classifications with GPS data from PostgreSQL."""
    query = """
        SELECT
            s.id as submission_id,
            s.gps_lat,
            s.gps_lng,
            s.created_at,
            rc.sti_score,
            rc.sti_risk_level,
            rc.maternal_score,
            rc.maternal_risk_level,
            rc.community_wellbeing_score,
            rc.community_wellbeing_risk_level,
            rc.overall_risk_level,
            rc.aggregate_score
        FROM submissions s
        JOIN risk_classifications rc ON rc.submission_id = s.id
        WHERE s.gps_lat IS NOT NULL
          AND s.gps_lng IS NOT NULL
    """
    params = {}
    if date_from:
        query += " AND s.created_at >= :date_from"
        params["date_from"] = date_from
    if date_to:
        query += " AND s.created_at <= :date_to"
        params["date_to"] = date_to

    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn, params=params)

    return df


def store_irix_scores(engine, results: pd.DataFrame, model_version: str):
    """Write computed IRIX scores to the database."""
    now = datetime.now(timezone.utc)

    records = []
    for _, row in results.iterrows():
        records.append({
            "geographic_unit_id": row.get("geographic_unit_id"),
            "computed_at": now,
            "model_version": model_version,
            "sti_avg_score": row.get("sti_avg_score"),
            "sti_risk_level": classify_risk_level(row.get("sti_avg_score", 0), 18),
            "maternal_avg_score": row.get("maternal_avg_score"),
            "maternal_risk_level": (
                classify_risk_level(row["maternal_avg_score"], 21)
                if pd.notna(row.get("maternal_avg_score"))
                else None
            ),
            "community_wellbeing_avg_score": row.get("community_wellbeing_avg_score"),
            "community_wellbeing_risk_level": classify_risk_level(
                row.get("community_wellbeing_avg_score", 0), 9
            ),
            "overall_irix_score": row["mean_score"],
            "overall_risk_level": classify_risk_level(row["mean_score"], 48),
            "submission_count": int(row.get("submission_count", 0)),
            "hotspot_flag": bool(row.get("confirmed_hotspot", False)),
            "confidence_lower": row.get("ci_lower"),
            "confidence_upper": row.get("ci_upper"),
        })

    if records:
        df_out = pd.DataFrame(records)
        with engine.connect() as conn:
            df_out.to_sql("irix_scores", conn, if_exists="append", index=False)
            conn.commit()


def run_pipeline(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    disease_group: str | None = None,
    model_version: str = "bym2-v1",
) -> dict:
    """Run the full IRIX prediction pipeline.

    Returns summary metrics.
    """
    engine = create_engine(DATABASE_URL)

    # 1. Fetch data
    df = fetch_submissions(engine, date_from, date_to, disease_group)
    if df.empty:
        return {"status": "no_data", "submission_count": 0}

    # 2. Assign H3 cells and aggregate
    df = assign_h3_cells(df)
    agg = aggregate_by_h3(df)

    if len(agg) < 3:
        return {"status": "insufficient_cells", "cell_count": len(agg)}

    # 3. Build spatial weights
    h3_indices = agg["h3_index"].tolist()
    weights = build_h3_adjacency(h3_indices)
    node1, node2, n_edges = weights_to_sparse(weights)

    # 4. Fit BYM2 model
    observed = agg["overall_avg_score"].values
    trace = fit_bym2(
        observed_scores=observed,
        covariates=None,  # TODO: add auxiliary covariates
        node1=node1,
        node2=node2,
        n_areas=len(h3_indices),
        n_edges=n_edges,
        n_samples=500,
        n_tune=500,
        n_chains=2,
    )

    # 5. Extract predictions
    predictions = predict_risk(trace, len(h3_indices))
    agg["mean_score"] = predictions["mean_scores"]
    agg["ci_lower"] = predictions["ci_lower"]
    agg["ci_upper"] = predictions["ci_upper"]

    # 6. Hotspot detection
    lisa = detect_lisa_hotspots(agg["mean_score"].values, weights)
    gi = detect_getis_hotspots(agg["mean_score"].values, weights)
    hotspots = classify_hotspot_type(lisa, gi)
    agg["confirmed_hotspot"] = hotspots["confirmed_hotspot"].values

    # 7. Store results
    store_irix_scores(engine, agg, model_version)

    # 8. Log to MLflow
    n_hotspots = int(agg["confirmed_hotspot"].sum())
    log_model_run(
        model_type="bym2",
        metrics={
            "n_cells": len(agg),
            "n_submissions": int(df.shape[0]),
            "n_hotspots": n_hotspots,
            "mean_irix_score": float(agg["mean_score"].mean()),
        },
        params={
            "model_version": model_version,
            "h3_resolution": 7,
            "date_from": str(date_from) if date_from else "all",
            "date_to": str(date_to) if date_to else "all",
        },
    )

    return {
        "status": "complete",
        "cell_count": len(agg),
        "submission_count": int(df.shape[0]),
        "hotspot_count": n_hotspots,
        "mean_score": float(agg["mean_score"].mean()),
    }
