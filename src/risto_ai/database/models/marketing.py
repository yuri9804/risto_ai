"""
Marketing-related database models.
Includes campaigns, offers, and delivery tracking.
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
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class OfferType(str, PyEnum):
    """Type of promotional offer."""
    HIGH_POPULARITY = "high_popularity"  # Discount on Star dishes
    HIGH_MARGIN = "high_margin"  # Promotion on high-margin quick dishes
    TEST_NEW = "test_new"  # Try new or test dishes


class OfferMechanic(str, PyEnum):
    """Promotional mechanic type."""
    PERCENTAGE_DISCOUNT = "percentage_discount"
    FIXED_DISCOUNT = "fixed_discount"
    FREE_ITEM = "free_item"
    BUNDLE = "bundle"
    UPGRADE = "upgrade"
    EARLY_BIRD = "early_bird"


class CampaignStatus(str, PyEnum):
    """Campaign status values."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DeliveryStatus(str, PyEnum):
    """Message delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    OPTED_OUT = "opted_out"


class Campaign(Base):
    """
    A marketing campaign targeting specific customer segments.
    """
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Targeting
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_segment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customer_segments.id"))
    day_classification: Mapped[str] = mapped_column(String(20), nullable=False)  # low, medium, high

    # Status
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    is_automated: Mapped[bool] = mapped_column(Boolean, default=True)

    # Performance targets
    target_reservations: Mapped[Optional[int]] = mapped_column(Integer)
    target_covers: Mapped[Optional[int]] = mapped_column(Integer)
    target_revenue: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))

    # Results (updated after campaign)
    messages_sent: Mapped[int] = mapped_column(Integer, default=0)
    messages_delivered: Mapped[int] = mapped_column(Integer, default=0)
    messages_read: Mapped[int] = mapped_column(Integer, default=0)
    reservations_made: Mapped[int] = mapped_column(Integer, default=0)
    actual_covers: Mapped[int] = mapped_column(Integer, default=0)
    actual_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Timestamps
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    offers: Mapped[List["CampaignOffer"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    deliveries: Mapped[List["CampaignDelivery"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )

    @property
    def delivery_rate(self) -> float:
        """Calculate delivery rate."""
        if self.messages_sent == 0:
            return 0.0
        return self.messages_delivered / self.messages_sent

    @property
    def read_rate(self) -> float:
        """Calculate read rate."""
        if self.messages_delivered == 0:
            return 0.0
        return self.messages_read / self.messages_delivered

    @property
    def conversion_rate(self) -> float:
        """Calculate conversion rate (reservations / messages read)."""
        if self.messages_read == 0:
            return 0.0
        return self.reservations_made / self.messages_read

    __table_args__ = (
        Index("ix_campaigns_date", "target_date"),
        Index("ix_campaigns_status", "status"),
        Index("ix_campaigns_segment", "target_segment_id"),
    )


class CampaignOffer(Base):
    """
    A specific offer within a campaign.
    Each campaign can have multiple offers for different situations.
    """
    __tablename__ = "campaign_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), nullable=False)

    # Offer details
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    offer_type: Mapped[OfferType] = mapped_column(Enum(OfferType), nullable=False)
    mechanic: Mapped[OfferMechanic] = mapped_column(Enum(OfferMechanic), nullable=False)

    # Targeting
    menu_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("menu_items.id"))
    menu_category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("menu_categories.id"))

    # Discount details
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    discount_percentage: Mapped[Optional[int]] = mapped_column(Integer)
    min_order_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    max_discount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))

    # Messaging
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    message_variables: Mapped[Optional[dict]] = mapped_column(JSON)  # Template variables

    # Validity
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime)
    max_redemptions: Mapped[Optional[int]] = mapped_column(Integer)

    # Performance
    times_sent: Mapped[int] = mapped_column(Integer, default=0)
    times_redeemed: Mapped[int] = mapped_column(Integer, default=0)
    total_discount_given: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(back_populates="offers")

    @property
    def redemption_rate(self) -> float:
        """Calculate redemption rate."""
        if self.times_sent == 0:
            return 0.0
        return self.times_redeemed / self.times_sent

    __table_args__ = (
        Index("ix_campaign_offers_campaign", "campaign_id"),
        Index("ix_campaign_offers_type", "offer_type"),
    )


class CampaignDelivery(Base):
    """
    Individual message delivery to a customer.
    """
    __tablename__ = "campaign_deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(ForeignKey("campaign_offers.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)

    # Message details
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp, email, sms
    message_content: Mapped[str] = mapped_column(Text, nullable=False)

    # External IDs
    external_message_id: Mapped[Optional[str]] = mapped_column(String(100))  # WhatsApp message ID

    # Status
    status: Mapped[DeliveryStatus] = mapped_column(Enum(DeliveryStatus), default=DeliveryStatus.PENDING)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Tracking timestamps
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Response tracking
    responded: Mapped[bool] = mapped_column(Boolean, default=False)
    response_type: Mapped[Optional[str]] = mapped_column(String(50))  # reservation, inquiry, optout

    # Conversion tracking
    converted: Mapped[bool] = mapped_column(Boolean, default=False)
    reservation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("reservations.id"))
    order_id: Mapped[Optional[int]] = mapped_column(ForeignKey("orders.id"))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(back_populates="deliveries")

    __table_args__ = (
        Index("ix_campaign_deliveries_campaign", "campaign_id"),
        Index("ix_campaign_deliveries_customer", "customer_id"),
        Index("ix_campaign_deliveries_status", "status"),
        Index("ix_campaign_deliveries_external_id", "external_message_id"),
    )
