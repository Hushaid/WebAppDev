"""LSTM / Temporal Fusion Transformer for rainfall time-series forecasting.

Captures temporal accumulation patterns that XGBoost misses.
Uses pytorch-forecasting for the TFT implementation.
"""

import numpy as np
import pandas as pd


class RainfallTFT:
    """Temporal Fusion Transformer for rainfall-driven flood forecasting."""

    def __init__(self, config: dict | None = None):
        self.config = config or {
            "max_encoder_length": 30,  # 30 days lookback
            "max_prediction_length": 7,  # 7-day forecast
            "hidden_size": 32,
            "attention_head_size": 2,
            "dropout": 0.1,
            "learning_rate": 0.001,
            "batch_size": 64,
            "max_epochs": 50,
        }
        self.model = None
        self.training_dataset = None

    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare time-series dataframe for TFT.

        Expected columns: date, lga_id, precipitation, soil_moisture,
        discharge, flood_event (target).
        """
        df = df.copy()
        df["time_idx"] = (df["date"] - df["date"].min()).dt.days
        df["lga_id"] = df["lga_id"].astype(str)

        # Add temporal features
        df["month"] = df["date"].dt.month
        df["day_of_year"] = df["date"].dt.dayofyear

        # Rolling rainfall accumulations
        for window in [3, 7, 14, 30]:
            df[f"rain_{window}d"] = (
                df.groupby("lga_id")["precipitation"]
                .transform(lambda x: x.rolling(window, min_periods=1).sum())
            )

        return df

    def train(self, df: pd.DataFrame) -> dict:
        """Train TFT model on historical data."""
        from pytorch_forecasting import (
            TemporalFusionTransformer,
            TimeSeriesDataSet,
        )
        from pytorch_forecasting.metrics import BinaryDistributionLoss
        import lightning.pytorch as pl

        df = self.prepare_data(df)

        max_encoder = self.config["max_encoder_length"]
        max_pred = self.config["max_prediction_length"]

        # Split temporally
        cutoff = df["time_idx"].max() - max_pred * 5
        train_df = df[df["time_idx"] <= cutoff]
        val_df = df[df["time_idx"] > cutoff - max_encoder]

        time_varying_known = ["month", "day_of_year"]
        time_varying_unknown = [
            "precipitation",
            "soil_moisture",
            "discharge",
            "rain_3d",
            "rain_7d",
            "rain_14d",
            "rain_30d",
        ]

        training = TimeSeriesDataSet(
            train_df,
            time_idx="time_idx",
            target="flood_event",
            group_ids=["lga_id"],
            max_encoder_length=max_encoder,
            max_prediction_length=max_pred,
            time_varying_known_reals=time_varying_known,
            time_varying_unknown_reals=time_varying_unknown,
            target_normalizer=None,
        )

        validation = TimeSeriesDataSet.from_dataset(training, val_df)
        self.training_dataset = training

        train_dl = training.to_dataloader(
            train=True, batch_size=self.config["batch_size"], num_workers=0
        )
        val_dl = validation.to_dataloader(
            train=False, batch_size=self.config["batch_size"], num_workers=0
        )

        tft = TemporalFusionTransformer.from_dataset(
            training,
            hidden_size=self.config["hidden_size"],
            attention_head_size=self.config["attention_head_size"],
            dropout=self.config["dropout"],
            learning_rate=self.config["learning_rate"],
            loss=BinaryDistributionLoss(),
        )

        trainer = pl.Trainer(
            max_epochs=self.config["max_epochs"],
            enable_progress_bar=False,
            enable_model_summary=False,
        )
        trainer.fit(tft, train_dataloaders=train_dl, val_dataloaders=val_dl)

        self.model = tft
        return {"epochs": self.config["max_epochs"], "status": "trained"}

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Predict flood probability for upcoming days."""
        if self.model is None:
            raise RuntimeError("Model not trained")

        from pytorch_forecasting import TimeSeriesDataSet

        df = self.prepare_data(df)
        pred_ds = TimeSeriesDataSet.from_dataset(self.training_dataset, df)
        pred_dl = pred_ds.to_dataloader(train=False, batch_size=128, num_workers=0)

        preds = self.model.predict(pred_dl)
        return preds.numpy().flatten()

    def save(self, path: str) -> None:
        if self.model:
            import torch

            torch.save(self.model.state_dict(), path)

    def load(self, path: str) -> None:
        import torch

        if self.model:
            self.model.load_state_dict(torch.load(path, weights_only=True))
