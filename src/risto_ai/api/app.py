"""
FastAPI Application Setup.

Main application factory and configuration.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from risto_ai.config import get_settings
from risto_ai.database import init_db
from risto_ai.api.routes import (
    menu,
    customers,
    reservations,
    marketing,
    predictions,
    staff,
    webhooks,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="Risto AI",
        description=(
            "AI-powered Restaurant Menu Optimization and Management System.\n\n"
            "## Features\n"
            "- **Menu Engineering**: Analyze and optimize menu items\n"
            "- **Customer Flow Prediction**: Forecast customer traffic\n"
            "- **CRM & Segmentation**: Manage customer relationships\n"
            "- **Marketing Campaigns**: Automated promotional campaigns\n"
            "- **Reservations**: Table booking and management\n"
            "- **Staff Scheduling**: Prediction-based staff planning\n"
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure properly in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(menu.router, prefix="/api/v1/menu", tags=["Menu"])
    app.include_router(customers.router, prefix="/api/v1/customers", tags=["Customers"])
    app.include_router(reservations.router, prefix="/api/v1/reservations", tags=["Reservations"])
    app.include_router(marketing.router, prefix="/api/v1/marketing", tags=["Marketing"])
    app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])
    app.include_router(staff.router, prefix="/api/v1/staff", tags=["Staff"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])

    @app.get("/", tags=["Health"])
    async def root():
        """Root endpoint - API health check."""
        return {
            "name": "Risto AI",
            "version": "1.0.0",
            "status": "healthy",
            "docs": "/docs",
        }

    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok"}

    return app


# Application instance for ASGI servers
app = create_app()
