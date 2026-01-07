"""
Menu API Routes.

Endpoints for menu management and analysis.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.database import get_sync_session
from risto_ai.services.menu_ai import MenuAIService

router = APIRouter()


class AnalysisRequest(BaseModel):
    """Request model for menu analysis."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class MenuItemCreate(BaseModel):
    """Request model for creating a menu item."""
    name: str
    description: Optional[str] = None
    category_id: int
    price: float
    cost: float
    preparation_time_minutes: int = 15
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False


@router.post("/analyze")
def run_menu_analysis(
    request: AnalysisRequest,
    session: Session = Depends(get_sync_session),
):
    """
    Run comprehensive menu analysis.

    Performs Menu Engineering analysis including:
    - Economic analysis (margins, profitability)
    - Popularity analysis
    - Customer satisfaction metrics
    - Ingredient efficiency
    - Strategic recommendations
    """
    service = MenuAIService(session)
    result = service.run_full_analysis(
        start_date=request.start_date,
        end_date=request.end_date,
    )

    # Convert to serializable format
    return {
        "period": result["period"],
        "summary": result["summary"],
        "engineering_results": [
            {
                "menu_item_id": r.menu_item_id,
                "name": r.name,
                "category": r.category_name,
                "classification": r.classification.value,
                "quantity_sold": r.quantity_sold,
                "total_revenue": float(r.total_revenue),
                "total_margin": float(r.total_margin),
                "margin_percentage": r.margin_percentage,
                "popularity_index": r.popularity_index,
                "profitability_index": r.profitability_index,
                "reorder_rate": r.reorder_rate,
                "avg_rating": r.avg_rating,
            }
            for r in result["engineering_results"]
        ],
        "ingredient_analysis": [
            {
                "ingredient_id": i.ingredient_id,
                "name": i.name,
                "dishes_used_in": i.dishes_used_in,
                "usage_percentage": i.usage_percentage,
                "is_exclusive": i.is_exclusive,
                "recommendation": i.recommendation,
            }
            for i in result["ingredient_analysis"]
        ],
        "recommendations": [
            {
                "menu_item_id": r.menu_item_id,
                "name": r.name,
                "current_classification": r.current_classification.value,
                "recommendation_type": r.recommendation_type,
                "priority": r.priority,
                "description": r.description,
                "expected_impact": r.expected_impact,
                "actions": r.actions,
            }
            for r in result["recommendations"]
        ],
    }


@router.get("/recommendations/marketing")
def get_marketing_recommendations(
    campaign_type: str = Query(
        ...,
        description="Type of campaign: high_popularity, high_margin, or test_new"
    ),
    max_items: int = Query(3, ge=1, le=10),
    session: Session = Depends(get_sync_session),
):
    """
    Get dish recommendations for marketing campaigns.

    Returns recommended dishes based on Menu Engineering analysis.
    """
    valid_types = ["high_popularity", "high_margin", "test_new"]
    if campaign_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid campaign_type. Must be one of: {valid_types}"
        )

    service = MenuAIService(session)
    return service.get_dish_recommendations_for_marketing(
        campaign_type=campaign_type,
        max_items=max_items,
    )


@router.get("/engineering/history")
def get_engineering_history(
    menu_item_id: Optional[int] = None,
    limit: int = Query(30, ge=1, le=100),
    session: Session = Depends(get_sync_session),
):
    """
    Get historical menu engineering analysis results.

    Useful for tracking item performance over time.
    """
    from sqlalchemy import select
    from risto_ai.database.models.menu import MenuEngineering, MenuItem

    query = select(MenuEngineering, MenuItem.name).join(
        MenuItem, MenuEngineering.menu_item_id == MenuItem.id
    )

    if menu_item_id:
        query = query.where(MenuEngineering.menu_item_id == menu_item_id)

    query = query.order_by(MenuEngineering.analysis_date.desc()).limit(limit)

    results = session.execute(query).fetchall()

    return [
        {
            "analysis_date": eng.analysis_date.isoformat(),
            "menu_item_id": eng.menu_item_id,
            "name": name,
            "classification": eng.category.value,
            "quantity_sold": eng.quantity_sold,
            "total_revenue": float(eng.total_revenue),
            "total_margin": float(eng.total_margin),
            "popularity_index": float(eng.popularity_index),
            "profitability_index": float(eng.profitability_index),
        }
        for eng, name in results
    ]
