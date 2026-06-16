from datetime import timedelta

from django.utils import timezone

from events.models import Event

from .plans import PLANS, get_plan


def month_start(dt=None):
    dt = dt or timezone.now()
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_effective_plan(user):
    if not user or getattr(user, 'role', None) != 'organizer':
        return 'free'
    plan = getattr(user, 'subscription_plan', None) or 'free'
    if plan not in PLANS:
        plan = 'free'
    if plan in ('plus', 'premium'):
        expires = getattr(user, 'subscription_expires_at', None)
        if expires and expires < timezone.now():
            return 'free'
    return plan


def events_created_this_month(organizer):
    start = month_start()
    return Event.objects.filter(organizer=organizer, created_at__gte=start).count()


def get_subscription_usage(organizer):
    plan_slug = get_effective_plan(organizer)
    plan = get_plan(plan_slug) or get_plan('free')
    used = events_created_this_month(organizer)
    limit = plan['events_per_month']
    return {
        'plan': plan_slug,
        'plan_name': plan['name'],
        'events_used_this_month': used,
        'events_limit_per_month': limit,
        'events_remaining': max(0, limit - used),
        'search_rank': plan['search_rank'],
        'subscription_expires_at': (
            organizer.subscription_expires_at.isoformat()
            if getattr(organizer, 'subscription_expires_at', None) else None
        ),
    }


def can_create_event(organizer):
    usage = get_subscription_usage(organizer)
    if usage['events_used_this_month'] >= usage['events_limit_per_month']:
        if usage['plan'] == 'free':
            return False, (
                'Free plan allows 1 event per month. Upgrade to Plus or Premium to create more events.'
            ), 'upgrade_required'
        return False, (
            f"You've reached your {usage['plan_name']} plan limit of "
            f"{usage['events_limit_per_month']} events this month."
        ), 'limit_reached'
    return True, '', None


def activate_subscription(organizer, plan_slug, *, months=1):
    plan = get_plan(plan_slug)
    if not plan or plan_slug == 'free':
        raise ValueError('Invalid paid plan')

    now = timezone.now()
    base = organizer.subscription_expires_at if (
        organizer.subscription_expires_at and organizer.subscription_expires_at > now
    ) else now

    organizer.subscription_plan = plan_slug
    organizer.subscription_started_at = organizer.subscription_started_at or now
    organizer.subscription_expires_at = base + timedelta(days=30 * months)
    organizer.save(update_fields=[
        'subscription_plan',
        'subscription_started_at',
        'subscription_expires_at',
    ])
    return organizer


def search_rank_for_organizer(organizer):
    plan_slug = get_effective_plan(organizer)
    plan = get_plan(plan_slug) or get_plan('free')
    return plan['search_rank']
