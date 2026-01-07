"""
Predictions API Routes.

Endpoints for customer flow prediction.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.prediction import PredictionService

router = APIRouter()


class PredictionRequest(BaseModel):
    """Request for generating predictions."""
    start_date: Optional[date] = None
    days: int = 14
    include_hourly: bool = True


class ModelTrainRequest(BaseModel):
    """Request for training the prediction model."""
    min_history_days: int = 90


@router.post("/generate")
def generate_predictions(
    request: PredictionRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Generate customer flow predictions.

    Predictions include:
    - Expected covers (with confidence intervals)
    - Expected revenue
    - Day classification (low/medium/high/very_high)
    - Hourly breakdown (optional)
    """
    service = PredictionService(session)
    predictions = service.predict(
        start_date=request.start_date,
        days=request.days,
        include_hourly=request.include_hourly,
    )

    return [
        {
            "date": p.prediction_date.isoformat(),
            "predicted_covers": p.predicted_covers,
            "covers_range": {
                "lower": p.predicted_covers_lower,
                "upper": p.predicted_covers_upper,
            },
            "predicted_revenue": float(p.predicted_revenue),
            "revenue_range": {
                "lower": float(p.predicted_revenue_lower),
                "upper": float(p.predicted_revenue_upper),
            },
            "day_classification": p.day_classification.value,
            "confidence_score": p.confidence_score,
            "weather_impact": p.weather_impact,
            "event_impact": p.event_impact,
            "hourly_breakdown": p.hourly_breakdown,
            "factors": p.factors,
        }
        for p in predictions
    ]


@router.get("/day/{target_date}")
def get_day_analysis(
    target_date: date,
    session: Session = Depends(get_sync_session),
):
    """
    Get detailed analysis for a specific day.

    Returns operational recommendations including:
    - Day classification
    - Expected covers and revenue
    - Staff level recommendation
    - Key factors affecting the day
    - Marketing recommendations
    """
    service = PredictionService(session)
    analysis = service.get_day_analysis(target_date)

    return {
        "date": analysis.date.isoformat(),
        "classification": analysis.classification.value,
        "expected_covers": analysis.expected_covers,
        "expected_revenue": float(analysis.expected_revenue),
        "recommended_staff_level": analysis.recommended_staff_level,
        "key_factors": analysis.key_factors,
        "marketing_recommendation": analysis.marketing_recommendation,
    }


@router.post("/model/train")
def train_model(
    request: ModelTrainRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Train or retrain the prediction model.

    Requires minimum historical data as specified.
    """
    service = PredictionService(session)
    success = service.train_model(min_history_days=request.min_history_days)

    if success:
        return {"status": "trained", "message": "Model trained successfully"}

    return {
        "status": "insufficient_data",
        "message": f"Need at least {request.min_history_days} days of history",
    }


@router.post("/actuals/{target_date}")
def update_actuals(
    target_date: date,
    session: Session = Depends(get_sync_session),
):
    """
    Update predictions with actual results for model evaluation.
    """
    service = PredictionService(session)
    service.update_with_actuals(target_date)

    return {"status": "updated"}


@router.get("/history")
def get_prediction_history(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(30, ge=1, le=100),
    session: Session = Depends(get_sync_session),
):
    """
    Get historical predictions with actual results.

    Useful for evaluating model accuracy.
    """
    from sqlalchemy import select, and_
    from risto_ai.database.models.prediction import CustomerFlowPrediction

    query = select(CustomerFlowPrediction).where(
        CustomerFlowPrediction.is_latest == True
    )

    if start_date:
        query = query.where(CustomerFlowPrediction.prediction_date >= start_date)
    if end_date:
        query = query.where(CustomerFlowPrediction.prediction_date <= end_date)

    query = query.order_by(
        CustomerFlowPrediction.prediction_date.desc()
    ).limit(limit)

    predictions = session.scalars(query).all()

    return [
        {
            "date": p.prediction_date.isoformat(),
            "predicted_covers": p.predicted_covers,
            "actual_covers": p.actual_covers,
            "predicted_revenue": float(p.predicted_revenue),
            "actual_revenue": float(p.actual_revenue) if p.actual_revenue else None,
            "prediction_error": float(p.prediction_error) if p.prediction_error else None,
            "classification": p.day_classification.value,
            "confidence": p.confidence_score,
        }
        for p in predictions
    ]


@router.get("/accuracy")
def get_model_accuracy(
    days: int = Query(30, ge=7, le=365),
    session: Session = Depends(get_sync_session),
):
    """
    Get model accuracy metrics.

    Calculates MAPE and other metrics based on actual vs predicted.
    """
    from sqlalchemy import select, func, and_
    from datetime import timedelta
    from risto_ai.database.models.prediction import CustomerFlowPrediction

    cutoff = date.today() - timedelta(days=days)

    # Get predictions with actuals
    stmt = select(CustomerFlowPrediction).where(
        and_(
            CustomerFlowPrediction.prediction_date >= cutoff,
            CustomerFlowPrediction.actual_covers.isnot(None),
            CustomerFlowPrediction.is_latest == True,
        )
    )

    predictions = list(session.scalars(stmt))

    if not predictions:
        return {
            "period_days": days,
            "sample_size": 0,
            "message": "No predictions with actuals found",
        }

    # Calculate metrics
    errors = []
    for p in predictions:
        if p.predicted_covers > 0:
            error = abs(p.actual_covers - p.predicted_covers) / p.predicted_covers
            errors.append(error)

    mape = sum(errors) / len(errors) if errors else 0

    # Calculate by classification
    by_class = {}
    for p in predictions:
        cls = p.day_classification.value
        if cls not in by_class:
            by_class[cls] = {"predictions": 0, "errors": []}
        by_class[cls]["predictions"] += 1
        if p.predicted_covers > 0:
            by_class[cls]["errors"].append(
                abs(p.actual_covers - p.predicted_covers) / p.predicted_covers
            )

    for cls in by_class:
        errs = by_class[cls]["errors"]
        by_class[cls]["mape"] = sum(errs) / len(errs) if errs else 0
        del by_class[cls]["errors"]

    return {
        "period_days": days,
        "sample_size": len(predictions),
        "mape": mape,
        "accuracy": 1 - mape,
        "by_classification": by_class,
    }
