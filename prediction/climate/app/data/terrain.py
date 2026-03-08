"""Terrain feature derivation from FABDEM elevation data.

Computes hydrological features: HAND (Height Above Nearest Drainage),
TWI (Topographic Wetness Index), slope, and flow accumulation using whitebox.
These are static features computed once and cached.
"""

import os

import numpy as np
import rasterio

DATA_DIR = os.getenv("CLIMATE_DATA_DIR", "/tmp/climate_data/terrain")


def compute_hand(dem_path: str, output_path: str | None = None) -> str:
    """Compute Height Above Nearest Drainage (HAND) from DEM.

    HAND is the vertical distance from each cell to its nearest
    drainage channel. Low HAND = high flood susceptibility.
    """
    import whitebox

    wbt = whitebox.WhiteboxTools()
    wbt.set_verbose_mode(False)

    os.makedirs(DATA_DIR, exist_ok=True)
    out = output_path or os.path.join(DATA_DIR, "hand.tif")

    # Step 1: Fill depressions
    filled = os.path.join(DATA_DIR, "dem_filled.tif")
    wbt.breach_depressions_least_cost(dem_path, filled, dist=5)

    # Step 2: Flow direction (D8)
    flow_dir = os.path.join(DATA_DIR, "flow_dir.tif")
    wbt.d8_pointer(filled, flow_dir)

    # Step 3: Flow accumulation
    flow_acc = os.path.join(DATA_DIR, "flow_acc.tif")
    wbt.d8_flow_accumulation(filled, flow_acc)

    # Step 4: Extract streams (threshold-based)
    streams = os.path.join(DATA_DIR, "streams.tif")
    wbt.extract_streams(flow_acc, streams, threshold=1000)

    # Step 5: HAND
    wbt.elevation_above_stream(filled, streams, out)

    return out


def compute_twi(dem_path: str, output_path: str | None = None) -> str:
    """Compute Topographic Wetness Index (TWI).

    TWI = ln(a / tan(β)) where a is specific catchment area
    and β is local slope. High TWI = flat, convergent areas prone to flooding.
    """
    import whitebox

    wbt = whitebox.WhiteboxTools()
    wbt.set_verbose_mode(False)

    os.makedirs(DATA_DIR, exist_ok=True)
    out = output_path or os.path.join(DATA_DIR, "twi.tif")

    wbt.wetness_index(dem_path, out)

    return out


def compute_slope(dem_path: str, output_path: str | None = None) -> str:
    """Compute slope from DEM."""
    import whitebox

    wbt = whitebox.WhiteboxTools()
    wbt.set_verbose_mode(False)

    os.makedirs(DATA_DIR, exist_ok=True)
    out = output_path or os.path.join(DATA_DIR, "slope.tif")

    wbt.slope(dem_path, out, units="degrees")

    return out


def extract_terrain_features(
    lga_geometries,
    hand_path: str,
    twi_path: str,
    slope_path: str,
) -> dict[str, dict[str, float]]:
    """Extract zonal terrain statistics per LGA.

    Returns dict mapping LGA name to {hand_mean, hand_min, twi_mean, slope_mean}.
    """
    from rasterstats import zonal_stats

    features = {}

    hand_stats = zonal_stats(lga_geometries, hand_path, stats=["mean", "min", "std"])
    twi_stats = zonal_stats(lga_geometries, twi_path, stats=["mean", "max"])
    slope_stats = zonal_stats(lga_geometries, slope_path, stats=["mean"])

    for i, geom in enumerate(lga_geometries):
        name = geom.get("properties", {}).get("NAME_2", f"lga_{i}")
        features[name] = {
            "hand_mean": hand_stats[i].get("mean", 0) or 0,
            "hand_min": hand_stats[i].get("min", 0) or 0,
            "hand_std": hand_stats[i].get("std", 0) or 0,
            "twi_mean": twi_stats[i].get("mean", 0) or 0,
            "twi_max": twi_stats[i].get("max", 0) or 0,
            "slope_mean": slope_stats[i].get("mean", 0) or 0,
        }

    return features
