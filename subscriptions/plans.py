"""Organizer subscription plan definitions."""

from decimal import Decimal

PLATFORM_MPESA_NUMBER = '0743042018'
PLATFORM_MPESA_DISPLAY_NAME = 'EventHub'

PLAN_CHOICES = (
    ('free', 'Free'),
    ('plus', 'Plus'),
    ('premium', 'Premium'),
)

PLANS = {
    'free': {
        'slug': 'free',
        'name': 'Free',
        'price_kes': Decimal('0'),
        'events_per_month': 1,
        'search_rank': 1,
        'description': 'Create 1 event per month. Standard search placement.',
    },
    'plus': {
        'slug': 'plus',
        'name': 'Plus',
        'price_kes': Decimal('500'),
        'events_per_month': 20,
        'search_rank': 2,
        'description': 'Create up to 20 events per month. Boosted search visibility.',
    },
    'premium': {
        'slug': 'premium',
        'name': 'Premium',
        'price_kes': Decimal('1000'),
        'events_per_month': 100,
        'search_rank': 3,
        'description': 'Create up to 100 events per month. Top search placement.',
    },
}

UPGRADABLE_PLANS = ('plus', 'premium')


def get_plan(slug):
    return PLANS.get(slug)


def plan_payment_options():
    return [{
        'type': 'send_money',
        'label': 'M-Pesa Send Money',
        'value': PLATFORM_MPESA_NUMBER,
        'instruction': f'Send the exact monthly amount to {PLATFORM_MPESA_NUMBER} ({PLATFORM_MPESA_DISPLAY_NAME}).',
    }]
