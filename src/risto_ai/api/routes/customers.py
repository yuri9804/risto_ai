"""
Customers API Routes.

Endpoints for customer management and CRM.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.customer import CustomerService
from risto_ai.database.models.customer import CustomerSegmentType

router = APIRouter()


class CustomerCreate(BaseModel):
    """Request model for creating a customer."""
    first_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    marketing_consent: bool = False


class CustomerUpdate(BaseModel):
    """Request model for updating a customer."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    marketing_consent: Optional[bool] = None


@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    session: Session = Depends(get_sync_session),
):
    """
    Get customer profile by ID.

    Returns complete customer profile including:
    - Contact information
    - Visit metrics
    - Value scores (CLV, loyalty, engagement)
    - Segment information
    - Favorite dishes
    """
    service = CustomerService(session)
    profile = service.get_customer_profile(customer_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {
        "id": profile.id,
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "whatsapp_number": profile.whatsapp_number,
        "preferred_channel": profile.preferred_channel.value,
        "marketing_consent": profile.marketing_consent,
        "metrics": {
            "total_visits": profile.total_visits,
            "total_spend": float(profile.total_spend),
            "average_spend": float(profile.average_spend),
            "first_visit": profile.first_visit.isoformat() if profile.first_visit else None,
            "last_visit": profile.last_visit.isoformat() if profile.last_visit else None,
            "days_since_last_visit": profile.days_since_last_visit,
        },
        "scores": {
            "clv_score": float(profile.clv_score),
            "clv_percentile": profile.clv_percentile,
            "loyalty_score": profile.loyalty_score,
            "engagement_score": profile.engagement_score,
        },
        "segment": {
            "name": profile.segment_name,
            "type": profile.segment_type.value if profile.segment_type else None,
        },
        "favorite_dishes": profile.favorite_dishes,
    }


@router.post("/")
def create_customer(
    data: CustomerCreate,
    session: Session = Depends(get_sync_session),
):
    """
    Create a new customer or return existing if phone matches.
    """
    service = CustomerService(session)
    customer = service.find_or_create_customer(
        phone=data.phone,
        name=f"{data.first_name} {data.last_name or ''}".strip(),
        email=data.email,
        whatsapp=data.whatsapp_number,
    )

    return {
        "id": customer.id,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "created": True,  # Simplified - could track if actually created
    }


@router.post("/segmentation/run")
def run_segmentation(
    session: Session = Depends(get_sync_session),
):
    """
    Run customer segmentation algorithm.

    Updates all customer segments based on RFM analysis
    and behavioral metrics.
    """
    service = CustomerService(session)
    segments = service.run_segmentation()

    return {
        "segments": [
            {
                "name": s.name,
                "type": s.segment_type.value,
                "customer_count": s.customer_count,
                "total_value": float(s.total_value),
                "avg_visits": s.avg_visits,
                "avg_spend": float(s.avg_spend),
                "characteristics": s.characteristics,
            }
            for s in segments
        ]
    }


@router.get("/segments/summary")
def get_segments_summary(
    session: Session = Depends(get_sync_session),
):
    """
    Get summary of all customer segments.
    """
    from sqlalchemy import select, func
    from risto_ai.database.models.customer import Customer, CustomerSegment

    stmt = (
        select(
            CustomerSegment.name,
            CustomerSegment.segment_type,
            func.count(Customer.id).label("count"),
            func.sum(Customer.clv_score).label("total_value"),
        )
        .outerjoin(Customer, Customer.segment_id == CustomerSegment.id)
        .group_by(CustomerSegment.id)
    )

    results = session.execute(stmt).fetchall()

    return [
        {
            "segment": name,
            "type": seg_type.value,
            "customer_count": count,
            "total_value": float(total_value or 0),
        }
        for name, seg_type, count, total_value in results
    ]


@router.get("/targetable")
def get_targetable_customers(
    segment_types: Optional[str] = Query(
        None,
        description="Comma-separated segment types to include"
    ),
    exclude_recent: bool = True,
    max_customers: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_sync_session),
):
    """
    Get customers eligible for marketing campaigns.

    Filters by segment, consent, and recent offer history.
    """
    service = CustomerService(session)

    types = None
    if segment_types:
        try:
            types = [CustomerSegmentType(t.strip()) for t in segment_types.split(",")]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid segment type: {e}")

    customers = service.get_targetable_customers(
        segment_types=types,
        exclude_recent_offers=exclude_recent,
        max_customers=max_customers,
    )

    return [
        {
            "id": c.id,
            "name": c.full_name,
            "phone": c.phone,
            "whatsapp_number": c.whatsapp_number,
            "segment_id": c.segment_id,
            "clv_score": float(c.clv_score),
        }
        for c in customers
    ]
