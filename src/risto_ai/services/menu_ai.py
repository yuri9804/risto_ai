"""
Menu AI Service - AI-powered menu optimization and analysis.

This module provides:
1. Menu Engineering Analysis (Star, Plow Horse, Puzzle, Dog classification)
2. Ingredient-Dish Correlation Analysis
3. Customer Preference Analysis
4. Strategic Recommendations
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database.models.menu import (
    MenuItem,
    Ingredient,
    MenuItemIngredient,
    MenuEngineering,
    MenuEngineeringCategory,
)
from risto_ai.database.models.order import Order, OrderItem, DailySales
from risto_ai.database.models.customer import CustomerPreference, CustomerFeedback

settings = get_settings()


@dataclass
class MenuEngineeringResult:
    """Result of menu engineering analysis for a single item."""
    menu_item_id: int
    name: str
    category_name: str
    quantity_sold: int
    total_revenue: Decimal
    total_cost: Decimal
    total_margin: Decimal
    unit_margin: Decimal
    margin_percentage: float
    popularity_index: float
    profitability_index: float
    classification: MenuEngineeringCategory
    reorder_rate: Optional[float] = None
    avg_rating: Optional[float] = None
    operational_complexity: float = 0.0
    ingredient_efficiency: float = 0.0


@dataclass
class IngredientAnalysis:
    """Analysis of ingredient usage efficiency."""
    ingredient_id: int
    name: str
    dishes_used_in: int
    total_dishes: int
    usage_percentage: float
    total_cost_impact: Decimal
    is_exclusive: bool  # Used in only one dish
    storage_complexity: str
    recommendation: str


@dataclass
class MenuRecommendation:
    """Strategic recommendation for a menu item."""
    menu_item_id: int
    name: str
    current_classification: MenuEngineeringCategory
    recommendation_type: str  # promote, modify, remove, price_adjust
    priority: int  # 1=highest
    description: str
    expected_impact: str
    actions: list[str]


class MenuAIService:
    """
    AI-powered menu analysis and optimization service.

    Provides comprehensive menu engineering analysis including:
    - Economic analysis (margin, profitability)
    - Popularity analysis (sales volume, mix percentage)
    - Customer satisfaction (reorder rates, ratings)
    - Operational complexity (ingredient efficiency)
    """

    def __init__(self, session: Session):
        self.session = session
        self.popularity_threshold = settings.menu_engineering_popularity_threshold
        self.profitability_threshold = settings.menu_engineering_profitability_threshold

    def run_full_analysis(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """
        Run complete menu analysis including all dimensions.

        Args:
            start_date: Start of analysis period (default: 30 days ago)
            end_date: End of analysis period (default: today)

        Returns:
            Dictionary with all analysis results and recommendations
        """
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=30)

        # Run all analysis components
        engineering_results = self.analyze_menu_engineering(start_date, end_date)
        ingredient_analysis = self.analyze_ingredient_efficiency()
        customer_analysis = self.analyze_customer_preferences(start_date, end_date)

        # Merge customer data into engineering results
        for result in engineering_results:
            if result.menu_item_id in customer_analysis:
                cust_data = customer_analysis[result.menu_item_id]
                result.reorder_rate = cust_data.get("reorder_rate")
                result.avg_rating = cust_data.get("avg_rating")

        # Generate recommendations
        recommendations = self.generate_recommendations(
            engineering_results, ingredient_analysis
        )

        # Store results
        self._store_engineering_results(engineering_results, start_date, end_date)

        return {
            "period": {"start": start_date, "end": end_date},
            "engineering_results": engineering_results,
            "ingredient_analysis": ingredient_analysis,
            "recommendations": recommendations,
            "summary": self._generate_summary(engineering_results, ingredient_analysis),
        }

    def analyze_menu_engineering(
        self,
        start_date: date,
        end_date: date,
    ) -> list[MenuEngineeringResult]:
        """
        Perform classic menu engineering analysis.

        Classifies each menu item into:
        - Star: High popularity, high profitability (keep & promote)
        - Plow Horse: High popularity, low profitability (optimize)
        - Puzzle: Low popularity, high profitability (promote or modify)
        - Dog: Low popularity, low profitability (consider removal)
        """
        # Query sales data for the period
        sales_data = self._get_sales_data(start_date, end_date)

        if sales_data.empty:
            return []

        # Calculate metrics for each item
        total_quantity = sales_data["quantity"].sum()
        total_margin = sales_data["margin"].sum()

        results = []
        for _, row in sales_data.iterrows():
            # Calculate indices
            popularity_index = row["quantity"] / total_quantity if total_quantity > 0 else 0
            profitability_index = (
                row["margin"] / total_margin if total_margin > 0 else 0
            )

            # Calculate percentiles for classification
            popularity_percentile = (
                (sales_data["quantity"] < row["quantity"]).mean()
            )
            profitability_percentile = (
                (sales_data["margin"] / sales_data["quantity"]).lt(
                    row["margin"] / max(row["quantity"], 1)
                ).mean()
            )

            # Classify the item
            is_popular = popularity_percentile >= self.popularity_threshold
            is_profitable = profitability_percentile >= self.profitability_threshold

            if is_popular and is_profitable:
                classification = MenuEngineeringCategory.STAR
            elif is_popular and not is_profitable:
                classification = MenuEngineeringCategory.PLOW_HORSE
            elif not is_popular and is_profitable:
                classification = MenuEngineeringCategory.PUZZLE
            else:
                classification = MenuEngineeringCategory.DOG

            unit_margin = Decimal(str(row["margin"] / max(row["quantity"], 1)))
            margin_pct = float(row["margin"] / max(row["revenue"], 1) * 100)

            results.append(MenuEngineeringResult(
                menu_item_id=int(row["menu_item_id"]),
                name=row["name"],
                category_name=row["category_name"],
                quantity_sold=int(row["quantity"]),
                total_revenue=Decimal(str(row["revenue"])),
                total_cost=Decimal(str(row["cost"])),
                total_margin=Decimal(str(row["margin"])),
                unit_margin=unit_margin,
                margin_percentage=margin_pct,
                popularity_index=float(popularity_index),
                profitability_index=float(profitability_index),
                classification=classification,
            ))

        return results

    def analyze_ingredient_efficiency(self) -> list[IngredientAnalysis]:
        """
        Analyze ingredient usage efficiency across the menu.

        Identifies:
        - Ingredients used in few dishes (operational complexity)
        - Exclusive ingredients (single-dish dependency)
        - High-cost low-utilization ingredients
        """
        # Get all ingredients with their dish count
        stmt = (
            select(
                Ingredient.id,
                Ingredient.name,
                Ingredient.cost_per_unit,
                Ingredient.storage_type,
                func.count(MenuItemIngredient.menu_item_id).label("dish_count"),
            )
            .outerjoin(MenuItemIngredient)
            .group_by(Ingredient.id)
        )
        ingredient_data = self.session.execute(stmt).fetchall()

        # Get total active dishes
        total_dishes = self.session.scalar(
            select(func.count(MenuItem.id)).where(MenuItem.is_active == True)
        )

        results = []
        for row in ingredient_data:
            usage_pct = row.dish_count / max(total_dishes, 1) * 100
            is_exclusive = row.dish_count == 1

            # Calculate cost impact (total cost across all dishes)
            cost_stmt = (
                select(func.sum(MenuItemIngredient.quantity * Ingredient.cost_per_unit))
                .where(MenuItemIngredient.ingredient_id == row.id)
                .join(Ingredient)
            )
            cost_impact = self.session.scalar(cost_stmt) or Decimal("0")

            # Generate recommendation
            if is_exclusive:
                recommendation = "REVIEW: Used in only one dish - consider alternatives"
            elif usage_pct < 10:
                recommendation = "LOW USAGE: Consider consolidation or removal"
            elif row.storage_type == "frozen" and usage_pct < 20:
                recommendation = "STORAGE COST: Frozen item with low usage"
            else:
                recommendation = "OK: Good utilization"

            results.append(IngredientAnalysis(
                ingredient_id=row.id,
                name=row.name,
                dishes_used_in=row.dish_count,
                total_dishes=total_dishes,
                usage_percentage=usage_pct,
                total_cost_impact=cost_impact,
                is_exclusive=is_exclusive,
                storage_complexity=row.storage_type,
                recommendation=recommendation,
            ))

        # Sort by usage percentage (lowest first for review)
        results.sort(key=lambda x: x.usage_percentage)
        return results

    def analyze_customer_preferences(
        self,
        start_date: date,
        end_date: date,
    ) -> dict[int, dict]:
        """
        Analyze customer preferences and satisfaction for menu items.

        Metrics:
        - Reorder rate: How often customers order the same dish again
        - Average rating: From customer feedback
        - Customer lifetime association: Dishes that retain customers
        """
        results = {}

        # Calculate reorder rates
        reorder_stmt = (
            select(
                OrderItem.menu_item_id,
                func.count(func.distinct(Order.customer_id)).label("unique_customers"),
                func.count(OrderItem.id).label("total_orders"),
            )
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                and_(
                    Order.order_date >= start_date,
                    Order.order_date <= end_date,
                    Order.customer_id.isnot(None),
                )
            )
            .group_by(OrderItem.menu_item_id)
        )
        reorder_data = self.session.execute(reorder_stmt).fetchall()

        for row in reorder_data:
            reorder_rate = row.total_orders / max(row.unique_customers, 1)
            results[row.menu_item_id] = {
                "reorder_rate": reorder_rate,
                "unique_customers": row.unique_customers,
            }

        # Get average ratings from feedback
        rating_stmt = (
            select(
                CustomerFeedback.menu_item_id,
                func.avg(CustomerFeedback.food_rating).label("avg_rating"),
                func.count(CustomerFeedback.id).label("rating_count"),
            )
            .where(
                and_(
                    CustomerFeedback.menu_item_id.isnot(None),
                    CustomerFeedback.food_rating.isnot(None),
                )
            )
            .group_by(CustomerFeedback.menu_item_id)
        )
        rating_data = self.session.execute(rating_stmt).fetchall()

        for row in rating_data:
            if row.menu_item_id in results:
                results[row.menu_item_id]["avg_rating"] = float(row.avg_rating)
                results[row.menu_item_id]["rating_count"] = row.rating_count
            else:
                results[row.menu_item_id] = {
                    "avg_rating": float(row.avg_rating),
                    "rating_count": row.rating_count,
                }

        return results

    def generate_recommendations(
        self,
        engineering_results: list[MenuEngineeringResult],
        ingredient_analysis: list[IngredientAnalysis],
    ) -> list[MenuRecommendation]:
        """
        Generate actionable recommendations based on analysis.

        Creates prioritized list of actions to optimize the menu.
        """
        recommendations = []
        priority = 1

        # Build ingredient lookup for exclusive ingredients
        exclusive_ingredients = {
            ia.ingredient_id: ia for ia in ingredient_analysis if ia.is_exclusive
        }

        for result in engineering_results:
            if result.classification == MenuEngineeringCategory.STAR:
                recommendations.append(MenuRecommendation(
                    menu_item_id=result.menu_item_id,
                    name=result.name,
                    current_classification=result.classification,
                    recommendation_type="promote",
                    priority=priority,
                    description="High performer - maximize visibility and sales",
                    expected_impact="Maintain/increase revenue contribution",
                    actions=[
                        "Feature prominently on menu",
                        "Train staff to recommend",
                        "Use in marketing campaigns",
                        "Consider small price increase",
                    ],
                ))
                priority += 1

            elif result.classification == MenuEngineeringCategory.PLOW_HORSE:
                recommendations.append(MenuRecommendation(
                    menu_item_id=result.menu_item_id,
                    name=result.name,
                    current_classification=result.classification,
                    recommendation_type="modify",
                    priority=priority,
                    description="Popular but low margin - optimize profitability",
                    expected_impact=f"Increase margin from {result.margin_percentage:.1f}%",
                    actions=[
                        "Review portion size (potential reduction)",
                        "Evaluate ingredient costs for alternatives",
                        "Consider modest price increase",
                        "Bundle with high-margin items",
                    ],
                ))
                priority += 1

            elif result.classification == MenuEngineeringCategory.PUZZLE:
                recommendations.append(MenuRecommendation(
                    menu_item_id=result.menu_item_id,
                    name=result.name,
                    current_classification=result.classification,
                    recommendation_type="promote",
                    priority=priority,
                    description="High margin but low sales - increase awareness",
                    expected_impact="Increase sales volume while maintaining margin",
                    actions=[
                        "Improve menu positioning/description",
                        "Staff training on dish features",
                        "Consider promotional campaign",
                        "Evaluate if name/presentation needs update",
                    ],
                ))
                priority += 1

            elif result.classification == MenuEngineeringCategory.DOG:
                recommendations.append(MenuRecommendation(
                    menu_item_id=result.menu_item_id,
                    name=result.name,
                    current_classification=result.classification,
                    recommendation_type="remove",
                    priority=priority,
                    description="Low performer - consider removal or major revision",
                    expected_impact="Simplify operations and reduce waste",
                    actions=[
                        "Evaluate customer attachment (loyal customers)",
                        "Check for exclusive ingredients to eliminate",
                        "Consider complete reformulation",
                        "Prepare replacement dish if removing",
                    ],
                ))
                priority += 1

        # Sort by classification importance then priority
        classification_order = {
            MenuEngineeringCategory.DOG: 0,
            MenuEngineeringCategory.PUZZLE: 1,
            MenuEngineeringCategory.PLOW_HORSE: 2,
            MenuEngineeringCategory.STAR: 3,
        }
        recommendations.sort(
            key=lambda r: (classification_order[r.current_classification], r.priority)
        )

        return recommendations

    def _get_sales_data(self, start_date: date, end_date: date) -> pd.DataFrame:
        """Query and aggregate sales data for the period."""
        stmt = (
            select(
                OrderItem.menu_item_id,
                MenuItem.name,
                func.coalesce(MenuItem.category_id, 0).label("category_id"),
                func.sum(OrderItem.quantity).label("quantity"),
                func.sum(OrderItem.unit_price * OrderItem.quantity).label("revenue"),
                func.sum(OrderItem.unit_cost * OrderItem.quantity).label("cost"),
            )
            .join(MenuItem, OrderItem.menu_item_id == MenuItem.id)
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                and_(
                    Order.order_date >= start_date,
                    Order.order_date <= end_date,
                    Order.status != "cancelled",
                )
            )
            .group_by(OrderItem.menu_item_id, MenuItem.name, MenuItem.category_id)
        )

        result = self.session.execute(stmt).fetchall()

        if not result:
            return pd.DataFrame()

        df = pd.DataFrame(result, columns=[
            "menu_item_id", "name", "category_id", "quantity", "revenue", "cost"
        ])

        # Get category names
        from risto_ai.database.models.menu import MenuCategory
        categories = {
            c.id: c.name for c in self.session.query(MenuCategory).all()
        }
        df["category_name"] = df["category_id"].map(
            lambda x: categories.get(x, "Uncategorized")
        )

        # Calculate margin
        df["margin"] = df["revenue"] - df["cost"]

        return df

    def _store_engineering_results(
        self,
        results: list[MenuEngineeringResult],
        start_date: date,
        end_date: date,
    ) -> None:
        """Store menu engineering results in database."""
        analysis_date = datetime.utcnow()

        for result in results:
            engineering = MenuEngineering(
                menu_item_id=result.menu_item_id,
                analysis_date=analysis_date,
                period_start=datetime.combine(start_date, datetime.min.time()),
                period_end=datetime.combine(end_date, datetime.max.time()),
                quantity_sold=result.quantity_sold,
                total_revenue=result.total_revenue,
                total_cost=result.total_cost,
                total_margin=result.total_margin,
                popularity_index=result.popularity_index,
                profitability_index=result.profitability_index,
                category=result.classification,
                reorder_rate=result.reorder_rate,
                avg_rating=result.avg_rating,
                operational_complexity_score=result.operational_complexity,
                ingredient_efficiency_score=result.ingredient_efficiency,
            )
            self.session.add(engineering)

        self.session.commit()

    def _generate_summary(
        self,
        engineering_results: list[MenuEngineeringResult],
        ingredient_analysis: list[IngredientAnalysis],
    ) -> dict:
        """Generate summary statistics for the analysis."""
        if not engineering_results:
            return {"message": "No sales data available for analysis"}

        # Count by classification
        classification_counts = {}
        for cat in MenuEngineeringCategory:
            classification_counts[cat.value] = len([
                r for r in engineering_results if r.classification == cat
            ])

        # Calculate totals
        total_revenue = sum(r.total_revenue for r in engineering_results)
        total_margin = sum(r.total_margin for r in engineering_results)
        total_quantity = sum(r.quantity_sold for r in engineering_results)

        # Revenue by classification
        revenue_by_class = {}
        for cat in MenuEngineeringCategory:
            cat_results = [r for r in engineering_results if r.classification == cat]
            revenue_by_class[cat.value] = sum(r.total_revenue for r in cat_results)

        # Ingredient issues
        exclusive_count = len([i for i in ingredient_analysis if i.is_exclusive])
        low_usage_count = len([i for i in ingredient_analysis if i.usage_percentage < 10])

        return {
            "total_items_analyzed": len(engineering_results),
            "classification_breakdown": classification_counts,
            "revenue_by_classification": revenue_by_class,
            "total_revenue": total_revenue,
            "total_margin": total_margin,
            "overall_margin_percentage": float(total_margin / total_revenue * 100) if total_revenue else 0,
            "total_quantity_sold": total_quantity,
            "ingredient_issues": {
                "exclusive_ingredients": exclusive_count,
                "low_usage_ingredients": low_usage_count,
            },
        }

    def get_dish_recommendations_for_marketing(
        self,
        campaign_type: str,
        max_items: int = 3,
    ) -> list[dict]:
        """
        Get recommended dishes for marketing campaigns.

        Args:
            campaign_type: 'high_popularity', 'high_margin', or 'test_new'
            max_items: Maximum number of items to return

        Returns:
            List of recommended dishes with messaging suggestions
        """
        # Get latest engineering results
        latest_date_stmt = select(func.max(MenuEngineering.analysis_date))
        latest_date = self.session.scalar(latest_date_stmt)

        if not latest_date:
            return []

        if campaign_type == "high_popularity":
            # Stars - high popularity, high margin
            stmt = (
                select(MenuEngineering, MenuItem)
                .join(MenuItem, MenuEngineering.menu_item_id == MenuItem.id)
                .where(
                    and_(
                        MenuEngineering.analysis_date == latest_date,
                        MenuEngineering.category == MenuEngineeringCategory.STAR,
                    )
                )
                .order_by(MenuEngineering.popularity_index.desc())
                .limit(max_items)
            )
            offer_type = "Sconto del 10% sul tuo piatto preferito"

        elif campaign_type == "high_margin":
            # High margin items (Stars and Puzzles with good margin)
            stmt = (
                select(MenuEngineering, MenuItem)
                .join(MenuItem, MenuEngineering.menu_item_id == MenuItem.id)
                .where(
                    and_(
                        MenuEngineering.analysis_date == latest_date,
                        MenuEngineering.category.in_([
                            MenuEngineeringCategory.STAR,
                            MenuEngineeringCategory.PUZZLE,
                        ]),
                    )
                )
                .order_by(MenuEngineering.profitability_index.desc())
                .limit(max_items)
            )
            offer_type = "Offerta speciale chef"

        elif campaign_type == "test_new":
            # Puzzles - need more exposure
            stmt = (
                select(MenuEngineering, MenuItem)
                .join(MenuItem, MenuEngineering.menu_item_id == MenuItem.id)
                .where(
                    and_(
                        MenuEngineering.analysis_date == latest_date,
                        MenuEngineering.category == MenuEngineeringCategory.PUZZLE,
                    )
                )
                .order_by(MenuEngineering.profitability_index.desc())
                .limit(max_items)
            )
            offer_type = "Prova la nostra novità"

        else:
            return []

        results = self.session.execute(stmt).fetchall()

        recommendations = []
        for eng, item in results:
            recommendations.append({
                "menu_item_id": item.id,
                "name": item.name,
                "description": item.description,
                "price": float(item.price),
                "margin_percentage": float(eng.profitability_index * 100),
                "popularity_rank": float(eng.popularity_index),
                "offer_type": offer_type,
                "suggested_discount": 10 if campaign_type == "high_popularity" else 15,
            })

        return recommendations
