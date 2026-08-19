"""XGBoost spatial ML model — secondary ensemble member for IRIX.

Uses engineered features (individual aggregations + area-level covariates +
spatial lag features) to predict community risk scores.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold


def engineer_spatial_features(df: pd.DataFrame, neighbors: dict[str, list[str]]) -> pd.DataFrame:
    """Add spatial lag features to the cell-level feature DataFrame.

    For each cell, compute the mean score of its neighbors (spatial lag).
    """
    df = df.copy()

    # Build neighbor lookup for scores
    score_lookup = dict(zip(df["h3_index"], df["overall_avg_score"]))
    count_lookup = dict(zip(df["h3_index"], df["submission_count"]))

    spatial_lag_scores = []
    spatial_lag_counts = []
    n_neighbors = []

    for _, row in df.iterrows():
        h3_idx = row["h3_index"]
        nbrs = neighbors.get(h3_idx, [])
        nbr_scores = [score_lookup[n] for n in nbrs if n in score_lookup]
        nbr_counts = [count_lookup[n] for n in nbrs if n in count_lookup]

        spatial_lag_scores.append(np.mean(nbr_scores) if nbr_scores else 0)
        spatial_lag_counts.append(np.sum(nbr_counts) if nbr_counts else 0)
        n_neighbors.append(len(nbr_scores))

    df["spatial_lag_score"] = spatial_lag_scores
    df["spatial_lag_count"] = spatial_lag_counts
    df["n_neighbors"] = n_neighbors

    return df


def train_xgboost(
    df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str = "overall_avg_score",
    n_folds: int = 5,
    coarse_h3_col: str = "h3_coarse",
) -> tuple[xgb.XGBRegressor, dict]:
    """Train XGBoost with spatial block cross-validation.

    Uses GroupKFold on coarse H3 cells to prevent spatial leakage.
    """
    X = df[feature_cols].values
    y = df[target_col].values
    groups = df[coarse_h3_col].values if coarse_h3_col in df.columns else None

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
    )

    cv_scores = []

    if groups is not None:
        gkf = GroupKFold(n_splits=n_folds)
        for train_idx, val_idx in gkf.split(X, y, groups):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            preds = model.predict(X_val)
            rmse = np.sqrt(np.mean((preds - y_val) ** 2))
            cv_scores.append(rmse)

    # Final fit on all data
    model.fit(X, y, verbose=False)

    metrics = {
        "cv_rmse_mean": np.mean(cv_scores) if cv_scores else None,
        "cv_rmse_std": np.std(cv_scores) if cv_scores else None,
        "n_features": len(feature_cols),
        "n_samples": len(df),
    }

    return model, metrics


def predict_xgboost(model: xgb.XGBRegressor, df: pd.DataFrame, feature_cols: list[str]) -> np.ndarray:
    """Predict risk scores using trained XGBoost model."""
    X = df[feature_cols].values
    return model.predict(X)
