"""Open-Meteo weather forecast fetcher (free, no API key required).

Provides real-time weather conditions and 5-day forecasts at point-based resolution.
"""

import httpx
import pandas as pd

OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"


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
