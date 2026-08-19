"""GloFAS river discharge data fetcher.

GloFAS (Global Flood Awareness System) provides river discharge forecasts.
Critical for Niger-Benue system flood monitoring and Lagdo Dam tracking.
"""

import os
from datetime import date

import cdsapi
import xarray as xr

DATA_DIR = os.getenv("CLIMATE_DATA_DIR", "/tmp/climate_data/glofas")

# Key river stations for Nigeria flood monitoring
BENUE_STATIONS = {
    "makurdi": {"lat": 7.73, "lon": 8.53},
    "lokoja": {"lat": 7.80, "lon": 6.74},
    "yola": {"lat": 9.20, "lon": 12.47},
}

NIGER_STATIONS = {
    "jebba": {"lat": 9.12, "lon": 4.83},
    "baro": {"lat": 8.57, "lon": 6.42},
}

NIGERIA_AREA = [14, 2, 4, 15]  # [N, W, S, E]


def fetch_glofas_forecast(target_date: date, leadtime_days: int = 30) -> str | None:
    """Fetch GloFAS river discharge forecast from CDS.

    Returns path to downloaded NetCDF file.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    filename = f"glofas_forecast_{target_date.isoformat()}.grib"
    filepath = os.path.join(DATA_DIR, filename)

    if os.path.exists(filepath):
        return filepath

    try:
        client = cdsapi.Client()
        client.retrieve(
            "cems-glofas-forecast",
            {
                "system_version": "operational",
                "hydrological_model": "lisflood",
                "product_type": "control_forecast",
                "variable": "river_discharge_in_the_last_24_hours",
                "year": str(target_date.year),
                "month": f"{target_date.month:02d}",
                "day": f"{target_date.day:02d}",
                "leadtime_hour": [str(h * 24) for h in range(1, min(leadtime_days + 1, 31))],
                "area": NIGERIA_AREA,
                "format": "grib",
            },
            filepath,
        )
        return filepath
    except Exception:
        return None


def load_glofas_discharge(filepath: str) -> xr.Dataset:
    """Load GloFAS discharge forecast data."""
    return xr.open_dataset(filepath, engine="cfgrib")


def extract_station_discharge(ds: xr.Dataset, stations: dict) -> dict[str, float]:
    """Extract discharge values at key river monitoring stations."""
    results = {}
    for name, coords in stations.items():
        try:
            val = ds.sel(
                latitude=coords["lat"],
                longitude=coords["lon"],
                method="nearest",
            )
            # Get the maximum discharge across forecast lead times
            discharge = float(val["dis24"].max().values)
            results[name] = discharge
        except (KeyError, ValueError):
            results[name] = 0.0
    return results


def check_lagdo_dam_risk(benue_discharge: dict[str, float]) -> dict:
    """Assess Lagdo Dam flood risk based on Benue discharge.

    Lagdo Dam (Cameroon) releases trigger major flooding downstream
    in Nigeria's Benue basin. Thresholds based on historical events.
    """
    yola_discharge = benue_discharge.get("yola", 0)
    makurdi_discharge = benue_discharge.get("makurdi", 0)

    # Thresholds (m³/s) based on historical flood events
    risk_level = "low"
    if yola_discharge > 3000 or makurdi_discharge > 8000:
        risk_level = "emergency"
    elif yola_discharge > 2000 or makurdi_discharge > 5000:
        risk_level = "warning"
    elif yola_discharge > 1000 or makurdi_discharge > 3000:
        risk_level = "watch"

    return {
        "risk_level": risk_level,
        "yola_discharge_m3s": yola_discharge,
        "makurdi_discharge_m3s": makurdi_discharge,
        "dam_release_likely": yola_discharge > 2500,
    }
