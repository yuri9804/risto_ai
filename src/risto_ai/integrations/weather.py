"""
Weather API Integration.

Provides weather data fetching from OpenWeatherMap for prediction models.
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from typing import Optional
import logging

import httpx
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.prediction import WeatherData

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class WeatherForecast:
    """Weather forecast data point."""
    date: date
    condition: str
    condition_description: str
    temperature: float
    feels_like: float
    temp_min: float
    temp_max: float
    humidity: int
    wind_speed: float
    precipitation_probability: int
    precipitation_mm: float


class WeatherService:
    """
    Weather data service using OpenWeatherMap API.

    Fetches and stores weather forecasts for prediction models.
    """

    API_BASE_URL = "https://api.openweathermap.org/data/2.5"

    def __init__(self, session: Session):
        self.session = session
        self.api_key = settings.openweather_api_key
        # Default location (can be configured per restaurant)
        self.latitude = 41.9028  # Rome
        self.longitude = 12.4964

    @property
    def is_configured(self) -> bool:
        """Check if weather API is configured."""
        return bool(self.api_key)

    async def fetch_forecast(self, days: int = 7) -> list[WeatherForecast]:
        """
        Fetch weather forecast for upcoming days.

        Args:
            days: Number of days to forecast (max 7 for free tier)

        Returns:
            List of daily weather forecasts
        """
        if not self.is_configured:
            logger.warning("Weather API not configured")
            return []

        try:
            # Use One Call API for daily forecasts
            url = f"{self.API_BASE_URL}/onecall"
            params = {
                "lat": self.latitude,
                "lon": self.longitude,
                "exclude": "minutely,hourly,alerts",
                "units": "metric",
                "lang": "it",
                "appid": self.api_key,
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

            forecasts = []
            daily_data = data.get("daily", [])[:days]

            for day in daily_data:
                forecast_date = datetime.fromtimestamp(day["dt"]).date()

                weather_info = day.get("weather", [{}])[0]

                forecasts.append(WeatherForecast(
                    date=forecast_date,
                    condition=weather_info.get("main", "Unknown"),
                    condition_description=weather_info.get("description", ""),
                    temperature=day.get("temp", {}).get("day", 0),
                    feels_like=day.get("feels_like", {}).get("day", 0),
                    temp_min=day.get("temp", {}).get("min", 0),
                    temp_max=day.get("temp", {}).get("max", 0),
                    humidity=day.get("humidity", 0),
                    wind_speed=day.get("wind_speed", 0),
                    precipitation_probability=int(day.get("pop", 0) * 100),
                    precipitation_mm=day.get("rain", 0) or day.get("snow", 0) or 0,
                ))

            return forecasts

        except httpx.HTTPStatusError as e:
            logger.error(f"Weather API HTTP error: {e.response.status_code}")
            return []
        except Exception as e:
            logger.error(f"Weather API error: {str(e)}")
            return []

    async def fetch_and_store(self, days: int = 7) -> int:
        """
        Fetch forecast and store in database.

        Args:
            days: Number of days to fetch

        Returns:
            Number of records stored
        """
        forecasts = await self.fetch_forecast(days)

        if not forecasts:
            return 0

        stored = 0
        for forecast in forecasts:
            # Check if we already have data for this date
            existing = self.session.query(WeatherData).filter(
                WeatherData.weather_date == forecast.date,
                WeatherData.is_forecast == True,
            ).first()

            if existing:
                # Update existing
                existing.temperature = forecast.temperature
                existing.feels_like = forecast.feels_like
                existing.temperature_min = forecast.temp_min
                existing.temperature_max = forecast.temp_max
                existing.condition = forecast.condition
                existing.condition_description = forecast.condition_description
                existing.humidity = forecast.humidity
                existing.wind_speed = forecast.wind_speed
                existing.precipitation_probability = forecast.precipitation_probability
                existing.precipitation_mm = forecast.precipitation_mm
                existing.fetched_at = datetime.utcnow()
            else:
                # Create new
                weather = WeatherData(
                    weather_date=forecast.date,
                    is_forecast=True,
                    temperature=forecast.temperature,
                    feels_like=forecast.feels_like,
                    temperature_min=forecast.temp_min,
                    temperature_max=forecast.temp_max,
                    condition=forecast.condition,
                    condition_description=forecast.condition_description,
                    humidity=forecast.humidity,
                    wind_speed=forecast.wind_speed,
                    precipitation_probability=forecast.precipitation_probability,
                    precipitation_mm=forecast.precipitation_mm,
                    source="openweathermap",
                )
                self.session.add(weather)
                stored += 1

        self.session.commit()
        logger.info(f"Stored {stored} new weather forecasts, updated {len(forecasts) - stored}")

        return stored

    async def fetch_current(self) -> Optional[WeatherForecast]:
        """
        Fetch current weather conditions.

        Returns:
            Current weather data or None
        """
        if not self.is_configured:
            return None

        try:
            url = f"{self.API_BASE_URL}/weather"
            params = {
                "lat": self.latitude,
                "lon": self.longitude,
                "units": "metric",
                "lang": "it",
                "appid": self.api_key,
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

            weather_info = data.get("weather", [{}])[0]
            main = data.get("main", {})

            return WeatherForecast(
                date=date.today(),
                condition=weather_info.get("main", "Unknown"),
                condition_description=weather_info.get("description", ""),
                temperature=main.get("temp", 0),
                feels_like=main.get("feels_like", 0),
                temp_min=main.get("temp_min", 0),
                temp_max=main.get("temp_max", 0),
                humidity=main.get("humidity", 0),
                wind_speed=data.get("wind", {}).get("speed", 0),
                precipitation_probability=0,  # Not available in current weather
                precipitation_mm=data.get("rain", {}).get("1h", 0),
            )

        except Exception as e:
            logger.error(f"Current weather fetch error: {str(e)}")
            return None

    def get_stored_forecast(self, target_date: date) -> Optional[WeatherData]:
        """
        Get stored forecast for a specific date.

        Args:
            target_date: Date to query

        Returns:
            WeatherData or None
        """
        return self.session.query(WeatherData).filter(
            WeatherData.weather_date == target_date
        ).order_by(WeatherData.fetched_at.desc()).first()

    def set_location(self, latitude: float, longitude: float) -> None:
        """
        Set the location for weather fetching.

        Args:
            latitude: Location latitude
            longitude: Location longitude
        """
        self.latitude = latitude
        self.longitude = longitude
