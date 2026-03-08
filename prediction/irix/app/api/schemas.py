"""Pydantic models for IRIX API request/response."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class DiseaseGroup(str, Enum):
    sti = "sti"
    maternal_health = "maternal_health"
    community_wellbeing = "community_wellbeing"


class IrixFilters(BaseModel):
    """Filters for IRIX computation and queries."""

    age_groups: list[str] | None = None
    disease_group: DiseaseGroup | None = None
    geographic_unit_ids: list[str] | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class IrixScoreResponse(BaseModel):
    """Single IRIX score for a geographic unit (H3 cell)."""

    geographic_unit_id: str
    h3_index: str
    overall_irix_score: float
    overall_risk_level: RiskLevel
    sti_avg_score: float | None = None
    sti_risk_level: RiskLevel | None = None
    maternal_avg_score: float | None = None
    maternal_risk_level: RiskLevel | None = None
    community_wellbeing_avg_score: float | None = None
    community_wellbeing_risk_level: RiskLevel | None = None
    submission_count: int
    hotspot_flag: bool = False
    confidence_lower: float | None = None
    confidence_upper: float | None = None
    computed_at: datetime


class HotspotResponse(BaseModel):
    """Detected hotspot from Local Moran's I / Getis-Ord Gi*."""

    h3_index: str
    geographic_unit_id: str
    hotspot_type: str = Field(description="HH (high-high), HL (high-low), etc.")
    statistic: float
    p_value: float
    risk_level: RiskLevel


class IrixTrendPoint(BaseModel):
    """Single time-series data point for IRIX trends."""

    period_start: datetime
    period_end: datetime
    overall_irix_score: float
    overall_risk_level: RiskLevel
    sti_avg_score: float | None = None
    maternal_avg_score: float | None = None
    community_wellbeing_avg_score: float | None = None
    submission_count: int


class IrixTrendResponse(BaseModel):
    geographic_unit_id: str
    h3_index: str
    trend: list[IrixTrendPoint]


class PredictRequest(BaseModel):
    """Request to trigger IRIX prediction for specified cells."""

    filters: IrixFilters | None = None
    force_retrain: bool = False


class PredictResponse(BaseModel):
    """Response from prediction endpoint."""

    job_id: str
    status: str = "queued"
    message: str = "IRIX prediction job queued"


class RetrainRequest(BaseModel):
    """Request to retrain the BYM2 model."""

    filters: IrixFilters | None = None
    model_version: str | None = None


class RetrainResponse(BaseModel):
    job_id: str
    status: str = "queued"
    message: str = "Model retraining job queued"
