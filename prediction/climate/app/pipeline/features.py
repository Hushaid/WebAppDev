"""Feature engineering for flood prediction.

Combines static terrain features with dynamic climate features per LGA.
"""

import os

import numpy as np
import pandas as pd

# Nigeria has 774 LGAs
N_LGAS = 774


def build_static_features(
    terrain_features: dict[str, dict[str, float]],
    lga_metadata: pd.DataFrame,
) -> pd.DataFrame:
    """Build static feature matrix from terrain and metadata.

    Args:
        terrain_features: Output of terrain.extract_terrain_features().
        lga_metadata: DataFrame with lga_id, name, population_density,
                      distance_to_river, historical_flood_count, land_cover.
    """
    rows = []
    for _, lga in lga_metadata.iterrows():
        name = lga.get("name", "")
        terrain = terrain_features.get(name, {})

        rows.append({
            "lga_id": lga["lga_id"],
            "hand_mean": terrain.get("hand_mean", 0),
            "hand_min": terrain.get("hand_min", 0),
            "hand_std": terrain.get("hand_std", 0),
            "twi_mean": terrain.get("twi_mean", 0),
            "twi_max": terrain.get("twi_max", 0),
            "slope_mean": terrain.get("slope_mean", 0),
            "population_density": lga.get("population_density", 0),
            "distance_to_river": lga.get("distance_to_river", 0),
            "historical_flood_count": lga.get("historical_flood_count", 0),
            "land_cover_urban": 1 if lga.get("land_cover") == "urban" else 0,
        })

    return pd.DataFrame(rows)


def build_dynamic_features(
    chirps_cumulative: dict[str, dict[str, float]],
    era5_soil: dict[str, float] | None,
    glofas_discharge: dict[str, float] | None,
    forecast_signals: dict[str, float] | None,
) -> pd.DataFrame:
    """Build dynamic feature matrix from daily climate data.

    Args:
        chirps_cumulative: {lga_id: {rain_1d, rain_3d, rain_7d, rain_14d, rain_30d}}.
        era5_soil: {lga_id: soil_moisture_value}.
        glofas_discharge: {station_name: discharge_m3s}.
        forecast_signals: {lga_id: 0-1 forecast risk}.
    """
    rows = []
    for lga_id, rainfall in chirps_cumulative.items():
        row = {
            "lga_id": lga_id,
            "rain_1d": rainfall.get("rain_1d", 0),
            "rain_3d": rainfall.get("rain_3d", 0),
            "rain_7d": rainfall.get("rain_7d", 0),
            "rain_14d": rainfall.get("rain_14d", 0),
            "rain_30d": rainfall.get("rain_30d", 0),
        }

        # Rainfall intensity ratios
        rain_30d = row["rain_30d"] or 1
        row["rain_7d_ratio"] = row["rain_7d"] / rain_30d
        row["rain_3d_ratio"] = row["rain_3d"] / rain_30d

        # Soil moisture
        if era5_soil:
            row["soil_moisture"] = era5_soil.get(lga_id, 0.3)
        else:
            row["soil_moisture"] = 0.3  # default

        # Forecast risk signal
        if forecast_signals:
            row["forecast_risk"] = forecast_signals.get(lga_id, 0)
        else:
            row["forecast_risk"] = 0

        rows.append(row)

    df = pd.DataFrame(rows)

    # Add river discharge features (broadcast to all LGAs in affected basins)
    if glofas_discharge:
        df["benue_discharge_max"] = max(
            glofas_discharge.get("makurdi", 0),
            glofas_discharge.get("yola", 0),
            glofas_discharge.get("lokoja", 0),
        )
        df["niger_discharge_max"] = max(
            glofas_discharge.get("jebba", 0),
            glofas_discharge.get("baro", 0),
        )
    else:
        df["benue_discharge_max"] = 0
        df["niger_discharge_max"] = 0

    return df


def merge_features(
    static: pd.DataFrame,
    dynamic: pd.DataFrame,
) -> pd.DataFrame:
    """Merge static and dynamic features into a single feature matrix."""
    merged = static.merge(dynamic, on="lga_id", how="left")
    merged = merged.fillna(0)
    return merged


FEATURE_NAMES = [
    # Static
    "hand_mean",
    "hand_min",
    "hand_std",
    "twi_mean",
    "twi_max",
    "slope_mean",
    "population_density",
    "distance_to_river",
    "historical_flood_count",
    "land_cover_urban",
    # Dynamic
    "rain_1d",
    "rain_3d",
    "rain_7d",
    "rain_14d",
    "rain_30d",
    "rain_7d_ratio",
    "rain_3d_ratio",
    "soil_moisture",
    "forecast_risk",
    "benue_discharge_max",
    "niger_discharge_max",
]
