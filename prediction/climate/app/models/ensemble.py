"""Stacking ensemble meta-learner for flood prediction.

Combines XGBoost, TFT, and Prophet predictions into a final flood risk score.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression


class FloodEnsemble:
    """Stacking meta-learner that combines model predictions."""

    def __init__(self):
        self.meta_model = LogisticRegression(
            C=1.0, class_weight="balanced", max_iter=1000
        )
        self.weights: np.ndarray | None = None
        self.is_fitted = False

    def train(
        self,
        xgb_preds: np.ndarray,
        tft_preds: np.ndarray | None,
        prophet_scores: np.ndarray,
        y_true: np.ndarray,
    ) -> dict:
        """Train meta-learner on base model predictions.

        Falls back to weighted average if TFT predictions unavailable.
        """
        if tft_preds is not None:
            X = np.column_stack([xgb_preds, tft_preds, prophet_scores])
        else:
            X = np.column_stack([xgb_preds, prophet_scores])

        self.meta_model.fit(X, y_true)
        self.is_fitted = True

        # Extract learned weights for interpretability
        self.weights = self.meta_model.coef_[0]

        from sklearn.metrics import roc_auc_score

        train_preds = self.meta_model.predict_proba(X)[:, 1]
        auc = roc_auc_score(y_true, train_preds)

        return {
            "meta_auc": float(auc),
            "weights": self.weights.tolist(),
            "n_models": X.shape[1],
        }

    def predict(
        self,
        xgb_preds: np.ndarray,
        tft_preds: np.ndarray | None,
        prophet_scores: np.ndarray,
    ) -> np.ndarray:
        """Produce final flood risk probabilities."""
        if self.is_fitted:
            if tft_preds is not None:
                X = np.column_stack([xgb_preds, tft_preds, prophet_scores])
            else:
                X = np.column_stack([xgb_preds, prophet_scores])
            return self.meta_model.predict_proba(X)[:, 1]

        # Fallback: weighted average when meta-model isn't trained
        if tft_preds is not None:
            return 0.5 * xgb_preds + 0.3 * tft_preds + 0.2 * prophet_scores
        return 0.7 * xgb_preds + 0.3 * prophet_scores

    def classify_risk(self, probabilities: np.ndarray) -> list[str]:
        """Classify flood risk into alert levels."""
        levels = []
        for p in probabilities:
            if p >= 0.8:
                levels.append("emergency")
            elif p >= 0.6:
                levels.append("warning")
            elif p >= 0.4:
                levels.append("watch")
            else:
                levels.append("normal")
        return levels
