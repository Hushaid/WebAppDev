"""Pydantic models for Climate API endpoints."""

from datetime import date
from pydantic import BaseModel


class FloodRiskResponse(BaseModel):
    lga_id: str
    prediction_date: date
    flood_probability: float
    risk_level: str  # normal, watch, warning, emergency
    compound_score: float | None = None
    compound_risk_level: str | None = None


class FloodRiskListResponse(BaseModel):
    predictions: list[FloodRiskResponse]
    date: date
    total: int


class CompoundRiskRequest(BaseModel):
    lga_ids: list[str] | None = None  # None = all LGAs


class CompoundRiskResponse(BaseModel):
    lga_id: str
    compound_score: float
    risk_level: str
    components: dict


class CompoundRiskListResponse(BaseModel):
    results: list[CompoundRiskResponse]
    total: int


class ClimateAlertResponse(BaseModel):
    id: str
    type: str
    risk_level: str
    message: str
    lga_id: str | None = None
    created_at: str


class ClimateAlertListResponse(BaseModel):
    alerts: list[ClimateAlertResponse]
    total: int


class TrainingResponse(BaseModel):
    status: str
    message: str
    metrics: dict | None = None


class LagdoDamResponse(BaseModel):
    risk_level: str
    discharge_m3s: float
    threshold_m3s: float
    affected_lgas: list[str]


class FloodForecastDay(BaseModel):
    date: str
    day_label: str          # "Today", "Tomorrow", "Mon 5 May", etc.
    flood_probability: float
    risk_level: str
    rain_mm: float          # forecasted / observed daily rainfall
    confidence: str         # "high", "moderate", "indicative"
    is_forecast: bool       # False = observed history, True = model forecast


class FloodForecastResponse(BaseModel):
    location: str
    forecasts: list[FloodForecastDay]
    generated_at: str
