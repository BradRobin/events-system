from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('events/', views.event_list, name='event_list'),
    path('events/<slug:slug>/', views.event_detail, name='event_detail'),
    
    # Static pages
    path('about/', views.about_page, name='about'),
    path('stories/', views.stories_page, name='stories'),
    path('faq/', views.faq_page, name='faq'),
    path('privacy/', views.privacy_page, name='privacy'),
    path('terms/', views.terms_page, name='terms'),
    path('help/', views.help_page, name='help'),
    path('reviews/', views.reviews_page, name='reviews'),
    
    # Authentication
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('email-verify/', views.email_verify, name='email_verify'),
    path('reset-password/', views.reset_password, name='reset_password'),
    
    # Bookings
    path('booking/<slug:event_slug>/', views.booking, name='booking'),
    path('checkout/<str:booking_reference>/', views.checkout, name='checkout'),
    path('confirmation/<str:booking_reference>/', views.booking_confirmation, name='booking_confirmation'),
    
    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/create-event/', views.create_event, name='create_event'),
    path('dashboard/profile/', views.profile, name='profile'),
    path('my-bookings/', views.my_bookings, name='my_bookings'),
    path('my-events/', views.my_events, name='my_events'),
    path('notifications/', views.notifications_view, name='notifications'),
    path('contact/', views.contact_view, name='contact'),
]