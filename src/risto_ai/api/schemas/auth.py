"""
Authentication schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from risto_ai.database.models.user import SubscriptionPlan


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password minimo 8 caratteri")
    conferma_password: str = Field(..., min_length=8)
    nome_ristorante: str = Field(..., min_length=2, max_length=255)
    piano: SubscriptionPlan = SubscriptionPlan.FREE

    @field_validator('conferma_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Le password non corrispondono')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (no password)."""
    id: int
    email: str
    nome_ristorante: str
    piano: SubscriptionPlan
    is_active: bool
    is_verified: bool
    data_registrazione: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    message: str
    success: bool = True
