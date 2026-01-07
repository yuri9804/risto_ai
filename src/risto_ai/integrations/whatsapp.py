"""
WhatsApp Business API Integration.

Provides:
- Message sending via WhatsApp Business API
- Webhook handling for incoming messages
- Chatbot for reservation management
- Message status tracking
"""

from dataclasses import dataclass
from datetime import datetime, date, time, timedelta
from enum import Enum
from typing import Optional, Callable
import logging
import re

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from risto_ai.config import get_settings
from risto_ai.database.models.marketing import DeliveryStatus

settings = get_settings()
logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """WhatsApp message types."""
    TEXT = "text"
    TEMPLATE = "template"
    INTERACTIVE = "interactive"
    IMAGE = "image"


@dataclass
class IncomingMessage:
    """Parsed incoming WhatsApp message."""
    message_id: str
    from_number: str
    timestamp: datetime
    message_type: MessageType
    text: Optional[str]
    button_response: Optional[str]
    context_message_id: Optional[str]


@dataclass
class SendResult:
    """Result of sending a WhatsApp message."""
    success: bool
    message_id: Optional[str]
    error: Optional[str]


class WhatsAppClient:
    """
    WhatsApp Business API client.

    Handles message sending and status updates via the Cloud API.
    """

    def __init__(self):
        self.api_url = settings.whatsapp_api_url
        self.phone_number_id = settings.whatsapp_phone_number_id
        self.access_token = settings.whatsapp_access_token

    @property
    def is_configured(self) -> bool:
        """Check if WhatsApp is properly configured."""
        return bool(
            self.phone_number_id and
            self.access_token
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def send_message(
        self,
        to_number: str,
        message: str,
        message_type: MessageType = MessageType.TEXT,
    ) -> SendResult:
        """
        Send a WhatsApp message.

        Args:
            to_number: Recipient phone number (with country code)
            message: Message content
            message_type: Type of message to send

        Returns:
            SendResult with success status and message ID
        """
        if not self.is_configured:
            logger.warning("WhatsApp not configured - message not sent")
            return SendResult(
                success=False,
                message_id=None,
                error="WhatsApp not configured",
            )

        # Normalize phone number
        to_number = self._normalize_phone(to_number)

        url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": message_type.value,
        }

        if message_type == MessageType.TEXT:
            payload["text"] = {"body": message}
        elif message_type == MessageType.TEMPLATE:
            # Template messages require different structure
            payload["template"] = message  # Expecting dict for templates

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()

                data = response.json()
                message_id = data.get("messages", [{}])[0].get("id")

                logger.info(f"Sent WhatsApp message to {to_number}, ID: {message_id}")

                return SendResult(
                    success=True,
                    message_id=message_id,
                    error=None,
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error: {e.response.status_code}"
            logger.error(f"Failed to send WhatsApp message: {error_msg}")
            return SendResult(success=False, message_id=None, error=error_msg)

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return SendResult(success=False, message_id=None, error=str(e))

    async def send_interactive_buttons(
        self,
        to_number: str,
        body_text: str,
        buttons: list[dict],
        header: Optional[str] = None,
        footer: Optional[str] = None,
    ) -> SendResult:
        """
        Send an interactive message with buttons.

        Args:
            to_number: Recipient phone number
            body_text: Main message body
            buttons: List of button definitions [{"id": "btn_1", "title": "Button 1"}]
            header: Optional header text
            footer: Optional footer text

        Returns:
            SendResult
        """
        if not self.is_configured:
            return SendResult(success=False, message_id=None, error="Not configured")

        to_number = self._normalize_phone(to_number)

        url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        interactive = {
            "type": "button",
            "body": {"text": body_text},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": btn}
                    for btn in buttons[:3]  # Max 3 buttons
                ]
            },
        }

        if header:
            interactive["header"] = {"type": "text", "text": header}
        if footer:
            interactive["footer"] = {"text": footer}

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "interactive",
            "interactive": interactive,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()

                data = response.json()
                message_id = data.get("messages", [{}])[0].get("id")

                return SendResult(success=True, message_id=message_id, error=None)

        except Exception as e:
            logger.error(f"Failed to send interactive message: {str(e)}")
            return SendResult(success=False, message_id=None, error=str(e))

    async def mark_as_read(self, message_id: str) -> bool:
        """Mark a message as read."""
        if not self.is_configured:
            return False

        url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                return response.is_success

        except Exception as e:
            logger.error(f"Failed to mark message as read: {str(e)}")
            return False

    def parse_webhook(self, payload: dict) -> list[IncomingMessage]:
        """
        Parse incoming webhook payload from WhatsApp.

        Args:
            payload: Webhook JSON payload

        Returns:
            List of parsed incoming messages
        """
        messages = []

        try:
            entries = payload.get("entry", [])
            for entry in entries:
                changes = entry.get("changes", [])
                for change in changes:
                    value = change.get("value", {})
                    incoming_messages = value.get("messages", [])

                    for msg in incoming_messages:
                        message = self._parse_message(msg)
                        if message:
                            messages.append(message)

        except Exception as e:
            logger.error(f"Error parsing webhook: {str(e)}")

        return messages

    def parse_status_update(self, payload: dict) -> list[tuple[str, DeliveryStatus]]:
        """
        Parse status updates from webhook.

        Args:
            payload: Webhook JSON payload

        Returns:
            List of (message_id, status) tuples
        """
        updates = []

        try:
            entries = payload.get("entry", [])
            for entry in entries:
                changes = entry.get("changes", [])
                for change in changes:
                    value = change.get("value", {})
                    statuses = value.get("statuses", [])

                    for status in statuses:
                        msg_id = status.get("id")
                        status_value = status.get("status")

                        if msg_id and status_value:
                            delivery_status = self._map_status(status_value)
                            updates.append((msg_id, delivery_status))

        except Exception as e:
            logger.error(f"Error parsing status update: {str(e)}")

        return updates

    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to international format."""
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)

        # Add Italian country code if not present
        if not digits.startswith('39') and len(digits) == 10:
            digits = '39' + digits

        return digits

    def _parse_message(self, msg: dict) -> Optional[IncomingMessage]:
        """Parse a single message from webhook."""
        try:
            msg_type = msg.get("type")
            text = None
            button_response = None

            if msg_type == "text":
                text = msg.get("text", {}).get("body")
            elif msg_type == "interactive":
                interactive = msg.get("interactive", {})
                button_reply = interactive.get("button_reply", {})
                button_response = button_reply.get("id")
                text = button_reply.get("title")
            elif msg_type == "button":
                text = msg.get("button", {}).get("text")

            return IncomingMessage(
                message_id=msg.get("id"),
                from_number=msg.get("from"),
                timestamp=datetime.fromtimestamp(int(msg.get("timestamp", 0))),
                message_type=MessageType(msg_type) if msg_type in ["text", "interactive"] else MessageType.TEXT,
                text=text,
                button_response=button_response,
                context_message_id=msg.get("context", {}).get("id"),
            )

        except Exception as e:
            logger.error(f"Error parsing message: {str(e)}")
            return None

    def _map_status(self, status: str) -> DeliveryStatus:
        """Map WhatsApp status to DeliveryStatus."""
        mapping = {
            "sent": DeliveryStatus.SENT,
            "delivered": DeliveryStatus.DELIVERED,
            "read": DeliveryStatus.READ,
            "failed": DeliveryStatus.FAILED,
        }
        return mapping.get(status, DeliveryStatus.PENDING)


class ConversationState(str, Enum):
    """States for the reservation chatbot."""
    IDLE = "idle"
    AWAITING_DATE = "awaiting_date"
    AWAITING_TIME = "awaiting_time"
    AWAITING_GUESTS = "awaiting_guests"
    AWAITING_NAME = "awaiting_name"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    COMPLETED = "completed"


@dataclass
class ConversationContext:
    """Context for an ongoing conversation."""
    phone_number: str
    state: ConversationState
    reservation_date: Optional[date] = None
    reservation_time: Optional[time] = None
    party_size: Optional[int] = None
    customer_name: Optional[str] = None
    last_interaction: datetime = None
    campaign_id: Optional[int] = None


class WhatsAppChatbot:
    """
    Chatbot for handling reservation conversations via WhatsApp.

    Manages multi-turn conversations for booking tables.
    """

    # Conversation timeout (minutes)
    TIMEOUT_MINUTES = 30

    def __init__(
        self,
        whatsapp_client: WhatsAppClient,
        reservation_callback: Callable,
    ):
        self.client = whatsapp_client
        self.reservation_callback = reservation_callback
        self.conversations: dict[str, ConversationContext] = {}

    async def handle_message(self, message: IncomingMessage) -> str:
        """
        Handle an incoming message and generate response.

        Args:
            message: Parsed incoming message

        Returns:
            Response message to send
        """
        phone = message.from_number
        text = message.text or ""

        # Get or create conversation context
        ctx = self._get_context(phone)

        # Handle based on state
        if ctx.state == ConversationState.IDLE:
            return await self._handle_initial(ctx, text)

        elif ctx.state == ConversationState.AWAITING_DATE:
            return await self._handle_date_input(ctx, text)

        elif ctx.state == ConversationState.AWAITING_TIME:
            return await self._handle_time_input(ctx, text)

        elif ctx.state == ConversationState.AWAITING_GUESTS:
            return await self._handle_guests_input(ctx, text)

        elif ctx.state == ConversationState.AWAITING_NAME:
            return await self._handle_name_input(ctx, text)

        elif ctx.state == ConversationState.AWAITING_CONFIRMATION:
            return await self._handle_confirmation(ctx, text, message.button_response)

        else:
            # Reset on unknown state
            self._reset_context(phone)
            return await self._handle_initial(ctx, text)

    async def _handle_initial(self, ctx: ConversationContext, text: str) -> str:
        """Handle initial message - detect intent."""
        text_lower = text.lower()

        # Detect reservation intent
        reservation_keywords = [
            "prenota", "prenotare", "tavolo", "reservation",
            "book", "posto", "cena", "pranzo", "disponibilità",
        ]

        if any(kw in text_lower for kw in reservation_keywords):
            ctx.state = ConversationState.AWAITING_DATE
            self._save_context(ctx)

            return (
                "Perfetto! Sarò felice di aiutarti con la prenotazione. 📅\n\n"
                "Per quale data vorresti prenotare?\n"
                "(Es: domani, venerdì, 15 gennaio)"
            )

        # Default welcome
        return (
            "Ciao! 👋 Sono l'assistente del ristorante.\n\n"
            "Posso aiutarti a:\n"
            "• Prenotare un tavolo\n"
            "• Verificare una prenotazione\n"
            "• Modificare o cancellare una prenotazione\n\n"
            "Come posso aiutarti?"
        )

    async def _handle_date_input(self, ctx: ConversationContext, text: str) -> str:
        """Parse and validate date input."""
        parsed_date = self._parse_date(text)

        if not parsed_date:
            return (
                "Non ho capito la data. 🤔\n"
                "Puoi indicarmela in uno di questi formati?\n"
                "• domani\n"
                "• venerdì\n"
                "• 15 gennaio\n"
                "• 15/01/2024"
            )

        if parsed_date < date.today():
            return "Questa data è nel passato. Per favore, indica una data futura."

        if parsed_date > date.today() + timedelta(days=60):
            return "Posso accettare prenotazioni fino a 60 giorni in anticipo."

        ctx.reservation_date = parsed_date
        ctx.state = ConversationState.AWAITING_TIME
        self._save_context(ctx)

        day_name = self._format_date_italian(parsed_date)
        return (
            f"Ottimo! {day_name}. ⏰\n\n"
            "A che ora vorresti venire?\n"
            "(Es: 20:00, 13:30)"
        )

    async def _handle_time_input(self, ctx: ConversationContext, text: str) -> str:
        """Parse and validate time input."""
        parsed_time = self._parse_time(text)

        if not parsed_time:
            return (
                "Non ho capito l'orario. 🤔\n"
                "Puoi indicarlo così?\n"
                "• 20:00\n"
                "• 13:30\n"
                "• 8 sera\n"
                "• 1 e mezza"
            )

        # Validate opening hours
        lunch = time(12, 0) <= parsed_time <= time(15, 0)
        dinner = time(19, 0) <= parsed_time <= time(23, 0)

        if not (lunch or dinner):
            return (
                "Siamo aperti:\n"
                "🍽️ Pranzo: 12:00 - 15:00\n"
                "🌙 Cena: 19:00 - 23:00\n\n"
                "Indica un orario in questi intervalli."
            )

        ctx.reservation_time = parsed_time
        ctx.state = ConversationState.AWAITING_GUESTS
        self._save_context(ctx)

        return (
            f"Perfetto, alle {parsed_time.strftime('%H:%M')}. 👥\n\n"
            "Per quante persone?"
        )

    async def _handle_guests_input(self, ctx: ConversationContext, text: str) -> str:
        """Parse and validate number of guests."""
        # Extract number from text
        numbers = re.findall(r'\d+', text)
        if not numbers:
            return "Per quante persone devo prenotare? (Es: 2, 4, 6)"

        guests = int(numbers[0])

        if guests < 1:
            return "Indica almeno 1 persona."

        if guests > 20:
            return (
                "Per gruppi di più di 20 persone, "
                "ti prego di chiamarci al numero XXX-XXXXXXX."
            )

        ctx.party_size = guests
        ctx.state = ConversationState.AWAITING_NAME
        self._save_context(ctx)

        return f"Perfetto, {guests} persone. 📝\n\nA che nome devo fare la prenotazione?"

    async def _handle_name_input(self, ctx: ConversationContext, text: str) -> str:
        """Handle customer name input."""
        name = text.strip()

        if len(name) < 2:
            return "Per favore, indica il nome per la prenotazione."

        ctx.customer_name = name.title()
        ctx.state = ConversationState.AWAITING_CONFIRMATION
        self._save_context(ctx)

        # Format summary
        day_name = self._format_date_italian(ctx.reservation_date)
        summary = (
            f"📋 Riepilogo prenotazione:\n\n"
            f"👤 Nome: {ctx.customer_name}\n"
            f"📅 Data: {day_name}\n"
            f"⏰ Ora: {ctx.reservation_time.strftime('%H:%M')}\n"
            f"👥 Persone: {ctx.party_size}\n\n"
            "Confermi la prenotazione?"
        )

        return summary

    async def _handle_confirmation(
        self,
        ctx: ConversationContext,
        text: str,
        button_response: Optional[str],
    ) -> str:
        """Handle confirmation response."""
        text_lower = text.lower()
        confirmed = (
            button_response == "confirm" or
            any(kw in text_lower for kw in ["sì", "si", "confermo", "ok", "yes", "va bene"])
        )

        if not confirmed:
            if any(kw in text_lower for kw in ["no", "annulla", "cancel"]):
                self._reset_context(ctx.phone_number)
                return (
                    "Prenotazione annullata. 👋\n\n"
                    "Se hai bisogno di altro, sono qui!"
                )
            else:
                return "Confermi la prenotazione? Rispondi Sì o No."

        # Create reservation via callback
        try:
            result = await self.reservation_callback(
                customer_name=ctx.customer_name,
                customer_phone=ctx.phone_number,
                party_size=ctx.party_size,
                reservation_date=ctx.reservation_date,
                reservation_time=ctx.reservation_time,
                campaign_id=ctx.campaign_id,
            )

            self._reset_context(ctx.phone_number)

            if result.success:
                return (
                    "✅ Prenotazione confermata!\n\n"
                    f"📌 Codice: {result.confirmation_code}\n\n"
                    "Ti aspettiamo! 🍽️\n"
                    "Riceverai un promemoria il giorno prima."
                )
            else:
                alternatives = result.suggested_alternatives[:3]
                if alternatives:
                    alt_text = "\n".join([
                        f"• {s.time.strftime('%H:%M')}"
                        for s in alternatives
                    ])
                    return (
                        "😔 Spiacente, l'orario non è disponibile.\n\n"
                        "Orari alternativi:\n"
                        f"{alt_text}\n\n"
                        "Vuoi prenotare per uno di questi orari?"
                    )
                else:
                    return (
                        "😔 Spiacente, non ci sono disponibilità "
                        "per questa data.\n"
                        "Prova con un'altra data."
                    )

        except Exception as e:
            logger.error(f"Reservation callback error: {str(e)}")
            return (
                "Si è verificato un errore. 😔\n"
                "Ti prego di chiamarci per prenotare."
            )

    def _get_context(self, phone: str) -> ConversationContext:
        """Get or create conversation context."""
        if phone in self.conversations:
            ctx = self.conversations[phone]
            # Check timeout
            if ctx.last_interaction:
                elapsed = datetime.utcnow() - ctx.last_interaction
                if elapsed > timedelta(minutes=self.TIMEOUT_MINUTES):
                    self._reset_context(phone)
                    return self._get_context(phone)
            return ctx

        ctx = ConversationContext(
            phone_number=phone,
            state=ConversationState.IDLE,
            last_interaction=datetime.utcnow(),
        )
        self.conversations[phone] = ctx
        return ctx

    def _save_context(self, ctx: ConversationContext) -> None:
        """Save conversation context."""
        ctx.last_interaction = datetime.utcnow()
        self.conversations[ctx.phone_number] = ctx

    def _reset_context(self, phone: str) -> None:
        """Reset conversation context."""
        if phone in self.conversations:
            del self.conversations[phone]

    def _parse_date(self, text: str) -> Optional[date]:
        """Parse date from natural language."""
        text_lower = text.lower().strip()
        today = date.today()

        # Relative dates
        if text_lower in ["oggi", "today"]:
            return today
        if text_lower in ["domani", "tomorrow"]:
            return today + timedelta(days=1)
        if text_lower == "dopodomani":
            return today + timedelta(days=2)

        # Day names
        days_it = {
            "lunedì": 0, "lunedi": 0,
            "martedì": 1, "martedi": 1,
            "mercoledì": 2, "mercoledi": 2,
            "giovedì": 3, "giovedi": 3,
            "venerdì": 4, "venerdi": 4,
            "sabato": 5,
            "domenica": 6,
        }

        for day_name, day_num in days_it.items():
            if day_name in text_lower:
                days_ahead = day_num - today.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                return today + timedelta(days=days_ahead)

        # Explicit date formats
        date_patterns = [
            r'(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?',  # DD/MM or DD/MM/YYYY
            r'(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|'
            r'luglio|agosto|settembre|ottobre|novembre|dicembre)',
        ]

        months_it = {
            "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4,
            "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8,
            "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12,
        }

        # Try DD/MM format
        match = re.search(date_patterns[0], text_lower)
        if match:
            day = int(match.group(1))
            month = int(match.group(2))
            year = int(match.group(3)) if match.group(3) else today.year
            if year < 100:
                year += 2000
            try:
                return date(year, month, day)
            except ValueError:
                pass

        # Try "15 gennaio" format
        match = re.search(date_patterns[1], text_lower)
        if match:
            day = int(match.group(1))
            month = months_it.get(match.group(2), 0)
            if month:
                try:
                    result = date(today.year, month, day)
                    if result < today:
                        result = date(today.year + 1, month, day)
                    return result
                except ValueError:
                    pass

        return None

    def _parse_time(self, text: str) -> Optional[time]:
        """Parse time from natural language."""
        text_lower = text.lower().strip()

        # Standard format HH:MM
        match = re.search(r'(\d{1,2})[:\.](\d{2})', text)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2))

            # Adjust for evening if ambiguous
            if hour < 12 and ("sera" in text_lower or "cena" in text_lower):
                hour += 12

            if 0 <= hour < 24 and 0 <= minute < 60:
                return time(hour, minute)

        # Just hour
        match = re.search(r'(\d{1,2})\s*(e\s*mezza|e\s*30)?', text)
        if match:
            hour = int(match.group(1))
            minute = 30 if match.group(2) else 0

            # Context clues for AM/PM
            if hour < 12:
                if any(kw in text_lower for kw in ["sera", "cena", "pomeriggio"]):
                    hour += 12
                elif hour < 6:
                    hour += 12  # Assume PM for small hours

            if 0 <= hour < 24:
                return time(hour, minute)

        return None

    def _format_date_italian(self, d: date) -> str:
        """Format date in Italian."""
        days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì",
                "Venerdì", "Sabato", "Domenica"]
        months = ["", "gennaio", "febbraio", "marzo", "aprile",
                  "maggio", "giugno", "luglio", "agosto",
                  "settembre", "ottobre", "novembre", "dicembre"]

        return f"{days[d.weekday()]} {d.day} {months[d.month]}"
