"""
Authentication API routes.
Includes register, login, logout, and user profile endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from risto_ai.database.connection import get_async_session
from risto_ai.database.models import User
from risto_ai.api.deps import get_current_user
from risto_ai.api.schemas.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    MessageResponse,
)
from risto_ai.services.auth import (
    authenticate_user,
    create_user,
    create_access_token,
    get_user_by_email,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Registra un nuovo utente.

    - **email**: Email valida (deve essere unica)
    - **password**: Minimo 8 caratteri
    - **conferma_password**: Deve corrispondere alla password
    - **nome_ristorante**: Nome del ristorante
    - **piano**: Piano di abbonamento (free, pro, enterprise)
    """
    # Check if email already exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Questa email è già registrata"
        )

    # Create user
    user = await create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
        nome_ristorante=user_data.nome_ristorante,
        piano=user_data.piano,
    )

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Effettua il login e restituisce un token JWT.

    - **email**: Email registrata
    - **password**: Password dell'account
    """
    user = await authenticate_user(db, credentials.email, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non corretti",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabilitato"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await db.flush()

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Restituisce il profilo dell'utente corrente.
    Richiede autenticazione.
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user),
):
    """
    Effettua il logout.
    Il token deve essere invalidato lato client (rimozione da localStorage).
    """
    # In a stateless JWT system, logout is handled client-side
    # Optionally, you could implement a token blacklist here
    return MessageResponse(
        message="Logout effettuato con successo",
        success=True,
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    nome_ristorante: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Aggiorna il profilo dell'utente corrente.
    """
    current_user.nome_ristorante = nome_ristorante
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)
