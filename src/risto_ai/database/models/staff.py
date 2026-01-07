"""
Staff management database models.
Includes staff profiles, preferences, shifts, and assignments.
"""

from datetime import datetime, date, time
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    String,
    Text,
    Numeric,
    Integer,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Enum,
    Index,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class StaffRole(str, PyEnum):
    """Staff role types."""
    CHEF = "chef"
    SOUS_CHEF = "sous_chef"
    LINE_COOK = "line_cook"
    PREP_COOK = "prep_cook"
    DISHWASHER = "dishwasher"
    HEAD_WAITER = "head_waiter"
    WAITER = "waiter"
    BARTENDER = "bartender"
    HOST = "host"
    MANAGER = "manager"
    ASSISTANT_MANAGER = "assistant_manager"


class ContractType(str, PyEnum):
    """Employment contract type."""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    ON_CALL = "on_call"
    TEMPORARY = "temporary"


class ShiftType(str, PyEnum):
    """Shift type."""
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    SPLIT = "split"
    FULL_DAY = "full_day"


class DayOfWeek(str, PyEnum):
    """Days of the week."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class AssignmentStatus(str, PyEnum):
    """Shift assignment status."""
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABSENT = "absent"
    CANCELLED = "cancelled"


class Staff(Base):
    """
    Staff member profile.
    """
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Personal info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)

    # Employment
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole), nullable=False)
    contract_type: Mapped[ContractType] = mapped_column(Enum(ContractType), nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    # Capacity
    max_hours_per_week: Mapped[int] = mapped_column(Integer, default=40)
    min_hours_per_week: Mapped[int] = mapped_column(Integer, default=0)
    max_consecutive_days: Mapped[int] = mapped_column(Integer, default=6)

    # Skills and certifications
    skills: Mapped[Optional[dict]] = mapped_column(JSON)  # {"skill": proficiency_level}
    certifications: Mapped[Optional[dict]] = mapped_column(JSON)  # {"cert": expiry_date}

    # Performance metrics
    performance_score: Mapped[float] = mapped_column(Numeric(5, 2), default=50)  # 0-100
    reliability_score: Mapped[float] = mapped_column(Numeric(5, 2), default=50)  # 0-100

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    preferences: Mapped[List["StaffPreference"]] = relationship(
        back_populates="staff", cascade="all, delete-orphan"
    )
    assignments: Mapped[List["ShiftAssignment"]] = relationship(
        back_populates="staff", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        """Get staff member's full name."""
        return f"{self.first_name} {self.last_name}"

    __table_args__ = (
        Index("ix_staff_role", "role"),
        Index("ix_staff_active", "is_active"),
    )


class StaffPreference(Base):
    """
    Staff scheduling preferences and availability.
    """
    __tablename__ = "staff_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), nullable=False)

    # Day preferences
    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek), nullable=False)

    # Availability
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    preferred: Mapped[bool] = mapped_column(Boolean, default=False)  # Preferred to work this day

    # Time preferences
    preferred_start_time: Mapped[Optional[time]] = mapped_column(Time)
    preferred_end_time: Mapped[Optional[time]] = mapped_column(Time)
    unavailable_start_time: Mapped[Optional[time]] = mapped_column(Time)
    unavailable_end_time: Mapped[Optional[time]] = mapped_column(Time)

    # Shift type preferences
    preferred_shift_types: Mapped[Optional[list]] = mapped_column(JSON)  # ["morning", "evening"]

    # Priority weight (higher = more important to respect)
    priority: Mapped[int] = mapped_column(Integer, default=5)  # 1-10

    # Reason
    reason: Mapped[Optional[str]] = mapped_column(Text)

    # Validity period
    valid_from: Mapped[Optional[date]] = mapped_column(Date)
    valid_until: Mapped[Optional[date]] = mapped_column(Date)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    staff: Mapped["Staff"] = relationship(back_populates="preferences")

    __table_args__ = (
        Index("ix_staff_preferences_staff", "staff_id"),
        Index("ix_staff_preferences_day", "day_of_week"),
    )


class Shift(Base):
    """
    Shift template definition.
    """
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Shift details
    shift_type: Mapped[ShiftType] = mapped_column(Enum(ShiftType), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)

    # Role requirements
    required_role: Mapped[Optional[StaffRole]] = mapped_column(Enum(StaffRole))
    min_staff: Mapped[int] = mapped_column(Integer, default=1)
    max_staff: Mapped[int] = mapped_column(Integer, default=1)

    # Customer flow based adjustments
    low_flow_staff: Mapped[int] = mapped_column(Integer, default=1)
    medium_flow_staff: Mapped[int] = mapped_column(Integer, default=1)
    high_flow_staff: Mapped[int] = mapped_column(Integer, default=2)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    assignments: Mapped[List["ShiftAssignment"]] = relationship(
        back_populates="shift", cascade="all, delete-orphan"
    )

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours."""
        from datetime import datetime as dt
        start = dt.combine(date.today(), self.start_time)
        end = dt.combine(date.today(), self.end_time)
        if end < start:
            end = dt.combine(date.today() + date.resolution, self.end_time)
        return (end - start).seconds / 3600 - (self.break_duration_minutes / 60)

    __table_args__ = (
        Index("ix_shifts_type", "shift_type"),
        Index("ix_shifts_role", "required_role"),
    )


class ShiftAssignment(Base):
    """
    Assignment of a staff member to a shift on a specific date.
    """
    __tablename__ = "shift_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), nullable=False)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"), nullable=False)
    assignment_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Override times if different from template
    actual_start_time: Mapped[Optional[time]] = mapped_column(Time)
    actual_end_time: Mapped[Optional[time]] = mapped_column(Time)

    # Status
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), default=AssignmentStatus.SCHEDULED
    )

    # Clock in/out
    clock_in_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    clock_out_time: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Assignment source
    is_auto_assigned: Mapped[bool] = mapped_column(Boolean, default=False)
    assignment_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))  # AI scoring

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    staff: Mapped["Staff"] = relationship(back_populates="assignments")
    shift: Mapped["Shift"] = relationship(back_populates="assignments")

    @property
    def hours_worked(self) -> Optional[float]:
        """Calculate actual hours worked."""
        if self.clock_in_time and self.clock_out_time:
            delta = self.clock_out_time - self.clock_in_time
            return delta.total_seconds() / 3600
        return None

    __table_args__ = (
        Index("ix_shift_assignments_date", "assignment_date"),
        Index("ix_shift_assignments_staff", "staff_id"),
        Index("ix_shift_assignments_status", "status"),
        Index("ix_shift_assignments_staff_date", "staff_id", "assignment_date"),
    )
