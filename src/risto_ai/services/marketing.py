"""
Marketing Campaign Engine.

Provides:
- Automated campaign generation based on predictions
- Customer targeting and offer selection
- Multi-channel delivery (WhatsApp, Email, SMS)
- Performance tracking and optimization
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
import logging
import random
import string

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.customer import (
    Customer,
    CustomerSegment,
    CustomerSegmentType,
)
from risto_ai.database.models.marketing import (
    Campaign,
    CampaignOffer,
    CampaignDelivery,
    CampaignStatus,
    DeliveryStatus,
    OfferType,
    OfferMechanic,
)
from risto_ai.database.models.prediction import DayClassification
from risto_ai.database.models.menu import MenuItem

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class CampaignPlan:
    """Plan for a marketing campaign."""
    target_date: date
    day_classification: DayClassification
    target_segments: list[CustomerSegmentType]
    offers: list[dict]
    estimated_reach: int
    estimated_conversions: int
    strategy: str


@dataclass
class PersonalizedOffer:
    """Personalized offer for a specific customer."""
    customer_id: int
    customer_name: str
    whatsapp_number: str
    offer_type: OfferType
    menu_item_name: str
    discount_value: Decimal
    message: str
    valid_until: datetime


class MarketingService:
    """
    AI-powered marketing campaign engine.

    Features:
    - Automatic campaign generation based on day classification
    - 9-offer matrix (3 types x 3 variants)
    - Customer-specific offer selection
    - Anti-spam frequency controls
    - Performance tracking
    """

    # Offer types with their characteristics
    OFFER_TYPES = {
        OfferType.HIGH_POPULARITY: {
            "name": "Piatto Preferito",
            "description": "Sconto su piatti Star - alta popolarità, alto margine",
            "default_discount": 10,
            "message_template": (
                "Ciao {customer_name}! 🍽️\n\n"
                "Abbiamo una sorpresa per te: {discount}% di sconto su {dish_name}, "
                "uno dei nostri piatti più amati!\n\n"
                "Valido fino al {valid_until}.\n\n"
                "Prenota ora: {booking_link}\n\n"
                "Ti aspettiamo! 🎉"
            ),
        },
        OfferType.HIGH_MARGIN: {
            "name": "Scelta dello Chef",
            "description": "Promozione su piatti ad alto margine e veloce preparazione",
            "default_discount": 15,
            "message_template": (
                "Ciao {customer_name}! 👨‍🍳\n\n"
                "Lo Chef ti consiglia: {dish_name}!\n"
                "Per te uno sconto speciale del {discount}%.\n\n"
                "Un piatto che ti sorprenderà.\n"
                "Offerta valida fino al {valid_until}.\n\n"
                "Prenota: {booking_link}\n\n"
                "A presto!"
            ),
        },
        OfferType.TEST_NEW: {
            "name": "Novità da Provare",
            "description": "Invito a provare piatti nuovi o poco ordinati",
            "default_discount": 20,
            "message_template": (
                "Ciao {customer_name}! ✨\n\n"
                "Hai già provato {dish_name}?\n"
                "È una delle nostre novità e vogliamo fartela scoprire "
                "con il {discount}% di sconto!\n\n"
                "Offerta esclusiva fino al {valid_until}.\n\n"
                "Prenota e scoprilo: {booking_link}\n\n"
                "Ti aspettiamo!"
            ),
        },
    }

    def __init__(self, session: Session):
        self.session = session

    def generate_campaign_plan(
        self,
        target_date: date,
        day_classification: DayClassification,
    ) -> CampaignPlan:
        """
        Generate campaign plan based on day classification.

        Args:
            target_date: Date for the campaign
            day_classification: Predicted day classification

        Returns:
            CampaignPlan with targeting strategy and offers
        """
        # Determine strategy based on classification
        if day_classification == DayClassification.LOW:
            strategy = "aggressive"
            target_segments = [
                CustomerSegmentType.LOYAL,
                CustomerSegmentType.POTENTIAL,
                CustomerSegmentType.OCCASIONAL,
                CustomerSegmentType.AT_RISK,
            ]
            offer_focus = [OfferType.HIGH_POPULARITY, OfferType.TEST_NEW]
        elif day_classification == DayClassification.MEDIUM:
            strategy = "targeted"
            target_segments = [
                CustomerSegmentType.INACTIVE,
                CustomerSegmentType.POTENTIAL,
                CustomerSegmentType.NEW,
            ]
            offer_focus = [OfferType.HIGH_MARGIN, OfferType.TEST_NEW]
        else:  # HIGH or VERY_HIGH
            strategy = "minimal"
            target_segments = [CustomerSegmentType.VIP]
            offer_focus = [OfferType.HIGH_MARGIN]

        # Get recommended dishes for each offer type
        offers = []
        for offer_type in offer_focus:
            dishes = self._get_dishes_for_offer_type(offer_type, limit=3)
            for dish in dishes:
                offers.append({
                    "offer_type": offer_type,
                    "menu_item_id": dish["id"],
                    "menu_item_name": dish["name"],
                    "discount": self.OFFER_TYPES[offer_type]["default_discount"],
                })

        # Estimate reach
        estimated_reach = self._estimate_reach(target_segments, target_date)
        estimated_conversions = int(estimated_reach * self._get_expected_conversion_rate(strategy))

        return CampaignPlan(
            target_date=target_date,
            day_classification=day_classification,
            target_segments=target_segments,
            offers=offers,
            estimated_reach=estimated_reach,
            estimated_conversions=estimated_conversions,
            strategy=strategy,
        )

    def create_campaign(
        self,
        plan: CampaignPlan,
        name: Optional[str] = None,
    ) -> Campaign:
        """
        Create a campaign from a plan.

        Args:
            plan: CampaignPlan to execute
            name: Optional campaign name

        Returns:
            Created Campaign object
        """
        if not name:
            name = f"Campagna {plan.target_date.strftime('%d/%m/%Y')} - {plan.strategy}"

        # Create campaign
        campaign = Campaign(
            name=name,
            description=f"Strategia: {plan.strategy}",
            target_date=plan.target_date,
            day_classification=plan.day_classification.value,
            status=CampaignStatus.DRAFT,
            is_automated=True,
            target_reservations=plan.estimated_conversions,
            target_covers=plan.estimated_conversions * 2,  # Assume 2 covers per reservation
        )
        self.session.add(campaign)
        self.session.flush()  # Get campaign ID

        # Create offers
        for offer_data in plan.offers:
            offer_config = self.OFFER_TYPES[offer_data["offer_type"]]
            offer = CampaignOffer(
                campaign_id=campaign.id,
                name=f"{offer_config['name']} - {offer_data['menu_item_name']}",
                offer_type=offer_data["offer_type"],
                mechanic=OfferMechanic.PERCENTAGE_DISCOUNT,
                menu_item_id=offer_data["menu_item_id"],
                discount_percentage=offer_data["discount"],
                message_template=offer_config["message_template"],
                valid_from=datetime.combine(plan.target_date, datetime.min.time()),
                valid_until=datetime.combine(
                    plan.target_date, datetime.max.time()
                ).replace(hour=23, minute=59),
            )
            self.session.add(offer)

        self.session.commit()
        return campaign

    def execute_campaign(self, campaign_id: int) -> dict:
        """
        Execute a campaign by generating and queuing messages.

        Args:
            campaign_id: Campaign to execute

        Returns:
            Execution results with counts
        """
        campaign = self.session.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
            raise ValueError(f"Campaign cannot be executed in {campaign.status} status")

        # Get campaign offers
        offers = list(self.session.scalars(
            select(CampaignOffer).where(CampaignOffer.campaign_id == campaign_id)
        ))

        if not offers:
            raise ValueError("Campaign has no offers")

        # Get targetable customers
        customers = self._get_campaign_customers(campaign)

        # Generate personalized deliveries
        deliveries_created = 0
        for customer in customers:
            # Select best offer for this customer
            selected_offer = self._select_offer_for_customer(customer, offers)

            if selected_offer:
                # Generate personalized message
                message = self._generate_message(customer, selected_offer, campaign)

                # Create delivery record
                delivery = CampaignDelivery(
                    campaign_id=campaign_id,
                    offer_id=selected_offer.id,
                    customer_id=customer.id,
                    channel="whatsapp",
                    message_content=message,
                    status=DeliveryStatus.PENDING,
                )
                self.session.add(delivery)
                deliveries_created += 1

        # Update campaign status
        campaign.status = CampaignStatus.ACTIVE
        campaign.started_at = datetime.utcnow()
        campaign.messages_sent = deliveries_created

        self.session.commit()

        return {
            "campaign_id": campaign_id,
            "deliveries_created": deliveries_created,
            "offers_used": len(offers),
            "customers_targeted": len(customers),
        }

    def get_pending_deliveries(self, limit: int = 100) -> list[CampaignDelivery]:
        """Get pending message deliveries for processing."""
        stmt = (
            select(CampaignDelivery)
            .where(CampaignDelivery.status == DeliveryStatus.PENDING)
            .order_by(CampaignDelivery.created_at)
            .limit(limit)
        )
        return list(self.session.scalars(stmt))

    def update_delivery_status(
        self,
        delivery_id: int,
        status: DeliveryStatus,
        external_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update delivery status after send attempt."""
        delivery = self.session.get(CampaignDelivery, delivery_id)
        if not delivery:
            return

        delivery.status = status
        delivery.external_message_id = external_id
        delivery.error_message = error_message

        if status == DeliveryStatus.SENT:
            delivery.sent_at = datetime.utcnow()
        elif status == DeliveryStatus.DELIVERED:
            delivery.delivered_at = datetime.utcnow()
        elif status == DeliveryStatus.READ:
            delivery.read_at = datetime.utcnow()

        # Update campaign counters
        campaign = delivery.campaign
        if status == DeliveryStatus.DELIVERED:
            campaign.messages_delivered += 1
        elif status == DeliveryStatus.READ:
            campaign.messages_read += 1

        self.session.commit()

    def record_conversion(
        self,
        delivery_id: int,
        reservation_id: Optional[int] = None,
        order_id: Optional[int] = None,
    ) -> None:
        """Record a campaign conversion (reservation or order)."""
        delivery = self.session.get(CampaignDelivery, delivery_id)
        if not delivery:
            return

        delivery.converted = True
        delivery.reservation_id = reservation_id
        delivery.order_id = order_id

        # Update campaign stats
        campaign = delivery.campaign
        campaign.reservations_made += 1

        # Update offer stats
        offer = self.session.get(CampaignOffer, delivery.offer_id)
        if offer:
            offer.times_redeemed += 1

        self.session.commit()

    def get_campaign_performance(self, campaign_id: int) -> dict:
        """Get performance metrics for a campaign."""
        campaign = self.session.get(Campaign, campaign_id)
        if not campaign:
            return {}

        # Calculate actual revenue from converted deliveries
        revenue_stmt = (
            select(func.sum(Order.total))
            .join(CampaignDelivery, CampaignDelivery.order_id == Order.id)
            .where(
                and_(
                    CampaignDelivery.campaign_id == campaign_id,
                    CampaignDelivery.converted == True,
                )
            )
        )
        from risto_ai.database.models.order import Order
        actual_revenue = self.session.scalar(revenue_stmt) or Decimal("0")

        # Get offer breakdown
        offer_stats = []
        for offer in campaign.offers:
            offer_stats.append({
                "offer_id": offer.id,
                "name": offer.name,
                "type": offer.offer_type.value,
                "sent": offer.times_sent,
                "redeemed": offer.times_redeemed,
                "redemption_rate": offer.redemption_rate,
            })

        return {
            "campaign_id": campaign.id,
            "name": campaign.name,
            "status": campaign.status.value,
            "target_date": campaign.target_date,
            "messages": {
                "sent": campaign.messages_sent,
                "delivered": campaign.messages_delivered,
                "read": campaign.messages_read,
                "delivery_rate": campaign.delivery_rate,
                "read_rate": campaign.read_rate,
            },
            "conversions": {
                "reservations": campaign.reservations_made,
                "covers": campaign.actual_covers,
                "conversion_rate": campaign.conversion_rate,
            },
            "revenue": {
                "target": float(campaign.target_revenue or 0),
                "actual": float(actual_revenue),
            },
            "offers": offer_stats,
        }

    def _get_dishes_for_offer_type(
        self,
        offer_type: OfferType,
        limit: int = 3,
    ) -> list[dict]:
        """Get recommended dishes for an offer type."""
        from risto_ai.database.models.menu import MenuEngineering, MenuEngineeringCategory

        if offer_type == OfferType.HIGH_POPULARITY:
            # Star dishes
            category = MenuEngineeringCategory.STAR
            order_by = "popularity_index"
        elif offer_type == OfferType.HIGH_MARGIN:
            # High margin dishes (Stars and some Puzzles)
            category = MenuEngineeringCategory.STAR
            order_by = "profitability_index"
        else:  # TEST_NEW
            # Puzzle dishes (need promotion)
            category = MenuEngineeringCategory.PUZZLE
            order_by = "profitability_index"

        # Get latest analysis date
        latest_date = self.session.scalar(
            select(func.max(MenuEngineering.analysis_date))
        )

        if not latest_date:
            # Fallback to any active menu items
            stmt = (
                select(MenuItem.id, MenuItem.name)
                .where(MenuItem.is_active == True)
                .limit(limit)
            )
            results = self.session.execute(stmt).fetchall()
            return [{"id": r.id, "name": r.name} for r in results]

        stmt = (
            select(MenuItem.id, MenuItem.name)
            .join(MenuEngineering, MenuItem.id == MenuEngineering.menu_item_id)
            .where(
                and_(
                    MenuEngineering.analysis_date == latest_date,
                    MenuEngineering.category == category,
                    MenuItem.is_active == True,
                )
            )
            .order_by(getattr(MenuEngineering, order_by).desc())
            .limit(limit)
        )
        results = self.session.execute(stmt).fetchall()
        return [{"id": r.id, "name": r.name} for r in results]

    def _estimate_reach(
        self,
        target_segments: list[CustomerSegmentType],
        target_date: date,
    ) -> int:
        """Estimate number of customers that can be reached."""
        # Get count of eligible customers
        min_days = settings.min_days_between_offers
        cutoff_date = datetime.utcnow() - timedelta(days=min_days)

        # Customers in target segments with consent
        eligible_stmt = (
            select(func.count(Customer.id))
            .join(CustomerSegment)
            .where(
                and_(
                    CustomerSegment.segment_type.in_(target_segments),
                    Customer.marketing_consent == True,
                    Customer.whatsapp_number.isnot(None),
                )
            )
        )
        total_eligible = self.session.scalar(eligible_stmt) or 0

        # Subtract recently contacted
        recent_stmt = (
            select(func.count(func.distinct(CampaignDelivery.customer_id)))
            .where(CampaignDelivery.sent_at >= cutoff_date)
        )
        recently_contacted = self.session.scalar(recent_stmt) or 0

        return max(0, total_eligible - recently_contacted)

    def _get_expected_conversion_rate(self, strategy: str) -> float:
        """Get expected conversion rate based on strategy."""
        rates = {
            "aggressive": 0.05,  # 5% for broad campaigns
            "targeted": 0.08,   # 8% for targeted
            "minimal": 0.12,    # 12% for VIP-only
        }
        return rates.get(strategy, 0.05)

    def _get_campaign_customers(self, campaign: Campaign) -> list[Customer]:
        """Get eligible customers for a campaign."""
        # Get segment types from campaign classification
        day_class = DayClassification(campaign.day_classification)

        if day_class == DayClassification.LOW:
            segment_types = [
                CustomerSegmentType.LOYAL,
                CustomerSegmentType.POTENTIAL,
                CustomerSegmentType.OCCASIONAL,
                CustomerSegmentType.AT_RISK,
            ]
        elif day_class == DayClassification.MEDIUM:
            segment_types = [
                CustomerSegmentType.INACTIVE,
                CustomerSegmentType.POTENTIAL,
                CustomerSegmentType.NEW,
            ]
        else:
            segment_types = [CustomerSegmentType.VIP]

        # Query eligible customers
        min_days = settings.min_days_between_offers
        cutoff_date = datetime.utcnow() - timedelta(days=min_days)

        recent_recipients = (
            select(CampaignDelivery.customer_id)
            .where(CampaignDelivery.sent_at >= cutoff_date)
            .distinct()
        )

        stmt = (
            select(Customer)
            .join(CustomerSegment)
            .where(
                and_(
                    CustomerSegment.segment_type.in_(segment_types),
                    Customer.marketing_consent == True,
                    Customer.whatsapp_number.isnot(None),
                    Customer.id.notin_(recent_recipients),
                )
            )
            .order_by(Customer.clv_score.desc())
        )

        return list(self.session.scalars(stmt))

    def _select_offer_for_customer(
        self,
        customer: Customer,
        offers: list[CampaignOffer],
    ) -> Optional[CampaignOffer]:
        """Select the best offer for a customer based on preferences."""
        if not offers:
            return None

        # Get customer preferences
        from risto_ai.database.models.customer import CustomerPreference
        pref_stmt = (
            select(CustomerPreference.menu_item_id)
            .where(CustomerPreference.customer_id == customer.id)
            .order_by(CustomerPreference.preference_score.desc())
            .limit(10)
        )
        preferred_items = set(self.session.scalars(pref_stmt))

        # Score each offer
        scored_offers = []
        for offer in offers:
            score = 0

            # Preference match
            if offer.menu_item_id in preferred_items:
                score += 10

            # Offer type scoring based on segment
            if customer.segment:
                if customer.segment.segment_type == CustomerSegmentType.VIP:
                    if offer.offer_type == OfferType.HIGH_POPULARITY:
                        score += 5
                elif customer.segment.segment_type == CustomerSegmentType.NEW:
                    if offer.offer_type == OfferType.TEST_NEW:
                        score += 5
                elif customer.segment.segment_type in [
                    CustomerSegmentType.INACTIVE,
                    CustomerSegmentType.AT_RISK,
                ]:
                    if offer.offer_type == OfferType.HIGH_POPULARITY:
                        score += 5

            scored_offers.append((score, offer))

        # Return highest scoring offer (or random if tied)
        scored_offers.sort(key=lambda x: x[0], reverse=True)
        top_score = scored_offers[0][0]
        top_offers = [o for s, o in scored_offers if s == top_score]

        return random.choice(top_offers)

    def _generate_message(
        self,
        customer: Customer,
        offer: CampaignOffer,
        campaign: Campaign,
    ) -> str:
        """Generate personalized message for a customer."""
        # Get menu item name
        item = self.session.get(MenuItem, offer.menu_item_id)
        dish_name = item.name if item else "il nostro piatto speciale"

        # Generate booking link (placeholder)
        booking_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        booking_link = f"https://ristorante.it/prenota?code={booking_code}"

        # Format valid until
        valid_until = offer.valid_until.strftime("%d/%m/%Y") if offer.valid_until else "fine disponibilità"

        # Fill template
        message = offer.message_template.format(
            customer_name=customer.first_name,
            dish_name=dish_name,
            discount=offer.discount_percentage,
            valid_until=valid_until,
            booking_link=booking_link,
        )

        return message
