"""ERA5 reanalysis data fetcher via Copernicus CDS API.

ERA5 provides soil moisture, temperature, and wind data at ~28 km resolution.
Used for antecedent soil moisture conditions which affect flood susceptibility.
"""

import os
from datetime import date

import cdsapi
import xarray as xr

DATA_DIR = os.getenv("CLIMATE_DATA_DIR", "/tmp/climate_data/era5")

NIGERIA_AREA = [14, 2, 4, 15]  # [N, W, S, E]


def fetch_era5_soil_moisture(target_date: date) -> str | None:
    """Fetch ERA5 volumetric soil water content for Nigeria.

    Uses CDS API (requires ~/.cdsapirc credentials).
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    filename = f"era5_soil_moisture_{target_date.isoformat()}.nc"
    filepath = os.path.join(DATA_DIR, filename)

    if os.path.exists(filepath):
        return filepath

    try:
        client = cdsapi.Client()
        client.retrieve(
            "reanalysis-era5-land",
            {
                "product_type": "reanalysis",
                "variable": [
                    "volumetric_soil_water_layer_1",
                    "volumetric_soil_water_layer_2",
                    "skin_temperature",
                ],
                "year": str(target_date.year),
                "month": f"{target_date.month:02d}",
                "day": f"{target_date.day:02d}",
                "time": ["00:00", "06:00", "12:00", "18:00"],
                "area": NIGERIA_AREA,
                "format": "netcdf",
            },
            filepath,
        )
        return filepath
    except Exception:
        return None


def load_era5_soil_moisture(filepath: str) -> xr.Dataset:
    """Load ERA5 soil moisture NetCDF and compute daily mean."""
    ds = xr.open_dataset(filepath)
    return ds.mean(dim="time")
