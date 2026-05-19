from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.db.models import Q, Sum, Avg, Min
from django.core.paginator import Paginator
from django.utils import timezone
from .models import Event, TicketType, Booking, Review, Notification, User
from .forms import (CustomUserCreationForm, CustomAuthenticationForm, EventForm, 
                    BookingForm, ReviewForm, UserProfileForm)


def is_organizer(user):
    return user.is_authenticated and user.role == 'organizer'


def home(request):
    featured_events = Event.objects.filter(is_published=True, is_featured=True, event_date__gt=timezone.now())[:4]
    
    context = {
        'featured_events': featured_events,
        'total_events': Event.objects.filter(is_published=True).count(),
        'total_tickets_sold': Booking.objects.filter(status='confirmed', payment_status='paid').aggregate(Sum('quantity'))['quantity__sum'] or 0,
        'total_organizers': User.objects.filter(role='organizer').count(),
    }
    return render(request, 'index.html', context)


def event_list(request):
    events = Event.objects.filter(is_published=True, event_date__gt=timezone.now())
    
    category = request.GET.get('category')
    if category:
        events = events.filter(category=category)
    
    search = request.GET.get('search')
    if search:
        events = events.filter(Q(title__icontains=search) | Q(venue__icontains=search))
    
    location = request.GET.get('location')
    if location:
        events = events.filter(venue__icontains=location)
    
    paginator = Paginator(events, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'events': page_obj,
        'categories': Event.CATEGORY_CHOICES,
        'current_category': category,
    }
    return render(request, 'events/event_list.html', context)


def event_detail(request, slug):
    event = get_object_or_404(Event, slug=slug, is_published=True)
    ticket_types = event.ticket_types.filter(quantity_available__gt=0)
    reviews = event.reviews.all()[:10]
    similar_events = Event.objects.filter(category=event.category, is_published=True).exclude(id=event.id)[:4]
    
    booking_form = None
    selected_ticket_type = None
    ticket_type_id = request.GET.get('ticket_type')
    if ticket_type_id:
        selected_ticket_type = get_object_or_404(TicketType, id=ticket_type_id, event=event)
        booking_form = BookingForm(ticket_type=selected_ticket_type)
    
    review_form = None
    has_attended = False
    has_reviewed = False
    
    if request.user.is_authenticated:
        has_attended = Booking.objects.filter(user=request.user, event=event, status='confirmed').exists()
        has_reviewed = Review.objects.filter(user=request.user, event=event).exists()
        if has_attended and not has_reviewed:
            review_form = ReviewForm()
    
    context = {
        'event': event,
        'ticket_types': ticket_types,
        'booking_form': booking_form,
        'selected_ticket_type': selected_ticket_type,
        'reviews': reviews,
        'similar_events': similar_events,
        'review_form': review_form,
        'has_attended': has_attended,
        'has_reviewed': has_reviewed,
    }
    return render(request, 'events/event_detail.html', context)


@login_required
def booking(request, event_slug):
    event = get_object_or_404(Event, slug=event_slug)
    
    if request.method == 'POST':
        ticket_type_id = request.POST.get('ticket_type')
        ticket_type = get_object_or_404(TicketType, id=ticket_type_id, event=event)
        
        form = BookingForm(request.POST, ticket_type=ticket_type)
        if form.is_valid():
            quantity = form.cleaned_data['quantity']
            total_price = quantity * ticket_type.price
            
            booking = Booking.objects.create(
                user=request.user,
                event=event,
                ticket_type=ticket_type,
                quantity=quantity,
                total_price=total_price,
                payment_method='pending',
                payment_status='unpaid'
            )
            
            messages.success(request, f"Booking created! Reference: {booking.booking_reference}")
            return redirect('checkout', booking_reference=booking.booking_reference)
    
    return redirect('event_detail', slug=event.slug)


@login_required
def checkout(request, booking_reference):
    booking = get_object_or_404(Booking, booking_reference=booking_reference, user=request.user, payment_status='unpaid')
    
    if request.method == 'POST':
        payment_method = request.POST.get('payment_method')
        if payment_method:
            booking.payment_method = payment_method
            booking.payment_status = 'paid'
            booking.status = 'confirmed'
            booking.save()
            
            booking.ticket_type.quantity_sold += booking.quantity
            booking.ticket_type.save()
            
            booking.generate_qr_code()
            booking.save()
            
            messages.success(request, "Payment successful! Your tickets are confirmed.")
            return redirect('booking_confirmation', booking_reference=booking.booking_reference)
    
    context = {'booking': booking}
    return render(request, 'bookings/booking_confirmation.html', context)


