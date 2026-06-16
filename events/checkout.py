"""Attendee checkout eligibility for an event (not related to organizer subscription plans)."""

from django.utils import timezone


def organizer_display_name(organizer):
    return (
        organizer.mpesa_display_name
        or organizer.organization_name
        or organizer.get_full_name()
        or organizer.username
    )


def get_event_checkout_status(event, *, quantity=1):
    """
    Return (can_checkout, block_reason, block_code).
    Subscription plans only limit how many events an organizer can create — they do not gate ticket sales.
    """
    now = timezone.now()
    qty = max(1, int(quantity or 1))
    organizer = event.organizer

    if event.status != 'published':
        return False, 'This event is not published yet and cannot be purchased.', 'event_not_published'
    if event.end_date < now:
        return False, 'This event has already ended.', 'event_ended'
    if event.available_seats < qty:
        return False, 'Not enough tickets are available for this event.', 'insufficient_seats'
    if not organizer.has_mpesa_payment_config():
        name = organizer_display_name(organizer)
        return (
            False,
            f'{name} has not set up M-Pesa payment details yet. '
            'The organizer must add a paybill, till, or send-money number in Organizer Settings → Payment before checkout can continue.',
            'organizer_payment_not_configured',
        )
    return True, '', None


def normalize_ticket_type(ticket_type):
    """Map cart/front-end tier slugs to PaymentOrder ticket_type values."""
    key = (ticket_type or 'regular').strip().lower()
    mapping = {
        'regular': 'Regular',
        'standard': 'Regular',
        'general': 'Regular',
        'vip': 'VIP',
        'vvip': 'VVIP',
    }
    if key in mapping:
        return mapping[key]
    value = (ticket_type or 'Regular').strip()
    if value.upper() == 'VIP':
        return 'VIP'
    if value.upper() == 'VVIP':
        return 'VVIP'
    return 'Regular'
