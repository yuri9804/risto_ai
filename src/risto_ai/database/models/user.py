"""
User model for authentication.
Includes user profile, password hash, subscription plan, and restaurant info.
"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    String,
    Integer,
    Boolean,
    DateTime,
    Enum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from risto_ai.database.connection import Base


class SubscriptionPlan(str, PyEnum):
    """Subscription plans available."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    """
    User model for authentication and multi-tenancy.
    Each user owns a restaurant and all associated data.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Authentication
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Restaurant info
    nome_ristorante: Mapped[str] = mapped_column(String(255), nullable=False)

    # Subscription
    piano: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan), default=SubscriptionPlan.FREE, nullable=False
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    data_registrazione: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    @property
    def initials(self) -> str:
        """Get user initials from restaurant name."""
        words = self.nome_ristorante.split()
        if len(words) >= 2:
            return (words[0][0] + words[1][0]).upper()
        return self.nome_ristorante[:2].upper()

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_piano", "piano"),
    )
