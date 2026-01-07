"""
Customer Flow Prediction Service.

Provides autonomous customer flow forecasting using:
- Prophet time series forecasting
- Weather impact modeling
- Event/holiday adjustments
- Hourly and daily predictions
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
import json
import logging

import numpy as np
import pandas as pd
from prophet import Prophet
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.order import Order, DailySales
from risto_ai.database.models.prediction import (
    CustomerFlowPrediction,
    WeatherData,
    Event,
    DayClassification,
)

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """Result of customer flow prediction for a single day."""
    prediction_date: date
    predicted_covers: int
    predicted_covers_lower: int
    predicted_covers_upper: int
    predicted_revenue: Decimal
    predicted_revenue_lower: Decimal
    predicted_revenue_upper: Decimal
    day_classification: DayClassification
    confidence_score: float
    hourly_breakdown: Optional[dict] = None
    weather_impact: float = 1.0
    event_impact: float = 1.0
    factors: Optional[dict] = None


@dataclass
class DayAnalysis:
    """Analysis of a specific day for operational planning."""
    date: date
    classification: DayClassification
    expected_covers: int
    expected_revenue: Decimal
    recommended_staff_level: str
    key_factors: list[str]
    marketing_recommendation: str


class PredictionService:
    """
    Autonomous customer flow prediction service.

    Features:
    - Automatic daily predictions
    - Weather API integration
    - Event/holiday impact modeling
    - Model auto-retraining
    - Confidence intervals
    """

    MODEL_VERSION = "prophet_v1.0"

    def __init__(self, session: Session):
        self.session = session
        self.model = None
        self.average_revenue_per_cover = Decimal("35.00")  # Will be calculated from data

    def train_model(self, min_history_days: int = 90) -> bool:
        """
        Train or retrain the prediction model.

        Args:
            min_history_days: Minimum days of history required

        Returns:
            True if training successful, False otherwise
        """
        # Get historical data
        historical_data = self._get_historical_data()

        if len(historical_data) < min_history_days:
            logger.warning(
                f"Insufficient data for training: {len(historical_data)} days "
                f"(minimum: {min_history_days})"
            )
            return False

        # Prepare data for Prophet
        df = historical_data[["date", "covers"]].rename(
            columns={"date": "ds", "covers": "y"}
        )

        # Initialize Prophet with Italian holidays
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
            interval_width=0.95,
        )

        # Add Italian holidays
        self.model.add_country_holidays(country_name="IT")

        # Add weather regressor if available
        if "weather_impact" in historical_data.columns:
            df["weather_impact"] = historical_data["weather_impact"]
            self.model.add_regressor("weather_impact")

        # Add event regressor
        if "has_event" in historical_data.columns:
            df["has_event"] = historical_data["has_event"].astype(float)
            self.model.add_regressor("has_event")

        # Train the model
        self.model.fit(df)

        # Calculate average revenue per cover
        self.average_revenue_per_cover = Decimal(str(
            historical_data["revenue"].sum() / max(historical_data["covers"].sum(), 1)
        ))

        logger.info(f"Model trained successfully with {len(df)} data points")
        return True

    def predict(
        self,
        start_date: Optional[date] = None,
        days: int = 14,
        include_hourly: bool = True,
    ) -> list[PredictionResult]:
        """
        Generate predictions for upcoming days.

        Args:
            start_date: First date to predict (default: tomorrow)
            days: Number of days to predict
            include_hourly: Include hourly breakdown

        Returns:
            List of PredictionResult objects
        """
        if start_date is None:
            start_date = date.today() + timedelta(days=1)

        if self.model is None:
            success = self.train_model()
            if not success:
                # Return simple estimates if no model
                return self._simple_predictions(start_date, days)

        # Create future dataframe
        future_dates = pd.DataFrame({
            "ds": pd.date_range(start=start_date, periods=days, freq="D")
        })

        # Add regressors
        future_dates = self._add_future_regressors(future_dates)

        # Make predictions
        forecast = self.model.predict(future_dates)

        # Get events for the period
        events = self._get_events(start_date, start_date + timedelta(days=days))

        results = []
        for i, row in forecast.iterrows():
            pred_date = row["ds"].date()

            # Base prediction
            covers = max(0, int(row["yhat"]))
            covers_lower = max(0, int(row["yhat_lower"]))
            covers_upper = max(0, int(row["yhat_upper"]))

            # Revenue estimates
            revenue = Decimal(str(covers)) * self.average_revenue_per_cover
            revenue_lower = Decimal(str(covers_lower)) * self.average_revenue_per_cover
            revenue_upper = Decimal(str(covers_upper)) * self.average_revenue_per_cover

            # Get weather impact
            weather_impact = self._get_weather_impact(pred_date)

            # Get event impact
            event_impact = 1.0
            day_events = [e for e in events if e.event_date == pred_date]
            if day_events:
                event_impact = max(e.impact_factor for e in day_events)

            # Classify the day
            classification = self._classify_day(covers, pred_date)

            # Calculate confidence
            confidence = self._calculate_confidence(row, pred_date)

            # Generate hourly breakdown
            hourly = None
            if include_hourly:
                hourly = self._generate_hourly_breakdown(covers, pred_date.weekday())

            results.append(PredictionResult(
                prediction_date=pred_date,
                predicted_covers=covers,
                predicted_covers_lower=covers_lower,
                predicted_covers_upper=covers_upper,
                predicted_revenue=revenue,
                predicted_revenue_lower=revenue_lower,
                predicted_revenue_upper=revenue_upper,
                day_classification=classification,
                confidence_score=confidence,
                hourly_breakdown=hourly,
                weather_impact=weather_impact,
                event_impact=event_impact,
                factors={
                    "trend": float(row.get("trend", 0)),
                    "weekly": float(row.get("weekly", 0)),
                    "yearly": float(row.get("yearly", 0)) if "yearly" in row else None,
                },
            ))

        # Store predictions
        self._store_predictions(results)

        return results

    def get_day_analysis(self, target_date: date) -> DayAnalysis:
        """
        Get detailed analysis for a specific day.

        Args:
            target_date: Date to analyze

        Returns:
            DayAnalysis with operational recommendations
        """
        # Check for existing prediction
        stmt = select(CustomerFlowPrediction).where(
            and_(
                CustomerFlowPrediction.prediction_date == target_date,
                CustomerFlowPrediction.is_latest == True,
            )
        )
        prediction = self.session.scalar(stmt)

        if not prediction:
            # Generate new prediction
            results = self.predict(target_date, days=1)
            if results:
                result = results[0]
            else:
                # Fallback
                return self._default_day_analysis(target_date)
        else:
            # Use existing prediction
            result = PredictionResult(
                prediction_date=prediction.prediction_date,
                predicted_covers=prediction.predicted_covers,
                predicted_covers_lower=prediction.predicted_covers_lower,
                predicted_covers_upper=prediction.predicted_covers_upper,
                predicted_revenue=prediction.predicted_revenue,
                predicted_revenue_lower=prediction.predicted_revenue_lower,
                predicted_revenue_upper=prediction.predicted_revenue_upper,
                day_classification=prediction.day_classification,
                confidence_score=prediction.confidence_score,
                weather_impact=prediction.weather_impact_factor,
            )

        # Build analysis
        key_factors = []

        # Day of week
        day_names = ["Lunedì", "Martedì", "Mercoledì", "Giovedì",
                     "Venerdì", "Sabato", "Domenica"]
        key_factors.append(f"Giorno: {day_names[target_date.weekday()]}")

        # Weather
        weather = self._get_weather_data(target_date)
        if weather:
            key_factors.append(f"Meteo: {weather.condition}, {weather.temperature}°C")
            if weather.precipitation_probability and weather.precipitation_probability > 50:
                key_factors.append("Attenzione: alta probabilità di pioggia")

        # Events
        events = self._get_events(target_date, target_date)
        for event in events:
            key_factors.append(f"Evento: {event.name}")

        # Staff recommendation
        if result.day_classification == DayClassification.LOW:
            staff_level = "ridotto"
        elif result.day_classification == DayClassification.MEDIUM:
            staff_level = "normale"
        elif result.day_classification == DayClassification.HIGH:
            staff_level = "rinforzato"
        else:
            staff_level = "massimo"

        # Marketing recommendation
        if result.day_classification == DayClassification.LOW:
            marketing = "Consigliata campagna promozionale per aumentare affluenza"
        elif result.day_classification == DayClassification.MEDIUM:
            marketing = "Campagna mirata a segmenti specifici"
        else:
            marketing = "Nessuna promozione necessaria - alta affluenza prevista"

        return DayAnalysis(
            date=target_date,
            classification=result.day_classification,
            expected_covers=result.predicted_covers,
            expected_revenue=result.predicted_revenue,
            recommended_staff_level=staff_level,
            key_factors=key_factors,
            marketing_recommendation=marketing,
        )

    def update_with_actuals(self, target_date: date) -> None:
        """
        Update prediction with actual results for model evaluation.

        Args:
            target_date: Date to update
        """
        # Get actual data
        stmt = select(DailySales).where(DailySales.sales_date == target_date)
        actual = self.session.scalar(stmt)

        if not actual:
            logger.warning(f"No actual data found for {target_date}")
            return

        # Update prediction record
        pred_stmt = select(CustomerFlowPrediction).where(
            and_(
                CustomerFlowPrediction.prediction_date == target_date,
                CustomerFlowPrediction.is_latest == True,
            )
        )
        prediction = self.session.scalar(pred_stmt)

        if prediction:
            prediction.actual_covers = actual.total_covers
            prediction.actual_revenue = actual.total_revenue

            # Calculate MAPE
            if prediction.predicted_covers > 0:
                prediction.prediction_error = abs(
                    actual.total_covers - prediction.predicted_covers
                ) / prediction.predicted_covers

            self.session.commit()

    def _get_historical_data(self) -> pd.DataFrame:
        """Get historical sales data for training."""
        stmt = (
            select(
                DailySales.sales_date,
                DailySales.total_covers,
                DailySales.total_revenue,
                DailySales.day_of_week,
                DailySales.is_holiday,
                DailySales.has_special_event,
                DailySales.weather_condition,
                DailySales.temperature,
            )
            .order_by(DailySales.sales_date)
        )

        results = self.session.execute(stmt).fetchall()

        if not results:
            return pd.DataFrame()

        df = pd.DataFrame(results, columns=[
            "date", "covers", "revenue", "day_of_week",
            "is_holiday", "has_event", "weather_condition", "temperature"
        ])

        # Add weather impact factor
        df["weather_impact"] = df.apply(
            lambda row: self._calculate_weather_impact_from_condition(
                row["weather_condition"], row["temperature"]
            ),
            axis=1
        )

        return df

    def _add_future_regressors(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add regressor values for future predictions."""
        # Get weather forecasts
        weather_forecasts = {}
        for d in df["ds"]:
            weather = self._get_weather_data(d.date())
            if weather:
                weather_forecasts[d] = self._calculate_weather_impact_from_condition(
                    weather.condition, weather.temperature
                )
            else:
                weather_forecasts[d] = 1.0

        df["weather_impact"] = df["ds"].map(weather_forecasts)

        # Get events
        start = df["ds"].min().date()
        end = df["ds"].max().date()
        events = self._get_events(start, end)
        event_dates = {e.event_date for e in events}
        df["has_event"] = df["ds"].apply(lambda x: 1.0 if x.date() in event_dates else 0.0)

        return df

    def _classify_day(self, predicted_covers: int, pred_date: date) -> DayClassification:
        """Classify a day based on predicted covers."""
        # Get historical averages by day of week
        dow = pred_date.weekday()
        stmt = select(func.avg(DailySales.total_covers)).where(
            DailySales.day_of_week == dow
        )
        avg_covers = self.session.scalar(stmt) or 50

        ratio = predicted_covers / max(avg_covers, 1)

        if ratio < 0.7:
            return DayClassification.LOW
        elif ratio < 1.1:
            return DayClassification.MEDIUM
        elif ratio < 1.4:
            return DayClassification.HIGH
        else:
            return DayClassification.VERY_HIGH

    def _calculate_confidence(self, forecast_row: pd.Series, pred_date: date) -> float:
        """Calculate prediction confidence score."""
        # Base confidence from prediction interval width
        interval_width = forecast_row["yhat_upper"] - forecast_row["yhat_lower"]
        relative_width = interval_width / max(forecast_row["yhat"], 1)

        # Narrower intervals = higher confidence
        base_confidence = max(0, 1 - relative_width / 2)

        # Reduce confidence for dates further in the future
        days_ahead = (pred_date - date.today()).days
        time_penalty = max(0, 1 - days_ahead * 0.02)  # 2% reduction per day

        return min(1.0, base_confidence * time_penalty)

    def _generate_hourly_breakdown(self, total_covers: int, day_of_week: int) -> dict:
        """Generate hourly distribution of expected covers."""
        # Typical distribution patterns
        if day_of_week < 5:  # Weekday
            distribution = {
                12: 0.15, 13: 0.20, 14: 0.10,  # Lunch
                19: 0.08, 20: 0.20, 21: 0.20, 22: 0.07  # Dinner
            }
        else:  # Weekend
            distribution = {
                12: 0.12, 13: 0.18, 14: 0.12, 15: 0.05,  # Lunch extended
                19: 0.06, 20: 0.18, 21: 0.20, 22: 0.09  # Dinner
            }

        return {
            str(hour): int(total_covers * pct)
            for hour, pct in distribution.items()
        }

    def _get_weather_data(self, target_date: date) -> Optional[WeatherData]:
        """Get weather data for a date."""
        stmt = select(WeatherData).where(
            WeatherData.weather_date == target_date
        ).order_by(WeatherData.fetched_at.desc()).limit(1)
        return self.session.scalar(stmt)

    def _get_weather_impact(self, target_date: date) -> float:
        """Calculate weather impact factor for a date."""
        weather = self._get_weather_data(target_date)
        if not weather:
            return 1.0
        return self._calculate_weather_impact_from_condition(
            weather.condition, weather.temperature
        )

    def _calculate_weather_impact_from_condition(
        self,
        condition: Optional[str],
        temperature: Optional[float],
    ) -> float:
        """Calculate impact factor from weather condition and temperature."""
        if not condition:
            return 1.0

        condition = condition.lower()
        impact = 1.0

        # Condition impact
        if "rain" in condition or "storm" in condition:
            impact *= 0.8
        elif "snow" in condition:
            impact *= 0.6
        elif "sunny" in condition or "clear" in condition:
            impact *= 1.1

        # Temperature impact (assuming outdoor seating or walk-in traffic)
        if temperature:
            if temperature < 5:
                impact *= 0.85
            elif temperature > 30:
                impact *= 0.9
            elif 18 <= temperature <= 25:
                impact *= 1.1

        return impact

    def _get_events(self, start_date: date, end_date: date) -> list[Event]:
        """Get events in date range."""
        stmt = select(Event).where(
            and_(
                Event.event_date >= start_date,
                Event.event_date <= end_date,
            )
        )
        return list(self.session.scalars(stmt))

    def _store_predictions(self, results: list[PredictionResult]) -> None:
        """Store predictions in database."""
        prediction_time = datetime.utcnow()

        # Mark old predictions as not latest
        for result in results:
            old_stmt = (
                select(CustomerFlowPrediction)
                .where(
                    and_(
                        CustomerFlowPrediction.prediction_date == result.prediction_date,
                        CustomerFlowPrediction.is_latest == True,
                    )
                )
            )
            for old_pred in self.session.scalars(old_stmt):
                old_pred.is_latest = False

            # Create new prediction
            prediction = CustomerFlowPrediction(
                prediction_date=result.prediction_date,
                prediction_made_at=prediction_time,
                model_version=self.MODEL_VERSION,
                predicted_covers=result.predicted_covers,
                predicted_covers_lower=result.predicted_covers_lower,
                predicted_covers_upper=result.predicted_covers_upper,
                predicted_revenue=result.predicted_revenue,
                predicted_revenue_lower=result.predicted_revenue_lower,
                predicted_revenue_upper=result.predicted_revenue_upper,
                hourly_predictions=result.hourly_breakdown,
                day_classification=result.day_classification,
                confidence_score=result.confidence_score,
                day_of_week=result.prediction_date.weekday(),
                week_of_year=result.prediction_date.isocalendar()[1],
                weather_impact_factor=result.weather_impact,
                is_latest=True,
            )
            self.session.add(prediction)

        self.session.commit()

    def _simple_predictions(self, start_date: date, days: int) -> list[PredictionResult]:
        """Generate simple predictions when no model is available."""
        results = []
        base_covers = 50  # Default assumption

        for i in range(days):
            pred_date = start_date + timedelta(days=i)
            dow = pred_date.weekday()

            # Simple day-of-week adjustment
            dow_multipliers = [0.8, 0.7, 0.8, 0.9, 1.2, 1.3, 1.1]
            covers = int(base_covers * dow_multipliers[dow])

            results.append(PredictionResult(
                prediction_date=pred_date,
                predicted_covers=covers,
                predicted_covers_lower=int(covers * 0.7),
                predicted_covers_upper=int(covers * 1.3),
                predicted_revenue=Decimal(str(covers * 35)),
                predicted_revenue_lower=Decimal(str(int(covers * 0.7) * 35)),
                predicted_revenue_upper=Decimal(str(int(covers * 1.3) * 35)),
                day_classification=DayClassification.MEDIUM,
                confidence_score=0.5,
            ))

        return results

    def _default_day_analysis(self, target_date: date) -> DayAnalysis:
        """Return default analysis when no data available."""
        return DayAnalysis(
            date=target_date,
            classification=DayClassification.MEDIUM,
            expected_covers=50,
            expected_revenue=Decimal("1750.00"),
            recommended_staff_level="normale",
            key_factors=["Dati storici insufficienti"],
            marketing_recommendation="Raccogliere più dati prima di decisioni marketing",
        )