@login_required
def booking_confirmation(request, booking_reference):
    booking = get_object_or_404(Booking, booking_reference=booking_reference, user=request.user)
    context = {'booking': booking}
    return render(request, 'bookings/booking_confirmation.html', context)


@login_required
def dashboard(request):
    tab = request.GET.get('tab', 'overview')
    
    if request.user.role == 'organizer':
        my_events = Event.objects.filter(organizer=request.user)
        total_revenue = Booking.objects.filter(event__organizer=request.user, payment_status='paid').aggregate(Sum('total_price'))['total_price__sum'] or 0
        total_tickets_sold = Booking.objects.filter(event__organizer=request.user, status='confirmed').aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        context = {
            'user': request.user,
            'active_tab': tab,
            'my_events': my_events,
            'total_revenue': total_revenue,
            'total_tickets_sold': total_tickets_sold,
        }
    else:
        upcoming_bookings = Booking.objects.filter(user=request.user, status='confirmed', event__event_date__gt=timezone.now())
        total_spent = Booking.objects.filter(user=request.user, payment_status='paid').aggregate(Sum('total_price'))['total_price__sum'] or 0
        
        context = {
            'user': request.user,
            'active_tab': tab,
            'upcoming_bookings': upcoming_bookings,
            'total_spent': total_spent,
        }
    
    return render(request, 'dashboard/dashboard.html', context)


@login_required
@user_passes_test(is_organizer)
def create_event(request):
    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES)
        if form.is_valid():
            event = form.save(commit=False)
            event.organizer = request.user
            event.save()
            messages.success(request, f"Event '{event.title}' created successfully!")
            return redirect('dashboard')
    else:
        form = EventForm()
    
    context = {'form': form}
    return render(request, 'events/create_event.html', context)


@login_required
def profile(request):
    if request.method == 'POST':
        form = UserProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated successfully!")
            return redirect('profile')
    else:
        form = UserProfileForm(instance=request.user)
    
    context = {'form': form}
    return render(request, 'dashboard/dashboard.html', context)


def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Welcome {user.username}!")
            return redirect('dashboard')
    else:
        role_param = request.GET.get('role', 'attendee')
        form = CustomUserCreationForm(initial={'role': role_param})
    
    context = {'form': form, 'hide_navbar': True, 'hide_footer': True}
    return render(request, 'registration/register.html', context)


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f"Welcome back, {user.username}!")
                return redirect('dashboard')
    else:
        form = CustomAuthenticationForm()
    
    context = {'form': form, 'hide_navbar': True, 'hide_footer': True}
    return render(request, 'registration/login.html', context)


def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('home')


def my_bookings(request):
    """User's booking history"""
    bookings = Booking.objects.filter(user=request.user).select_related('event', 'ticket_type').order_by('-booked_at')
    context = {'bookings': bookings}
    return render(request, 'events/my_bookings.html', context)


def my_events(request):
    """Organizer's events list"""
    if request.user.role != 'organizer':
        return redirect('dashboard')
    events = Event.objects.filter(organizer=request.user).order_by('-event_date')
    context = {'events': events}
    return render(request, 'events/my_events.html', context)


def notifications_view(request):
    """User notifications"""
    notifications = Notification.objects.filter(user=request.user)
    if request.GET.get('mark_read'):
        notifications.update(is_read=True)
        return redirect('notifications')
    context = {'notifications': notifications}
    return render(request, 'notifications.html', context)


def contact_view(request):
    """Contact page"""
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')
        message = request.POST.get('message')
        messages.success(request, f"Thank you {name}! Your message has been sent.")
        return redirect('contact')
    return render(request, 'contact.html')


def about_page(request):
    """About Us page"""
    return render(request, 'pages/about.html')


def stories_page(request):
    """Customer Stories page"""
    return render(request, 'pages/stories.html')


def faq_page(request):
    """FAQ page"""
    return render(request, 'pages/faq.html')


def privacy_page(request):
    """Privacy Policy page"""
    return render(request, 'pages/privacy.html')


def terms_page(request):
    """Terms of Service page"""
    return render(request, 'pages/terms.html')


def email_verify(request):
    """Email verification page"""
    return render(request, 'registration/email_verify.html', {'hide_navbar': True, 'hide_footer': True})


def reset_password(request):
    """Reset password page"""
    return render(request, 'registration/reset_password.html', {'hide_navbar': True, 'hide_footer': True})


def help_page(request):
    """Help Center page"""
    return render(request, 'pages/help.html')


def reviews_page(request):
    """Reviews & Feedback page"""
    return render(request, 'pages/reviews.html')