from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from django.shortcuts import render


def home(request):
    return render(request, 'index.html')


def event_list(request):
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Browse Events - EventHub</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container">
                <a class="navbar-brand" href="/">EventHub</a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="/">Home</a>
                    <a class="nav-link" href="/admin">Admin</a>
                </div>
            </div>
        </nav>
        <main class="container mt-4">
            <h1>Browse Events</h1>
            <p class="lead">Published events will appear here once organizers start adding them.</p>
            <div class="alert alert-info">No events are available yet.</div>
        </main>
    </body>
    </html>
    """
    return HttpResponse(html)


def organizer_dashboard(request):
    # Support both logged-in organizer and anonymous views for easy local testing
    if request.user.is_authenticated:
        if hasattr(request.user, 'role') and request.user.role != 'organizer':
            return HttpResponseForbidden('You do not have permission to access the organizer dashboard.')

    return render(request, 'organizer_dashboard.html')

def organizer_dashboard_stats(request):
    if not request.user.is_authenticated or getattr(request.user, 'role', None) != 'organizer':
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
    events = Event.objects.filter(organizer=request.user)
    
    events_count = events.count()
    tickets_sold = sum(e.total_seats - e.available_seats for e in events)
    revenue = sum((e.total_seats - e.available_seats) * e.price for e in events)
    
    metrics = {
        'events_count': events_count,
        'tickets_sold': tickets_sold,
        'revenue': float(revenue),
        'attendees': tickets_sold,
        'top_event': 'No events yet' if events_count == 0 else events.first().title,
        'conversion_rate': 0,
        'new_followers': 0,
        'pending_payout': float(revenue) * 0.9 if revenue > 0 else 0.00,
    }

    return JsonResponse(metrics)


# ============ ATTENDEE EVENTS API ENDPOINTS ============

from django.db.models import Q
from .models import Category, Event

def api_event_list(request):
    """API endpoint to list and search events for attendees"""
    query = request.GET.get('search', '').strip()
    category_id = request.GET.get('category', '').strip()
    ordering = request.GET.get('ordering', 'date').strip()
    
    # Handle search from both list.html and search.html
    if not query:
        query = request.GET.get('q', '').strip()
        
    events = Event.objects.filter(status='published')
    
    if query:
        events = events.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(venue__icontains=query)
        )
        
    if category_id:
        events = events.filter(category_id=category_id)
        
    # Ordering
    if ordering == 'price':
        events = events.order_by('price')
    elif ordering == '-price':
        events = events.order_by('-price')
    elif ordering == 'title':
        events = events.order_by('title')
    elif ordering == '-date':
        events = events.order_by('-start_date')
    else:
        events = events.order_by('start_date')
        
    # Simple pagination
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 6))
    start = (page - 1) * limit
    end = page * limit
    
    count = events.count()
    events_page = events[start:end]
    
    results = []
    for e in events_page:
        results.append({
            'id': e.id,
            'title': e.title,
            'slug': e.slug,
            'description': e.description,
            'date': e.start_date.isoformat(),
            'start_date': e.start_date.isoformat(),
            'end_date': e.end_date.isoformat(),
            'location': e.venue,
            'city': e.address or 'Nairobi',
            'venue': e.venue,
            'price': float(e.price),
            'min_price': float(e.price),
            'total_seats': e.total_seats,
            'available_seats': e.available_seats,
            'available_tickets': e.available_seats,
            'image': e.banner_image,
            'banner_image': e.banner_image,
            'category': e.category.name if e.category else 'General',
            'category_name': e.category.name if e.category else 'General',
            'is_featured': e.is_featured,
        })
        
    return JsonResponse({
        'count': count,
        'results': results,
        'total_pages': (count + limit - 1) // limit
    })


def api_category_list(request):
    """API endpoint to list categories"""
    categories = Category.objects.all()
    results = []
    for c in categories:
        event_count = Event.objects.filter(category=c, status='published').count()
        results.append({
            'id': c.id,
            'name': c.name,
            'slug': c.slug,
            'description': c.description,
            'icon': c.icon or 'globe',
            'event_count': event_count
        })
    return JsonResponse({'success': True, 'categories': results})


def api_event_detail(request, event_id):
    """API endpoint to get detail of a single event"""
    try:
        e = Event.objects.get(id=event_id)
        data = {
            'id': e.id,
            'title': e.title,
            'slug': e.slug,
            'description': e.description,
            'date': e.start_date.isoformat(),
            'start_date': e.start_date.isoformat(),
            'end_date': e.end_date.isoformat(),
            'location': e.venue,
            'city': e.address or 'Nairobi',
            'venue': e.venue,
            'price': float(e.price),
            'min_price': float(e.price),
            'total_seats': e.total_seats,
            'available_seats': e.available_seats,
            'available_tickets': e.available_seats,
            'image': e.banner_image,
            'banner_image': e.banner_image,
            'category': e.category.name if e.category else 'General',
            'category_name': e.category.name if e.category else 'General',
            'is_featured': e.is_featured,
            'organizer_name': e.organizer.organization_name or e.organizer.username,
        }
        return JsonResponse({'success': True, 'event': data})
    except Event.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Event not found'}, status=404)


from django.utils import timezone

def api_dashboard_stats(request):
    """API endpoint to get attendee dashboard stats"""
    upcoming_count = Event.objects.filter(status='published', start_date__gte=timezone.now()).count()
    if upcoming_count == 0:
        upcoming_count = Event.objects.filter(status='published').count()
        
    return JsonResponse({
        'total_tickets': 0,
        'total_spent': 0,
        'upcoming_events': upcoming_count,
        'reviews_written': 0,
        'tickets_trend': {'percentage': 0, 'direction': 'flat'},
        'spent_trend': {'percentage': 0, 'direction': 'flat'},
        'upcoming_trend': {'percentage': 0, 'direction': 'flat'},
        'reviews_trend': {'percentage': 0, 'direction': 'flat'}
    })

def api_dashboard_recommendations(request):
    """API endpoint to get recommended events (featured events)"""
    events = Event.objects.filter(status='published', is_featured=True)[:3]
    if not events.exists():
        events = Event.objects.filter(status='published')[:3]
        
    results = []
    for e in events:
        results.append({
            'id': e.id,
            'title': e.title,
            'date': e.start_date.isoformat(),
            'location': e.venue,
            'price': float(e.price),
            'image': e.banner_image,
        })
    return JsonResponse(results, safe=False)

def api_dashboard_recent_activity(request):
    """API endpoint to get recent activity"""
    return JsonResponse([], safe=False)

def api_tickets_upcoming(request):
    """API endpoint to get upcoming tickets"""
    return JsonResponse({'results': []})




