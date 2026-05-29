"""
Main URL Configuration for EventHub Project
Includes all portal URLs
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.views import LogoutView
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.contrib import messages
from events.views import (
    organizer_dashboard_stats, api_event_list, api_category_list, api_event_detail,
    api_dashboard_stats, api_dashboard_recommendations, api_dashboard_recent_activity,
    api_tickets_upcoming
)
from accounts.auth_views import register_submit, login_submit
from events.api_organizer_views import (
    api_organizer_events_list,
    api_organizer_events_create,
    api_organizer_events_update,
    api_organizer_events_delete
)
import json

# ============ ADMIN LOGIN VIEWS ============

def admin_login_page(request):
    """Admin login page view"""
    return render(request, 'admin/login.html')

def admin_login_submit(request):
    """Process admin login"""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None and user.is_staff:
            login(request, user)
            messages.success(request, f'Welcome back, {user.username}!')
            return redirect('/admin-portal/dashboard/')
        else:
            messages.error(request, 'Invalid credentials or you do not have admin access.')
            return redirect('/admin/login/')
    
    return redirect('/admin/login/')

def admin_logout_view(request):
    """Admin logout"""
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('/admin/login/')

def user_logout_view(request):
    """User logout"""
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('/login/')

# ============ API VIEWS ============

@csrf_exempt
@require_http_methods(["POST"])
def newsletter_subscribe(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        if email:
            return JsonResponse({'success': True, 'message': 'Subscribed successfully!'})
        return JsonResponse({'success': False, 'message': 'Email required'}, status=400)
    except:
        return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_contact_submit(request):
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()
        
        if not name or len(name) < 2:
            return JsonResponse({'success': False, 'message': 'Name must be at least 2 characters'}, status=400)
        if not email:
            return JsonResponse({'success': False, 'message': 'Email is required'}, status=400)
        if not message or len(message) < 10:
            return JsonResponse({'success': False, 'message': 'Message must be at least 10 characters'}, status=400)
        
        return JsonResponse({'success': True, 'message': 'Thank you! We will get back to you soon.'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_categories_list(request):
    categories_data = [
        {'id': 1, 'name': 'Music', 'event_count': 3, 'icon': 'music'},
        {'id': 2, 'name': 'Technology', 'event_count': 2, 'icon': 'microchip'},
        {'id': 3, 'name': 'Business', 'event_count': 1, 'icon': 'briefcase'},
        {'id': 4, 'name': 'Sports', 'event_count': 1, 'icon': 'futbol'},
        {'id': 5, 'name': 'Arts', 'event_count': 1, 'icon': 'palette'},
        {'id': 6, 'name': 'Food', 'event_count': 1, 'icon': 'utensils'},
    ]
    return JsonResponse({'success': True, 'categories': categories_data})

# ============ ADMIN API ENDPOINTS ============

from accounts.admin_api import (
    dashboard_stats, recent_events, recent_bookings, top_events,
    revenue_chart, categories_chart, events_list_api, categories_list_api,
    users_list_api, user_profile, notifications_api, settings_api
)

# ============ ANALYTICS API ENDPOINTS ============

@csrf_exempt
@require_http_methods(["GET"])
def analytics_categories(request):
    return JsonResponse({
        'labels': ['Music', 'Technology', 'Business', 'Sports', 'Arts', 'Food'],
        'values': [245, 180, 120, 95, 78, 65]
    })

@csrf_exempt
@require_http_methods(["GET"])
def analytics_top_events(request):
    return JsonResponse({
        'events': [
            {'title': 'Tech Conference 2024', 'tickets_sold': 450, 'revenue': 2250000},
            {'title': 'Summer Music Festival', 'tickets_sold': 380, 'revenue': 1330000},
            {'title': 'Business Summit', 'tickets_sold': 210, 'revenue': 1575000},
            {'title': 'Food Festival', 'tickets_sold': 180, 'revenue': 270000},
            {'title': 'Sports Tournament', 'tickets_sold': 150, 'revenue': 225000}
        ]
    })

@csrf_exempt
@require_http_methods(["GET"])
def analytics_user_growth(request):
    return JsonResponse({
        'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        'values': [45, 78, 112, 158, 203, 289]
    })

@csrf_exempt
@require_http_methods(["GET"])
def analytics_kpi(request):
    return JsonResponse({
        'total_revenue': 5625000,
        'total_tickets': 1370,
        'active_users': 289,
        'completed_events': 24,
        'total_events': 45,
        'total_bookings': 1370,
        'conversion_rate': 68,
        'avg_order_value': 4100
    })

# ============ EVENT APPROVAL API ENDPOINTS ============

@csrf_exempt
@require_http_methods(["GET"])
def api_pending_events(request):
    return JsonResponse({'events': [], 'pagination': {'current_page': 1, 'total_pages': 1, 'total_items': 0}})

@csrf_exempt
@require_http_methods(["GET"])
def api_all_events(request):
    return JsonResponse({'events': [], 'pagination': {'current_page': 1, 'total_pages': 1, 'total_items': 0}})

@csrf_exempt
@require_http_methods(["GET"])
def api_event_detail(request, event_id):
    return JsonResponse({'event': {'id': event_id, 'title': 'Sample Event', 'status': 'pending'}})

@csrf_exempt
@require_http_methods(["POST"])
def api_approve_event(request, event_id):
    return JsonResponse({'success': True, 'message': 'Event approved successfully'})

@csrf_exempt
@require_http_methods(["POST"])
def api_reject_event(request, event_id):
    return JsonResponse({'success': True, 'message': 'Event rejected successfully'})

@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_event(request, event_id):
    return JsonResponse({'success': True, 'message': 'Event deleted successfully'})

@csrf_exempt
@require_http_methods(["GET"])
def api_event_history(request, event_id):
    return JsonResponse({'history': []})

@csrf_exempt
@require_http_methods(["GET"])
def api_event_stats(request):
    return JsonResponse({'stats': {'pending': 0, 'approved_this_month': 0, 'rejected_this_month': 0}})

@csrf_exempt
@require_http_methods(["POST"])
def api_bulk_approve(request):
    return JsonResponse({'success': True, 'message': 'Events approved successfully'})

@csrf_exempt
@require_http_methods(["POST"])
def api_bulk_reject(request):
    return JsonResponse({'success': True, 'message': 'Events rejected successfully'})

# ============ NOTIFICATIONS API ENDPOINTS ============

@csrf_exempt
@require_http_methods(["GET"])
def api_notifications_recent(request):
    return JsonResponse({'notifications': [], 'unread_count': 0})

@csrf_exempt
@require_http_methods(["POST"])
def api_notification_mark_read(request, notification_id):
    return JsonResponse({'success': True})

@csrf_exempt
@require_http_methods(["POST"])
def api_notifications_mark_all_read(request):
    return JsonResponse({'success': True})

# ============ MAIN URL PATTERNS ============

urlpatterns = [
    # Django Admin
    path('django-admin/', admin.site.urls),
    
    # Admin Login URLs
    path('admin/login/', admin_login_page, name='admin_login'),
    path('admin/login/submit/', admin_login_submit, name='admin_login_submit'),
    path('admin/logout/', admin_logout_view, name='admin_logout'),
    
    # Shared Auth Pages
    path('login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='login'),
    path('login/submit/', login_submit, name='login_submit'),
    path('register/', TemplateView.as_view(template_name='shared/auth/register.html'), name='register'),
    path('register/submit/', register_submit, name='register_submit'),
    path('forgot-password/', TemplateView.as_view(template_name='shared/auth/forgot_password.html'), name='forgot_password'),
    path('reset-password/', TemplateView.as_view(template_name='shared/auth/reset_password.html'), name='reset_password'),
    path('2fa/', TemplateView.as_view(template_name='shared/auth/2fa.html'), name='two_factor'),
    path('verify-email/', TemplateView.as_view(template_name='shared/auth/email_verify.html'), name='verify_email'),
    path('logout/', user_logout_view, name='logout'),
    
    # Static Pages (Homepage)
    path('', TemplateView.as_view(template_name='attendee/pages/homepage/homepage.html'), name='home'),
    
    # API Endpoints
    path('api/', include('accounts.urls')),
    path('api/attendee/events/', api_event_list, name='api_attendee_event_list'),
    path('api/attendee/events/search/', api_event_list, name='api_attendee_event_search'),
    path('api/attendee/events/categories/', api_category_list, name='api_attendee_category_list'),
    path('api/attendee/categories/', api_category_list, name='api_attendee_category_list_legacy'),
    path('api/attendee/events/<int:event_id>/', api_event_detail, name='api_attendee_event_detail'),
    path('api/attendee/dashboard/stats/', api_dashboard_stats, name='api_attendee_dashboard_stats'),
    path('api/attendee/dashboard/recommendations/', api_dashboard_recommendations, name='api_attendee_dashboard_recommendations'),
    path('api/attendee/dashboard/recent-activity/', api_dashboard_recent_activity, name='api_attendee_dashboard_recent_activity'),
    path('api/attendee/tickets/upcoming/', api_tickets_upcoming, name='api_attendee_tickets_upcoming'),
    
    # Organizer API Endpoints
    path('api/organizer/dashboard/stats/', organizer_dashboard_stats, name='organizer_dashboard_stats'),
    path('api/organizer/events/', api_organizer_events_list, name='api_organizer_events_list'),
    path('api/organizer/events/create/', api_organizer_events_create, name='api_organizer_events_create'),
    path('api/organizer/events/<int:event_id>/update/', api_organizer_events_update, name='api_organizer_events_update'),
    path('api/organizer/events/<int:event_id>/delete/', api_organizer_events_delete, name='api_organizer_events_delete'),
    
    path('api/contact/submit/', api_contact_submit, name='api_contact_submit'),
    path('api/events/categories/', get_categories_list, name='api_categories'),
    path('newsletter/subscribe/', newsletter_subscribe, name='newsletter_subscribe'),
    
    # Admin API Endpoints
    path('api/admin/dashboard/stats/', dashboard_stats, name='admin_dashboard_stats'),
    path('api/admin/events/recent/', recent_events, name='admin_recent_events'),
    path('api/admin/bookings/recent/', recent_bookings, name='admin_recent_bookings'),
    path('api/admin/events/top/', top_events, name='admin_top_events'),
    path('api/admin/charts/revenue/', revenue_chart, name='admin_revenue_chart'),
    path('api/admin/charts/categories/', categories_chart, name='admin_categories_chart'),
    path('api/admin/events/', events_list_api, name='admin_events_list'),
    path('api/admin/categories/', categories_list_api, name='admin_categories_list'),
    path('api/admin/users/', users_list_api, name='admin_users_list'),
    path('api/admin/user/profile/', user_profile, name='admin_user_profile'),
    path('api/admin/notifications/', notifications_api, name='admin_notifications'),
    path('api/admin/settings/', settings_api, name='admin_settings_api'),
    
    # Analytics API Endpoints
    path('api/admin/analytics/categories/', analytics_categories, name='analytics_categories'),
    path('api/admin/analytics/top-events/', analytics_top_events, name='analytics_top_events'),
    path('api/admin/analytics/user-growth/', analytics_user_growth, name='analytics_user_growth'),
    path('api/admin/analytics/kpi/', analytics_kpi, name='analytics_kpi'),
    
    # Event Approval API Endpoints
    path('api/admin/events/pending/', api_pending_events, name='api_pending_events'),
    path('api/admin/events/all/', api_all_events, name='api_all_events'),
    path('api/admin/events/<int:event_id>/', api_event_detail, name='api_event_detail'),
    path('api/admin/events/<int:event_id>/approve/', api_approve_event, name='api_approve_event'),
    path('api/admin/events/<int:event_id>/reject/', api_reject_event, name='api_reject_event'),
    path('api/admin/events/<int:event_id>/delete/', api_delete_event, name='api_delete_event'),
    path('api/admin/events/<int:event_id>/history/', api_event_history, name='api_event_history'),
    path('api/admin/events/stats/', api_event_stats, name='api_event_stats'),
    path('api/admin/events/bulk-approve/', api_bulk_approve, name='api_bulk_approve'),
    path('api/admin/events/bulk-reject/', api_bulk_reject, name='api_bulk_reject'),
    
    # Notifications API Endpoints
    path('api/admin/notifications/recent/', api_notifications_recent, name='api_notifications_recent'),
    path('api/admin/notifications/<int:notification_id>/read/', api_notification_mark_read, name='api_notification_mark_read'),
    path('api/admin/notifications/mark-all-read/', api_notifications_mark_all_read, name='api_notifications_mark_all_read'),
    
    # Portal URLs
    path('', include('config.attendee_urls')),
    path('attendee/', include('config.attendee_urls')),
    path('organizer/', include('config.organizer_urls')),
    path('admin-portal/', include('config.admin_urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
