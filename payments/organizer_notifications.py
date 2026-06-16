"""Helpers for creating in-app organizer notifications."""

from .models import OrganizerNotification


def create_organizer_notification(
    *,
    organizer,
    title,
    message,
    notification_type='info',
    requires_action=False,
    action_type='',
    action_url='',
    payment_order=None,
):
    return OrganizerNotification.objects.create(
        organizer=organizer,
        payment_order=payment_order,
        title=title,
        message=message,
        notification_type=notification_type,
        requires_action=requires_action,
        action_type=action_type,
        action_url=action_url,
    )


def notify_organizer_event_approved(event):
    """Notify organizer when an admin approves/publishes their event."""
    return create_organizer_notification(
        organizer=event.organizer,
        title='Event approved',
        message=(
            f'Your event "{event.title}" has been approved by the admin team '
            f'and is now published on EventHub.'
        ),
        notification_type='success',
        action_type='event_approved',
        action_url=f'/organizer/events/?edit={event.id}',
    )


def notify_organizer_event_rejected(event, reason=''):
    """Notify organizer when an admin rejects or revokes approval."""
    detail = f' Reason: {reason}' if reason else ''
    return create_organizer_notification(
        organizer=event.organizer,
        title='Event needs changes',
        message=(
            f'Your event "{event.title}" was returned for revisions.{detail} '
            f'Update the event and submit it again when ready.'
        ),
        notification_type='warning',
        action_type='event_rejected',
        action_url=f'/organizer/events/?edit={event.id}',
    )


def notify_organizer_event_review(review):
    """Notify organizer when an attendee leaves a review for their event."""
    event = review.event
    attendee_name = (
        getattr(review.user, 'full_name', None)
        or review.user.get_full_name()
        or review.user.username
    )
    stars = '★' * review.rating
    excerpt = (review.comment or '').strip()
    if len(excerpt) > 120:
        excerpt = excerpt[:117] + '...'
    detail = f' "{excerpt}"' if excerpt else ''
    return create_organizer_notification(
        organizer=event.organizer,
        title='New event review',
        message=(
            f'{attendee_name} rated "{event.title}" {stars} ({review.rating}/5).{detail}'
        ),
        notification_type='info',
        action_type='event_review',
        action_url='/organizer/reviews/',
    )
