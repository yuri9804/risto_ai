"""
API Routes for Risto AI.
"""

from risto_ai.api.routes import (
    auth,
    menu,
    customers,
    reservations,
    marketing,
    predictions,
    staff,
    webhooks,
)

__all__ = [
    "auth",
    "menu",
    "customers",
    "reservations",
    "marketing",
    "predictions",
    "staff",
    "webhooks",
]
