"""
Staff API Routes.

Endpoints for staff management and scheduling.
"""

from datetime import date, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.staff import StaffService
from risto_ai.database.models.staff import DayOfWeek

router = APIRouter()


class StaffCreate(BaseModel):
    """Request model for creating a staff member."""
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    role: str
    contract_type: str
    hire_date: date
    hourly_rate: float
    max_hours_per_week: int = 40
    min_hours_per_week: int = 0


class PreferenceUpdate(BaseModel):
    """Request model for updating staff preferences."""
    day_of_week: str
    is_available: bool = True
    preferred: bool = False
    preferred_start: Optional[time] = None
    preferred_end: Optional[time] = None
    reason: Optional[str] = None


class ShiftAssignRequest(BaseModel):
    """Request for assigning staff to a shift."""
    staff_id: int
    shift_id: int
    assignment_date: date


class AutoScheduleRequest(BaseModel):
    """Request for auto-scheduling."""
    start_date: date
    end_date: date


@router.get("/requirements/{target_date}")
def get_staff_requirements(
    target_date: date,
    session: Session = Depends(get_sync_session),
):
    """
    Get staff requirements for a specific date.

    Based on predicted customer flow, calculates how many
    staff are needed per shift and identifies gaps.
    """
    service = StaffService(session)
    requirements = service.calculate_requirements(target_date)

    return [
        {
            "shift_id": r.shift_id,
            "shift_name": r.shift_name,
            "shift_type": r.shift_type.value,
            "required_role": r.required_role.value if r.required_role else None,
            "required_count": r.required_count,
            "assigned_count": r.assigned_count,
            "gap": r.gap,
        }
        for r in requirements
    ]


@router.get("/suggestions/{target_date}")
def get_schedule_suggestions(
    target_date: date,
    shift_id: Optional[int] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Get AI-generated schedule suggestions.

    Suggests staff assignments based on:
    - Availability and preferences
    - Role compatibility
    - Performance and reliability scores
    - Workload balancing
    """
    service = StaffService(session)
    suggestions = service.generate_schedule_suggestions(
        target_date=target_date,
        shift_id=shift_id,
    )

    return [
        {
            "staff_id": s.staff_id,
            "staff_name": s.staff_name,
            "shift_id": s.shift_id,
            "shift_name": s.shift_name,
            "score": s.score,
            "reasons": s.reasons,
        }
        for s in suggestions
    ]


@router.post("/auto-schedule")
def auto_schedule(
    request: AutoScheduleRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Automatically generate schedule for a date range.

    Uses AI to optimally assign staff to shifts based on
    predictions and preferences.
    """
    service = StaffService(session)
    result = service.auto_schedule(
        start_date=request.start_date,
        end_date=request.end_date,
    )

    return result


@router.post("/assign")
def assign_staff(
    request: ShiftAssignRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Manually assign a staff member to a shift.
    """
    service = StaffService(session)
    assignment = service.assign_staff(
        staff_id=request.staff_id,
        shift_id=request.shift_id,
        assignment_date=request.assignment_date,
    )

    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="Unable to create assignment (conflict or hour limit)"
        )

    return {
        "assignment_id": assignment.id,
        "status": assignment.status.value,
    }


@router.get("/roster/{target_date}")
def get_daily_roster(
    target_date: date,
    session: Session = Depends(get_sync_session),
):
    """
    Get complete roster for a specific day.
    """
    service = StaffService(session)
    roster = service.get_daily_roster(target_date)
    return roster


@router.get("/{staff_id}/schedule")
def get_staff_schedule(
    staff_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_sync_session),
):
    """
    Get schedule for a specific staff member.
    """
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    service = StaffService(session)
    schedule = service.get_staff_schedule(
        staff_id=staff_id,
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "staff_id": schedule.staff_id,
        "staff_name": schedule.staff_name,
        "total_hours": schedule.total_hours,
        "total_shifts": schedule.total_shifts,
        "preferences_met": schedule.preferences_met,
        "preferences_total": schedule.preferences_total,
        "assignments": [
            {
                "date": a.assignment_date.isoformat(),
                "shift_id": a.shift_id,
                "status": a.status.value,
            }
            for a in schedule.assignments
        ],
    }


@router.put("/{staff_id}/preferences")
def update_preference(
    staff_id: int,
    request: PreferenceUpdate,
    session: Session = Depends(get_sync_session),
):
    """
    Update or create a staff preference.
    """
    try:
        day = DayOfWeek(request.day_of_week)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid day_of_week")

    service = StaffService(session)
    pref = service.update_preference(
        staff_id=staff_id,
        day_of_week=day,
        is_available=request.is_available,
        preferred=request.preferred,
        preferred_start=request.preferred_start,
        preferred_end=request.preferred_end,
        reason=request.reason,
    )

    return {
        "id": pref.id,
        "day_of_week": pref.day_of_week.value,
        "is_available": pref.is_available,
        "preferred": pref.preferred,
    }


@router.post("/assignments/{assignment_id}/clock-in")
def clock_in(
    assignment_id: int,
    session: Session = Depends(get_sync_session),
):
    """
    Record clock-in time for an assignment.
    """
    service = StaffService(session)
    if service.clock_in(assignment_id):
        return {"status": "clocked_in"}
    raise HTTPException(status_code=400, detail="Unable to clock in")


@router.post("/assignments/{assignment_id}/clock-out")
def clock_out(
    assignment_id: int,
    session: Session = Depends(get_sync_session),
):
    """
    Record clock-out time for an assignment.
    """
    service = StaffService(session)
    if service.clock_out(assignment_id):
        return {"status": "clocked_out"}
    raise HTTPException(status_code=400, detail="Unable to clock out")


@router.get("/")
def list_staff(
    active_only: bool = True,
    role: Optional[str] = None,
    session: Session = Depends(get_sync_session),
):
    """
    List all staff members.
    """
    from sqlalchemy import select
    from risto_ai.database.models.staff import Staff, StaffRole

    query = select(Staff)

    if active_only:
        query = query.where(Staff.is_active == True)

    if role:
        try:
            role_filter = StaffRole(role)
            query = query.where(Staff.role == role_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")

    query = query.order_by(Staff.last_name, Staff.first_name)
    staff_list = session.scalars(query).all()

    return [
        {
            "id": s.id,
            "name": s.full_name,
            "role": s.role.value,
            "contract_type": s.contract_type.value,
            "performance_score": s.performance_score,
            "reliability_score": s.reliability_score,
        }
        for s in staff_list
    ]
