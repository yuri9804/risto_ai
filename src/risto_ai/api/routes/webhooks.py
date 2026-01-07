"""
Webhooks API Routes.

Endpoints for handling external webhooks (WhatsApp, etc.).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from risto_ai.config import get_settings
from risto_ai.database import get_sync_session
from risto_ai.integrations.whatsapp import WhatsAppClient, WhatsAppChatbot
from risto_ai.services.reservation import ReservationService, ReservationRequest, ReservationSource
from risto_ai.services.marketing import MarketingService

settings = get_settings()
router = APIRouter()


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    WhatsApp webhook verification endpoint.

    Used by Meta to verify the webhook URL during setup.
    """
    if hub_mode == "subscribe":
        if hub_verify_token == settings.whatsapp_verify_token:
            return int(hub_challenge) if hub_challenge else ""
        raise HTTPException(status_code=403, detail="Invalid verify token")

    raise HTTPException(status_code=400, detail="Invalid request")


@router.post("/whatsapp")
async def handle_whatsapp_webhook(
    request: Request,
    session: Session = Depends(get_sync_session),
):
    """
    Handle incoming WhatsApp webhooks.

    Processes:
    - Incoming messages (forwarded to chatbot)
    - Message status updates (delivery, read receipts)
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    client = WhatsAppClient()

    # Check for status updates
    status_updates = client.parse_status_update(payload)
    if status_updates:
        marketing_service = MarketingService(session)
        for message_id, status in status_updates:
            # Find delivery by external ID and update
            from sqlalchemy import select
            from risto_ai.database.models.marketing import CampaignDelivery

            delivery = session.scalar(
                select(CampaignDelivery).where(
                    CampaignDelivery.external_message_id == message_id
                )
            )
            if delivery:
                marketing_service.update_delivery_status(
                    delivery_id=delivery.id,
                    status=status,
                )

    # Check for incoming messages
    messages = client.parse_webhook(payload)

    if messages:
        # Create chatbot with reservation callback
        reservation_service = ReservationService(session)

        async def reservation_callback(
            customer_name: str,
            customer_phone: str,
            party_size: int,
            reservation_date,
            reservation_time,
            campaign_id: Optional[int] = None,
        ):
            req = ReservationRequest(
                customer_name=customer_name,
                customer_phone=customer_phone,
                party_size=party_size,
                reservation_date=reservation_date,
                reservation_time=reservation_time,
                source=ReservationSource.WHATSAPP,
                campaign_id=campaign_id,
            )
            return reservation_service.create_reservation(req)

        chatbot = WhatsAppChatbot(client, reservation_callback)

        for message in messages:
            # Mark as read
            await client.mark_as_read(message.message_id)

            # Generate response
            response = await chatbot.handle_message(message)

            # Send response
            await client.send_message(
                to_number=message.from_number,
                message=response,
            )

    return {"status": "ok"}


class ManualMessageRequest(BaseModel):
    """Request for sending a manual message."""
    to_number: str
    message: str


@router.post("/whatsapp/send")
async def send_whatsapp_message(
    request: ManualMessageRequest,
):
    """
    Send a manual WhatsApp message.

    For testing and manual communication.
    """
    client = WhatsAppClient()

    if not client.is_configured:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp not configured"
        )

    result = await client.send_message(
        to_number=request.to_number,
        message=request.message,
    )

    if result.success:
        return {
            "status": "sent",
            "message_id": result.message_id,
        }

    raise HTTPException(
        status_code=500,
        detail=f"Failed to send: {result.error}"
    )


@router.post("/whatsapp/process-pending")
async def process_pending_messages(
    limit: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_sync_session),
):
    """
    Process pending marketing campaign messages.

    Sends queued messages via WhatsApp.
    """
    client = WhatsAppClient()

    if not client.is_configured:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp not configured"
        )

    marketing_service = MarketingService(session)
    deliveries = marketing_service.get_pending_deliveries(limit)

    sent = 0
    failed = 0

    for delivery in deliveries:
        # Get customer phone
        from risto_ai.database.models.customer import Customer
        customer = session.get(Customer, delivery.customer_id)

        if not customer or not customer.whatsapp_number:
            marketing_service.update_delivery_status(
                delivery_id=delivery.id,
                status=DeliveryStatus.FAILED,
                error_message="No WhatsApp number",
            )
            failed += 1
            continue

        result = await client.send_message(
            to_number=customer.whatsapp_number,
            message=delivery.message_content,
        )

        from risto_ai.database.models.marketing import DeliveryStatus

        if result.success:
            marketing_service.update_delivery_status(
                delivery_id=delivery.id,
                status=DeliveryStatus.SENT,
                external_id=result.message_id,
            )
            sent += 1
        else:
            marketing_service.update_delivery_status(
                delivery_id=delivery.id,
                status=DeliveryStatus.FAILED,
                error_message=result.error,
            )
            failed += 1

    return {
        "processed": sent + failed,
        "sent": sent,
        "failed": failed,
    }
