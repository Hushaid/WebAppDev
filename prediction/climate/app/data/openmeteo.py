"""Open-Meteo weather forecast + historical fetcher (free, no API key required).

Provides real-time weather conditions, 5-day forecasts, and up to 90 days of
historical daily precipitation and ET at any coordinate.
"""

from datetime import date, timedelta

import httpx
import pandas as pd

OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"
OPENMETEO_HISTORICAL_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
SEASONAL_URL = "https://seasonal-api.open-meteo.com/v1/seasonal"

# Karu LGA, Nasarawa State
KARU_LAT = 9.2747
KARU_LON = 8.3161


async def fetch_forecast(lat: float, lon: float, days: int = 5) -> dict | None:
    """Fetch weather forecast for a location.

    Returns current conditions + daily forecasts.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "precipitation_sum",
            "precipitation_probability_max",
            "temperature_2m_max",
            "temperature_2m_min",
            "wind_speed_10m_max",
        ],
        "current": [
            "temperature_2m",
            "precipitation",
            "rain",
            "relative_humidity_2m",
        ],
        "forecast_days": days,
        "timezone": "Africa/Lagos",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.get(OPENMETEO_URL, params=params)
            if response.status_code == 200:
                return response.json()
        except httpx.HTTPError:
            pass

    return None


async def fetch_bulk_forecasts(
    locations: list[dict[str, float]],
    days: int = 5,
) -> list[dict]:
    """Fetch forecasts for multiple locations."""
    results = []
    for loc in locations:
        data = await fetch_forecast(loc["lat"], loc["lon"], days)
        if data:
            results.append({**loc, "forecast": data})
    return results


def extract_rainfall_forecast(forecast_data: dict) -> list[float]:
    """Extract daily precipitation sums from forecast response."""
    daily = forecast_data.get("daily", {})
    return daily.get("precipitation_sum", [])


def compute_forecast_risk_signal(forecast_data: dict) -> float:
    """Compute a risk signal from forecasted rainfall.

    Returns a 0-1 score based on cumulative expected rainfall.
    """
    rainfall = extract_rainfall_forecast(forecast_data)
    if not rainfall:
        return 0.0

    cumulative = sum(rainfall)

    # Sigmoid-like normalization: 100mm+ → near 1.0
    return min(1.0, cumulative / 100.0)


def fetch_karu_forecast_series(forecast_days: int = 16) -> pd.DataFrame | None:
    """Fetch a combined 30-day history + N-day forecast series for Karu LGA.

    Returns a DataFrame with one row per day (past + future) containing:
        date, rain_mm, et_mm, is_forecast,
        rain_1d/3d/7d/14d/30d, et_7d/30d,
        water_balance_7d/30d, soil_moisture

    Returns None if the API request fails.
    """
    params = {
        "latitude": KARU_LAT,
        "longitude": KARU_LON,
        "daily": [
            "precipitation_sum",
            "et0_fao_evapotranspiration",
        ],
        "timezone": "Africa/Lagos",
        "past_days": 30,
        "forecast_days": forecast_days,
    }

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.get(OPENMETEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        return None

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    rain_vals = daily.get("precipitation_sum", [])
    et_vals = daily.get("et0_fao_evapotranspiration", [])

    if not dates:
        return None

    today_str = date.today().isoformat()

    df = pd.DataFrame({
        "date": pd.to_datetime(dates),
        "rain_mm": [v or 0.0 for v in rain_vals],
        "et_mm":   [v or 0.0 for v in et_vals],
    }).sort_values("date").reset_index(drop=True)

    df["is_forecast"] = df["date"].dt.date >= date.today()

    # Rolling cumulative windows over the full series
    for w in [1, 3, 7, 14, 30]:
        df[f"rain_{w}d"] = df["rain_mm"].rolling(w, min_periods=1).sum()
    for w in [7, 30]:
        df[f"et_{w}d"] = df["et_mm"].rolling(w, min_periods=1).sum()

    df["water_balance_7d"]  = df["rain_7d"]  - df["et_7d"]
    df["water_balance_30d"] = df["rain_30d"] - df["et_30d"]

    import math
    df["soil_moisture"] = df["water_balance_30d"].apply(
        lambda wb: round(1.0 / (1.0 + math.exp(-wb / 50.0)), 4)
    )

    return df


def fetch_karu_live_features() -> dict | None:
    """Fetch today's dynamic features for Karu LGA from Open-Meteo.

    Pulls the last 30 days of daily precipitation and ET, computes rolling
    window sums, and returns a feature dict ready for the prediction pipeline.
    Returns None if the request fails so the caller can fall back to NIMET.
    """
    end = date.today()
    start = end - timedelta(days=30)

    params = {
        "latitude": KARU_LAT,
        "longitude": KARU_LON,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": [
            "precipitation_sum",
            "et0_fao_evapotranspiration",
        ],
        "timezone": "Africa/Lagos",
    }

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.get(OPENMETEO_HISTORICAL_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        return None

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    rain_vals = daily.get("precipitation_sum", [])
    et_vals = daily.get("et0_fao_evapotranspiration", [])

    if not dates or not rain_vals:
        return None

    df = pd.DataFrame({
        "date": pd.to_datetime(dates),
        "rain": [v or 0.0 for v in rain_vals],
        "et":   [v or 0.0 for v in et_vals],
    }).sort_values("date").reset_index(drop=True)

    # Rolling cumulative sums (most recent day = last row)
    for w in [1, 3, 7, 14, 30]:
        df[f"rain_{w}d"] = df["rain"].rolling(w, min_periods=1).sum()
    for w in [7, 30]:
        df[f"et_{w}d"] = df["et"].rolling(w, min_periods=1).sum()

    latest = df.iloc[-1]

    rain_30d = float(latest["rain_30d"]) or 1.0
    wb7  = float(latest["rain_7d"])  - float(latest["et_7d"])
    wb30 = float(latest["rain_30d"]) - float(latest["et_30d"])

    # Sigmoid soil moisture proxy from 30-day water balance (same as NIMET pipeline)
    import math
    soil_moisture = 1.0 / (1.0 + math.exp(-wb30 / 50.0))

    return {
        "rain_1d":            float(latest["rain_1d"]),
        "rain_3d":            float(latest["rain_3d"]),
        "rain_7d":            float(latest["rain_7d"]),
        "rain_14d":           float(latest["rain_14d"]),
        "rain_30d":           float(latest["rain_30d"]),
        "soil_moisture":      round(soil_moisture, 4),
        "water_balance_7d":   round(wb7,  2),
        "water_balance_30d":  round(wb30, 2),
        "data_date":          str(latest["date"].date()),
    }


def fetch_karu_seasonal_series(forecast_days: int = 92) -> pd.DataFrame | None:
    """Fetch seasonal ensemble forecast for Karu (up to 92 days).

    Returns a DataFrame with columns:
        date, rain_mm (ensemble median), rain_mm_p10, rain_mm_p90

    Uses 50 ensemble members from the Open-Meteo seasonal API (free, no key).
    """
    import numpy as np

    params = {
        "latitude": KARU_LAT,
        "longitude": KARU_LON,
        "daily": "precipitation_sum",
        "forecast_days": min(forecast_days, 92),
        "timezone": "Africa/Lagos",
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(SEASONAL_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        return None

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    if not dates:
        return None

    member_keys = sorted(k for k in daily if k.startswith("precipitation_sum_member"))
    if not member_keys:
        return None

    member_arr = np.array([daily[k] for k in member_keys], dtype=float)  # (n_members, n_days)

    df = pd.DataFrame({
        "date": pd.to_datetime(dates),
        "rain_mm": np.nanmedian(member_arr, axis=0),
        "rain_mm_p10": np.nanpercentile(member_arr, 10, axis=0),
        "rain_mm_p90": np.nanpercentile(member_arr, 90, axis=0),
    })

    return df.reset_index(drop=True)
