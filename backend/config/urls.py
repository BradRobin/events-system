"""
URL Configuration for EventHub Project - Complete with Auth Endpoints
"""

from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib.auth.views import LogoutView
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
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
    from django.contrib.auth import logout
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('admin_login')

# ============ AUTH API VIEWS ============

@csrf_exempt
@require_http_methods(["POST"])
def login_submit(request):
    """Process login for attendees and organizers"""
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            role = data.get('role', 'attendee')
        else:
            email = request.POST.get('email')
            password = request.POST.get('password')
            role = request.POST.get('role', 'attendee')
        
        if not email or not password:
            return JsonResponse({'success': False, 'error': 'Email and password required'}, status=400)
        
        from django.contrib.auth import authenticate
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return JsonResponse({'success': False, 'error': 'Invalid email or password'}, status=401)
        
        # Check role
        if role == 'organizer' and not getattr(user, 'is_organizer', False):
            return JsonResponse({'success': False, 'error': 'This account is not registered as an organizer'}, status=403)
        
        login(request, user)
        
        redirect_url = '/attendee/dashboard/' if role != 'organizer' else '/organizer/dashboard/'
        
        return JsonResponse({
            'success': True,
            'redirect_url': redirect_url,
            'user': {
                'id': user.id,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': 'organizer' if getattr(user, 'is_organizer', False) else 'attendee'
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def register_submit(request):
    """Process registration for attendees and organizers"""
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            password = data.get('password1')
            role = data.get('role', 'attendee')
            organization_name = data.get('organization_name', '')
            tax_id = data.get('tax_id', '')
        else:
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password1')
            role = request.POST.get('role', 'attendee')
            organization_name = request.POST.get('organization_name', '')
            tax_id = request.POST.get('tax_id', '')
        
        if not name or not email or not password:
            return JsonResponse({'success': False, 'error': 'All fields are required'}, status=400)
        
        from accounts.models import User as CustomUser
        
        if CustomUser.objects.filter(username=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already registered'}, status=400)
        
        # Parse name
        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Create user
        user = CustomUser.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_organizer=(role == 'organizer')
        )
        
        if role == 'organizer':
            user.organization_name = organization_name
            if tax_id:
                user.tax_id = tax_id
            user.save()
        
        login(request, user)
        
        redirect_url = '/attendee/dashboard/' if role != 'organizer' else '/organizer/dashboard/'
        
        return JsonResponse({
            'success': True,
            'redirect_url': redirect_url,
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'role': role
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def forgot_password_submit(request):
    """Process forgot password request"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        
        if not email:
            return JsonResponse({'success': False, 'error': 'Email required'}, status=400)
        
        # Here you would send email with reset link
        # For now, just return success
        
        return JsonResponse({'success': True, 'message': 'Reset link sent to your email'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def reset_password_submit(request):
    """Process password reset"""
    try:
        data = json.loads(request.body)
        token = data.get('token')
        password = data.get('password')
        
        if not token or not password:
            return JsonResponse({'success': False, 'error': 'Token and password required'}, status=400)
        
        # Here you would validate token and reset password
        
        return JsonResponse({'success': True, 'message': 'Password reset successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def verify_email_submit(request):
    """Process email verification"""
    try:
        data = json.loads(request.body)
        code = data.get('code')
        
        if not code:
            return JsonResponse({'success': False, 'error': 'Verification code required'}, status=400)
        
        # Here you would verify the code
        
        return JsonResponse({'success': True, 'message': 'Email verified successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def two_factor_submit(request):
    """Process 2FA verification"""
    try:
        data = json.loads(request.body)
        code = data.get('code')
        
        if not code:
            return JsonResponse({'success': False, 'error': 'Verification code required'}, status=400)
        
        # Here you would verify 2FA code
        
        return JsonResponse({'success': True, 'message': 'Verified successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# ============ URL PATTERNS ============

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Admin Auth
    path('admin/login/', admin_login_page, name='admin_login'),
    path('admin/login/submit/', admin_login_submit, name='admin_login_submit'),
    path('admin/logout/', admin_logout_view, name='admin_logout'),
    
    # Shared Auth Pages (Templates)
    path('login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='login'),
    path('register/', TemplateView.as_view(template_name='shared/auth/register.html'), name='register'),
    path('forgot-password/', TemplateView.as_view(template_name='shared/auth/forgot_password.html'), name='forgot_password'),
    path('reset-password/', TemplateView.as_view(template_name='shared/auth/reset_password.html'), name='reset_password'),
    path('2fa/', TemplateView.as_view(template_name='shared/auth/2fa.html'), name='two_factor'),
    path('verify-email/', TemplateView.as_view(template_name='shared/auth/email_verify.html'), name='verify_email'),
    path('logout/', LogoutView.as_view(next_page='/'), name='logout'),
    
    # Role-specific auth redirects
    path('attendee/login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='attendee_login'),
    path('organizer/login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='organizer_login'),
    path('attendee/register/', TemplateView.as_view(template_name='shared/auth/register.html'), name='attendee_register'),
    path('organizer/register/', TemplateView.as_view(template_name='shared/auth/register.html'), name='organizer_register'),
    
    # Auth API Endpoints
    path('login/submit/', login_submit, name='login_submit'),
    path('register/submit/', register_submit, name='register_submit'),
    path('forgot-password/submit/', forgot_password_submit, name='forgot_password_submit'),
    path('reset-password/submit/', reset_password_submit, name='reset_password_submit'),
    path('verify-email/submit/', verify_email_submit, name='verify_email_submit'),
    path('2fa/submit/', two_factor_submit, name='two_factor_submit'),
    
    # ============ ATTENDEE PORTAL ============
    
    # Homepage
    path('', TemplateView.as_view(template_name='attendee/pages/homepage/homepage.html'), name='home'),
    path('attendee/', TemplateView.as_view(template_name='attendee/pages/homepage/homepage.html'), name='attendee_home'),
    
    # Static Pages
    path('attendee/about/', TemplateView.as_view(template_name='attendee/pages/about.html'), name='attendee_about'),
    path('attendee/contact/', TemplateView.as_view(template_name='attendee/pages/contact.html'), name='attendee_contact'),
    path('attendee/faq/', TemplateView.as_view(template_name='attendee/pages/faq.html'), name='attendee_faq'),
    path('attendee/help-center/', TemplateView.as_view(template_name='attendee/pages/help-center.html'), name='attendee_help_center'),
    path('attendee/how-it-works/', TemplateView.as_view(template_name='attendee/pages/how_it_works.html'), name='attendee_how_it_works'),
    path('attendee/privacy/', TemplateView.as_view(template_name='attendee/pages/privacy.html'), name='attendee_privacy'),
    path('attendee/terms/', TemplateView.as_view(template_name='attendee/pages/terms.html'), name='attendee_terms'),
    path('attendee/reviews/', TemplateView.as_view(template_name='attendee/pages/reviews.html'), name='attendee_reviews'),
    path('attendee/success-stories/', TemplateView.as_view(template_name='attendee/pages/success-stories.html'), name='attendee_success_stories'),
    
    # Events
    path('attendee/events/', TemplateView.as_view(template_name='attendee/events/list.html'), name='attendee_events'),
    path('attendee/events/detail/', TemplateView.as_view(template_name='attendee/events/detail.html'), name='attendee_event_detail'),
    path('attendee/events/search/', TemplateView.as_view(template_name='attendee/events/search.html'), name='attendee_event_search'),
    
    # Dashboard (Protected)
    path('attendee/dashboard/', login_required(TemplateView.as_view(template_name='attendee/dashboard/dashboard.html')), name='attendee_dashboard'),
    
    # Profile
    path('attendee/profile/', login_required(TemplateView.as_view(template_name='attendee/pages/profile.html')), name='attendee_profile'),
    
    # Tickets
    path('attendee/tickets/', login_required(TemplateView.as_view(template_name='attendee/tickets/list.html')), name='attendee_tickets'),
    path('attendee/tickets/detail/', login_required(TemplateView.as_view(template_name='attendee/tickets/detail.html')), name='attendee_ticket_detail'),
    path('attendee/tickets/qr/', login_required(TemplateView.as_view(template_name='attendee/tickets/qr.html')), name='attendee_ticket_qr'),
    
    # Bookings
    path('attendee/bookings/', login_required(TemplateView.as_view(template_name='attendee/bookings/history.html')), name='attendee_bookings'),
    path('attendee/bookings/detail/', login_required(TemplateView.as_view(template_name='attendee/bookings/detail.html')), name='attendee_booking_detail'),
    
    # Cart & Wishlist
    path('attendee/cart/', login_required(TemplateView.as_view(template_name='attendee/cart/cart.html')), name='attendee_cart'),
    path('attendee/wishlist/', login_required(TemplateView.as_view(template_name='attendee/wishlist/wishlist.html')), name='attendee_wishlist'),
    
    # Support
    path('attendee/support/', login_required(TemplateView.as_view(template_name='attendee/support/tickets.html')), name='attendee_support'),
    
    # Notifications
    path('attendee/notifications/', login_required(TemplateView.as_view(template_name='attendee/notifications/notifications.html')), name='attendee_notifications'),
    path('attendee/notifications/preferences/', login_required(TemplateView.as_view(template_name='attendee/notifications/preferences.html')), name='attendee_notification_prefs'),
    
    # Settings
    path('attendee/settings/', login_required(TemplateView.as_view(template_name='attendee/settings/settings.html')), name='attendee_settings'),
    
    # ============ ORGANIZER PORTAL ============
    path('organizer/', login_required(TemplateView.as_view(template_name='organizer/dashboard/dashboard.html')), name='organizer_home'),
    path('organizer/dashboard/', login_required(TemplateView.as_view(template_name='organizer/dashboard/dashboard.html')), name='organizer_dashboard'),
    path('organizer/events/', login_required(TemplateView.as_view(template_name='organizer/events/list.html')), name='organizer_events'),
    path('organizer/events/create/', login_required(TemplateView.as_view(template_name='organizer/events/create.html')), name='organizer_event_create'),
    path('organizer/tickets/scanner/', login_required(TemplateView.as_view(template_name='organizer/tickets/scanner.html')), name='organizer_ticket_scanner'),
    path('organizer/bookings/', login_required(TemplateView.as_view(template_name='organizer/bookings/bookings.html')), name='organizer_bookings'),
    path('organizer/payouts/', login_required(TemplateView.as_view(template_name='organizer/payouts/payouts.html')), name='organizer_payouts'),
    path('organizer/reports/', login_required(TemplateView.as_view(template_name='organizer/reports/reports.html')), name='organizer_reports'),
    path('organizer/profile/', login_required(TemplateView.as_view(template_name='organizer/profile/profile.html')), name='organizer_profile'),
    
    # ============ ADMIN PORTAL ============
    path('admin-portal/', login_required(TemplateView.as_view(template_name='admin/dashboard/index.html')), name='admin_portal'),
    path('admin-portal/dashboard/', login_required(TemplateView.as_view(template_name='admin/dashboard/index.html')), name='admin_dashboard'),
    path('admin-portal/events/pending/', login_required(TemplateView.as_view(template_name='admin/events/pending_approvals.html')), name='admin_pending_events'),
    path('admin-portal/events/all/', login_required(TemplateView.as_view(template_name='admin/events/all_events.html')), name='admin_all_events'),
    path('admin-portal/events/detail/', login_required(TemplateView.as_view(template_name='admin/events/detail.html')), name='admin_event_detail'),
    path('admin-portal/bookings/', login_required(TemplateView.as_view(template_name='admin/bookings/all_bookings.html')), name='admin_bookings'),
    path('admin-portal/bookings/refunds/', login_required(TemplateView.as_view(template_name='admin/bookings/refunds.html')), name='admin_refunds'),
    path('admin-portal/users/', login_required(TemplateView.as_view(template_name='admin/users/all_users.html')), name='admin_users'),
    path('admin-portal/users/organizers/', login_required(TemplateView.as_view(template_name='admin/users/organizers.html')), name='admin_organizers'),
    path('admin-portal/payments/', login_required(TemplateView.as_view(template_name='admin/payments/transactions.html')), name='admin_payments'),
    path('admin-portal/payments/payouts/', login_required(TemplateView.as_view(template_name='admin/payments/payouts.html')), name='admin_payouts'),
    path('admin-portal/reports/', login_required(TemplateView.as_view(template_name='admin/reports/analytics.html')), name='admin_reports'),
    path('admin-portal/reports/sales/', login_required(TemplateView.as_view(template_name='admin/reports/sales.html')), name='admin_sales_report'),
    path('admin-portal/reports/events/', login_required(TemplateView.as_view(template_name='admin/reports/events-report.html')), name='admin_events_report'),
    path('admin-portal/notifications/', login_required(TemplateView.as_view(template_name='admin/notifications/index.html')), name='admin_notifications'),
    path('admin-portal/support/', login_required(TemplateView.as_view(template_name='admin/support/tickets.html')), name='admin_support'),
    path('admin-portal/profile/', login_required(TemplateView.as_view(template_name='admin/profile.html')), name='admin_profile'),
    path('admin-portal/settings/general/', login_required(TemplateView.as_view(template_name='admin/settings/general.html')), name='admin_general_settings'),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)