"""
Reservation Management Service.

Provides:
- Table availability management
- Reservation creation and management
- Overbooking control
- Confirmation and reminder handling
"""

from dataclasses import dataclass
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Optional
import logging
import random
import string

from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.reservation import (
    Table,
    Reservation,
    ReservationStatus,
    ReservationSource,
    TableStatus,
)
from risto_ai.database.models.customer import Customer

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class AvailabilitySlot:
    """An available time slot for reservations."""
    time: time
    available_tables: int
    max_party_size: int
    remaining_capacity: int


@dataclass
class ReservationRequest:
    """Request to create a reservation."""
    customer_name: str
    customer_phone: str
    customer_email: Optional[str]
    party_size: int
    reservation_date: date
    reservation_time: time
    special_requests: Optional[str] = None
    dietary_requirements: Optional[str] = None
    occasion: Optional[str] = None
    source: ReservationSource = ReservationSource.PHONE
    campaign_id: Optional[int] = None


@dataclass
class ReservationResult:
    """Result of a reservation request."""
    success: bool
    reservation: Optional[Reservation]
    confirmation_code: Optional[str]
    message: str
    suggested_alternatives: list[AvailabilitySlot]


class ReservationService:
    """
    Restaurant reservation management service.

    Features:
    - Real-time availability checking
    - Smart table assignment
    - Overbooking management
    - Confirmation handling
    """

    # Standard reservation durations by party size
    DURATION_BY_SIZE = {
        1: 60,   # 1 person: 1 hour
        2: 90,   # 2 people: 1.5 hours
        3: 90,
        4: 120,  # 4 people: 2 hours
        5: 120,
        6: 150,  # 6+ people: 2.5 hours
    }

    # Operating hours
    LUNCH_START = time(12, 0)
    LUNCH_END = time(15, 0)
    DINNER_START = time(19, 0)
    DINNER_END = time(23, 0)

    def __init__(self, session: Session):
        self.session = session
        self.max_overbooking_pct = settings.max_overbooking_percentage

    def check_availability(
        self,
        target_date: date,
        party_size: int,
        preferred_time: Optional[time] = None,
    ) -> list[AvailabilitySlot]:
        """
        Check availability for a given date and party size.

        Args:
            target_date: Date to check
            party_size: Number of guests
            preferred_time: Optional preferred time

        Returns:
            List of available time slots
        """
        # Get all possible time slots
        time_slots = self._generate_time_slots(target_date)

        # Calculate availability for each slot
        available_slots = []
        for slot_time in time_slots:
            availability = self._calculate_slot_availability(
                target_date, slot_time, party_size
            )
            if availability["available"]:
                available_slots.append(AvailabilitySlot(
                    time=slot_time,
                    available_tables=availability["available_tables"],
                    max_party_size=availability["max_party_size"],
                    remaining_capacity=availability["remaining_capacity"],
                ))

        # Sort by preference if specified
        if preferred_time and available_slots:
            available_slots.sort(
                key=lambda s: abs(
                    datetime.combine(date.today(), s.time) -
                    datetime.combine(date.today(), preferred_time)
                ).seconds
            )

        return available_slots

    def create_reservation(
        self,
        request: ReservationRequest,
    ) -> ReservationResult:
        """
        Create a new reservation.

        Args:
            request: Reservation request details

        Returns:
            ReservationResult with success status and details
        """
        # Check availability
        availability = self._calculate_slot_availability(
            request.reservation_date,
            request.reservation_time,
            request.party_size,
        )

        if not availability["available"]:
            # Get alternatives
            alternatives = self.check_availability(
                request.reservation_date,
                request.party_size,
                request.reservation_time,
            )[:5]

            return ReservationResult(
                success=False,
                reservation=None,
                confirmation_code=None,
                message="Spiacenti, non ci sono tavoli disponibili per l'orario richiesto.",
                suggested_alternatives=alternatives,
            )

        # Find or create customer
        customer = self._find_or_create_customer(request)

        # Find best table
        table = self._find_best_table(
            request.reservation_date,
            request.reservation_time,
            request.party_size,
        )

        # Generate confirmation code
        confirmation_code = self._generate_confirmation_code()

        # Calculate duration
        duration = self.DURATION_BY_SIZE.get(
            min(request.party_size, 6),
            150  # Default for large groups
        )

        # Create reservation
        reservation = Reservation(
            confirmation_code=confirmation_code,
            customer_id=customer.id if customer else None,
            customer_name=request.customer_name,
            customer_phone=request.customer_phone,
            customer_email=request.customer_email,
            table_id=table.id if table else None,
            reservation_date=request.reservation_date,
            reservation_time=request.reservation_time,
            party_size=request.party_size,
            duration_minutes=duration,
            status=ReservationStatus.PENDING,
            source=request.source,
            special_requests=request.special_requests,
            dietary_requirements=request.dietary_requirements,
            occasion=request.occasion,
            campaign_id=request.campaign_id,
        )

        self.session.add(reservation)
        self.session.commit()

        logger.info(
            f"Created reservation {confirmation_code} for {request.customer_name} "
            f"on {request.reservation_date} at {request.reservation_time}"
        )

        return ReservationResult(
            success=True,
            reservation=reservation,
            confirmation_code=confirmation_code,
            message="Prenotazione confermata! A presto.",
            suggested_alternatives=[],
        )

    def confirm_reservation(self, confirmation_code: str) -> bool:
        """
        Confirm a pending reservation.

        Args:
            confirmation_code: Reservation confirmation code

        Returns:
            True if confirmed successfully
        """
        reservation = self.session.scalar(
            select(Reservation).where(
                Reservation.confirmation_code == confirmation_code
            )
        )

        if not reservation:
            return False

        if reservation.status != ReservationStatus.PENDING:
            return False

        reservation.status = ReservationStatus.CONFIRMED
        reservation.confirmation_sent = True
        self.session.commit()

        return True

    def cancel_reservation(
        self,
        confirmation_code: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Cancel a reservation.

        Args:
            confirmation_code: Reservation confirmation code
            reason: Optional cancellation reason

        Returns:
            True if cancelled successfully
        """
        reservation = self.session.scalar(
            select(Reservation).where(
                Reservation.confirmation_code == confirmation_code
            )
        )

        if not reservation:
            return False

        if reservation.status in [
            ReservationStatus.COMPLETED,
            ReservationStatus.CANCELLED,
        ]:
            return False

        reservation.status = ReservationStatus.CANCELLED
        if reason:
            reservation.internal_notes = f"Cancellato: {reason}"

        self.session.commit()
        return True

    def check_in_reservation(self, confirmation_code: str) -> bool:
        """
        Check in a guest for their reservation.

        Args:
            confirmation_code: Reservation confirmation code

        Returns:
            True if checked in successfully
        """
        reservation = self.session.scalar(
            select(Reservation).where(
                Reservation.confirmation_code == confirmation_code
            )
        )

        if not reservation:
            return False

        if reservation.status not in [
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
        ]:
            return False

        reservation.status = ReservationStatus.SEATED
        reservation.checked_in_at = datetime.utcnow()

        # Update table status
        if reservation.table:
            reservation.table.status = TableStatus.OCCUPIED

        self.session.commit()
        return True

    def complete_reservation(self, confirmation_code: str) -> bool:
        """
        Complete a reservation (guest has left).

        Args:
            confirmation_code: Reservation confirmation code

        Returns:
            True if completed successfully
        """
        reservation = self.session.scalar(
            select(Reservation).where(
                Reservation.confirmation_code == confirmation_code
            )
        )

        if not reservation:
            return False

        reservation.status = ReservationStatus.COMPLETED
        reservation.checked_out_at = datetime.utcnow()

        # Update table status
        if reservation.table:
            reservation.table.status = TableStatus.AVAILABLE

        self.session.commit()
        return True

    def get_reservations_by_date(
        self,
        target_date: date,
        status: Optional[ReservationStatus] = None,
    ) -> list[Reservation]:
        """
        Get all reservations for a specific date.

        Args:
            target_date: Date to query
            status: Optional status filter

        Returns:
            List of reservations
        """
        query = select(Reservation).where(
            Reservation.reservation_date == target_date
        )

        if status:
            query = query.where(Reservation.status == status)

        query = query.order_by(Reservation.reservation_time)

        return list(self.session.scalars(query))

    def get_pending_reminders(self) -> list[Reservation]:
        """
        Get reservations that need reminder messages.

        Returns reservations for tomorrow that haven't received reminders.
        """
        tomorrow = date.today() + timedelta(days=1)

        stmt = select(Reservation).where(
            and_(
                Reservation.reservation_date == tomorrow,
                Reservation.status == ReservationStatus.CONFIRMED,
                Reservation.reminder_sent == False,
            )
        )

        return list(self.session.scalars(stmt))

    def mark_reminder_sent(self, reservation_id: int) -> None:
        """Mark a reminder as sent."""
        reservation = self.session.get(Reservation, reservation_id)
        if reservation:
            reservation.reminder_sent = True
            reservation.last_message_at = datetime.utcnow()
            self.session.commit()

    def get_daily_capacity(self, target_date: date) -> dict:
        """
        Get capacity statistics for a date.

        Args:
            target_date: Date to analyze

        Returns:
            Dictionary with capacity metrics
        """
        # Get all active tables
        tables = list(self.session.scalars(
            select(Table).where(Table.is_active == True)
        ))

        total_capacity = sum(t.max_capacity for t in tables)
        table_count = len(tables)

        # Get reservations
        reservations = self.get_reservations_by_date(target_date)
        active_reservations = [
            r for r in reservations
            if r.status not in [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW]
        ]

        reserved_covers = sum(r.party_size for r in active_reservations)

        # Calculate by time period
        lunch_reservations = [
            r for r in active_reservations
            if self.LUNCH_START <= r.reservation_time < self.LUNCH_END
        ]
        dinner_reservations = [
            r for r in active_reservations
            if self.DINNER_START <= r.reservation_time <= self.DINNER_END
        ]

        return {
            "date": target_date,
            "total_tables": table_count,
            "total_capacity": total_capacity,
            "total_reservations": len(active_reservations),
            "total_covers_reserved": reserved_covers,
            "lunch": {
                "reservations": len(lunch_reservations),
                "covers": sum(r.party_size for r in lunch_reservations),
            },
            "dinner": {
                "reservations": len(dinner_reservations),
                "covers": sum(r.party_size for r in dinner_reservations),
            },
            "availability_percentage": (
                (total_capacity - reserved_covers) / max(total_capacity, 1) * 100
            ),
        }

    def _generate_time_slots(self, target_date: date) -> list[time]:
        """Generate available time slots for a date."""
        slots = []

        # Lunch slots (30-min intervals)
        current = datetime.combine(target_date, self.LUNCH_START)
        end_lunch = datetime.combine(target_date, time(14, 30))  # Last lunch slot
        while current <= end_lunch:
            slots.append(current.time())
            current += timedelta(minutes=30)

        # Dinner slots (30-min intervals)
        current = datetime.combine(target_date, self.DINNER_START)
        end_dinner = datetime.combine(target_date, time(22, 0))  # Last dinner slot
        while current <= end_dinner:
            slots.append(current.time())
            current += timedelta(minutes=30)

        return slots

    def _calculate_slot_availability(
        self,
        target_date: date,
        slot_time: time,
        party_size: int,
    ) -> dict:
        """Calculate availability for a specific time slot."""
        # Get duration for this party size
        duration = self.DURATION_BY_SIZE.get(min(party_size, 6), 150)

        # Calculate time window
        slot_start = datetime.combine(target_date, slot_time)
        slot_end = slot_start + timedelta(minutes=duration)

        # Get all tables
        tables = list(self.session.scalars(
            select(Table).where(
                and_(
                    Table.is_active == True,
                    Table.max_capacity >= party_size,
                )
            )
        ))

        if not tables:
            return {
                "available": False,
                "available_tables": 0,
                "max_party_size": 0,
                "remaining_capacity": 0,
            }

        # Check which tables are free during this slot
        available_tables = []
        for table in tables:
            if self._is_table_available(table.id, target_date, slot_start, slot_end):
                available_tables.append(table)

        # Apply overbooking limit
        total_tables = len(tables)
        max_reservations = int(total_tables * (1 + self.max_overbooking_pct / 100))
        current_reservations = self._count_slot_reservations(
            target_date, slot_time, duration
        )

        can_accept = current_reservations < max_reservations or len(available_tables) > 0

        return {
            "available": can_accept and len(available_tables) > 0,
            "available_tables": len(available_tables),
            "max_party_size": max(t.max_capacity for t in available_tables) if available_tables else 0,
            "remaining_capacity": sum(t.max_capacity for t in available_tables),
        }

    def _is_table_available(
        self,
        table_id: int,
        target_date: date,
        slot_start: datetime,
        slot_end: datetime,
    ) -> bool:
        """Check if a specific table is available during a time window."""
        # Find overlapping reservations
        stmt = select(Reservation).where(
            and_(
                Reservation.table_id == table_id,
                Reservation.reservation_date == target_date,
                Reservation.status.notin_([
                    ReservationStatus.CANCELLED,
                    ReservationStatus.NO_SHOW,
                    ReservationStatus.COMPLETED,
                ]),
            )
        )

        reservations = list(self.session.scalars(stmt))

        for res in reservations:
            res_start = datetime.combine(target_date, res.reservation_time)
            res_end = res_start + timedelta(minutes=res.duration_minutes)

            # Check for overlap
            if slot_start < res_end and slot_end > res_start:
                return False

        return True

    def _count_slot_reservations(
        self,
        target_date: date,
        slot_time: time,
        duration: int,
    ) -> int:
        """Count reservations overlapping with a time slot."""
        slot_start = datetime.combine(target_date, slot_time)
        slot_end = slot_start + timedelta(minutes=duration)

        # This is simplified - in production would need proper overlap calculation
        stmt = select(func.count(Reservation.id)).where(
            and_(
                Reservation.reservation_date == target_date,
                Reservation.reservation_time >= (slot_start - timedelta(hours=2)).time(),
                Reservation.reservation_time <= slot_time,
                Reservation.status.notin_([
                    ReservationStatus.CANCELLED,
                    ReservationStatus.NO_SHOW,
                ]),
            )
        )

        return self.session.scalar(stmt) or 0

    def _find_best_table(
        self,
        target_date: date,
        slot_time: time,
        party_size: int,
    ) -> Optional[Table]:
        """Find the best available table for a party."""
        duration = self.DURATION_BY_SIZE.get(min(party_size, 6), 150)
        slot_start = datetime.combine(target_date, slot_time)
        slot_end = slot_start + timedelta(minutes=duration)

        # Get suitable tables ordered by capacity (smallest first that fits)
        tables = list(self.session.scalars(
            select(Table)
            .where(
                and_(
                    Table.is_active == True,
                    Table.max_capacity >= party_size,
                )
            )
            .order_by(Table.max_capacity)
        ))

        for table in tables:
            if self._is_table_available(table.id, target_date, slot_start, slot_end):
                return table

        return None

    def _find_or_create_customer(
        self,
        request: ReservationRequest,
    ) -> Optional[Customer]:
        """Find or create a customer from reservation request."""
        # Try to find by phone
        customer = self.session.scalar(
            select(Customer).where(Customer.phone == request.customer_phone)
        )

        if customer:
            return customer

        # Create new customer
        name_parts = request.customer_name.split(" ", 1)
        customer = Customer(
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else None,
            phone=request.customer_phone,
            email=request.customer_email,
            whatsapp_number=request.customer_phone,
        )

        self.session.add(customer)
        self.session.flush()

        return customer

    def _generate_confirmation_code(self) -> str:
        """Generate a unique confirmation code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            existing = self.session.scalar(
                select(Reservation).where(Reservation.confirmation_code == code)
            )
            if not existing:
                return code
