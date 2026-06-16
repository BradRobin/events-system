"""Real-time user presence tracking for admin online-user metrics."""

import random
from datetime import timedelta

from django.utils import timezone

from accounts.models import UserPresence

# A user is considered online if they sent a heartbeat within this window.
ONLINE_WINDOW_MINUTES = 5


def online_threshold():
    return timezone.now() - timedelta(minutes=ONLINE_WINDOW_MINUTES)


def touch_presence(session_id, user=None, path=''):
    """Record or refresh a browser session heartbeat."""
    now = timezone.now()
    defaults = {
        'last_seen': now,
        'path': (path or '')[:500],
    }
    if user:
        defaults['user'] = user
        defaults['role'] = user.role or ''

    presence, _created = UserPresence.objects.update_or_create(
        session_id=session_id,
        defaults=defaults,
    )

    if random.random() < 0.02:
        prune_stale_presence(days=7)

    return presence


def prune_stale_presence(days=7):
    cutoff = timezone.now() - timedelta(days=days)
    UserPresence.objects.filter(last_seen__lt=cutoff).delete()


def get_online_user_ids(window_minutes=ONLINE_WINDOW_MINUTES):
    threshold = timezone.now() - timedelta(minutes=window_minutes)
    return set(
        UserPresence.objects.filter(
            user__isnull=False,
            user__is_active=True,
            last_seen__gte=threshold,
        ).values_list('user_id', flat=True).distinct()
    )


def count_online_users(window_minutes=ONLINE_WINDOW_MINUTES):
    return len(get_online_user_ids(window_minutes))


def count_online_sessions(window_minutes=ONLINE_WINDOW_MINUTES):
    """All active browser sessions (including anonymous visitors)."""
    threshold = timezone.now() - timedelta(minutes=window_minutes)
    return UserPresence.objects.filter(last_seen__gte=threshold).count()
