"""
URL Configuration for EventHub Project - FIXED VERSION
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
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.contrib import messages
import json

# ============ ADMIN LOGIN VIEWS ============

def admin_login_page(request):
    """Admin login page view"""
    if request.user.is_authenticated and request.user.is_staff:
        return redirect('admin_dashboard')
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
            return redirect('admin_dashboard')
        else:
            messages.error(request, 'Invalid credentials or you do not have admin access.')
            return redirect('admin_login')
    
    return redirect('admin_login')

def admin_logout_view(request):
    """Admin logout"""
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('admin_login')

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

# ============ MAIN URL PATTERNS ============

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Admin Login URLs
    path('admin/login/', admin_login_page, name='admin_login'),
    path('admin/login/submit/', admin_login_submit, name='admin_login_submit'),
    path('admin/logout/', admin_logout_view, name='admin_logout'),
    
    # API Endpoints
    path('api/contact/submit/', api_contact_submit, name='api_contact_submit'),
    path('api/events/categories/', get_categories_list, name='api_categories'),
    path('newsletter/subscribe/', newsletter_subscribe, name='newsletter_subscribe'),
    path('logout/', LogoutView.as_view(next_page='/'), name='logout'),
    
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
    
    # ============ ATTENDEE PORTAL ============
    path('', TemplateView.as_view(template_name='attendee/index.html'), name='home'),
    path('events/', TemplateView.as_view(template_name='attendee/events/event_list.html'), name='event_list'),
    path('contact/', TemplateView.as_view(template_name='attendee/pages/contact.html'), name='contact'),
    path('about/', TemplateView.as_view(template_name='attendee/pages/about.html'), name='about'),
    path('faq/', TemplateView.as_view(template_name='attendee/pages/faq.html'), name='faq'),
    path('login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='login'),
    path('register/', TemplateView.as_view(template_name='shared/auth/register.html'), name='register'),
    
    # ============ PROTECTED ATTENDEE ROUTES ============
    path('dashboard/', login_required(TemplateView.as_view(template_name='attendee/dashboard/dashboard.html')), name='dashboard'),
    path('profile/', login_required(TemplateView.as_view(template_name='attendee/dashboard/profile.html')), name='profile'),
    path('my-tickets/', login_required(TemplateView.as_view(template_name='attendee/bookings/my_tickets.html')), name='my_tickets'),
    
    # ============ ADMIN PORTAL ============
    path('admin-portal/', login_required(TemplateView.as_view(template_name='admin/dashboard/index.html')), name='admin_portal'),
    path('admin-portal/dashboard/', login_required(TemplateView.as_view(template_name='admin/dashboard/index.html')), name='admin_dashboard'),
    path('admin-portal/events/pending/', login_required(TemplateView.as_view(template_name='admin/events/pending_approvals.html')), name='admin_pending_approvals'),
    path('admin-portal/events/all/', login_required(TemplateView.as_view(template_name='admin/events/all_events.html')), name='admin_all_events'),
    path('admin-portal/events/detail/', login_required(TemplateView.as_view(template_name='admin/events/detail.html')), name='admin_event_detail'),
    path('admin-portal/bookings/', login_required(TemplateView.as_view(template_name='admin/bookings/all_bookings.html')), name='admin_bookings'),
    path('admin-portal/bookings/refunds/', login_required(TemplateView.as_view(template_name='admin/bookings/refunds.html')), name='admin_refunds'),
    path('admin-portal/users/', login_required(TemplateView.as_view(template_name='admin/users/all_users.html')), name='admin_users'),
    path('admin-portal/users/organizers/', login_required(TemplateView.as_view(template_name='admin/users/organizers.html')), name='admin_organizers'),
    path('admin-portal/tickets/', login_required(TemplateView.as_view(template_name='admin/tickets/all_tickets.html')), name='admin_tickets'),
    path('admin-portal/tickets/scanner/', login_required(TemplateView.as_view(template_name='admin/tickets/scanner.html')), name='admin_ticket_scanner'),
    path('admin-portal/payments/', login_required(TemplateView.as_view(template_name='admin/payments/transactions.html')), name='admin_payments'),
    path('admin-portal/reports/', login_required(TemplateView.as_view(template_name='admin/reports/analytics.html')), name='admin_reports'),
    path('admin-portal/reports/sales/', login_required(TemplateView.as_view(template_name='admin/reports/sales.html')), name='admin_sales_report'),
    path('admin-portal/reports/events/', login_required(TemplateView.as_view(template_name='admin/reports/events-report.html')), name='admin_events_report'),
    path('admin-portal/profile/', login_required(TemplateView.as_view(template_name='admin/profile.html')), name='admin_profile'),
    path('admin-portal/settings/general/', login_required(TemplateView.as_view(template_name='admin/settings/general.html')), name='admin_general_settings'),
    path('admin-portal/settings/payment/', login_required(TemplateView.as_view(template_name='admin/settings/payment.html')), name='admin_payment_settings'),
    path('admin-portal/settings/security/', login_required(TemplateView.as_view(template_name='admin/settings/security.html')), name='admin_security_settings'),
    path('admin-portal/support/', login_required(TemplateView.as_view(template_name='admin/support/tickets.html')), name='admin_support'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
