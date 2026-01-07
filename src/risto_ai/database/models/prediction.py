"""
Prediction-related database models.
Includes customer flow predictions, weather data, and events.
"""

from datetime import datetime, date, time
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

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
from sqlalchemy.orm import Mapped, mapped_column

from risto_ai.database.connection import Base


class DayClassification(str, PyEnum):
    """Classification of predicted customer flow."""
    LOW = "low"  # Below average expected
    MEDIUM = "medium"  # Around average
    HIGH = "high"  # Above average expected
    VERY_HIGH = "very_high"  # Special events, holidays


class EventType(str, PyEnum):
    """Type of external event."""
    HOLIDAY = "holiday"  # National/regional holidays
    LOCAL_EVENT = "local_event"  # Concerts, sports, festivals
    SPECIAL_OCCASION = "special_occasion"  # Valentine's, Mother's Day
    INTERNAL = "internal"  # Restaurant's own events
    EXTERNAL = "external"  # Nearby events affecting traffic


class CustomerFlowPrediction(Base):
    """
    Daily customer flow prediction with confidence intervals.
    """
    __tablename__ = "customer_flow_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Prediction target
    prediction_date: Mapped[date] = mapped_column(Date, nullable=False)
    prediction_made_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    # Main predictions
    predicted_covers: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_covers_lower: Mapped[int] = mapped_column(Integer, nullable=False)  # Lower bound (95% CI)
    predicted_covers_upper: Mapped[int] = mapped_column(Integer, nullable=False)  # Upper bound (95% CI)

    predicted_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    predicted_revenue_lower: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    predicted_revenue_upper: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Time-slot breakdown (JSON with hourly predictions)
    hourly_predictions: Mapped[Optional[dict]] = mapped_column(JSON)

    # Classification
    day_classification: Mapped[DayClassification] = mapped_column(
        Enum(DayClassification), nullable=False
    )
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)  # 0-1

    # Input factors
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday
    week_of_year: Mapped[int] = mapped_column(Integer, nullable=False)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False)
    has_event: Mapped[bool] = mapped_column(Boolean, default=False)

    # Weather impact
    weather_impact_factor: Mapped[float] = mapped_column(Numeric(5, 4), default=1.0)
    weather_data_id: Mapped[Optional[int]] = mapped_column(ForeignKey("weather_data.id"))

    # Actual results (filled after the day)
    actual_covers: Mapped[Optional[int]] = mapped_column(Integer)
    actual_revenue: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    prediction_error: Mapped[Optional[float]] = mapped_column(Numeric(8, 4))  # MAPE

    # Status
    is_latest: Mapped[bool] = mapped_column(Boolean, default=True)  # Most recent prediction for date

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_predictions_date", "prediction_date"),
        Index("ix_predictions_latest", "prediction_date", "is_latest"),
        Index("ix_predictions_classification", "day_classification"),
    )


class WeatherData(Base):
    """
    Weather data for prediction models.
    """
    __tablename__ = "weather_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Target date and time
    weather_date: Mapped[date] = mapped_column(Date, nullable=False)
    weather_time: Mapped[Optional[time]] = mapped_column(Time)  # For hourly data
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=True)

    # Temperature
    temperature: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    feels_like: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    temperature_min: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    temperature_max: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))

    # Conditions
    condition: Mapped[str] = mapped_column(String(50), nullable=False)  # sunny, cloudy, rain, etc.
    condition_description: Mapped[Optional[str]] = mapped_column(String(200))
    condition_icon: Mapped[Optional[str]] = mapped_column(String(20))

    # Details
    humidity: Mapped[Optional[int]] = mapped_column(Integer)  # %
    wind_speed: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))  # km/h
    precipitation_probability: Mapped[Optional[int]] = mapped_column(Integer)  # %
    precipitation_mm: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))

    # UV and visibility
    uv_index: Mapped[Optional[int]] = mapped_column(Integer)
    visibility_km: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))

    # Source
    source: Mapped[str] = mapped_column(String(50), default="openweathermap")
    external_id: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamps
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_weather_date", "weather_date"),
        Index("ix_weather_date_time", "weather_date", "weather_time"),
    )


class Event(Base):
    """
    External events that may affect customer flow.
    """
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Event details
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[Optional[time]] = mapped_column(Time)
    end_time: Mapped[Optional[time]] = mapped_column(Time)

    # Location
    location: Mapped[Optional[str]] = mapped_column(String(200))
    distance_km: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))

    # Impact estimation
    expected_impact: Mapped[str] = mapped_column(String(20), default="neutral")  # positive, negative, neutral
    impact_factor: Mapped[float] = mapped_column(Numeric(5, 4), default=1.0)  # Multiplier for predictions
    expected_additional_covers: Mapped[Optional[int]] = mapped_column(Integer)

    # Status
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_pattern: Mapped[Optional[str]] = mapped_column(String(100))  # daily, weekly, monthly, yearly

    # Source
    source: Mapped[str] = mapped_column(String(100), default="manual")
    external_id: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_events_date", "event_date"),
        Index("ix_events_type", "event_type"),
    )
