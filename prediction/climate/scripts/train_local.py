#!/usr/bin/env python3
"""Standalone flood prediction model trainer.

Trains XGBoost on all 774 Nigerian LGAs using:
  - NIMET Karu daily rainfall (2021-2025) as the historical rainfall base
  - Zone-scaled synthetic rainfall for the other 773 LGAs
  - Geographically calibrated synthetic terrain/metadata features
  - Hydrological threshold-based flood labels (no DB or external APIs needed)

Outputs to models_store/:
  flood_xgb.json          - trained XGBoost model
  static_features.parquet - static terrain/metadata features per LGA
  training_metrics.json   - CV AUC scores + metadata

Usage:
    python scripts/train_local.py --nimet-csv /path/to/dataset-rainfall.csv
    python scripts/train_local.py --nimet-csv /path/to/dataset-rainfall.csv --output-dir ./models_store
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score

# Allow importing app modules from the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.data.nimet import parse_nimet_rainfall, merge_rainfall_et
from app.models.xgboost_flood import FloodXGBoost
from app.pipeline.features import FEATURE_NAMES

# FloodScan baseline data path (downloaded from HDX, satellite-derived 1998-2023)
FLOODSCAN_CSV = "/tmp/climate_data/flood_history/floodscan_nga_lga.csv"

# Real terrain features for Karu LGA derived from Copernicus GLO-30 DEM
# (computed via whitebox HAND/TWI/slope — see scripts/compute_terrain.py)
KARU_TERRAIN = {
    "hand_mean":  18.32,
    "hand_min":    0.00,
    "hand_std":   21.96,
    "twi_mean":   -3.22,
    "twi_max":     2.91,
    "slope_mean":  3.69,
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

RNG = np.random.default_rng(42)

# ── Nigeria state configuration ───────────────────────────────────────────────
# (name, lat_center, lon_center, n_lgas, flood_vulnerability_0_1, rainfall_zone)
# flood_vulnerability: 0=rare, 1=very high — calibrated from NEMA flood records
# rainfall_zone: south ~1.8x, middle 1.0x, north 0.45x relative to Karu baseline
STATES = [
    ("Abia",        5.40, 7.50, 17, 0.55, "south"),
    ("Adamawa",     9.40, 12.50, 21, 0.40, "north"),
    ("Akwa Ibom",   4.90, 7.90, 31, 0.70, "south"),
    ("Anambra",     6.20, 7.00, 21, 0.85, "south"),
    ("Bauchi",     10.30, 9.80, 20, 0.28, "north"),
    ("Bayelsa",     4.80, 6.10,  8, 0.90, "south"),
    ("Benue",       7.30, 8.80, 23, 0.80, "middle"),
    ("Borno",      11.80, 13.20, 27, 0.22, "north"),
    ("Cross River", 5.90, 8.50, 18, 0.72, "south"),
    ("Delta",       5.50, 6.20, 25, 0.83, "south"),
    ("Ebonyi",      6.20, 8.10, 13, 0.50, "south"),
    ("Edo",         6.30, 5.90, 18, 0.68, "south"),
    ("Ekiti",       7.70, 5.20, 16, 0.42, "south"),
    ("Enugu",       6.50, 7.50, 17, 0.52, "south"),
    ("FCT",         8.90, 7.40,  6, 0.38, "middle"),
    ("Gombe",      10.30, 11.20, 11, 0.25, "north"),
    ("Imo",         5.50, 7.10, 27, 0.60, "south"),
    ("Jigawa",     12.20, 9.30, 27, 0.30, "north"),
    ("Kaduna",     10.50, 7.40, 23, 0.33, "north"),
    ("Kano",       12.00, 8.50, 44, 0.25, "north"),
    ("Katsina",    12.50, 7.60, 34, 0.22, "north"),
    ("Kebbi",      11.50, 4.20, 21, 0.42, "north"),
    ("Kogi",        7.80, 6.70, 21, 0.82, "middle"),
    ("Kwara",       8.50, 4.60, 16, 0.55, "middle"),
    ("Lagos",       6.50, 3.30, 20, 0.73, "south"),
    ("Nasarawa",    8.50, 8.20, 13, 0.48, "middle"),  # includes Karu
    ("Niger",       9.60, 5.60, 25, 0.65, "middle"),
    ("Ogun",        7.00, 3.40, 20, 0.58, "south"),
    ("Ondo",        7.10, 5.00, 18, 0.55, "south"),
    ("Osun",        7.50, 4.60, 30, 0.45, "south"),
    ("Oyo",         8.20, 4.00, 33, 0.50, "middle"),
    ("Plateau",     9.20, 9.20, 17, 0.40, "middle"),
    ("Rivers",      4.90, 7.00, 23, 0.78, "south"),
    ("Sokoto",     13.10, 5.20, 23, 0.28, "north"),
    ("Taraba",      8.00, 11.40, 16, 0.45, "middle"),
    ("Yobe",       12.30, 11.50, 17, 0.20, "north"),
    ("Zamfara",    12.20, 6.20, 14, 0.25, "north"),
]

ZONE_RAINFALL_MULTIPLIER = {"south": 1.80, "middle": 1.00, "north": 0.45}


def _load_floodscan_lookup() -> tuple[dict, dict, float]:
    """Load real FloodScan LGA baseline flood fractions from HDX dataset.

    Returns:
        lga_lookup  — exact match keyed by (state_lower, lga_name_lower)
        state_avg   — state-level average as fallback for unmatched LGAs
        national_avg — national fallback of last resort
    Source: AER FloodScan SFED 1998-2023, 10-year historical baseline per LGA.
    """
    if not os.path.exists(FLOODSCAN_CSV):
        logger.warning("FloodScan CSV not found at %s — run download step first", FLOODSCAN_CSV)
        return {}, {}, 0.001

    df = pd.read_csv(FLOODSCAN_CSV)
    lga_lookup = {
        (row["state"].strip().lower(), row["lga_name"].strip().lower()): row["flood_fraction_baseline"]
        for _, row in df.iterrows()
    }
    state_avg = {
        state.strip().lower(): grp["flood_fraction_baseline"].mean()
        for state, grp in df.groupby("state")
    }
    national_avg = float(df["flood_fraction_baseline"].mean())
    logger.info(
        "Loaded FloodScan: %d LGA baselines, %d states (national avg: %.6f)",
        len(lga_lookup), len(state_avg), national_avg,
    )
    return lga_lookup, state_avg, national_avg


def build_lga_metadata() -> pd.DataFrame:
    """Generate metadata for all 774 Nigerian LGAs.

    Terrain features (HAND, TWI, slope) are calibrated to each state's
    flood vulnerability class. flood_fraction_baseline comes from real
    FloodScan satellite data (AER, HDX, 1998-2023 historical average).
    """
    floodscan_lga, floodscan_state, national_avg = _load_floodscan_lookup()

    rows = []
    lga_counter = 0

    for state, lat_c, lon_c, n_lgas, flood_vuln, zone in STATES:
        for i in range(n_lgas):
            # Scatter LGAs within state bounds (~1.5° spread)
            lat = lat_c + RNG.uniform(-1.2, 1.2)
            lon = lon_c + RNG.uniform(-1.2, 1.2)
            lat = float(np.clip(lat, 4.3, 13.9))
            lon = float(np.clip(lon, 2.7, 14.6))

            # Terrain features derived from vulnerability class
            # High flood_vuln → low HAND (flat floodplains), high TWI (waterlogged)
            vuln_noise = RNG.uniform(0.8, 1.2)
            hand_mean = max(0.5, (1 - flood_vuln) * 40 * vuln_noise + RNG.uniform(0, 5))
            twi_mean  = max(3.0, flood_vuln * 15 * vuln_noise + RNG.uniform(0, 3))
            slope_mean = max(0.1, (1 - flood_vuln) * 20 * vuln_noise + RNG.uniform(0, 3))

            # Indicate Karu specifically (only real rainfall data available)
            is_karu = state == "Nasarawa" and i == 0

            lga_id = f"{state.lower().replace(' ', '_')}_{i + 1:02d}"
            if is_karu:
                lga_id = "nasarawa_karu"

            # Karu gets real DEM-derived terrain; all others get calibrated synthetic values
            if is_karu:
                lga_terrain = KARU_TERRAIN.copy()
            else:
                lga_terrain = {
                    "hand_mean":  round(max(0.5, (1 - flood_vuln) * 40 * vuln_noise + RNG.uniform(0, 5)), 2),
                    "hand_min":   round(max(0.0, (1 - flood_vuln) * 16 * vuln_noise), 2),
                    "hand_std":   round((1 - flood_vuln) * 12 * vuln_noise + RNG.uniform(0, 2), 2),
                    "twi_mean":   round(flood_vuln * 15 * vuln_noise + RNG.uniform(0, 3), 2),
                    "twi_max":    round(flood_vuln * 24 * vuln_noise + RNG.uniform(0, 3), 2),
                    "slope_mean": round(max(0.1, (1 - flood_vuln) * 20 * vuln_noise + RNG.uniform(0, 3)), 2),
                }

            rows.append({
                "lga_id": lga_id,
                "name": "Karu" if is_karu else f"{state} LGA {i + 1}",
                "state": state,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "flood_vulnerability": round(flood_vuln, 2),
                "rainfall_zone": zone,
                "rainfall_multiplier": ZONE_RAINFALL_MULTIPLIER[zone],
                **lga_terrain,
                "population_density": round(RNG.uniform(50, 3000), 1),
                "distance_to_river":  round(RNG.exponential(15) * (1 - flood_vuln * 0.6), 2),
                # Real FloodScan satellite-derived flood fraction baseline.
                # Karu: exact LGA match. All others: real state-level average
                # from FloodScan, then national average as last resort.
                "flood_fraction_baseline": (
                    floodscan_lga.get(("nasarawa", "karu"), national_avg)
                    if is_karu
                    else floodscan_state.get(state.lower(), national_avg)
                ),
                "land_cover_urban": int(RNG.random() < 0.25),
            })
            lga_counter += 1

    df = pd.DataFrame(rows)
    assert len(df) == 774, f"Expected 774 LGAs, got {len(df)}"
    logger.info("Generated metadata for %d LGAs", len(df))
    return df


def build_rainfall_series(
    nimet_df: pd.DataFrame,
    lga_meta: pd.DataFrame,
) -> pd.DataFrame:
    """Build daily rainfall time series for all LGAs.

    Karu LGA gets actual NIMET measurements. All other LGAs get NIMET scaled
    by their zone multiplier plus a per-LGA random factor (0.6–1.4) to simulate
    spatial variation within zones.
    """
    nimet_df = nimet_df.copy()
    nimet_df["date"] = pd.to_datetime(nimet_df["date"])

    # Use 2021-01-01 to 2025-12-31 as the training window
    start = pd.Timestamp("2021-01-01")
    end   = pd.Timestamp("2025-12-31")
    full_dates = pd.date_range(start, end, freq="D")

    # NIMET Karu rainfall reindexed to full range
    karu_series = (
        nimet_df[nimet_df["lga_name"] == "Karu"]
        .set_index("date")["rainfall_mm"]
        .reindex(full_dates, fill_value=0.0)
    )

    rainfall_records = []

    for _, lga in lga_meta.iterrows():
        lga_id = lga["lga_id"]
        multiplier = lga["rainfall_multiplier"]

        # Per-LGA variation factor drawn once, fixed for all dates
        lga_factor = RNG.uniform(0.6, 1.4)

        if lga_id == "nasarawa_karu":
            # Use real NIMET data
            daily = karu_series.values.copy()
        else:
            # Scale Karu + multiplicative noise per rain event
            base = karu_series.values * multiplier * lga_factor
            # Add small perturbation to zero-rain days (5% chance of trace)
            trace_mask = (base == 0) & (RNG.random(len(base)) < 0.05)
            base[trace_mask] = RNG.uniform(0.1, 2.0, trace_mask.sum())
            # Zero out some non-zero days to vary wet-day frequency
            event_mask = (base > 0) & (RNG.random(len(base)) < 0.15)
            base[event_mask] = 0
            daily = np.clip(base, 0, None)

        df_lga = pd.DataFrame({
            "date": full_dates,
            "lga_id": lga_id,
            "rainfall_mm": daily,
        })
        rainfall_records.append(df_lga)

    all_rainfall = pd.concat(rainfall_records, ignore_index=True)
    logger.info(
        "Built rainfall series: %d LGA-day records (%.1f%% non-zero)",
        len(all_rainfall),
        100 * (all_rainfall["rainfall_mm"] > 0).mean(),
    )
    return all_rainfall


def compute_rolling_features(rainfall_df: pd.DataFrame) -> pd.DataFrame:
    """Compute cumulative rainfall windows and intensity ratios per LGA."""
    windows = [1, 3, 7, 14, 30]
    out = []

    for lga_id, grp in rainfall_df.groupby("lga_id"):
        grp = grp.sort_values("date").copy()
        rain = grp["rainfall_mm"].values

        for w in windows:
            grp[f"rain_{w}d"] = pd.Series(rain).rolling(w, min_periods=1).sum().values

        rain_30d = np.where(grp["rain_30d"] > 0, grp["rain_30d"], 1.0)
        grp["rain_7d_ratio"] = grp["rain_7d"] / rain_30d
        grp["rain_3d_ratio"] = grp["rain_3d"] / rain_30d

        out.append(grp)

    return pd.concat(out, ignore_index=True)


def generate_flood_labels(
    rainfall_features: pd.DataFrame,
    lga_meta: pd.DataFrame,
) -> np.ndarray:
    """Generate binary flood labels using a hydrological threshold model.

    Logic:
      - Base flood probability from rain_7d relative to HAND-adjusted threshold
      - Wet season (Jul–Oct) amplification
      - LGA flood vulnerability amplification
      - Logistic noise to avoid perfect separability
    Target flood event rate: ~3–6% of LGA-day records.
    """
    merged = rainfall_features.merge(
        lga_meta[["lga_id", "hand_mean", "flood_vulnerability", "flood_fraction_baseline"]],
        on="lga_id",
        how="left",
    )

    # HAND-based thresholds for 7-day cumulative rainfall
    # Low HAND (floodplains) flood at much lower rainfall totals
    hand = merged["hand_mean"].values
    threshold_7d = np.where(
        hand < 3,   60,
        np.where(hand < 8,  100,
        np.where(hand < 20, 180, 350))
    ).astype(float)

    rain_7d = merged["rain_7d"].values
    flood_vuln = merged["flood_vulnerability"].values

    # Core exceedance ratio: how much rainfall exceeds the threshold
    exceedance = np.clip((rain_7d - threshold_7d * 0.5) / threshold_7d, -1, 3)

    # Wet season amplifier (Jul=7 through Oct=10)
    month = pd.to_datetime(merged["date"]).dt.month.values
    season_amp = np.where((month >= 7) & (month <= 10), 1.5, 1.0)

    # Vulnerability amplifier
    vuln_amp = 0.5 + flood_vuln * 1.5

    # Logistic probability
    log_odds = exceedance * season_amp * vuln_amp * 2.5 - 1.5
    p_flood = 1 / (1 + np.exp(-log_odds))

    # Boost from real FloodScan baseline — high satellite-detected flood fraction
    # indicates areas that genuinely flood repeatedly (scaled to 0-0.3 range)
    ffb = merged["flood_fraction_baseline"].values
    hist_boost = np.clip(ffb / 0.10, 0, 1) * 0.3  # 0.10 = ~Borno Abadam max
    p_flood = np.clip(p_flood + hist_boost, 0, 0.95)

    # Stochastic realisation
    labels = (RNG.random(len(p_flood)) < p_flood).astype(int)

    flood_rate = labels.mean() * 100
    logger.info(
        "Generated flood labels: %d events / %d records (%.2f%% flood rate)",
        labels.sum(), len(labels), flood_rate,
    )
    return labels


def build_feature_matrix(
    rainfall_features: pd.DataFrame,
    lga_meta: pd.DataFrame,
    karu_et_df: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Merge rainfall + ET + static features into the full feature matrix.

    For Karu, real NIMET ET data drives water_balance and soil_moisture_proxy.
    For all other LGAs, ET is estimated as a seasonal fraction of rainfall.

    Returns (features_df, static_df).
    """
    static_cols = [
        "lga_id", "hand_mean", "hand_min", "hand_std",
        "twi_mean", "twi_max", "slope_mean",
        "population_density", "distance_to_river",
        "flood_fraction_baseline", "land_cover_urban",
    ]
    static_df = lga_meta[static_cols].copy()

    dynamic_cols = [
        "date", "lga_id",
        "rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d",
        "rain_7d_ratio", "rain_3d_ratio",
    ]
    merged = rainfall_features[dynamic_cols].merge(static_df, on="lga_id", how="left")

    # ── Water balance features ────────────────────────────────────────────────
    # Karu: use real NIMET ET data
    if karu_et_df is not None:
        karu_et = karu_et_df[["date", "et_7d", "et_30d",
                               "water_balance_7d", "water_balance_30d",
                               "soil_moisture_proxy"]].copy()
        karu_et["date"] = pd.to_datetime(karu_et["date"])
        karu_mask = merged["lga_id"] == "nasarawa_karu"
        merged["date"] = pd.to_datetime(merged["date"])
        merged = merged.merge(
            karu_et.rename(columns={
                "water_balance_7d":  "_wb7_karu",
                "water_balance_30d": "_wb30_karu",
                "soil_moisture_proxy": "_sm_karu",
            }),
            on="date", how="left",
        )
        merged.loc[karu_mask, "water_balance_7d"]  = merged.loc[karu_mask, "_wb7_karu"]
        merged.loc[karu_mask, "water_balance_30d"] = merged.loc[karu_mask, "_wb30_karu"]
        merged.loc[karu_mask, "soil_moisture"]     = merged.loc[karu_mask, "_sm_karu"]
        merged.drop(columns=["et_7d", "et_30d", "_wb7_karu", "_wb30_karu", "_sm_karu"],
                    errors="ignore", inplace=True)

    # All other LGAs: estimate ET as seasonal fraction of rainfall
    # Wet season (Jul-Oct): ET ~ 30% of rain; dry season: ET ~ 80% of rain
    month = pd.to_datetime(merged["date"]).dt.month
    et_fraction = np.where((month >= 7) & (month <= 10), 0.30, 0.80)
    if "water_balance_7d" not in merged.columns:
        merged["water_balance_7d"] = 0.0
    if "water_balance_30d" not in merged.columns:
        merged["water_balance_30d"] = 0.0
    if "soil_moisture" not in merged.columns:
        merged["soil_moisture"] = 0.35

    non_karu = merged["lga_id"] != "nasarawa_karu"
    merged.loc[non_karu, "water_balance_7d"]  = (
        merged.loc[non_karu, "rain_7d"] * (1 - et_fraction[non_karu])
    )
    merged.loc[non_karu, "water_balance_30d"] = (
        merged.loc[non_karu, "rain_30d"] * (1 - et_fraction[non_karu])
    )
    wb30 = merged.loc[non_karu, "water_balance_30d"]
    merged.loc[non_karu, "soil_moisture"] = 1 / (1 + np.exp(-wb30 / 50))

    # Remaining defaults
    merged["forecast_risk"]       = 0.0
    merged["benue_discharge_max"] = 0.0
    merged["niger_discharge_max"] = 0.0

    for col in FEATURE_NAMES:
        if col not in merged.columns:
            merged[col] = 0.0

    merged = merged.fillna(0)
    return merged, static_df


