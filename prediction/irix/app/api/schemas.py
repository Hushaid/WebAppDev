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
    computed_at: str
    model_version: str | None = None


class HotspotResponse(BaseModel):
    """Detected hotspot from IRIX scores where hotspot_flag is true."""

    geographic_unit_id: str
    overall_irix_score: float
    overall_risk_level: RiskLevel
    submission_count: int
    confidence_lower: float | None = None
    confidence_upper: float | None = None


class IrixTrendPoint(BaseModel):
    """Single time-series data point for IRIX trends."""

    computed_at: str
    overall_irix_score: float
    overall_risk_level: RiskLevel
    sti_avg_score: float | None = None
    maternal_avg_score: float | None = None
    community_wellbeing_avg_score: float | None = None
    submission_count: int


class IrixTrendResponse(BaseModel):
    geographic_unit_id: str
    periods: list[IrixTrendPoint]


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
