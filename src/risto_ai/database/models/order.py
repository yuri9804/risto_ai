"""
Order-related database models.
Includes orders, order items, and daily sales summaries.
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
    Time,
    ForeignKey,
    Enum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class OrderStatus(str, PyEnum):
    """Order status values."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderType(str, PyEnum):
    """Order type values."""
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"


class PaymentMethod(str, PyEnum):
    """Payment method values."""
    CASH = "cash"
    CARD = "card"
    DIGITAL = "digital"  # Apple Pay, Google Pay, etc.
    OTHER = "other"


class Order(Base):
    """
    A customer order.
    """
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Customer and table info
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"))
    table_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tables.id"))
    reservation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("reservations.id"))

    # Order details
    order_type: Mapped[OrderType] = mapped_column(Enum(OrderType), default=OrderType.DINE_IN)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDING)
    covers: Mapped[int] = mapped_column(Integer, default=1)  # Number of guests

    # Financial
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    discount_reason: Mapped[Optional[str]] = mapped_column(String(200))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Payment
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(Enum(PaymentMethod))
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)

    # Campaign tracking
    campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaigns.id"))
    offer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaign_offers.id"))

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    order_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    items: Mapped[List["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )

    @property
    def total_items(self) -> int:
        """Get total number of items in order."""
        return sum(item.quantity for item in self.items)

    @property
    def total_cost(self) -> Decimal:
        """Get total cost of items in order."""
        return sum(item.total_cost for item in self.items)

    @property
    def margin(self) -> Decimal:
        """Calculate order margin (total - cost)."""
        return self.total - self.total_cost

    __table_args__ = (
        Index("ix_orders_customer", "customer_id"),
        Index("ix_orders_date", "order_date"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_campaign", "campaign_id"),
    )


class OrderItem(Base):
    """
    An item in an order.
    """
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)

    # Quantity and pricing
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Modifications
    notes: Mapped[Optional[str]] = mapped_column(Text)
    modifiers: Mapped[Optional[str]] = mapped_column(Text)  # JSON string of modifications

    # Status
    is_promotional: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    order: Mapped["Order"] = relationship(back_populates="items")

    @property
    def total_price(self) -> Decimal:
        """Get total price for this item."""
        return (self.unit_price * self.quantity) - self.discount_amount

    @property
    def total_cost(self) -> Decimal:
        """Get total cost for this item."""
        return self.unit_cost * self.quantity

    @property
    def margin(self) -> Decimal:
        """Calculate margin for this item."""
        return self.total_price - self.total_cost

    __table_args__ = (
        Index("ix_order_items_order", "order_id"),
        Index("ix_order_items_menu_item", "menu_item_id"),
    )


class DailySales(Base):
    """
    Aggregated daily sales data for analysis and reporting.
    Pre-calculated for faster queries.
    """
    __tablename__ = "daily_sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sales_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday

    # Order metrics
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_covers: Mapped[int] = mapped_column(Integer, default=0)
    dine_in_orders: Mapped[int] = mapped_column(Integer, default=0)
    takeaway_orders: Mapped[int] = mapped_column(Integer, default=0)
    delivery_orders: Mapped[int] = mapped_column(Integer, default=0)

    # Financial metrics
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_margin: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    average_order_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    average_margin_per_cover: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Discounts and promotions
    total_discounts: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    promotional_orders: Mapped[int] = mapped_column(Integer, default=0)

    # Customer metrics
    unique_customers: Mapped[int] = mapped_column(Integer, default=0)
    new_customers: Mapped[int] = mapped_column(Integer, default=0)
    returning_customers: Mapped[int] = mapped_column(Integer, default=0)

    # External factors
    weather_condition: Mapped[Optional[str]] = mapped_column(String(50))
    temperature: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False)
    has_special_event: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_daily_sales_date", "sales_date"),
        Index("ix_daily_sales_dow", "day_of_week"),
    )
