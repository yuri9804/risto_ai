"""
Main entry point for Risto AI.

Run with: uvicorn risto_ai.main:app --reload
"""

import uvicorn

from risto_ai.api.app import app
from risto_ai.config import get_settings


def main():
    """Run the application."""
    settings = get_settings()
    uvicorn.run(
        "risto_ai.api.app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_debug,
    )


if __name__ == "__main__":
    main()
