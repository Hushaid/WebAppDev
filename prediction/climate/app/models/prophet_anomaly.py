"""Prophet seasonal anomaly detection for rainfall.

Flags when observed rainfall deviates significantly from seasonal baselines.
Unusual rainfall patterns precede flood events.
"""

import numpy as np
import pandas as pd


class RainfallAnomalyDetector:
    """Prophet-based seasonal anomaly detector for precipitation."""

    def __init__(self, config: dict | None = None):
        self.config = config or {
            "changepoint_prior_scale": 0.05,
            "seasonality_prior_scale": 10,
            "yearly_seasonality": True,
            "weekly_seasonality": False,
            "daily_seasonality": False,
            "interval_width": 0.95,
        }
        self.models: dict[str, object] = {}  # per-LGA models

    def train(self, df: pd.DataFrame, lga_id: str) -> dict:
        """Train Prophet model for a single LGA.

        Args:
            df: DataFrame with 'date' and 'precipitation' columns.
            lga_id: LGA identifier.
        """
        from prophet import Prophet

        prophet_df = pd.DataFrame({
            "ds": pd.to_datetime(df["date"]),
            "y": df["precipitation"].clip(lower=0),
        })

        model = Prophet(
            changepoint_prior_scale=self.config["changepoint_prior_scale"],
            seasonality_prior_scale=self.config["seasonality_prior_scale"],
            yearly_seasonality=self.config["yearly_seasonality"],
            weekly_seasonality=self.config["weekly_seasonality"],
            daily_seasonality=self.config["daily_seasonality"],
            interval_width=self.config["interval_width"],
        )
        model.fit(prophet_df)
        self.models[lga_id] = model

        return {"lga_id": lga_id, "training_points": len(prophet_df)}

    def train_bulk(self, df: pd.DataFrame) -> list[dict]:
        """Train models for all LGAs in the dataframe."""
        results = []
        for lga_id, group in df.groupby("lga_id"):
            if len(group) >= 365:  # need at least 1 year
                result = self.train(group, str(lga_id))
                results.append(result)
        return results

    def detect_anomalies(
        self, df: pd.DataFrame, lga_id: str
    ) -> pd.DataFrame:
        """Detect rainfall anomalies for an LGA.

        Returns dataframe with anomaly scores (how many sigmas above expected).
        """
        model = self.models.get(lga_id)
        if model is None:
            return pd.DataFrame()

        future = pd.DataFrame({"ds": pd.to_datetime(df["date"])})
        forecast = model.predict(future)

        result = pd.DataFrame({
            "date": forecast["ds"],
            "observed": df["precipitation"].values,
            "expected": forecast["yhat"].values,
            "upper": forecast["yhat_upper"].values,
            "lower": forecast["yhat_lower"].values,
        })

        # Anomaly score: how far above upper bound
        band_width = (result["upper"] - result["expected"]).clip(lower=0.1)
        result["anomaly_score"] = (
            (result["observed"] - result["expected"]) / band_width
        ).clip(lower=0)

        result["is_anomaly"] = result["observed"] > result["upper"]

        return result

    def compute_risk_signal(self, df: pd.DataFrame, lga_id: str) -> float:
        """Compute a 0-1 risk signal from recent anomalies.

        Looks at last 7 days of data. High anomaly scores → high risk.
        """
        anomalies = self.detect_anomalies(df.tail(7), lga_id)
        if anomalies.empty:
            return 0.0

        max_score = float(anomalies["anomaly_score"].max())
        n_anomalous = int(anomalies["is_anomaly"].sum())

        # Combine severity and frequency
        risk = min(1.0, (max_score / 3.0) * 0.6 + (n_anomalous / 7.0) * 0.4)
        return risk
