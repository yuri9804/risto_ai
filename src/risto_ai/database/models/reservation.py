"""
Reservation-related database models.
Includes tables and reservations management.
"""

from datetime import datetime, date, time
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Enum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class ReservationStatus(str, PyEnum):
    """Reservation status values."""
    PENDING = "pending"  # Awaiting confirmation
    CONFIRMED = "confirmed"  # Confirmed by restaurant
    SEATED = "seated"  # Customer has arrived and seated
    COMPLETED = "completed"  # Reservation completed
    CANCELLED = "cancelled"  # Cancelled by customer or restaurant
    NO_SHOW = "no_show"  # Customer didn't show up


class ReservationSource(str, PyEnum):
    """Source of the reservation."""
    PHONE = "phone"
    WEBSITE = "website"
    WHATSAPP = "whatsapp"
    WALK_IN = "walk_in"
    THEFORK = "thefork"
    GOOGLE = "google"
    OTHER = "other"


class TableStatus(str, PyEnum):
    """Table status values."""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    UNAVAILABLE = "unavailable"


class Table(Base):
    """
    Restaurant table configuration.
    """
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    table_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "Table by Window"

    # Capacity
    min_capacity: Mapped[int] = mapped_column(Integer, default=1)
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False)

    # Location
    location: Mapped[str] = mapped_column(String(50), default="main")  # main, terrace, private, etc.
    floor: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    status: Mapped[TableStatus] = mapped_column(Enum(TableStatus), default=TableStatus.AVAILABLE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Features
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True)
    has_power_outlet: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    reservations: Mapped[List["Reservation"]] = relationship(back_populates="table")

    __table_args__ = (
        Index("ix_tables_status", "status"),
        Index("ix_tables_location", "location"),
    )


class Reservation(Base):
    """
    A table reservation.
    """
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    confirmation_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    # Customer info
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"))
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))

    # Reservation details
    table_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tables.id"))
    reservation_date: Mapped[date] = mapped_column(Date, nullable=False)
    reservation_time: Mapped[time] = mapped_column(Time, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90)

    # Status
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus), default=ReservationStatus.PENDING
    )
    source: Mapped[ReservationSource] = mapped_column(
        Enum(ReservationSource), default=ReservationSource.PHONE
    )

    # Special requests
    special_requests: Mapped[Optional[str]] = mapped_column(Text)
    dietary_requirements: Mapped[Optional[str]] = mapped_column(Text)
    occasion: Mapped[Optional[str]] = mapped_column(String(100))  # birthday, anniversary, etc.

    # Campaign tracking
    campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaigns.id"))

    # Communication
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmation_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Check-in/out
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    checked_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Notes
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    table: Mapped[Optional["Table"]] = relationship(back_populates="reservations")

    @property
    def end_time(self) -> time:
        """Calculate reservation end time."""
        from datetime import timedelta
        dt = datetime.combine(self.reservation_date, self.reservation_time)
        end_dt = dt + timedelta(minutes=self.duration_minutes)
        return end_dt.time()

    __table_args__ = (
        Index("ix_reservations_date", "reservation_date"),
        Index("ix_reservations_status", "status"),
        Index("ix_reservations_customer", "customer_id"),
        Index("ix_reservations_table_date", "table_id", "reservation_date"),
        Index("ix_reservations_phone", "customer_phone"),
    )
