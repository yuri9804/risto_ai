"""
Customer-related database models.
Includes customer data, segments, preferences, and feedback.
"""

from datetime import datetime, date
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
    ForeignKey,
    Enum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class CustomerSegmentType(str, PyEnum):
    """Customer segment categories based on value and behavior."""
    VIP = "vip"  # High value, high frequency
    LOYAL = "loyal"  # Regular customers, medium value
    POTENTIAL = "potential"  # Growing engagement
    OCCASIONAL = "occasional"  # Infrequent visitors
    INACTIVE = "inactive"  # No recent visits
    NEW = "new"  # First-time or very recent customers
    AT_RISK = "at_risk"  # Previously active, declining engagement


class ContactChannel(str, PyEnum):
    """Preferred contact channel for marketing."""
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SMS = "sms"
    NONE = "none"


class Customer(Base):
    """
    Customer profile with contact information and behavioral metrics.
    """
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Basic info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50))

    # Contact preferences
    preferred_channel: Mapped[ContactChannel] = mapped_column(
        Enum(ContactChannel), default=ContactChannel.WHATSAPP
    )
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(10), default="it")

    # Visit metrics (calculated fields, updated periodically)
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    total_spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    average_spend: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    first_visit_date: Mapped[Optional[date]] = mapped_column(Date)
    last_visit_date: Mapped[Optional[date]] = mapped_column(Date)

    # Customer lifetime value
    clv_score: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    clv_percentile: Mapped[float] = mapped_column(Numeric(5, 4), default=0)

    # Behavioral scores
    loyalty_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)  # 0-100
    engagement_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)  # 0-100
    offer_propensity_score: Mapped[float] = mapped_column(Numeric(5, 4), default=0.5)  # 0-1

    # Segment
    segment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customer_segments.id"))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    segment: Mapped[Optional["CustomerSegment"]] = relationship(back_populates="customers")
    preferences: Mapped[List["CustomerPreference"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    feedback: Mapped[List["CustomerFeedback"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        """Get customer's full name."""
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name

    @property
    def days_since_last_visit(self) -> Optional[int]:
        """Calculate days since last visit."""
        if self.last_visit_date:
            return (date.today() - self.last_visit_date).days
        return None

    __table_args__ = (
        Index("ix_customers_segment", "segment_id"),
        Index("ix_customers_phone", "phone"),
        Index("ix_customers_whatsapp", "whatsapp_number"),
        Index("ix_customers_clv", "clv_score"),
    )


class CustomerSegment(Base):
    """
    Customer segment definition for targeting and analysis.
    """
    __tablename__ = "customer_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    segment_type: Mapped[CustomerSegmentType] = mapped_column(
        Enum(CustomerSegmentType), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Segment criteria
    min_visits: Mapped[Optional[int]] = mapped_column(Integer)
    max_visits: Mapped[Optional[int]] = mapped_column(Integer)
    min_clv: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    max_clv: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    max_days_inactive: Mapped[Optional[int]] = mapped_column(Integer)

    # Marketing rules
    max_offers_per_week: Mapped[int] = mapped_column(Integer, default=1)
    min_days_between_offers: Mapped[int] = mapped_column(Integer, default=7)
    default_offer_type: Mapped[Optional[str]] = mapped_column(String(50))

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    customers: Mapped[List["Customer"]] = relationship(back_populates="segment")


class CustomerPreference(Base):
    """
    Customer preferences learned from order history.
    """
    __tablename__ = "customer_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)

    # Preference metrics
    order_count: Mapped[int] = mapped_column(Integer, default=0)
    last_ordered: Mapped[Optional[datetime]] = mapped_column(DateTime)
    preference_score: Mapped[float] = mapped_column(Numeric(5, 4), default=0)  # 0-1

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="preferences")

    __table_args__ = (
        Index("ix_customer_preferences_unique", "customer_id", "menu_item_id", unique=True),
    )


class CustomerFeedback(Base):
    """
    Customer feedback and ratings.
    """
    __tablename__ = "customer_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    order_id: Mapped[Optional[int]] = mapped_column(ForeignKey("orders.id"))
    menu_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("menu_items.id"))

    # Feedback type
    feedback_type: Mapped[str] = mapped_column(String(50), nullable=False)  # survey, review, complaint, compliment

    # Ratings (1-5)
    overall_rating: Mapped[Optional[int]] = mapped_column(Integer)
    food_rating: Mapped[Optional[int]] = mapped_column(Integer)
    service_rating: Mapped[Optional[int]] = mapped_column(Integer)
    value_rating: Mapped[Optional[int]] = mapped_column(Integer)
    ambiance_rating: Mapped[Optional[int]] = mapped_column(Integer)

    # Comments
    comment: Mapped[Optional[str]] = mapped_column(Text)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3))  # -1 to 1

    # Status
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    response_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    feedback_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="feedback")

    __table_args__ = (
        Index("ix_customer_feedback_customer", "customer_id"),
        Index("ix_customer_feedback_date", "feedback_date"),
    )
