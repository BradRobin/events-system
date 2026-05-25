"""
Organizer Portal URLs
All organizer-related URLs
"""

from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    # Auth
    path('login/', TemplateView.as_view(template_name='shared/auth/login.html'), name='organizer_login'),
    
    # Dashboard
    path('', TemplateView.as_view(template_name='organizer/dashboard/dashboard.html'), name='organizer_home'),
    path('dashboard/', TemplateView.as_view(template_name='organizer/dashboard/dashboard.html'), name='organizer_dashboard'),
    
    # Events Management
    path('events/', TemplateView.as_view(template_name='organizer/events/list.html'), name='organizer_events'),
    path('events/create/', TemplateView.as_view(template_name='organizer/events/create.html'), name='organizer_event_create'),
    path('events/edit/', TemplateView.as_view(template_name='organizer/events/edit.html'), name='organizer_event_edit'),
    path('events/detail/', TemplateView.as_view(template_name='organizer/events/detail.html'), name='organizer_event_detail'),
    
    # Tickets & Scanner
    path('tickets/', TemplateView.as_view(template_name='organizer/tickets/list.html'), name='organizer_tickets'),
    path('tickets/scanner/', TemplateView.as_view(template_name='organizer/tickets/scanner.html'), name='organizer_ticket_scanner'),
    
    # Bookings
    path('bookings/', TemplateView.as_view(template_name='organizer/bookings/bookings.html'), name='organizer_bookings'),
    
    # Attendees
    path('attendees/', TemplateView.as_view(template_name='organizer/attendees/attendees.html'), name='organizer_attendees'),
    
    # Payouts & Earnings
    path('payouts/', TemplateView.as_view(template_name='organizer/payouts/payouts.html'), name='organizer_payouts'),
    
    # Promotions
    path('promotions/', TemplateView.as_view(template_name='organizer/promotions/promotions.html'), name='organizer_promotions'),
    
    # Reports & Analytics
    path('reports/', TemplateView.as_view(template_name='organizer/reports/reports.html'), name='organizer_reports'),
    
    # Profile
    path('profile/', TemplateView.as_view(template_name='organizer/profile/profile.html'), name='organizer_profile'),
    
    # Settings
    path('settings/', TemplateView.as_view(template_name='organizer/settings/settings.html'), name='organizer_settings'),
    
    # Support
    path('support/', TemplateView.as_view(template_name='organizer/support/tickets.html'), name='organizer_support'),
]