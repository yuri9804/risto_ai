"""
Staff Management Service.

Provides:
- Staff scheduling based on predicted customer flow
- Preference-based shift assignment
- Automatic schedule optimization
- Workload balancing
"""

from dataclasses import dataclass
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Optional
import logging

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.staff import (
    Staff,
    StaffPreference,
    Shift,
    ShiftAssignment,
    StaffRole,
    ShiftType,
    DayOfWeek,
    AssignmentStatus,
)
from risto_ai.database.models.prediction import CustomerFlowPrediction, DayClassification

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class StaffRequirement:
    """Staff requirement for a shift on a specific day."""
    shift_id: int
    shift_name: str
    shift_type: ShiftType
    required_role: Optional[StaffRole]
    required_count: int
    assigned_count: int
    gap: int


@dataclass
class ScheduleSuggestion:
    """AI-generated schedule suggestion."""
    staff_id: int
    staff_name: str
    shift_id: int
    shift_name: str
    assignment_date: date
    score: float
    reasons: list[str]


@dataclass
class WeeklySchedule:
    """Weekly schedule summary for a staff member."""
    staff_id: int
    staff_name: str
    total_hours: float
    total_shifts: int
    assignments: list[ShiftAssignment]
    preferences_met: int
    preferences_total: int


class StaffService:
    """
    AI-powered staff scheduling and management.

    Features:
    - Prediction-based staffing levels
    - Preference-aware scheduling
    - Automatic schedule generation
    - Workload optimization
    """

    def __init__(self, session: Session):
        self.session = session

    def calculate_requirements(
        self,
        target_date: date,
        day_classification: Optional[DayClassification] = None,
    ) -> list[StaffRequirement]:
        """
        Calculate staff requirements for a specific date.

        Args:
            target_date: Date to calculate requirements
            day_classification: Override classification (auto-detected if None)

        Returns:
            List of staff requirements per shift
        """
        # Get or predict day classification
        if not day_classification:
            day_classification = self._get_day_classification(target_date)

        # Get all active shifts
        shifts = list(self.session.scalars(
            select(Shift).where(Shift.is_active == True)
        ))

        requirements = []
        for shift in shifts:
            # Determine required staff based on classification
            if day_classification == DayClassification.LOW:
                required = shift.low_flow_staff
            elif day_classification == DayClassification.MEDIUM:
                required = shift.medium_flow_staff
            elif day_classification in [DayClassification.HIGH, DayClassification.VERY_HIGH]:
                required = shift.high_flow_staff
            else:
                required = shift.min_staff

            # Count existing assignments
            assigned = self.session.scalar(
                select(func.count(ShiftAssignment.id)).where(
                    and_(
                        ShiftAssignment.shift_id == shift.id,
                        ShiftAssignment.assignment_date == target_date,
                        ShiftAssignment.status.notin_([
                            AssignmentStatus.CANCELLED,
                        ]),
                    )
                )
            ) or 0

            requirements.append(StaffRequirement(
                shift_id=shift.id,
                shift_name=shift.name,
                shift_type=shift.shift_type,
                required_role=shift.required_role,
                required_count=required,
                assigned_count=assigned,
                gap=required - assigned,
            ))

        return requirements

    def generate_schedule_suggestions(
        self,
        target_date: date,
        shift_id: Optional[int] = None,
    ) -> list[ScheduleSuggestion]:
        """
        Generate AI-powered schedule suggestions.

        Args:
            target_date: Date to schedule
            shift_id: Optional specific shift to fill

        Returns:
            List of ranked suggestions
        """
        suggestions = []

        # Get requirements with gaps
        requirements = self.calculate_requirements(target_date)
        gaps = [r for r in requirements if r.gap > 0]

        if shift_id:
            gaps = [r for r in gaps if r.shift_id == shift_id]

        if not gaps:
            return []

        # Get available staff
        available_staff = self._get_available_staff(target_date)

        dow = DayOfWeek(target_date.strftime("%A").lower())

        for requirement in gaps:
            shift = self.session.get(Shift, requirement.shift_id)
            if not shift:
                continue

            for staff in available_staff:
                # Check role compatibility
                if shift.required_role and staff.role != shift.required_role:
                    continue

                # Score this assignment
                score, reasons = self._score_assignment(
                    staff, shift, target_date, dow
                )

                if score > 0:
                    suggestions.append(ScheduleSuggestion(
                        staff_id=staff.id,
                        staff_name=staff.full_name,
                        shift_id=shift.id,
                        shift_name=shift.name,
                        assignment_date=target_date,
                        score=score,
                        reasons=reasons,
                    ))

        # Sort by score (highest first)
        suggestions.sort(key=lambda s: s.score, reverse=True)

        return suggestions

    def auto_schedule(
        self,
        start_date: date,
        end_date: date,
    ) -> dict:
        """
        Automatically generate schedule for a date range.

        Args:
            start_date: First date to schedule
            end_date: Last date to schedule

        Returns:
            Summary of assignments made
        """
        total_assigned = 0
        total_gaps = 0
        assignments_made = []

        current = start_date
        while current <= end_date:
            # Get suggestions for each day
            suggestions = self.generate_schedule_suggestions(current)

            # Track which staff and shifts are filled
            assigned_staff = set()
            filled_shifts = {}

            requirements = self.calculate_requirements(current)
            req_by_shift = {r.shift_id: r for r in requirements}

            for suggestion in suggestions:
                shift_req = req_by_shift.get(suggestion.shift_id)
                if not shift_req:
                    continue

                # Check if shift still needs staff
                current_fill = filled_shifts.get(suggestion.shift_id, 0)
                if current_fill >= shift_req.required_count:
                    continue

                # Check if staff already assigned
                if suggestion.staff_id in assigned_staff:
                    continue

                # Make the assignment
                assignment = self.assign_staff(
                    staff_id=suggestion.staff_id,
                    shift_id=suggestion.shift_id,
                    assignment_date=current,
                    is_auto=True,
                    score=suggestion.score,
                )

                if assignment:
                    assigned_staff.add(suggestion.staff_id)
                    filled_shifts[suggestion.shift_id] = current_fill + 1
                    assignments_made.append({
                        "date": current,
                        "staff": suggestion.staff_name,
                        "shift": suggestion.shift_name,
                        "score": suggestion.score,
                    })
                    total_assigned += 1

            # Count remaining gaps
            for req in requirements:
                fill = filled_shifts.get(req.shift_id, 0)
                total_gaps += max(0, req.required_count - fill - req.assigned_count)

            current += timedelta(days=1)

        return {
            "period": {"start": start_date, "end": end_date},
            "total_assigned": total_assigned,
            "remaining_gaps": total_gaps,
            "assignments": assignments_made,
        }

    def assign_staff(
        self,
        staff_id: int,
        shift_id: int,
        assignment_date: date,
        is_auto: bool = False,
        score: Optional[float] = None,
    ) -> Optional[ShiftAssignment]:
        """
        Assign a staff member to a shift.

        Args:
            staff_id: Staff member ID
            shift_id: Shift ID
            assignment_date: Date of assignment
            is_auto: Whether this is an auto-assignment
            score: Assignment score (for auto-assignments)

        Returns:
            Created ShiftAssignment or None if conflict
        """
        # Check for existing assignment
        existing = self.session.scalar(
            select(ShiftAssignment).where(
                and_(
                    ShiftAssignment.staff_id == staff_id,
                    ShiftAssignment.assignment_date == assignment_date,
                    ShiftAssignment.status != AssignmentStatus.CANCELLED,
                )
            )
        )

        if existing:
            logger.warning(
                f"Staff {staff_id} already assigned on {assignment_date}"
            )
            return None

        # Validate weekly hours
        if not self._validate_weekly_hours(staff_id, assignment_date, shift_id):
            logger.warning(f"Staff {staff_id} would exceed weekly hours")
            return None

        # Create assignment
        assignment = ShiftAssignment(
            staff_id=staff_id,
            shift_id=shift_id,
            assignment_date=assignment_date,
            status=AssignmentStatus.SCHEDULED,
            is_auto_assigned=is_auto,
            assignment_score=score,
        )

        self.session.add(assignment)
        self.session.commit()

        logger.info(
            f"Assigned staff {staff_id} to shift {shift_id} on {assignment_date}"
        )

        return assignment

    def get_staff_schedule(
        self,
        staff_id: int,
        start_date: date,
        end_date: date,
    ) -> WeeklySchedule:
        """
        Get schedule for a staff member.

        Args:
            staff_id: Staff member ID
            start_date: Period start
            end_date: Period end

        Returns:
            WeeklySchedule summary
        """
        staff = self.session.get(Staff, staff_id)
        if not staff:
            raise ValueError(f"Staff {staff_id} not found")

        # Get assignments
        stmt = (
            select(ShiftAssignment)
            .where(
                and_(
                    ShiftAssignment.staff_id == staff_id,
                    ShiftAssignment.assignment_date >= start_date,
                    ShiftAssignment.assignment_date <= end_date,
                    ShiftAssignment.status != AssignmentStatus.CANCELLED,
                )
            )
            .order_by(ShiftAssignment.assignment_date)
        )
        assignments = list(self.session.scalars(stmt))

        # Calculate total hours
        total_hours = 0.0
        for assignment in assignments:
            shift = self.session.get(Shift, assignment.shift_id)
            if shift:
                total_hours += shift.duration_hours

        # Check preferences met
        preferences_met = 0
        preferences_total = 0

        for assignment in assignments:
            dow = DayOfWeek(assignment.assignment_date.strftime("%A").lower())
            pref = self._get_staff_preference(staff_id, dow)
            if pref:
                preferences_total += 1
                if pref.preferred:
                    preferences_met += 1

        return WeeklySchedule(
            staff_id=staff_id,
            staff_name=staff.full_name,
            total_hours=total_hours,
            total_shifts=len(assignments),
            assignments=assignments,
            preferences_met=preferences_met,
            preferences_total=preferences_total,
        )

    def get_daily_roster(self, target_date: date) -> list[dict]:
        """
        Get complete roster for a specific day.

        Args:
            target_date: Date to query

        Returns:
            List of assignments with staff and shift details
        """
        stmt = (
            select(ShiftAssignment, Staff, Shift)
            .join(Staff, ShiftAssignment.staff_id == Staff.id)
            .join(Shift, ShiftAssignment.shift_id == Shift.id)
            .where(
                and_(
                    ShiftAssignment.assignment_date == target_date,
                    ShiftAssignment.status != AssignmentStatus.CANCELLED,
                )
            )
            .order_by(Shift.start_time, Staff.last_name)
        )

        results = self.session.execute(stmt).fetchall()

        roster = []
        for assignment, staff, shift in results:
            roster.append({
                "assignment_id": assignment.id,
                "staff_id": staff.id,
                "staff_name": staff.full_name,
                "role": staff.role.value,
                "shift_id": shift.id,
                "shift_name": shift.name,
                "shift_type": shift.shift_type.value,
                "start_time": shift.start_time.strftime("%H:%M"),
                "end_time": shift.end_time.strftime("%H:%M"),
                "status": assignment.status.value,
                "is_auto": assignment.is_auto_assigned,
            })

        return roster

    def update_preference(
        self,
        staff_id: int,
        day_of_week: DayOfWeek,
        is_available: bool = True,
        preferred: bool = False,
        preferred_start: Optional[time] = None,
        preferred_end: Optional[time] = None,
        reason: Optional[str] = None,
    ) -> StaffPreference:
        """
        Update or create a staff preference.

        Args:
            staff_id: Staff member ID
            day_of_week: Day of the week
            is_available: Whether available this day
            preferred: Whether this is a preferred day
            preferred_start: Preferred start time
            preferred_end: Preferred end time
            reason: Reason for preference

        Returns:
            Updated StaffPreference
        """
        # Find existing
        pref = self.session.scalar(
            select(StaffPreference).where(
                and_(
                    StaffPreference.staff_id == staff_id,
                    StaffPreference.day_of_week == day_of_week,
                )
            )
        )

        if pref:
            pref.is_available = is_available
            pref.preferred = preferred
            pref.preferred_start_time = preferred_start
            pref.preferred_end_time = preferred_end
            pref.reason = reason
        else:
            pref = StaffPreference(
                staff_id=staff_id,
                day_of_week=day_of_week,
                is_available=is_available,
                preferred=preferred,
                preferred_start_time=preferred_start,
                preferred_end_time=preferred_end,
                reason=reason,
            )
            self.session.add(pref)

        self.session.commit()
        return pref

    def clock_in(self, assignment_id: int) -> bool:
        """Record clock-in time for an assignment."""
        assignment = self.session.get(ShiftAssignment, assignment_id)
        if not assignment:
            return False

        assignment.clock_in_time = datetime.utcnow()
        assignment.status = AssignmentStatus.IN_PROGRESS
        self.session.commit()
        return True

    def clock_out(self, assignment_id: int) -> bool:
        """Record clock-out time for an assignment."""
        assignment = self.session.get(ShiftAssignment, assignment_id)
        if not assignment:
            return False

        assignment.clock_out_time = datetime.utcnow()
        assignment.status = AssignmentStatus.COMPLETED
        self.session.commit()
        return True

    def _get_day_classification(self, target_date: date) -> DayClassification:
        """Get predicted day classification."""
        prediction = self.session.scalar(
            select(CustomerFlowPrediction).where(
                and_(
                    CustomerFlowPrediction.prediction_date == target_date,
                    CustomerFlowPrediction.is_latest == True,
                )
            )
        )

        if prediction:
            return prediction.day_classification

        # Default to MEDIUM if no prediction
        return DayClassification.MEDIUM

    def _get_available_staff(self, target_date: date) -> list[Staff]:
        """Get staff members available on a date."""
        dow = DayOfWeek(target_date.strftime("%A").lower())

        # Get all active staff
        all_staff = list(self.session.scalars(
            select(Staff).where(Staff.is_active == True)
        ))

        available = []
        for staff in all_staff:
            # Check preferences
            pref = self._get_staff_preference(staff.id, dow)

            if pref and not pref.is_available:
                continue

            # Check not already assigned
            existing = self.session.scalar(
                select(ShiftAssignment).where(
                    and_(
                        ShiftAssignment.staff_id == staff.id,
                        ShiftAssignment.assignment_date == target_date,
                        ShiftAssignment.status != AssignmentStatus.CANCELLED,
                    )
                )
            )

            if not existing:
                available.append(staff)

        return available

    def _get_staff_preference(
        self,
        staff_id: int,
        day_of_week: DayOfWeek,
    ) -> Optional[StaffPreference]:
        """Get staff preference for a specific day."""
        return self.session.scalar(
            select(StaffPreference).where(
                and_(
                    StaffPreference.staff_id == staff_id,
                    StaffPreference.day_of_week == day_of_week,
                )
            )
        )

    def _score_assignment(
        self,
        staff: Staff,
        shift: Shift,
        target_date: date,
        day_of_week: DayOfWeek,
    ) -> tuple[float, list[str]]:
        """
        Score a potential assignment.

        Returns:
            Tuple of (score, reasons)
        """
        score = 50.0  # Base score
        reasons = []

        # Check preference
        pref = self._get_staff_preference(staff.id, day_of_week)

        if pref:
            if not pref.is_available:
                return 0.0, ["Non disponibile"]

            if pref.preferred:
                score += 20
                reasons.append("Giorno preferito (+20)")

            # Time preference matching
            if pref.preferred_start_time and pref.preferred_end_time:
                if (shift.start_time >= pref.preferred_start_time and
                    shift.end_time <= pref.preferred_end_time):
                    score += 15
                    reasons.append("Orario preferito (+15)")

        # Role match bonus
        if shift.required_role and shift.required_role == staff.role:
            score += 10
            reasons.append("Ruolo corretto (+10)")

        # Performance score contribution
        perf_bonus = staff.performance_score / 10  # 0-10 points
        score += perf_bonus
        if perf_bonus > 5:
            reasons.append(f"Alta performance (+{perf_bonus:.1f})")

        # Reliability score contribution
        rel_bonus = staff.reliability_score / 10  # 0-10 points
        score += rel_bonus
        if rel_bonus > 5:
            reasons.append(f"Alta affidabilità (+{rel_bonus:.1f})")

        # Check consecutive days
        consecutive = self._get_consecutive_days(staff.id, target_date)
        if consecutive >= staff.max_consecutive_days:
            return 0.0, ["Superato limite giorni consecutivi"]
        elif consecutive >= staff.max_consecutive_days - 1:
            score -= 20
            reasons.append("Vicino limite giorni consecutivi (-20)")

        # Balance workload (prefer staff with fewer hours this week)
        week_hours = self._get_week_hours(staff.id, target_date)
        if week_hours < staff.min_hours_per_week:
            score += 15
            reasons.append("Sotto ore minime (+15)")
        elif week_hours + shift.duration_hours > staff.max_hours_per_week:
            return 0.0, ["Supererebbe ore massime settimanali"]

        return score, reasons

    def _get_consecutive_days(self, staff_id: int, target_date: date) -> int:
        """Count consecutive days worked before target date."""
        consecutive = 0
        check_date = target_date - timedelta(days=1)

        while True:
            assignment = self.session.scalar(
                select(ShiftAssignment).where(
                    and_(
                        ShiftAssignment.staff_id == staff_id,
                        ShiftAssignment.assignment_date == check_date,
                        ShiftAssignment.status != AssignmentStatus.CANCELLED,
                    )
                )
            )

            if not assignment:
                break

            consecutive += 1
            check_date -= timedelta(days=1)

            if consecutive > 10:  # Safety limit
                break

        return consecutive

    def _get_week_hours(self, staff_id: int, target_date: date) -> float:
        """Get total hours worked in the week containing target_date."""
        # Get week start (Monday)
        week_start = target_date - timedelta(days=target_date.weekday())
        week_end = week_start + timedelta(days=6)

        stmt = (
            select(ShiftAssignment, Shift)
            .join(Shift, ShiftAssignment.shift_id == Shift.id)
            .where(
                and_(
                    ShiftAssignment.staff_id == staff_id,
                    ShiftAssignment.assignment_date >= week_start,
                    ShiftAssignment.assignment_date <= week_end,
                    ShiftAssignment.status != AssignmentStatus.CANCELLED,
                )
            )
        )

        results = self.session.execute(stmt).fetchall()
        total_hours = sum(shift.duration_hours for _, shift in results)

        return total_hours

    def _validate_weekly_hours(
        self,
        staff_id: int,
        target_date: date,
        shift_id: int,
    ) -> bool:
        """Validate that assignment won't exceed weekly hours."""
        staff = self.session.get(Staff, staff_id)
        shift = self.session.get(Shift, shift_id)

        if not staff or not shift:
            return False

        current_hours = self._get_week_hours(staff_id, target_date)
        return (current_hours + shift.duration_hours) <= staff.max_hours_per_week
