"""XGBoost flood risk classifier.

Predicts flood probability per LGA using static terrain features
and dynamic climate/hydrological features.
"""

import numpy as np
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit


class FloodXGBoost:
    """XGBoost classifier for flood risk prediction."""

    def __init__(self, params: dict | None = None):
        self.params = params or {
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 5,
            "scale_pos_weight": 10,  # floods are rare events
            "tree_method": "hist",
            "seed": 42,
        }
        self.model: xgb.Booster | None = None
        self.feature_names: list[str] = []

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: list[str],
        n_rounds: int = 500,
        early_stopping: int = 50,
    ) -> dict:
        """Train with temporal cross-validation.

        Uses TimeSeriesSplit to prevent data leakage from future events.
        """
        self.feature_names = feature_names

        tscv = TimeSeriesSplit(n_splits=5)
        cv_scores = []

        for train_idx, val_idx in tscv.split(X):
            dtrain = xgb.DMatrix(
                X[train_idx], label=y[train_idx], feature_names=feature_names
            )
            dval = xgb.DMatrix(
                X[val_idx], label=y[val_idx], feature_names=feature_names
            )

            model = xgb.train(
                self.params,
                dtrain,
                num_boost_round=n_rounds,
                evals=[(dval, "val")],
                early_stopping_rounds=early_stopping,
                verbose_eval=False,
            )

            preds = model.predict(dval)
            from sklearn.metrics import roc_auc_score

            auc = roc_auc_score(y[val_idx], preds)
            cv_scores.append(auc)

        # Final model on full data
        dfull = xgb.DMatrix(X, label=y, feature_names=feature_names)
        self.model = xgb.train(
            self.params, dfull, num_boost_round=n_rounds, verbose_eval=False
        )

        return {
            "cv_auc_mean": float(np.mean(cv_scores)),
            "cv_auc_std": float(np.std(cv_scores)),
            "cv_scores": [float(s) for s in cv_scores],
            "n_rounds": n_rounds,
        }

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict flood probability."""
        if self.model is None:
            raise RuntimeError("Model not trained")
        dmat = xgb.DMatrix(X, feature_names=self.feature_names)
        return self.model.predict(dmat)

    def feature_importance(self) -> dict[str, float]:
        """Get feature importance scores."""
        if self.model is None:
            return {}
        scores = self.model.get_score(importance_type="gain")
        total = sum(scores.values()) or 1
        return {k: v / total for k, v in sorted(scores.items(), key=lambda x: -x[1])}

    def save(self, path: str) -> None:
        if self.model:
            self.model.save_model(path)

    def load(self, path: str, feature_names: list[str]) -> None:
        self.model = xgb.Booster()
        self.model.load_model(path)
        self.feature_names = feature_names
