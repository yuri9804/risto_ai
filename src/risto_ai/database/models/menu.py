"""
Menu-related database models.
Includes menu items, ingredients, categories, and menu engineering data.
"""

from datetime import datetime
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
    ForeignKey,
    Enum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from risto_ai.database.connection import Base


class MenuEngineeringCategory(str, PyEnum):
    """Menu Engineering classification categories."""
    STAR = "star"  # High popularity, high profitability
    PLOW_HORSE = "plow_horse"  # High popularity, low profitability
    PUZZLE = "puzzle"  # Low popularity, high profitability
    DOG = "dog"  # Low popularity, low profitability


class SeasonalityType(str, PyEnum):
    """Seasonality classification for menu items."""
    ALL_YEAR = "all_year"
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"
    HOLIDAY = "holiday"


class MenuCategory(Base):
    """Category for organizing menu items."""
    __tablename__ = "menu_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    menu_items: Mapped[List["MenuItem"]] = relationship(back_populates="category")


class MenuItem(Base):
    """
    A dish on the restaurant menu.
    Contains pricing, cost, and classification data.
    """
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category_id: Mapped[int] = mapped_column(ForeignKey("menu_categories.id"), nullable=False)

    # Pricing
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Total ingredient cost

    # Operational metrics
    preparation_time_minutes: Mapped[int] = mapped_column(Integer, default=15)
    complexity_score: Mapped[int] = mapped_column(Integer, default=5)  # 1-10

    # Classification
    seasonality: Mapped[SeasonalityType] = mapped_column(
        Enum(SeasonalityType), default=SeasonalityType.ALL_YEAR
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegan: Mapped[bool] = mapped_column(Boolean, default=False)
    is_gluten_free: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    category: Mapped["MenuCategory"] = relationship(back_populates="menu_items")
    ingredients: Mapped[List["MenuItemIngredient"]] = relationship(
        back_populates="menu_item", cascade="all, delete-orphan"
    )
    engineering_data: Mapped[List["MenuEngineering"]] = relationship(
        back_populates="menu_item", cascade="all, delete-orphan"
    )

    @property
    def margin(self) -> Decimal:
        """Calculate gross margin (price - cost)."""
        return self.price - self.cost

    @property
    def margin_percentage(self) -> float:
        """Calculate margin percentage."""
        if self.price == 0:
            return 0.0
        return float((self.margin / self.price) * 100)

    __table_args__ = (
        Index("ix_menu_items_category_active", "category_id", "is_active"),
    )


class Ingredient(Base):
    """
    An ingredient used in menu items.
    Tracks cost, supplier, and usage data.
    """
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Cost and supplier
    unit: Mapped[str] = mapped_column(String(50), nullable=False)  # kg, l, unit, etc.
    cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    supplier: Mapped[Optional[str]] = mapped_column(String(200))

    # Storage and handling
    storage_type: Mapped[str] = mapped_column(String(50), default="ambient")  # ambient, refrigerated, frozen
    shelf_life_days: Mapped[int] = mapped_column(Integer, default=7)

    # Flags
    is_allergen: Mapped[bool] = mapped_column(Boolean, default=False)
    allergen_info: Mapped[Optional[str]] = mapped_column(String(200))
    is_seasonal: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    menu_items: Mapped[List["MenuItemIngredient"]] = relationship(back_populates="ingredient")


class MenuItemIngredient(Base):
    """
    Association table linking menu items to ingredients with quantities.
    """
    __tablename__ = "menu_item_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)

    # Relationships
    menu_item: Mapped["MenuItem"] = relationship(back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="menu_items")

    @property
    def cost(self) -> Decimal:
        """Calculate cost of this ingredient in the dish."""
        return self.quantity * self.ingredient.cost_per_unit

    __table_args__ = (
        Index("ix_menu_item_ingredients_unique", "menu_item_id", "ingredient_id", unique=True),
    )


class MenuEngineering(Base):
    """
    Periodic menu engineering analysis results.
    Stores classification and metrics for each menu item at a point in time.
    """
    __tablename__ = "menu_engineering"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    analysis_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Sales metrics
    quantity_sold: Mapped[int] = mapped_column(Integer, nullable=False)
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_margin: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relative metrics (for classification)
    popularity_index: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)  # % of total sales
    profitability_index: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)  # Relative margin

    # Classification
    category: Mapped[MenuEngineeringCategory] = mapped_column(
        Enum(MenuEngineeringCategory), nullable=False
    )

    # Customer satisfaction (if available)
    reorder_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    avg_rating: Mapped[Optional[float]] = mapped_column(Numeric(3, 2))

    # Operational metrics
    operational_complexity_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    ingredient_efficiency_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    menu_item: Mapped["MenuItem"] = relationship(back_populates="engineering_data")

    __table_args__ = (
        Index("ix_menu_engineering_item_date", "menu_item_id", "analysis_date"),
        Index("ix_menu_engineering_category", "category"),
    )
