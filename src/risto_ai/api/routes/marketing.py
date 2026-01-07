"""
Marketing API Routes.

Endpoints for campaign management.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.marketing import MarketingService
from risto_ai.database.models.prediction import DayClassification
from risto_ai.database.models.marketing import CampaignStatus

router = APIRouter()


class CampaignPlanRequest(BaseModel):
    """Request for generating a campaign plan."""
    target_date: date
    day_classification: Optional[str] = None


class CampaignCreateRequest(BaseModel):
    """Request for creating a campaign from a plan."""
    target_date: date
    name: Optional[str] = None
    day_classification: Optional[str] = None


@router.post("/campaigns/plan")
def generate_campaign_plan(
    request: CampaignPlanRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Generate a campaign plan for a specific date.

    Returns targeting strategy, offers, and estimated impact.
    """
    service = MarketingService(session)

    # Parse classification
    if request.day_classification:
        try:
            classification = DayClassification(request.day_classification)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid day_classification"
            )
    else:
        # Get from predictions
        from risto_ai.services.prediction import PredictionService
        pred_service = PredictionService(session)
        analysis = pred_service.get_day_analysis(request.target_date)
        classification = analysis.classification

    plan = service.generate_campaign_plan(
        target_date=request.target_date,
        day_classification=classification,
    )

    return {
        "target_date": plan.target_date.isoformat(),
        "day_classification": plan.day_classification.value,
        "strategy": plan.strategy,
        "target_segments": [s.value for s in plan.target_segments],
        "offers": plan.offers,
        "estimated_reach": plan.estimated_reach,
        "estimated_conversions": plan.estimated_conversions,
    }


@router.post("/campaigns")
def create_campaign(
    request: CampaignCreateRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Create a campaign from a plan.
    """
    service = MarketingService(session)

    # Generate plan first
    if request.day_classification:
        try:
            classification = DayClassification(request.day_classification)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid day_classification"
            )
    else:
        from risto_ai.services.prediction import PredictionService
        pred_service = PredictionService(session)
        analysis = pred_service.get_day_analysis(request.target_date)
        classification = analysis.classification

    plan = service.generate_campaign_plan(
        target_date=request.target_date,
        day_classification=classification,
    )

    campaign = service.create_campaign(plan, name=request.name)

    return {
        "id": campaign.id,
        "name": campaign.name,
        "target_date": campaign.target_date.isoformat(),
        "status": campaign.status.value,
        "offers_count": len(campaign.offers),
    }


@router.post("/campaigns/{campaign_id}/execute")
def execute_campaign(
    campaign_id: int,
    session: Session = Depends(get_sync_session),
):
    """
    Execute a campaign by generating and queuing messages.
    """
    service = MarketingService(session)

    try:
        result = service.execute_campaign(campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/campaigns/{campaign_id}/performance")
def get_campaign_performance(
    campaign_id: int,
    session: Session = Depends(get_sync_session),
):
    """
    Get performance metrics for a campaign.
    """
    service = MarketingService(session)
    performance = service.get_campaign_performance(campaign_id)

    if not performance:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return performance


@router.get("/campaigns")
def list_campaigns(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_sync_session),
):
    """
    List campaigns with optional status filter.
    """
    from sqlalchemy import select
    from risto_ai.database.models.marketing import Campaign

    query = select(Campaign)

    if status:
        try:
            status_filter = CampaignStatus(status)
            query = query.where(Campaign.status == status_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")

    query = query.order_by(Campaign.target_date.desc()).limit(limit)

    campaigns = session.scalars(query).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "target_date": c.target_date.isoformat(),
            "status": c.status.value,
            "messages_sent": c.messages_sent,
            "reservations_made": c.reservations_made,
            "delivery_rate": c.delivery_rate,
            "conversion_rate": c.conversion_rate,
        }
        for c in campaigns
    ]


@router.get("/deliveries/pending")
def get_pending_deliveries(
    limit: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_sync_session),
):
    """
    Get pending message deliveries for processing.
    """
    service = MarketingService(session)
    deliveries = service.get_pending_deliveries(limit)

    return [
        {
            "id": d.id,
            "campaign_id": d.campaign_id,
            "customer_id": d.customer_id,
            "channel": d.channel,
            "message_content": d.message_content,
        }
        for d in deliveries
    ]


@router.post("/deliveries/{delivery_id}/status")
def update_delivery_status(
    delivery_id: int,
    status: str,
    external_id: Optional[str] = None,
    error_message: Optional[str] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Update delivery status after send attempt.
    """
    from risto_ai.database.models.marketing import DeliveryStatus

    try:
        delivery_status = DeliveryStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    service = MarketingService(session)
    service.update_delivery_status(
        delivery_id=delivery_id,
        status=delivery_status,
        external_id=external_id,
        error_message=error_message,
    )

    return {"status": "updated"}


@router.post("/deliveries/{delivery_id}/conversion")
def record_conversion(
    delivery_id: int,
    reservation_id: Optional[int] = None,
    order_id: Optional[int] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Record a campaign conversion.
    """
    service = MarketingService(session)
    service.record_conversion(
        delivery_id=delivery_id,
        reservation_id=reservation_id,
        order_id=order_id,
    )

    return {"status": "recorded"}
