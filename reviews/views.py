import json

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from bookings.models import Ticket
from bookings.views import get_authenticated_attendee
from events.models import Event
from payments.organizer_notifications import notify_organizer_event_review

from .models import EventReview, CustomerStory


def _review_payload(review):
    return {
        'id': review.id,
        'event_id': review.event_id,
        'event_title': review.event.title,
        'rating': review.rating,
        'comment': review.comment,
        'created_at': review.created_at.isoformat(),
        'updated_at': review.updated_at.isoformat(),
    }


def _user_can_review_event(user, event):
    """Attendee may review only past events they attended (valid ticket)."""
    if event.end_date >= timezone.now():
        return False, 'You can only review events that have ended.', None
    ticket = Ticket.objects.filter(
        attendee=user,
        event=event,
        status__in=['valid', 'checked_in'],
    ).order_by('-purchase_date').first()
    if not ticket:
        return False, 'You need a ticket for this event to leave a review.', None
    return True, None, ticket


@csrf_exempt
@require_http_methods(['GET'])
def api_my_reviews(request):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login.'}, status=401)

    reviews = EventReview.objects.filter(user=user).select_related('event')
    results = [_review_payload(r) for r in reviews]
    return JsonResponse({'success': True, 'results': results, 'count': len(results)})


@csrf_exempt
@require_http_methods(['GET'])
def api_event_reviews(request, event_id):
    reviews = EventReview.objects.filter(event_id=event_id).select_related('user', 'event')
    results = []
    for review in reviews:
        name = (
            getattr(review.user, 'full_name', None)
            or review.user.get_full_name()
            or review.user.username
        )
        results.append({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat(),
            'user_name': name,
        })
    avg = 0
    if results:
        avg = sum(r['rating'] for r in results) / len(results)
    return JsonResponse({
        'success': True,
        'results': results,
        'count': len(results),
        'average_rating': round(avg, 1),
    })


@csrf_exempt
@require_http_methods(['POST'])
def api_create_review(request, event_id):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login.'}, status=401)

    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Event not found.'}, status=404)

    allowed, reason, ticket = _user_can_review_event(user, event)
    if not allowed:
        return JsonResponse({'success': False, 'message': reason}, status=403)

    if EventReview.objects.filter(user=user, event=event).exists():
        return JsonResponse({'success': False, 'message': 'You already reviewed this event.'}, status=400)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    rating = data.get('rating')
    comment = (data.get('comment') or '').strip()

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'message': 'Rating must be between 1 and 5.'}, status=400)

    if rating < 1 or rating > 5:
        return JsonResponse({'success': False, 'message': 'Rating must be between 1 and 5.'}, status=400)

    review = EventReview.objects.create(
        user=user,
        event=event,
        ticket=ticket,
        rating=rating,
        comment=comment,
    )
    notify_organizer_event_review(review)
    return JsonResponse({'success': True, 'review': _review_payload(review)}, status=201)


@csrf_exempt
@require_http_methods(['PUT', 'PATCH'])
def api_update_review(request, review_id):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login.'}, status=401)

    try:
        review = EventReview.objects.select_related('event').get(pk=review_id, user=user)
    except EventReview.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Review not found.'}, status=404)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    if 'rating' in data:
        try:
            rating = int(data['rating'])
        except (TypeError, ValueError):
            return JsonResponse({'success': False, 'message': 'Rating must be between 1 and 5.'}, status=400)
        if rating < 1 or rating > 5:
            return JsonResponse({'success': False, 'message': 'Rating must be between 1 and 5.'}, status=400)
        review.rating = rating

    if 'comment' in data:
        review.comment = (data['comment'] or '').strip()

    review.save()
    return JsonResponse({'success': True, 'review': _review_payload(review)})


@csrf_exempt
@require_http_methods(['DELETE'])
def api_delete_review(request, review_id):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login.'}, status=401)

    deleted, _ = EventReview.objects.filter(pk=review_id, user=user).delete()
    if not deleted:
        return JsonResponse({'success': False, 'message': 'Review not found.'}, status=404)
    return JsonResponse({'success': True})


