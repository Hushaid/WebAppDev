"""Celery scheduled tasks for climate prediction service."""

import asyncio
import logging
import os

from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")

celery_app = Celery("climate", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.beat_schedule = {
    "daily-flood-prediction": {
        "task": "climate.daily_prediction",
        "schedule": crontab(hour=3, minute=0),  # 3 AM UTC daily
    },
    "weekly-retrain": {
        "task": "climate.retrain",
        "schedule": crontab(hour=1, minute=0, day_of_week=0),  # Sunday 1 AM
    },
}
celery_app.conf.timezone = "UTC"


@celery_app.task(name="climate.daily_prediction", bind=True, max_retries=3)
def daily_prediction(self):
    """Run daily flood prediction pipeline."""
    from ..pipeline.prediction import run_daily_prediction

    try:
        result = asyncio.run(run_daily_prediction())
        logger.info("Daily prediction complete: %s", result)
        return result
    except Exception as exc:
        logger.error("Daily prediction failed: %s", exc)
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="climate.retrain", bind=True, max_retries=2)
def retrain_climate_model(self):
    """Retrain flood prediction models."""
    from ..pipeline.training import run_training_pipeline

    try:
        result = asyncio.run(run_training_pipeline())
        logger.info("Retraining complete: %s", result)
        return result
    except Exception as exc:
        logger.error("Retraining failed: %s", exc)
        raise self.retry(exc=exc, countdown=1800)
