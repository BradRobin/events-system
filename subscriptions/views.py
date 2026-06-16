import json
import logging
import time
from io import BytesIO

from django.db.utils import ProgrammingError
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from accounts.auth import authenticate_bearer, parse_json_body
from events.api_organizer_views import organizer_required
from payments.screenshot_storage import encode_upload_to_data_uri, open_screenshot_stream
from payments.screenshot_verifier import verify_screenshot as analyze_payment_screenshot, ocr_is_available

from .models import SubscriptionOrder
from .plans import PLANS, UPGRADABLE_PLANS, PLATFORM_MPESA_DISPLAY_NAME, PLATFORM_MPESA_NUMBER, get_plan, plan_payment_options
from .services import activate_subscription, get_subscription_usage

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024


def get_authenticated_user(request):
    user = request.user
    if not user.is_authenticated:
        bearer_user, _ = authenticate_bearer(request)
        if bearer_user:
            user = bearer_user
    return user if user.is_authenticated else None


def _sse_event(step, message, **extra):
    payload = {'step': step, 'message': message, **extra}
    return f"data: {json.dumps(payload)}\n\n"


def _platform_mpesa_numbers():
    return [PLATFORM_MPESA_NUMBER, '254' + PLATFORM_MPESA_NUMBER.lstrip('0')]


def _serialize_order(order, include_payment=False):
    plan = get_plan(order.plan) or {}
    data = {
        'id': order.id,
        'plan': order.plan,
        'plan_name': plan.get('name', order.plan),
        'amount': float(order.amount),
        'status': order.status,
        'verification_message': order.verification_message,
        'screenshot_verified': order.screenshot_verified,
        'billing_months': order.billing_months,
        'created_at': order.created_at.isoformat(),
        'updated_at': order.updated_at.isoformat(),
    }
    if include_payment:
        data['payment_options'] = plan_payment_options()
        data['platform_mpesa_number'] = PLATFORM_MPESA_NUMBER
        data['requires_admin_approval'] = True
    return data


def _escalate_to_admin_review(order, *, ocr_passed, verification_message=''):
    order.status = 'manual_review'
    order.screenshot_verified = ocr_passed
    order.verification_message = verification_message or 'Payment submitted for admin approval.'
    order.save(update_fields=['status', 'screenshot_verified', 'verification_message', 'updated_at'])


@csrf_exempt
@require_http_methods(["GET"])
def ocr_health(request):
    return JsonResponse({
        'success': True,
        'ocr_available': ocr_is_available(),
        'message': 'Tesseract OCR is ready.' if ocr_is_available() else (
            'Tesseract OCR is not available. Screenshots will still be submitted for manual review.'
        ),
    })


@csrf_exempt
@organizer_required
@require_http_methods(["GET"])
def organizer_subscription_status(request):
    usage = get_subscription_usage(request.user)
    plans = []
    for slug, plan in PLANS.items():
        plans.append({
            'slug': slug,
            'name': plan['name'],
            'price_kes': float(plan['price_kes']),
            'events_per_month': plan['events_per_month'],
            'search_rank': plan['search_rank'],
            'description': plan['description'],
            'upgradable': slug in UPGRADABLE_PLANS,
        })
    pending = SubscriptionOrder.objects.filter(
        organizer=request.user,
        status__in=('pending_payment', 'verifying', 'manual_review'),
    ).order_by('-created_at').first()

    return JsonResponse({
        'success': True,
        'usage': usage,
        'plans': plans,
        'platform_mpesa_number': PLATFORM_MPESA_NUMBER,
        'pending_order': _serialize_order(pending, include_payment=True) if pending else None,
    })


@csrf_exempt
@organizer_required
@require_http_methods(["POST"])
def create_subscription_order(request):
    data = parse_json_body(request)
    if data is None:
        return JsonResponse({'success': False, 'message': 'Invalid JSON body.'}, status=400)

    plan_slug = (data.get('plan') or '').strip().lower()
    if plan_slug not in UPGRADABLE_PLANS:
        return JsonResponse({'success': False, 'message': 'Choose Plus or Premium to upgrade.'}, status=400)

    plan = get_plan(plan_slug)
    months = int(data.get('billing_months') or 1)
    if months < 1:
        months = 1
    if months > 12:
        months = 12

    amount = plan['price_kes'] * months

    existing = SubscriptionOrder.objects.filter(
        organizer=request.user,
        status__in=('pending_payment', 'verifying', 'manual_review'),
    ).first()
    if existing:
        return JsonResponse({
            'success': True,
            'message': 'You already have a subscription payment in progress.',
            'order': _serialize_order(existing, include_payment=True),
        })

    order_fields = {
        'organizer': request.user,
        'plan': plan_slug,
        'amount': amount,
        'billing_months': months,
        'status': 'pending_payment',
    }
    try:
        order = SubscriptionOrder.objects.create(**order_fields)
    except ProgrammingError:
        from config.db_migrations import run_migrations
        run_migrations()
        order = SubscriptionOrder.objects.create(**order_fields)

    return JsonResponse({
        'success': True,
        'order': _serialize_order(order, include_payment=True),
    })


@csrf_exempt
@organizer_required
@require_http_methods(["GET"])
def subscription_order_status(request, order_id):
    try:
        order = SubscriptionOrder.objects.get(pk=order_id, organizer=request.user)
    except SubscriptionOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Order not found.'}, status=404)
    return JsonResponse({'success': True, 'order': _serialize_order(order, include_payment=True)})


