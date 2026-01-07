"""
Customer Service - CRM and Customer Segmentation.

Provides:
- Customer lifecycle management
- Dynamic segmentation based on behavior
- Customer Lifetime Value (CLV) calculation
- Preference tracking and analysis
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
import logging

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.customer import (
    Customer,
    CustomerSegment,
    CustomerSegmentType,
    CustomerPreference,
    CustomerFeedback,
    ContactChannel,
)
from risto_ai.database.models.order import Order, OrderItem
from risto_ai.database.models.marketing import CampaignDelivery

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class CustomerProfile:
    """Complete customer profile with behavioral metrics."""
    id: int
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    whatsapp_number: Optional[str]
    preferred_channel: ContactChannel
    marketing_consent: bool

    # Visit metrics
    total_visits: int
    total_spend: Decimal
    average_spend: Decimal
    first_visit: Optional[date]
    last_visit: Optional[date]
    days_since_last_visit: Optional[int]

    # Value metrics
    clv_score: Decimal
    clv_percentile: float
    loyalty_score: float
    engagement_score: float

    # Segment
    segment_name: Optional[str]
    segment_type: Optional[CustomerSegmentType]

    # Preferences
    favorite_dishes: list[dict]
    dietary_preferences: list[str]


@dataclass
class SegmentDefinition:
    """Definition of a customer segment."""
    name: str
    segment_type: CustomerSegmentType
    customer_count: int
    total_value: Decimal
    avg_visits: float
    avg_spend: Decimal
    characteristics: list[str]


class CustomerService:
    """
    Customer relationship management service.

    Features:
    - Dynamic customer segmentation
    - CLV calculation and tracking
    - Behavioral analysis
    - Preference management
    """

    def __init__(self, session: Session):
        self.session = session
        self.high_value_threshold = settings.customer_high_value_threshold
        self.inactive_days = settings.customer_inactive_days

    def get_customer_profile(self, customer_id: int) -> Optional[CustomerProfile]:
        """
        Get complete customer profile.

        Args:
            customer_id: Customer ID

        Returns:
            CustomerProfile or None if not found
        """
        customer = self.session.get(Customer, customer_id)
        if not customer:
            return None

        # Get favorite dishes
        favorites = self._get_customer_favorites(customer_id, limit=5)

        # Get dietary preferences from feedback
        dietary = self._get_dietary_preferences(customer_id)

        return CustomerProfile(
            id=customer.id,
            full_name=customer.full_name,
            email=customer.email,
            phone=customer.phone,
            whatsapp_number=customer.whatsapp_number,
            preferred_channel=customer.preferred_channel,
            marketing_consent=customer.marketing_consent,
            total_visits=customer.total_visits,
            total_spend=customer.total_spend,
            average_spend=customer.average_spend,
            first_visit=customer.first_visit_date,
            last_visit=customer.last_visit_date,
            days_since_last_visit=customer.days_since_last_visit,
            clv_score=customer.clv_score,
            clv_percentile=customer.clv_percentile,
            loyalty_score=customer.loyalty_score,
            engagement_score=customer.engagement_score,
            segment_name=customer.segment.name if customer.segment else None,
            segment_type=customer.segment.segment_type if customer.segment else None,
            favorite_dishes=favorites,
            dietary_preferences=dietary,
        )

    def update_customer_metrics(self, customer_id: int) -> None:
        """
        Update calculated metrics for a customer.

        Should be called after each order.
        """
        customer = self.session.get(Customer, customer_id)
        if not customer:
            return

        # Calculate visit metrics
        order_stmt = (
            select(
                func.count(Order.id).label("visit_count"),
                func.sum(Order.total).label("total_spend"),
                func.min(Order.order_date).label("first_visit"),
                func.max(Order.order_date).label("last_visit"),
            )
            .where(
                and_(
                    Order.customer_id == customer_id,
                    Order.status != "cancelled",
                )
            )
        )
        result = self.session.execute(order_stmt).first()

        if result and result.visit_count:
            customer.total_visits = result.visit_count
            customer.total_spend = result.total_spend or Decimal("0")
            customer.average_spend = customer.total_spend / max(result.visit_count, 1)
            customer.first_visit_date = result.first_visit
            customer.last_visit_date = result.last_visit

        # Calculate CLV
        customer.clv_score = self._calculate_clv(customer)

        # Calculate loyalty score
        customer.loyalty_score = self._calculate_loyalty_score(customer)

        # Calculate engagement score
        customer.engagement_score = self._calculate_engagement_score(customer_id)

        self.session.commit()

    def run_segmentation(self) -> list[SegmentDefinition]:
        """
        Run customer segmentation algorithm.

        Uses RFM analysis (Recency, Frequency, Monetary) combined with
        behavioral factors for dynamic segmentation.
        """
        # Get customer data for segmentation
        customers_data = self._get_customers_for_segmentation()

        if customers_data.empty:
            return []

        # Calculate RFM scores
        rfm_data = self._calculate_rfm_scores(customers_data)

        # Ensure or create segments
        self._ensure_segments()

        # Assign customers to segments
        segment_counts = self._assign_segments(rfm_data)

        # Update CLV percentiles
        self._update_clv_percentiles()

        # Build segment definitions
        return self._build_segment_definitions(segment_counts)

    def get_targetable_customers(
        self,
        segment_types: Optional[list[CustomerSegmentType]] = None,
        exclude_recent_offers: bool = True,
        max_customers: Optional[int] = None,
    ) -> list[Customer]:
        """
        Get customers eligible for marketing campaigns.

        Args:
            segment_types: Filter by segment types
            exclude_recent_offers: Exclude customers who received recent offers
            max_customers: Maximum number to return

        Returns:
            List of eligible Customer objects
        """
        query = select(Customer).where(
            and_(
                Customer.marketing_consent == True,
                Customer.whatsapp_number.isnot(None),
            )
        )

        # Filter by segment
        if segment_types:
            query = query.join(CustomerSegment).where(
                CustomerSegment.segment_type.in_(segment_types)
            )

        # Exclude recent offer recipients
        if exclude_recent_offers:
            min_days = settings.min_days_between_offers
            cutoff_date = datetime.utcnow() - timedelta(days=min_days)

            recent_recipients = (
                select(CampaignDelivery.customer_id)
                .where(CampaignDelivery.sent_at >= cutoff_date)
                .distinct()
            )
            query = query.where(Customer.id.notin_(recent_recipients))

        # Order by value
        query = query.order_by(Customer.clv_score.desc())

        if max_customers:
            query = query.limit(max_customers)

        return list(self.session.scalars(query))

    def find_or_create_customer(
        self,
        phone: str,
        name: str,
        email: Optional[str] = None,
        whatsapp: Optional[str] = None,
    ) -> Customer:
        """
        Find existing customer or create new one.

        Args:
            phone: Phone number (unique identifier)
            name: Customer name
            email: Email address
            whatsapp: WhatsApp number

        Returns:
            Customer object (existing or newly created)
        """
        # Try to find by phone
        customer = self.session.scalar(
            select(Customer).where(Customer.phone == phone)
        )

        if customer:
            return customer

        # Try by WhatsApp
        if whatsapp:
            customer = self.session.scalar(
                select(Customer).where(Customer.whatsapp_number == whatsapp)
            )
            if customer:
                return customer

        # Create new customer
        name_parts = name.split(" ", 1)
        customer = Customer(
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else None,
            phone=phone,
            email=email,
            whatsapp_number=whatsapp or phone,
            marketing_consent=True,  # Should be explicit consent in production
        )

        # Assign to NEW segment
        new_segment = self.session.scalar(
            select(CustomerSegment).where(
                CustomerSegment.segment_type == CustomerSegmentType.NEW
            )
        )
        if new_segment:
            customer.segment_id = new_segment.id

        self.session.add(customer)
        self.session.commit()

        return customer

    def update_preferences_from_order(self, customer_id: int, order_id: int) -> None:
        """
        Update customer preferences based on their order.

        Args:
            customer_id: Customer ID
            order_id: Order ID to analyze
        """
        # Get order items
        items_stmt = (
            select(OrderItem)
            .where(OrderItem.order_id == order_id)
        )
        order_items = list(self.session.scalars(items_stmt))

        for item in order_items:
            # Find or create preference
            pref = self.session.scalar(
                select(CustomerPreference).where(
                    and_(
                        CustomerPreference.customer_id == customer_id,
                        CustomerPreference.menu_item_id == item.menu_item_id,
                    )
                )
            )

            if pref:
                pref.order_count += item.quantity
                pref.last_ordered = datetime.utcnow()
            else:
                pref = CustomerPreference(
                    customer_id=customer_id,
                    menu_item_id=item.menu_item_id,
                    order_count=item.quantity,
                    last_ordered=datetime.utcnow(),
                )
                self.session.add(pref)

        # Recalculate preference scores
        self._recalculate_preference_scores(customer_id)
        self.session.commit()

    def _calculate_clv(self, customer: Customer) -> Decimal:
        """
        Calculate Customer Lifetime Value.

        Simple CLV model based on:
        - Average order value
        - Purchase frequency
        - Customer lifespan
        """
        if customer.total_visits == 0:
            return Decimal("0")

        # Calculate purchase frequency (orders per month)
        if customer.first_visit_date and customer.last_visit_date:
            lifespan_days = (customer.last_visit_date - customer.first_visit_date).days
            lifespan_months = max(lifespan_days / 30, 1)
            frequency = customer.total_visits / lifespan_months
        else:
            frequency = 1.0

        # Project 12-month value
        projected_visits = frequency * 12
        clv = customer.average_spend * Decimal(str(projected_visits))

        return clv

    def _calculate_loyalty_score(self, customer: Customer) -> float:
        """
        Calculate loyalty score (0-100).

        Based on:
        - Visit frequency
        - Recency
        - Total lifetime value
        """
        score = 0.0

        # Frequency component (max 40 points)
        if customer.total_visits >= 20:
            score += 40
        elif customer.total_visits >= 10:
            score += 30
        elif customer.total_visits >= 5:
            score += 20
        elif customer.total_visits >= 2:
            score += 10

        # Recency component (max 30 points)
        if customer.last_visit_date:
            days_since = (date.today() - customer.last_visit_date).days
            if days_since <= 7:
                score += 30
            elif days_since <= 14:
                score += 25
            elif days_since <= 30:
                score += 20
            elif days_since <= 60:
                score += 10

        # Value component (max 30 points)
        if customer.total_spend >= Decimal("1000"):
            score += 30
        elif customer.total_spend >= Decimal("500"):
            score += 25
        elif customer.total_spend >= Decimal("250"):
            score += 20
        elif customer.total_spend >= Decimal("100"):
            score += 10

        return min(100, score)

    def _calculate_engagement_score(self, customer_id: int) -> float:
        """
        Calculate engagement score (0-100).

        Based on:
        - Response to campaigns
        - Feedback provided
        - Reservation vs walk-in ratio
        """
        score = 50.0  # Base score

        # Campaign response
        response_stmt = (
            select(
                func.count(CampaignDelivery.id).label("total"),
                func.sum(CampaignDelivery.converted.cast(Integer)).label("converted"),
            )
            .where(CampaignDelivery.customer_id == customer_id)
        )
        from sqlalchemy import Integer
        response = self.session.execute(response_stmt).first()

        if response and response.total > 0:
            conversion_rate = (response.converted or 0) / response.total
            score += conversion_rate * 25  # Max 25 points

        # Feedback given
        feedback_count = self.session.scalar(
            select(func.count(CustomerFeedback.id))
            .where(CustomerFeedback.customer_id == customer_id)
        )
        if feedback_count:
            score += min(25, feedback_count * 5)  # Max 25 points

        return min(100, score)

    def _get_customers_for_segmentation(self) -> pd.DataFrame:
        """Get customer data for segmentation analysis."""
        stmt = (
            select(
                Customer.id,
                Customer.total_visits,
                Customer.total_spend,
                Customer.average_spend,
                Customer.first_visit_date,
                Customer.last_visit_date,
                Customer.loyalty_score,
            )
            .where(Customer.total_visits > 0)
        )

        results = self.session.execute(stmt).fetchall()

        if not results:
            return pd.DataFrame()

        df = pd.DataFrame(results, columns=[
            "id", "visits", "total_spend", "avg_spend",
            "first_visit", "last_visit", "loyalty"
        ])

        # Calculate recency (days since last visit)
        today = date.today()
        df["recency"] = df["last_visit"].apply(
            lambda x: (today - x).days if x else 365
        )

        return df

    def _calculate_rfm_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate RFM scores for customers."""
        # Recency score (1-5, lower recency = higher score)
        df["r_score"] = pd.qcut(
            df["recency"].rank(method="first"),
            q=5,
            labels=[5, 4, 3, 2, 1]
        ).astype(int)

        # Frequency score (1-5)
        df["f_score"] = pd.qcut(
            df["visits"].rank(method="first"),
            q=5,
            labels=[1, 2, 3, 4, 5],
            duplicates="drop"
        ).astype(int)

        # Monetary score (1-5)
        df["m_score"] = pd.qcut(
            df["total_spend"].rank(method="first"),
            q=5,
            labels=[1, 2, 3, 4, 5],
            duplicates="drop"
        ).astype(int)

        # Combined RFM score
        df["rfm_score"] = df["r_score"] + df["f_score"] + df["m_score"]

        return df

    def _ensure_segments(self) -> None:
        """Ensure all segment types exist in database."""
        segment_configs = [
            (CustomerSegmentType.VIP, "VIP", "Top customers by value and frequency"),
            (CustomerSegmentType.LOYAL, "Clienti Fedeli", "Regular returning customers"),
            (CustomerSegmentType.POTENTIAL, "Clienti Potenziali", "Growing engagement"),
            (CustomerSegmentType.OCCASIONAL, "Clienti Occasionali", "Infrequent visitors"),
            (CustomerSegmentType.INACTIVE, "Clienti Inattivi", "No recent visits"),
            (CustomerSegmentType.NEW, "Nuovi Clienti", "First-time or recent customers"),
            (CustomerSegmentType.AT_RISK, "Clienti a Rischio", "Previously active, declining"),
        ]

        for seg_type, name, desc in segment_configs:
            existing = self.session.scalar(
                select(CustomerSegment).where(CustomerSegment.segment_type == seg_type)
            )
            if not existing:
                segment = CustomerSegment(
                    name=name,
                    segment_type=seg_type,
                    description=desc,
                )
                self.session.add(segment)

        self.session.commit()

    def _assign_segments(self, rfm_data: pd.DataFrame) -> dict:
        """Assign customers to segments based on RFM scores."""
        segment_counts = {seg: 0 for seg in CustomerSegmentType}

        # Get segment IDs
        segments = {
            seg.segment_type: seg.id
            for seg in self.session.scalars(select(CustomerSegment))
        }

        for _, row in rfm_data.iterrows():
            customer = self.session.get(Customer, int(row["id"]))
            if not customer:
                continue

            # Determine segment based on RFM
            rfm = row["rfm_score"]
            recency = row["recency"]
            visits = row["visits"]

            if rfm >= 13 and visits >= 10:
                seg_type = CustomerSegmentType.VIP
            elif rfm >= 11 and visits >= 5:
                seg_type = CustomerSegmentType.LOYAL
            elif rfm >= 9 and recency <= 30:
                seg_type = CustomerSegmentType.POTENTIAL
            elif recency > self.inactive_days:
                if row["f_score"] >= 3:
                    seg_type = CustomerSegmentType.AT_RISK
                else:
                    seg_type = CustomerSegmentType.INACTIVE
            elif visits <= 2 and recency <= 60:
                seg_type = CustomerSegmentType.NEW
            else:
                seg_type = CustomerSegmentType.OCCASIONAL

            customer.segment_id = segments.get(seg_type)
            segment_counts[seg_type] += 1

        self.session.commit()
        return segment_counts

    def _update_clv_percentiles(self) -> None:
        """Update CLV percentiles for all customers."""
        # Get all CLV scores
        stmt = select(Customer.id, Customer.clv_score).where(Customer.clv_score > 0)
        results = self.session.execute(stmt).fetchall()

        if not results:
            return

        df = pd.DataFrame(results, columns=["id", "clv"])
        df["percentile"] = df["clv"].rank(pct=True)

        for _, row in df.iterrows():
            customer = self.session.get(Customer, int(row["id"]))
            if customer:
                customer.clv_percentile = float(row["percentile"])

        self.session.commit()

    def _build_segment_definitions(self, counts: dict) -> list[SegmentDefinition]:
        """Build segment definitions with statistics."""
        definitions = []

        for seg_type in CustomerSegmentType:
            # Get segment stats
            stats_stmt = (
                select(
                    func.count(Customer.id).label("count"),
                    func.sum(Customer.clv_score).label("total_value"),
                    func.avg(Customer.total_visits).label("avg_visits"),
                    func.avg(Customer.average_spend).label("avg_spend"),
                )
                .join(CustomerSegment)
                .where(CustomerSegment.segment_type == seg_type)
            )
            stats = self.session.execute(stats_stmt).first()

            if stats and stats.count > 0:
                characteristics = self._get_segment_characteristics(seg_type)

                definitions.append(SegmentDefinition(
                    name=seg_type.value,
                    segment_type=seg_type,
                    customer_count=stats.count,
                    total_value=stats.total_value or Decimal("0"),
                    avg_visits=float(stats.avg_visits or 0),
                    avg_spend=stats.avg_spend or Decimal("0"),
                    characteristics=characteristics,
                ))

        return definitions

    def _get_segment_characteristics(self, seg_type: CustomerSegmentType) -> list[str]:
        """Get descriptive characteristics for a segment."""
        characteristics = {
            CustomerSegmentType.VIP: [
                "Alta frequenza di visite",
                "Spesa elevata",
                "Alta fedeltà",
                "Priorità massima per retention",
            ],
            CustomerSegmentType.LOYAL: [
                "Visite regolari",
                "Buon valore medio ordine",
                "Risponde bene alle promozioni",
            ],
            CustomerSegmentType.POTENTIAL: [
                "Engagement crescente",
                "Visite recenti",
                "Potenziale di crescita",
            ],
            CustomerSegmentType.OCCASIONAL: [
                "Visite sporadiche",
                "Opportunità di engagement",
                "Target per campagne di riattivazione",
            ],
            CustomerSegmentType.INACTIVE: [
                "Nessuna visita recente",
                "Richiede campagna di win-back",
                "Valutare interesse residuo",
            ],
            CustomerSegmentType.NEW: [
                "Prima visita recente",
                "Fase di onboarding",
                "Cruciale per impressione iniziale",
            ],
            CustomerSegmentType.AT_RISK: [
                "Era cliente attivo",
                "Engagement in calo",
                "Priorità per retention immediata",
            ],
        }
        return characteristics.get(seg_type, [])

    def _get_customer_favorites(self, customer_id: int, limit: int = 5) -> list[dict]:
        """Get customer's favorite dishes."""
        from risto_ai.database.models.menu import MenuItem

        stmt = (
            select(CustomerPreference, MenuItem)
            .join(MenuItem, CustomerPreference.menu_item_id == MenuItem.id)
            .where(CustomerPreference.customer_id == customer_id)
            .order_by(CustomerPreference.preference_score.desc())
            .limit(limit)
        )
        results = self.session.execute(stmt).fetchall()

        return [
            {
                "menu_item_id": pref.menu_item_id,
                "name": item.name,
                "order_count": pref.order_count,
                "preference_score": float(pref.preference_score),
            }
            for pref, item in results
        ]

    def _get_dietary_preferences(self, customer_id: int) -> list[str]:
        """Get dietary preferences from feedback."""
        # This would analyze feedback comments for dietary mentions
        # Simplified implementation
        return []

    def _recalculate_preference_scores(self, customer_id: int) -> None:
        """Recalculate preference scores for a customer."""
        # Get total orders for the customer
        total_orders = self.session.scalar(
            select(func.sum(CustomerPreference.order_count))
            .where(CustomerPreference.customer_id == customer_id)
        ) or 1

        # Update scores
        prefs = self.session.scalars(
            select(CustomerPreference)
            .where(CustomerPreference.customer_id == customer_id)
        )

        for pref in prefs:
            pref.preference_score = pref.order_count / total_orders