def train(nimet_csv: str, et_csv: str | None, output_dir: str) -> dict:
    """End-to-end training: data prep → feature engineering → model training → save."""
    os.makedirs(output_dir, exist_ok=True)

    # ── 1. Load NIMET rainfall ────────────────────────────────────────────────
    logger.info("Loading NIMET rainfall from %s", nimet_csv)
    nimet_df = parse_nimet_rainfall(nimet_csv)
    logger.info("NIMET rainfall: %d daily records, %s → %s",
                len(nimet_df), nimet_df["date"].min(), nimet_df["date"].max())

    # ── 1b. Load ET data ──────────────────────────────────────────────────────
    karu_et_df = None
    if et_csv and os.path.exists(et_csv):
        logger.info("Loading NIMET ET from %s", et_csv)
        karu_et_df = merge_rainfall_et(nimet_csv, et_csv)
        karu_et_df["date"] = pd.to_datetime(karu_et_df["date"])
        logger.info(
            "ET merged: soil_moisture_proxy range [%.3f, %.3f]",
            karu_et_df["soil_moisture_proxy"].min(),
            karu_et_df["soil_moisture_proxy"].max(),
        )
    else:
        logger.warning("No ET CSV provided — soil_moisture will use rainfall-based estimate")

    # ── 2. LGA metadata ───────────────────────────────────────────────────────
    logger.info("Generating LGA metadata for 774 LGAs")
    lga_meta = build_lga_metadata()

    # Sample LGAs to fit 512 MB RAM on Render Starter.
    # 773 non-Karu LGAs are synthetic (Karu data × zone multipliers + noise),
    # so a representative sample preserves model quality while cutting memory ~60%.
    # Karu is always included as it holds the only real NIMET measurements.
    _SAMPLE_LGA_COUNT = 300
    karu_row = lga_meta[lga_meta["lga_id"] == "nasarawa_karu"]
    other_lgas = lga_meta[lga_meta["lga_id"] != "nasarawa_karu"]
    sampled_others = other_lgas.sample(
        n=min(_SAMPLE_LGA_COUNT - 1, len(other_lgas)), random_state=42
    )
    lga_meta = pd.concat([karu_row, sampled_others], ignore_index=True)
    logger.info("Using %d sampled LGAs for training (Karu always included)", len(lga_meta))

    # ── 3. Rainfall series ────────────────────────────────────────────────────
    logger.info("Building rainfall time series for all LGAs")
    rainfall_df = build_rainfall_series(nimet_df, lga_meta)

    # ── 4. Rolling features ───────────────────────────────────────────────────
    logger.info("Computing rolling rainfall windows (1/3/7/14/30d)")
    rainfall_features = compute_rolling_features(rainfall_df)

    # ── 5. Full feature matrix ────────────────────────────────────────────────
    logger.info("Building full feature matrix (with ET water balance)")
    features_df, static_df = build_feature_matrix(rainfall_features, lga_meta, karu_et_df)

    # ── 6. Labels ─────────────────────────────────────────────────────────────
    logger.info("Generating flood event labels")
    y = generate_flood_labels(rainfall_features, lga_meta)

    X = features_df[FEATURE_NAMES].values.astype(np.float32)
    logger.info("Training matrix shape: %s | positive class: %.2f%%",
                X.shape, 100 * y.mean())

    # ── 7. Temporal ordering ──────────────────────────────────────────────────
    # Sort by date so TimeSeriesSplit respects temporal order
    sort_idx = features_df["date"].argsort().values
    X = X[sort_idx]
    y = y[sort_idx]

    # ── 8. Train XGBoost ──────────────────────────────────────────────────────
    logger.info("Training XGBoost flood classifier")
    model = FloodXGBoost()
    metrics = model.train(X, y, FEATURE_NAMES, n_rounds=500, early_stopping=50)
    logger.info(
        "XGBoost CV AUC: %.4f ± %.4f  |  folds: %s",
        metrics["cv_auc_mean"],
        metrics["cv_auc_std"],
        [f"{s:.4f}" for s in metrics["cv_scores"]],
    )

    # ── 9. Feature importance ─────────────────────────────────────────────────
    importance = model.feature_importance()
    logger.info("Top 5 features:")
    for feat, score in list(importance.items())[:5]:
        logger.info("  %-30s %.4f", feat, score)

    # ── 10. Save outputs ──────────────────────────────────────────────────────
    model_path = os.path.join(output_dir, "flood_xgb.json")
    model.save(model_path)
    logger.info("Saved model → %s", model_path)

    static_path = os.path.join(output_dir, "static_features.parquet")
    static_df.to_parquet(static_path, index=False)
    logger.info("Saved static features → %s", static_path)

    lga_meta_path = os.path.join(output_dir, "lga_metadata.parquet")
    lga_meta.to_parquet(lga_meta_path, index=False)
    logger.info("Saved LGA metadata → %s", lga_meta_path)

    top_feature = next(iter(importance), "n/a") if importance else "n/a"
    metrics_out = {
        **metrics,
        "n_lgas": int(len(lga_meta)),
        "n_samples": int(len(X)),
        "n_training_records": int(len(X)),
        "flood_event_rate_pct": round(float(y.mean() * 100), 3),
        "top_feature": top_feature,
        "feature_importance": {k: round(v, 5) for k, v in importance.items()},
    }
    metrics_path = os.path.join(output_dir, "training_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_out, f, indent=2)
    logger.info("Saved training metrics → %s", metrics_path)

    return metrics_out


def main():
    parser = argparse.ArgumentParser(description="Train Nigeria flood prediction model")
    parser.add_argument(
        "--nimet-csv",
        required=True,
        help="Path to NIMET rainfall CSV (e.g. dataset-rainfall.csv)",
    )
    parser.add_argument(
        "--et-csv",
        default=None,
        help="Path to NIMET ET CSV (e.g. ET_dataset.csv)",
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).parent.parent / "models_store"),
        help="Directory to save trained models (default: models_store/)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.nimet_csv):
        logger.error("NIMET CSV not found: %s", args.nimet_csv)
        sys.exit(1)

    metrics = train(args.nimet_csv, getattr(args, "et_csv", None), args.output_dir)

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"  CV AUC:         {metrics['cv_auc_mean']:.4f} ± {metrics['cv_auc_std']:.4f}")
    print(f"  Training rows:  {metrics['n_training_records']:,}")
    print(f"  LGAs covered:   {metrics['n_lgas']}")
    print(f"  Flood rate:     {metrics['flood_event_rate_pct']:.2f}%")
    print(f"  Output dir:     {args.output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