@csrf_exempt
@organizer_required
@require_http_methods(["POST"])
def verify_subscription_screenshot(request, order_id):
    try:
        order = SubscriptionOrder.objects.get(pk=order_id, organizer=request.user)
    except SubscriptionOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Order not found.'}, status=404)

    if order.status not in ('pending_payment', 'failed', 'rejected', 'verifying'):
        return JsonResponse({'success': False, 'message': 'This order cannot accept a new screenshot.'}, status=400)

    screenshot = request.FILES.get('screenshot')
    if not screenshot:
        return JsonResponse({'success': False, 'message': 'Screenshot file is required.'}, status=400)
    if screenshot.size > MAX_SCREENSHOT_SIZE:
        return JsonResponse({'success': False, 'message': 'Screenshot must be 5 MB or smaller.'}, status=400)

    content_type = getattr(screenshot, 'content_type', '') or ''
    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        return JsonResponse({'success': False, 'message': 'Only JPEG, PNG, or WebP images are allowed.'}, status=400)

    try:
        data_uri, screenshot_bytes = encode_upload_to_data_uri(screenshot, content_type=content_type)
    except Exception as exc:
        return JsonResponse({'success': False, 'message': f'Could not read screenshot: {exc}'}, status=400)

    order.status = 'verifying'
    order.screenshot_data = data_uri
    order.verification_message = ''
    order.save(update_fields=['status', 'screenshot_data', 'verification_message', 'updated_at'])

    def event_stream():
        yield _sse_event('upload_received', 'Screenshot received')
        time.sleep(0.2)
        yield _sse_event('reading_text', 'Reading transaction details')

        image_stream = open_screenshot_stream(order) or BytesIO(screenshot_bytes)
        try:
            result = analyze_payment_screenshot(
                image_stream,
                PLATFORM_MPESA_DISPLAY_NAME,
                order.amount,
                _platform_mpesa_numbers(),
            )
        except Exception:
            _escalate_to_admin_review(order, ocr_passed=False, verification_message='Payment submitted for admin approval.')
            yield _sse_event(
                'pending_approval',
                'Your payment has been sent to EventHub for approval.',
                order_id=order.id,
            )
            return

        if result.get('ocr_unavailable'):
            _escalate_to_admin_review(order, ocr_passed=False)
            yield _sse_event(
                'pending_approval',
                'Your payment has been sent to EventHub for approval.',
                order_id=order.id,
            )
            return

        order.ocr_raw_text = result.get('ocr_text', '')
        order.save(update_fields=['ocr_raw_text', 'updated_at'])

        ocr_passed = bool(result.get('success'))
        notes = result.get('notes', '') or 'Payment submitted for admin approval.'
        _escalate_to_admin_review(order, ocr_passed=ocr_passed, verification_message=notes)

        message = (
            'Screenshot verified! Your upgrade request has been sent to EventHub for final approval.'
            if ocr_passed else
            'Your payment has been sent to EventHub for approval.'
        )
        yield _sse_event('pending_approval', message, ocr_passed=ocr_passed, order_id=order.id)

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


def _admin_required(view_func):
    def wrapper(request, *args, **kwargs):
        user = get_authenticated_user(request)
        if not user:
            return JsonResponse({'success': False, 'message': 'Please login.'}, status=401)
        if not (user.is_superuser or getattr(user, 'role', None) == 'admin'):
            return JsonResponse({'success': False, 'message': 'Admin access required.'}, status=403)
        request.user = user
        return view_func(request, *args, **kwargs)
    return wrapper


@csrf_exempt
@_admin_required
@require_http_methods(["GET"])
def admin_pending_subscription_orders(request):
    orders = SubscriptionOrder.objects.filter(status='manual_review').select_related('organizer').order_by('-updated_at')[:100]
    results = []
    for order in orders:
        item = _serialize_order(order, include_payment=True)
        item['organizer_name'] = (
            order.organizer.organization_name or order.organizer.get_full_name() or order.organizer.username
        )
        item['organizer_email'] = order.organizer.email
        results.append(item)
    return JsonResponse({'success': True, 'orders': results})


@csrf_exempt
@_admin_required
@require_http_methods(["POST"])
def admin_approve_subscription_order(request, order_id):
    try:
        order = SubscriptionOrder.objects.select_related('organizer').get(pk=order_id)
    except SubscriptionOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Order not found.'}, status=404)

    if order.status != 'manual_review':
        return JsonResponse({'success': False, 'message': 'Order is not awaiting approval.'}, status=400)

    activate_subscription(order.organizer, order.plan, months=order.billing_months)
    order.status = 'completed'
    order.save(update_fields=['status', 'updated_at'])

    return JsonResponse({
        'success': True,
        'message': f'{order.organizer.username} upgraded to {order.plan}.',
        'order': _serialize_order(order),
    })


@csrf_exempt
@_admin_required
@require_http_methods(["POST"])
def admin_reject_subscription_order(request, order_id):
    try:
        order = SubscriptionOrder.objects.get(pk=order_id)
    except SubscriptionOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Order not found.'}, status=404)

    if order.status != 'manual_review':
        return JsonResponse({'success': False, 'message': 'Order is not awaiting approval.'}, status=400)

    data = parse_json_body(request) or {}
    order.status = 'rejected'
    order.verification_message = (data.get('reason') or 'Payment rejected by admin.').strip()
    order.save(update_fields=['status', 'verification_message', 'updated_at'])
    return JsonResponse({'success': True, 'message': 'Subscription payment rejected.'})
