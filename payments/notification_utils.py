"""Shared helpers for portal notification APIs."""

from math import ceil


def paginate_notifications(queryset, request, *, default_page_size=10, max_page_size=50):
    """Return (items, pagination_dict, unread_count)."""
    page = max(1, int(request.GET.get('page', 1) or 1))
    page_size = min(
        max_page_size,
        max(1, int(request.GET.get('page_size', default_page_size) or default_page_size)),
    )
    total = queryset.count()
    total_pages = max(1, ceil(total / page_size)) if total else 1
    start = (page - 1) * page_size
    items = list(queryset[start:start + page_size])
    unread_count = queryset.filter(is_read=False).count()
    pagination = {
        'page': page,
        'page_size': page_size,
        'count': total,
        'total_pages': total_pages,
        'current_page': page,
    }
    return items, pagination, unread_count


def serialize_attendee_notification(notification):
    return {
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'notification_type': notification.notification_type,
        'is_read': notification.is_read,
        'payment_order_id': notification.payment_order_id,
        'created_at': notification.created_at.isoformat(),
        'action_url': '/tickets/' if notification.payment_order_id else '/notifications/',
    }
