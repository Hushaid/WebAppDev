"""MLflow model registry integration for IRIX."""

import os

import mlflow

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
EXPERIMENT_NAME = "irix-bym2"


def init_mlflow():
    """Initialize MLflow tracking."""
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)


def log_model_run(
    model_type: str,
    metrics: dict,
    params: dict,
    artifacts: dict[str, str] | None = None,
) -> str:
    """Log a model training run to MLflow.

    Returns the run ID.
    """
    init_mlflow()

    with mlflow.start_run() as run:
        mlflow.log_param("model_type", model_type)
        for k, v in params.items():
            mlflow.log_param(k, v)
        for k, v in metrics.items():
            if v is not None:
                mlflow.log_metric(k, v)
        if artifacts:
            for name, path in artifacts.items():
                mlflow.log_artifact(path, name)

        return run.info.run_id


def load_latest_model(model_name: str = "irix-bym2"):
    """Load the latest registered model from MLflow."""
    init_mlflow()
    client = mlflow.MlflowClient()
    versions = client.search_model_versions(f"name='{model_name}'")
    if not versions:
        return None
    latest = max(versions, key=lambda v: int(v.version))
    return mlflow.pyfunc.load_model(f"models:/{model_name}/{latest.version}")
