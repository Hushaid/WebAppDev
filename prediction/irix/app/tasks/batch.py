"""Celery tasks for IRIX batch prediction and retraining.

Schedule:
    - Daily: recompute IRIX scores for all cells
    - On-demand: retrain when >50 new submissions arrive
"""

import os
from datetime import datetime, timezone

from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("irix", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Daily batch schedule
celery_app.conf.beat_schedule = {
    "daily-irix-prediction": {
        "task": "app.tasks.batch.run_irix_prediction",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC
        "args": (None, None, False),
    },
}


@celery_app.task(name="app.tasks.batch.run_irix_prediction", bind=True)
def run_irix_prediction(self, job_id: str | None = None, filters: dict | None = None, force_retrain: bool = False):
    """Run the full IRIX prediction pipeline."""
    from app.pipeline.training import run_pipeline

    date_from = None
    date_to = None
    disease_group = None

    if filters:
        if filters.get("date_from"):
            date_from = datetime.fromisoformat(filters["date_from"])
        if filters.get("date_to"):
            date_to = datetime.fromisoformat(filters["date_to"])
        disease_group = filters.get("disease_group")

    result = run_pipeline(
        date_from=date_from,
        date_to=date_to,
        disease_group=disease_group,
    )

    return {
        "job_id": job_id or self.request.id,
        **result,
    }


@celery_app.task(name="app.tasks.batch.retrain_model")
def retrain_model(job_id: str, filters: dict | None = None, model_version: str | None = None):
    """Retrain the BYM2 model with current data."""
    from app.pipeline.training import run_pipeline

    version = model_version or f"bym2-v{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    result = run_pipeline(model_version=version)

    return {
        "job_id": job_id,
        "model_version": version,
        **result,
    }
