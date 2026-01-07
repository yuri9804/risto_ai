"""
Database models for Risto AI.
All SQLAlchemy models for the restaurant management system.
"""

from risto_ai.database.models.menu import (
    MenuItem,
    Ingredient,
    MenuItemIngredient,
    MenuCategory,
    MenuEngineering,
)
from risto_ai.database.models.customer import (
    Customer,
    CustomerSegment,
    CustomerPreference,
    CustomerFeedback,
)
from risto_ai.database.models.order import (
    Order,
    OrderItem,
    DailySales,
)
from risto_ai.database.models.reservation import (
    Table,
    Reservation,
    ReservationStatus,
)
from risto_ai.database.models.marketing import (
    Campaign,
    CampaignOffer,
    CampaignDelivery,
    OfferType,
)
from risto_ai.database.models.prediction import (
    CustomerFlowPrediction,
    WeatherData,
    Event,
    DayClassification,
)
from risto_ai.database.models.staff import (
    Staff,
    StaffPreference,
    Shift,
    ShiftAssignment,
)

__all__ = [
    # Menu
    "MenuItem",
    "Ingredient",
    "MenuItemIngredient",
    "MenuCategory",
    "MenuEngineering",
    # Customer
    "Customer",
    "CustomerSegment",
    "CustomerPreference",
    "CustomerFeedback",
    # Order
    "Order",
    "OrderItem",
    "DailySales",
    # Reservation
    "Table",
    "Reservation",
    "ReservationStatus",
    # Marketing
    "Campaign",
    "CampaignOffer",
    "CampaignDelivery",
    "OfferType",
    # Prediction
    "CustomerFlowPrediction",
    "WeatherData",
    "Event",
    "DayClassification",
    # Staff
    "Staff",
    "StaffPreference",
    "Shift",
    "ShiftAssignment",
]
