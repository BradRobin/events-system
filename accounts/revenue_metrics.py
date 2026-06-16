"""
EventHub platform revenue pipeline.

MRR  = platform fee revenue for the selected calendar month (EventHub take from ticket sales).
ARR  = MRR × 12 (annualized run rate from that month's platform revenue).

Gross revenue is summed from completed Ticket rows (valid + checked_in).
Platform revenue = gross × platform_fee_rate (from admin settings, default 5%).
"""

from calendar import monthrange
from datetime import datetime

from django.db.models import Sum, Count, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone

from bookings.models import Ticket
from accounts.admin_store import load_store


def get_platform_fee_rate():
    """Platform fee as a decimal fraction (e.g. 0.05 for 5%)."""
    store = load_store()
    settings = store.get('settings', {})
    pct = settings.get('platform_fee', 5)
    try:
        pct = float(pct)
    except (TypeError, ValueError):
        pct = 5.0
    return max(0.0, min(pct, 100.0)) / 100.0


def _ticket_revenue_qs():
    return Ticket.objects.exclude(status__in=['cancelled', 'refunded'])


def _gross_agg(qs):
    return qs.aggregate(
        gross=Sum(
            Coalesce('price', 0) * Coalesce('quantity', 1),
            output_field=DecimalField(),
        ),
        bookings=Count('id'),
        tickets=Sum(Coalesce('quantity', 1)),
    )


def _month_bounds(year, month):
    start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0))
    last_day = monthrange(year, month)[1]
    end = timezone.make_aware(datetime(year, month, last_day, 23, 59, 59, 999999))
    return start, end


def aggregate_month(year, month):
    """Aggregate gross and platform revenue for a single calendar month."""
    start, end = _month_bounds(year, month)
    qs = _ticket_revenue_qs().filter(purchase_date__gte=start, purchase_date__lte=end)
    agg = _gross_agg(qs)
    gross = float(agg['gross'] or 0)
    fee_rate = get_platform_fee_rate()
    platform = round(gross * fee_rate, 2)
    return {
        'year': year,
        'month': month,
        'label': start.strftime('%B %Y'),
        'gross_revenue': gross,
        'platform_revenue': platform,
        'mrr': platform,
        'arr': round(platform * 12, 2),
        'platform_fee_rate_pct': round(fee_rate * 100, 2),
        'booking_count': int(agg['bookings'] or 0),
        'ticket_count': int(agg['tickets'] or 0),
    }


def parse_month_param(month_str):
    """
    Parse YYYY-MM. Returns (year, month) for current month if missing/invalid.
    """
    now = timezone.now()
    if not month_str:
        return now.year, now.month
    try:
        parts = month_str.strip().split('-')
        year, month = int(parts[0]), int(parts[1])
        if month < 1 or month > 12:
            raise ValueError('invalid month')
        return year, month
    except (ValueError, IndexError):
        return now.year, now.month


def monthly_series(months=12, end_year=None, end_month=None):
    """Return monthly MRR/gross for the last N months ending at end_year/end_month."""
    now = timezone.now()
    end_year = end_year or now.year
    end_month = end_month or now.month

    results = []
    y, m = end_year, end_month
    for _ in range(months):
        results.append(aggregate_month(y, m))
        m -= 1
        if m < 1:
            m = 12
            y -= 1
    results.reverse()
    return results


def compute_revenue_metrics(month_str=None, include_series=True, series_months=12):
    """
    Full metrics payload for the admin bookings dashboard.
    """
    year, month = parse_month_param(month_str)
    current = aggregate_month(year, month)

    prev_m = month - 1
    prev_y = year
    if prev_m < 1:
        prev_m = 12
        prev_y -= 1
    previous = aggregate_month(prev_y, prev_m)

    prev_mrr = previous['mrr']
    cur_mrr = current['mrr']
    if prev_mrr > 0:
        growth = round(((cur_mrr - prev_mrr) / prev_mrr) * 100, 1)
    else:
        growth = 100.0 if cur_mrr > 0 else 0.0

    # Lifetime totals (all time)
    lifetime_agg = _gross_agg(_ticket_revenue_qs())
    lifetime_gross = float(lifetime_agg['gross'] or 0)
    fee_rate = get_platform_fee_rate()
    lifetime_platform = round(lifetime_gross * fee_rate, 2)

    payload = {
        'period': {
            'year': year,
            'month': month,
            'month_key': f'{year:04d}-{month:02d}',
            'label': current['label'],
        },
        'metrics': {
            'gross_revenue': current['gross_revenue'],
            'platform_revenue': current['platform_revenue'],
            'mrr': current['mrr'],
            'arr': current['arr'],
            'platform_fee_rate_pct': current['platform_fee_rate_pct'],
            'booking_count': current['booking_count'],
            'ticket_count': current['ticket_count'],
            'total_revenue_lifetime': lifetime_gross,
            'total_platform_revenue_lifetime': lifetime_platform,
        },
        'comparison': {
            'previous_month_label': previous['label'],
            'previous_mrr': prev_mrr,
            'mrr_growth_pct': growth,
            'previous_gross_revenue': previous['gross_revenue'],
        },
    }

    if include_series:
        payload['monthly_series'] = monthly_series(
            months=series_months,
            end_year=year,
            end_month=month,
        )

    return payload
