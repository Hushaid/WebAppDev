"""Hotspot detection using Local Moran's I (LISA) and Getis-Ord Gi* statistics.

Identifies statistically significant spatial clusters of high (or low) SRHR risk.
Also includes SKATER regionalization for defining contiguous intervention zones.
"""

import numpy as np
import pandas as pd
from esda.moran import Moran_Local
from esda.getisord import G_Local
from libpysal.weights import W


def detect_lisa_hotspots(
    scores: np.ndarray,
    weights: W,
    p_threshold: float = 0.05,
) -> pd.DataFrame:
    """Detect hotspots using Local Moran's I (LISA).

    Returns DataFrame with columns:
        index, lisa_statistic, p_value, quadrant, significant
    Quadrants:
        1 = HH (high-high cluster — hotspot)
        2 = LH (low-high outlier)
        3 = LL (low-low cluster — coldspot)
        4 = HL (high-low outlier)
    """
    lisa = Moran_Local(scores, weights)

    quadrant_labels = {1: "HH", 2: "LH", 3: "LL", 4: "HL"}

    results = pd.DataFrame({
        "lisa_statistic": lisa.Is,
        "p_value": lisa.p_sim,
        "quadrant": lisa.q,
        "quadrant_label": [quadrant_labels.get(q, "NS") for q in lisa.q],
        "significant": lisa.p_sim < p_threshold,
    })

    return results


def detect_getis_hotspots(
    scores: np.ndarray,
    weights: W,
    p_threshold: float = 0.05,
) -> pd.DataFrame:
    """Detect hotspots using Getis-Ord Gi* statistic.

    Gi* identifies clusters of high values (hotspots) and low values (coldspots)
    based on the local sum relative to the global sum.
    """
    gi = G_Local(scores, weights, star=True)

    results = pd.DataFrame({
        "gi_statistic": gi.Zs,
        "p_value": gi.p_sim,
        "hotspot": (gi.Zs > 0) & (gi.p_sim < p_threshold),
        "coldspot": (gi.Zs < 0) & (gi.p_sim < p_threshold),
        "significant": gi.p_sim < p_threshold,
    })

    return results


def classify_hotspot_type(
    lisa_results: pd.DataFrame,
    gi_results: pd.DataFrame,
) -> pd.DataFrame:
    """Combine LISA and Gi* results for robust hotspot classification.

    A cell is classified as a hotspot if BOTH methods agree.
    """
    combined = pd.DataFrame({
        "lisa_significant": lisa_results["significant"],
        "lisa_quadrant": lisa_results["quadrant_label"],
        "gi_significant": gi_results["significant"],
        "gi_hotspot": gi_results["hotspot"],
        "gi_coldspot": gi_results["coldspot"],
    })

    # Hotspot: LISA HH + Gi* hotspot
    combined["confirmed_hotspot"] = (
        combined["lisa_significant"]
        & (combined["lisa_quadrant"] == "HH")
        & combined["gi_hotspot"]
    )

    # Coldspot: LISA LL + Gi* coldspot
    combined["confirmed_coldspot"] = (
        combined["lisa_significant"]
        & (combined["lisa_quadrant"] == "LL")
        & combined["gi_coldspot"]
    )

    return combined
