"""
Reservations API Routes.

Endpoints for table reservation management.
"""

from datetime import date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.reservation import (
    ReservationService,
    ReservationRequest,
    ReservationSource,
)
from risto_ai.database.models.reservation import ReservationStatus

router = APIRouter()


class ReservationCreate(BaseModel):
    """Request model for creating a reservation."""
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    party_size: int
    reservation_date: date
    reservation_time: time
    special_requests: Optional[str] = None
    dietary_requirements: Optional[str] = None
    occasion: Optional[str] = None
    source: str = "website"
    campaign_id: Optional[int] = None


class ReservationUpdate(BaseModel):
    """Request model for updating a reservation."""
    party_size: Optional[int] = None
    reservation_time: Optional[time] = None
    special_requests: Optional[str] = None
    dietary_requirements: Optional[str] = None


@router.get("/availability")
def check_availability(
    date: date = Query(..., description="Date to check"),
    party_size: int = Query(..., ge=1, le=20),
    preferred_time: Optional[time] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Check table availability for a specific date and party size.

    Returns available time slots sorted by preference.
    """
    service = ReservationService(session)
    slots = service.check_availability(
        target_date=date,
        party_size=party_size,
        preferred_time=preferred_time,
    )

    return [
        {
            "time": slot.time.strftime("%H:%M"),
            "available_tables": slot.available_tables,
            "max_party_size": slot.max_party_size,
            "remaining_capacity": slot.remaining_capacity,
        }
        for slot in slots
    ]


@router.post("/")
def create_reservation(
    data: ReservationCreate,
    session: Session = Depends(get_sync_session),
):
    """
    Create a new reservation.

    Returns confirmation code on success, or alternatives if unavailable.
    """
    service = ReservationService(session)

    try:
        source = ReservationSource(data.source)
    except ValueError:
        source = ReservationSource.OTHER

    request = ReservationRequest(
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        party_size=data.party_size,
        reservation_date=data.reservation_date,
        reservation_time=data.reservation_time,
        special_requests=data.special_requests,
        dietary_requirements=data.dietary_requirements,
        occasion=data.occasion,
        source=source,
        campaign_id=data.campaign_id,
    )

    result = service.create_reservation(request)

    return {
        "success": result.success,
        "confirmation_code": result.confirmation_code,
        "message": result.message,
        "alternatives": [
            {
                "time": slot.time.strftime("%H:%M"),
                "available_tables": slot.available_tables,
            }
            for slot in result.suggested_alternatives
        ] if result.suggested_alternatives else [],
    }


@router.get("/{confirmation_code}")
def get_reservation(
    confirmation_code: str,
    session: Session = Depends(get_sync_session),
):
    """
    Get reservation details by confirmation code.
    """
    from sqlalchemy import select
    from risto_ai.database.models.reservation import Reservation

    reservation = session.scalar(
        select(Reservation).where(
            Reservation.confirmation_code == confirmation_code
        )
    )

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    return {
        "confirmation_code": reservation.confirmation_code,
        "customer_name": reservation.customer_name,
        "customer_phone": reservation.customer_phone,
        "reservation_date": reservation.reservation_date.isoformat(),
        "reservation_time": reservation.reservation_time.strftime("%H:%M"),
        "party_size": reservation.party_size,
        "status": reservation.status.value,
        "table_number": reservation.table.table_number if reservation.table else None,
        "special_requests": reservation.special_requests,
        "occasion": reservation.occasion,
    }


@router.post("/{confirmation_code}/confirm")
def confirm_reservation(
    confirmation_code: str,
    session: Session = Depends(get_sync_session),
):
    """
    Confirm a pending reservation.
    """
    service = ReservationService(session)

    if service.confirm_reservation(confirmation_code):
        return {"status": "confirmed", "message": "Prenotazione confermata"}

    raise HTTPException(status_code=400, detail="Unable to confirm reservation")


@router.post("/{confirmation_code}/cancel")
def cancel_reservation(
    confirmation_code: str,
    reason: Optional[str] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Cancel a reservation.
    """
    service = ReservationService(session)

    if service.cancel_reservation(confirmation_code, reason):
        return {"status": "cancelled", "message": "Prenotazione cancellata"}

    raise HTTPException(status_code=400, detail="Unable to cancel reservation")


@router.post("/{confirmation_code}/check-in")
def check_in(
    confirmation_code: str,
    session: Session = Depends(get_sync_session),
):
    """
    Check in a guest for their reservation.
    """
    service = ReservationService(session)

    if service.check_in_reservation(confirmation_code):
        return {"status": "seated", "message": "Cliente accolto"}

    raise HTTPException(status_code=400, detail="Unable to check in")


@router.post("/{confirmation_code}/complete")
def complete_reservation(
    confirmation_code: str,
    session: Session = Depends(get_sync_session),
):
    """
    Complete a reservation (guest has left).
    """
    service = ReservationService(session)

    if service.complete_reservation(confirmation_code):
        return {"status": "completed", "message": "Prenotazione completata"}

    raise HTTPException(status_code=400, detail="Unable to complete reservation")


@router.get("/date/{date}")
def get_reservations_by_date(
    date: date,
    status: Optional[str] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Get all reservations for a specific date.
    """
    service = ReservationService(session)

    status_filter = None
    if status:
        try:
            status_filter = ReservationStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")

    reservations = service.get_reservations_by_date(date, status_filter)

    return [
        {
            "confirmation_code": r.confirmation_code,
            "customer_name": r.customer_name,
            "time": r.reservation_time.strftime("%H:%M"),
            "party_size": r.party_size,
            "status": r.status.value,
            "table": r.table.table_number if r.table else None,
        }
        for r in reservations
    ]


@router.get("/capacity/{date}")
def get_daily_capacity(
    date: date,
    session: Session = Depends(get_sync_session),
):
    """
    Get capacity statistics for a specific date.
    """
    service = ReservationService(session)
    capacity = service.get_daily_capacity(date)

    return {
        "date": capacity["date"].isoformat(),
        "total_tables": capacity["total_tables"],
        "total_capacity": capacity["total_capacity"],
        "total_reservations": capacity["total_reservations"],
        "total_covers_reserved": capacity["total_covers_reserved"],
        "lunch": capacity["lunch"],
        "dinner": capacity["dinner"],
        "availability_percentage": capacity["availability_percentage"],
    }
