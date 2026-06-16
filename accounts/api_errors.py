"""
User-facing API error responses.

Never expose raw exception strings (str(e)) to clients — log server-side only.
"""

import logging
import re
import traceback

from django.http import JsonResponse

logger = logging.getLogger(__name__)

_TECHNICAL_PATTERNS = [
    re.compile(r'missing\s+\d+\s+required positional argument', re.I),
    re.compile(r'takes\s+\d+\s+positional argument', re.I),
    re.compile(r'admin_required_json', re.I),
    re.compile(r'_wrapped\s*\(', re.I),
    re.compile(r'typeerror', re.I),
    re.compile(r'referenceerror', re.I),
    re.compile(r'traceback', re.I),
    re.compile(r'file\s+".+",\s+line\s+\d+', re.I),
    re.compile(r'object has no attribute', re.I),
]

DEFAULT_MESSAGE = 'Something went wrong on our end. Please try again in a moment.'

CONTEXT_MESSAGES = {
    'dashboard': 'The system was unable to load dashboard statistics. Please refresh and try again.',
    'pending_organizers': 'The system was unable to fetch pending organizers. Please try again.',
    'organizers': 'The system was unable to load organizer data. Please try again.',
    'events': 'The system was unable to load events. Please try again.',
    'bookings': 'The system was unable to load bookings. Please try again.',
    'tickets': 'The system was unable to load tickets. Please try again.',
    'payments': 'The system was unable to load payment records. Please try again.',
    'support': 'The system was unable to load support tickets. Please try again.',
    'notifications': 'The system was unable to load notifications. Please try again.',
    'users': 'The system was unable to load user records. Please try again.',
    'reports': 'The system was unable to generate this report. Please try again.',
    'profile': 'The system was unable to update your profile. Please try again.',
    'checkout': 'Checkout could not be completed. Please try again.',
    'generic': DEFAULT_MESSAGE,
}


def _is_admin_user(request):
    if request is None:
        return False
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    role = getattr(user, 'role', None)
    return bool(user.is_staff or user.is_superuser or role == 'admin')


def is_technical_message(text):
    if not text or not isinstance(text, str):
        return True
    trimmed = text.strip()
    if not trimmed or len(trimmed) > 220:
        return True
    return any(pattern.search(trimmed) for pattern in _TECHNICAL_PATTERNS)


def context_key_from_path(path):
    if not path:
        return None
    rules = (
        ('pending_organizers', '/organizers/pending'),
        ('organizers', '/organizers'),
        ('events', '/events'),
        ('bookings', '/bookings'),
        ('tickets', '/tickets'),
        ('payments', '/payments'),
        ('payments', '/payouts'),
        ('payments', '/transactions'),
        ('support', '/support'),
        ('notifications', '/notifications'),
        ('users', '/users'),
        ('reports', '/reports'),
        ('dashboard', '/dashboard'),
        ('profile', '/profile'),
        ('checkout', '/checkout'),
    )
    for key, fragment in rules:
        if fragment in path:
            return key
    return None


def friendly_message(context_key=None, fallback=None):
    if context_key and context_key in CONTEXT_MESSAGES:
        return CONTEXT_MESSAGES[context_key]
    return fallback or DEFAULT_MESSAGE


def safe_api_error_response(request, exception, *, context_key=None, status=500, message=None):
    """Return a JSON error response safe to display in the UI."""
    if isinstance(exception, BaseException):
        logger.error('API error [%s]: %s', context_key or 'generic', exception, exc_info=True)
    else:
        logger.error('API error [%s]: %s', context_key or 'generic', exception)

    if message is None and isinstance(exception, BaseException):
        raw = str(exception)
        if status < 500 and not is_technical_message(raw):
            message = raw

    if message is None and request is not None:
        context_key = context_key or context_key_from_path(getattr(request, 'path', ''))

    user_message = message or friendly_message(context_key)
    payload = {
        'success': False,
        'message': user_message,
        'error': user_message,
    }

    if _is_admin_user(request) and isinstance(exception, BaseException):
        payload['admin_details'] = traceback.format_exc()

    return JsonResponse(payload, status=status)
