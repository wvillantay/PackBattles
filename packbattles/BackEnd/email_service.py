import logging
import os

logger = logging.getLogger(__name__)


def _is_enabled():
    return os.getenv("EMAIL_ENABLED", "false").strip().lower() == "true"


def _send(to_email, subject, body):
    """Send a plain-text email via Resend. Never raises — errors are logged only."""
    if not _is_enabled():
        return

    api_key   = os.getenv("RESEND_API_KEY", "").strip()
    from_addr = os.getenv("EMAIL_FROM", "").strip()

    if not api_key or not from_addr:
        logger.warning("Email skipped: RESEND_API_KEY or EMAIL_FROM not configured.")
        return

    if not to_email:
        logger.warning("Email skipped: recipient address is empty.")
        return

    try:
        import resend  # lazy import — package may not be installed when EMAIL_ENABLED=false
        resend.api_key = api_key
        resend.Emails.send({
            "from":    from_addr,
            "to":      [to_email],
            "subject": subject,
            "text":    body,
        })
    except Exception as exc:
        logger.error("Email send failed (to=%s subject=%r): %s", to_email, subject, exc)


# ---------------------------------------------------------------------------
# Public send functions — one per shipment event
# ---------------------------------------------------------------------------

def send_ship_request_submitted(user_email, user_name, card_name):
    subject = f"Your shipment request for {card_name} has been received"
    body = (
        f"Hi {user_name},\n\n"
        f"We've received your shipment request for your {card_name} card. "
        f"Our team will review it shortly.\n\n"
        f"You can check the status anytime in your Profile under Shipments.\n\n"
        f"— Pack Battles"
    )
    _send(user_email, subject, body)


def send_ship_request_shipped(user_email, user_name, card_name,
                               tracking_number=None, carrier=None):
    subject = f"{card_name} has been shipped!"

    if carrier or tracking_number:
        tracking_lines = "\n".join(filter(None, [
            f"Carrier: {carrier}"          if carrier          else "",
            f"Tracking: {tracking_number}" if tracking_number  else "",
        ]))
    else:
        tracking_lines = "Tracking information will be added soon."

    body = (
        f"Hi {user_name},\n\n"
        f"Great news — your {card_name} card is on its way!\n\n"
        f"{tracking_lines}\n\n"
        f"Check your Profile under Shipments for updates.\n\n"
        f"— Pack Battles"
    )
    _send(user_email, subject, body)


def send_ship_request_rejected(user_email, user_name, card_name, admin_note=None):
    subject = f"Update on your shipment request for {card_name}"
    note_line = f"Reason: {admin_note}\n\n" if admin_note else ""
    body = (
        f"Hi {user_name},\n\n"
        f"Unfortunately, we were unable to fulfill your shipment request for "
        f"{card_name} at this time.\n\n"
        f"{note_line}"
        f"Your card remains in your inventory. "
        f"If you believe this was an error, please contact support.\n\n"
        f"— Pack Battles"
    )
    _send(user_email, subject, body)


def send_tracking_updated(user_email, user_name, card_name,
                           tracking_number=None, carrier=None):
    subject = f"Tracking info added for your {card_name} shipment"
    tracking_lines = "\n".join(filter(None, [
        f"Carrier: {carrier}"                 if carrier          else "",
        f"Tracking number: {tracking_number}" if tracking_number  else "",
    ]))
    body = (
        f"Hi {user_name},\n\n"
        f"Tracking information has been added to your {card_name} shipment.\n\n"
        f"{tracking_lines}\n\n"
        f"Check your Profile under Shipments for the latest status.\n\n"
        f"— Pack Battles"
    )
    _send(user_email, subject, body)
