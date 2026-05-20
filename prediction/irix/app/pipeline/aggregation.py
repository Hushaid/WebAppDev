"""GPS → H3 cell assignment → feature aggregation for IRIX.

Each individual submission's GPS point maps to an H3 cell at resolution 7 (~5.16 km²).
Features are then aggregated per cell: mean scores, counts, proportions by risk level.
"""

import h3
import numpy as np
import pandas as pd


H3_RESOLUTION = 7


def gps_to_h3(lat: float, lng: float, resolution: int = H3_RESOLUTION) -> str:
    """Convert GPS coordinates to H3 hex index."""
    return h3.latlng_to_cell(lat, lng, resolution)


def assign_h3_cells(df: pd.DataFrame) -> pd.DataFrame:
    """Add h3_index column to a DataFrame with gps_lat and gps_lng columns."""
    df = df.copy()
    df["h3_index"] = df.apply(
        lambda row: gps_to_h3(float(row["gps_lat"]), float(row["gps_lng"])),
        axis=1,
    )
    return df


def aggregate_by_h3(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate individual risk classifications per H3 cell.

    Input DataFrame expected columns:
        h3_index, sti_score, sti_risk_level, maternal_score, maternal_risk_level,
        community_wellbeing_score, community_wellbeing_risk_level, overall_risk_level,
        aggregate_score

    Returns DataFrame with one row per H3 cell containing:
        h3_index, sti_avg_score, maternal_avg_score, community_wellbeing_avg_score,
        overall_avg_score, submission_count, high_risk_proportion, ...
    """
    grouped = df.groupby("h3_index")

    agg = grouped.agg(
        sti_avg_score=("sti_score", "mean"),
        sti_std=("sti_score", "std"),
        maternal_avg_score=("maternal_score", lambda x: x.dropna().mean()),
        community_wellbeing_avg_score=("community_wellbeing_score", "mean"),
        overall_avg_score=("aggregate_score", "mean"),
        submission_count=("sti_score", "count"),
    ).reset_index()

    # Proportion of high-risk submissions per cell
    high_risk = grouped["overall_risk_level"].apply(
        lambda x: (x == "high").sum() / len(x)
    ).reset_index(name="high_risk_proportion")

    agg = agg.merge(high_risk, on="h3_index")

    # Fill NaN std with 0 (single-submission cells)
    agg["sti_std"] = agg["sti_std"].fillna(0)

    return agg


def get_h3_neighbors(h3_index: str) -> list[str]:
    """Return the k=1 ring neighbors of an H3 cell."""
    return list(h3.grid_ring(h3_index, 1))


def get_nigeria_h3_cells(resolution: int = H3_RESOLUTION) -> list[str]:
    """Generate H3 cells covering Nigeria's bounding box.

    Nigeria approximate bounds:
        lat: 4.27 - 13.89
        lng: 2.69 - 14.68
    """
    # Use H3 polygon fill with Nigeria's approximate boundary
    nigeria_boundary = [
        (4.27, 2.69), (4.27, 14.68), (13.89, 14.68), (13.89, 2.69), (4.27, 2.69)
    ]
    # h3.polygon_to_cells expects a LatLngPoly
    polygon = h3.LatLngPoly(nigeria_boundary)
    cells = h3.polygon_to_cells(polygon, resolution)
    return list(cells)
