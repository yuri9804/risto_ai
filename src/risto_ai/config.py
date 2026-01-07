"""
Configuration module for Risto AI.
Loads settings from environment variables with sensible defaults.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/risto_ai"
    database_url_sync: str = "postgresql://user:password@localhost:5432/risto_ai"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False
    secret_key: str = "change-me-in-production"

    # External APIs
    openweather_api_key: Optional[str] = None
    google_calendar_api_key: Optional[str] = None

    # WhatsApp Business API
    whatsapp_api_url: str = "https://graph.facebook.com/v18.0"
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None

    # ML Model Configuration
    model_retrain_interval_days: int = 7
    prediction_horizon_days: int = 14

    # Marketing Configuration
    max_campaigns_per_customer_week: int = 1
    min_days_between_offers: int = 7

    # Reservation System
    max_overbooking_percentage: int = 10
    reservation_confirmation_hours: int = 24

    # Menu Engineering Thresholds
    menu_engineering_popularity_threshold: float = 0.7  # Percentile
    menu_engineering_profitability_threshold: float = 0.7  # Percentile

    # Customer Segmentation
    customer_high_value_threshold: float = 0.8  # Top 20% by CLV
    customer_inactive_days: int = 60  # Days without visit to be considered inactive


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