@require_http_methods(['GET'])
def api_public_reviews(request):
    """Public aggregate and recent reviews for marketing pages."""
    from django.db.models import Avg, Count

    agg = EventReview.objects.aggregate(avg=Avg('rating'), count=Count('id'))
    reviews = EventReview.objects.select_related('user', 'event').order_by('-created_at')[:24]

    results = []
    for review in reviews:
        name = (
            getattr(review.user, 'full_name', None)
            or review.user.get_full_name()
            or review.user.username
        )
        parts = [p for p in name.split() if p]
        initials = ''.join(p[0].upper() for p in parts[:2]) or 'U'
        results.append({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'event_title': review.event.title,
            'user_name': name,
            'initials': initials,
            'created_at': review.created_at,
        })

    avg = agg['avg']
    return JsonResponse({
        'success': True,
        'count': agg['count'] or 0,
        'average_rating': round(float(avg), 1) if avg is not None else 0,
        'results': [
            {
                **{k: v for k, v in item.items() if k != 'created_at'},
                'created_at': item['created_at'].isoformat(),
            }
            for item in results
        ],
    })


def reviews_page_view(request):
    """Attendee reviews page with live database aggregates."""
    from django.db.models import Avg, Count

    agg = EventReview.objects.aggregate(avg=Avg('rating'), count=Count('id'))
    reviews = EventReview.objects.select_related('user', 'event').order_by('-created_at')[:24]

    review_items = []
    for review in reviews:
        name = (
            getattr(review.user, 'full_name', None)
            or review.user.get_full_name()
            or review.user.username
        )
        parts = [p for p in name.split() if p]
        initials = ''.join(p[0].upper() for p in parts[:2]) or 'U'
        review_items.append({
            'rating': review.rating,
            'comment': review.comment,
            'event_title': review.event.title,
            'user_name': name,
            'initials': initials,
            'created_at': review.created_at,
        })

    avg = agg['avg']
    context = {
        'review_count': agg['count'] or 0,
        'average_rating': round(float(avg), 1) if avg is not None else 0,
        'reviews': review_items,
    }
    return render(request, 'attendee/pages/reviews.html', context)


def _customer_story_payload(story):
    user = story.user
    avatar = None
    if hasattr(user, 'get_avatar_url'):
        try:
            avatar = user.get_avatar_url()
        except Exception:
            avatar = None
    return {
        'id': story.id,
        'name': story.display_name,
        'email': user.email,
        'role': 'Event Enthusiast',
        'rating': story.rating,
        'message': story.message,
        'event': story.event_name,
        'avatar': avatar,
        'isDefault': False,
        'created_at': story.created_at.isoformat(),
    }


@csrf_exempt
@require_http_methods(['GET'])
def api_customer_stories_list(request):
    """Public list of user-submitted customer stories."""
    stories = CustomerStory.objects.filter(is_published=True).select_related('user')
    results = [_customer_story_payload(s) for s in stories]
    return JsonResponse({'success': True, 'stories': results, 'count': len(results)})


@csrf_exempt
@require_http_methods(['GET'])
def api_my_customer_story(request):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login to share your story.'}, status=401)

    try:
        story = CustomerStory.objects.select_related('user').get(user=user)
    except CustomerStory.DoesNotExist:
        return JsonResponse({'success': True, 'story': None})

    return JsonResponse({'success': True, 'story': _customer_story_payload(story)})


@csrf_exempt
@require_http_methods(['POST'])
def api_create_customer_story(request):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login to share your story.'}, status=401)

    if CustomerStory.objects.filter(user=user).exists():
        return JsonResponse({
            'success': False,
            'message': 'You have already shared a story. Delete it first to submit a new one.',
        }, status=400)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    display_name = (data.get('name') or '').strip()
    message = (data.get('message') or '').strip()
    event_name = (data.get('event') or data.get('event_name') or '').strip()
    rating = data.get('rating')

    if not display_name:
        return JsonResponse({'success': False, 'message': 'Please enter your name.'}, status=400)
    if not message or len(message) < 10:
        return JsonResponse({'success': False, 'message': 'Your story must be at least 10 characters.'}, status=400)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'message': 'Please select a rating between 1 and 5.'}, status=400)

    if rating < 1 or rating > 5:
        return JsonResponse({'success': False, 'message': 'Please select a rating between 1 and 5.'}, status=400)

    story = CustomerStory.objects.create(
        user=user,
        display_name=display_name,
        message=message,
        event_name=event_name,
        rating=rating,
    )
    return JsonResponse({'success': True, 'story': _customer_story_payload(story)}, status=201)


@csrf_exempt
@require_http_methods(['DELETE', 'POST'])
def api_delete_customer_story(request):
    user = get_authenticated_attendee(request)
    if not user or not user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login to manage your story.'}, status=401)

    deleted, _ = CustomerStory.objects.filter(user=user).delete()
    if not deleted:
        return JsonResponse({'success': False, 'message': 'Story not found.'}, status=404)
    return JsonResponse({'success': True, 'message': 'Your story has been deleted.'})
