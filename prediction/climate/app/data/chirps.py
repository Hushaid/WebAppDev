"""CHIRPS precipitation data fetcher.

CHIRPS (Climate Hazards Group InfraRed Precipitation with Station data)
provides daily rainfall at ~5.5 km resolution, optimized for Africa.
Used for historical training data and weekly updates.
"""

import os
from datetime import date, timedelta

import httpx
import numpy as np
import xarray as xr

CHIRPS_BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_daily/tifs/p05"

# Nigeria bounding box
NIGERIA_BOUNDS = {
    "lat_min": 4.27,
    "lat_max": 13.89,
    "lon_min": 2.69,
    "lon_max": 14.68,
}

DATA_DIR = os.getenv("CLIMATE_DATA_DIR", "/tmp/climate_data/chirps")


async def fetch_chirps_daily(target_date: date) -> str | None:
    """Download CHIRPS daily rainfall GeoTIFF for a given date.

    Returns the local file path, or None if unavailable.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    filename = f"chirps-v2.0.{target_date.strftime('%Y.%m.%d')}.tif"
    filepath = os.path.join(DATA_DIR, filename)

    if os.path.exists(filepath):
        return filepath

    year = target_date.year
    url = f"{CHIRPS_BASE_URL}/{year}/{filename}.gz"

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.get(url)
            if response.status_code == 200:
                import gzip
                with open(filepath, "wb") as f:
                    f.write(gzip.decompress(response.content))
                return filepath
        except httpx.HTTPError:
            pass

    return None


def load_chirps_raster(filepath: str) -> xr.DataArray:
    """Load CHIRPS GeoTIFF and clip to Nigeria bounds."""
    ds = xr.open_dataarray(filepath, engine="rasterio")
    clipped = ds.sel(
        y=slice(NIGERIA_BOUNDS["lat_max"], NIGERIA_BOUNDS["lat_min"]),
        x=slice(NIGERIA_BOUNDS["lon_min"], NIGERIA_BOUNDS["lon_max"]),
    )
    return clipped


def compute_cumulative_rainfall(
    filepaths: list[str],
    windows: list[int] = [1, 3, 7, 14, 30],
) -> dict[str, xr.DataArray]:
    """Compute cumulative rainfall over multiple windows.

    Returns dict mapping window name to cumulative rainfall DataArray.
    """
    arrays = [load_chirps_raster(fp) for fp in filepaths if fp]

    if not arrays:
        return {}

    # Stack along time dimension
    stacked = xr.concat(arrays, dim="time")

    result = {}
    for window in windows:
        if len(arrays) >= window:
            result[f"rain_{window}d"] = stacked[-window:].sum(dim="time")

    return result
