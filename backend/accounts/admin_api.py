from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
import json

User = get_user_model()

# ============ DASHBOARD API ============
@csrf_exempt
@require_http_methods(["GET"])
def dashboard_stats(request):
    return JsonResponse({
        'success': True,
        'stats': {
            'total_events': 0,
            'total_tickets': 0,
            'total_users': User.objects.count(),
            'total_revenue': 0
        }
    })

@csrf_exempt
@require_http_methods(["GET"])
def recent_events(request):
    return JsonResponse({'success': True, 'events': []})

@csrf_exempt
@require_http_methods(["GET"])
def recent_bookings(request):
    return JsonResponse({'success': True, 'bookings': []})

@csrf_exempt
@require_http_methods(["GET"])
def top_events(request):
    return JsonResponse({'success': True, 'events': []})

@csrf_exempt
@require_http_methods(["GET"])
def revenue_chart(request):
    return JsonResponse({'success': True, 'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], 'values': [0, 0, 0, 0, 0, 0]})

@csrf_exempt
@require_http_methods(["GET"])
def categories_chart(request):
    return JsonResponse({'success': True, 'labels': ['Music', 'Tech', 'Business'], 'values': [0, 0, 0]})

# ============ EVENTS API ============
@csrf_exempt
@require_http_methods(["GET"])
def events_list_api(request):
    return JsonResponse({
        'success': True,
        'events': [],
        'pagination': {'current_page': 1, 'total_pages': 1, 'total_items': 0}
    })

@csrf_exempt
@require_http_methods(["GET"])
def categories_list_api(request):
    return JsonResponse({
        'success': True,
        'categories': [
            {'id': 1, 'name': 'Music'},
            {'id': 2, 'name': 'Technology'},
            {'id': 3, 'name': 'Business'},
            {'id': 4, 'name': 'Sports'},
            {'id': 5, 'name': 'Arts'},
            {'id': 6, 'name': 'Food'}
        ]
    })

# ============ USERS API ============
@csrf_exempt
@require_http_methods(["GET"])
def users_list_api(request):
    users = User.objects.all()
    data = [{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'full_name': u.get_full_name(),
        'role': getattr(u, 'role', 'attendee'),
        'is_active': u.is_active,
        'date_joined': u.date_joined.isoformat()
    } for u in users]
    return JsonResponse({
        'success': True,
        'users': data,
        'pagination': {'current_page': 1, 'total_pages': 1, 'total_items': len(data)}
    })

@csrf_exempt
@require_http_methods(["GET"])
def user_profile(request):
    return JsonResponse({'success': True, 'user': {'username': 'admin', 'full_name': 'Administrator', 'email': 'admin@eventhub.com'}})

@csrf_exempt
@require_http_methods(["GET"])
def notifications_api(request):
    return JsonResponse({'success': True, 'notifications': []})

# ============ SETTINGS API ============
@csrf_exempt
@require_http_methods(["GET"])
def settings_api(request):
    return JsonResponse({
        'success': True,
        'site_name': 'EventHub',
        'site_description': 'Event Management Platform',
        'contact_email': 'info@eventhub.com',
        'timezone': 'Africa/Nairobi',
        'currency': 'KES',
        'platform_fee': 5
    })
