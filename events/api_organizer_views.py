import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Event, Category
from django.utils import timezone
from datetime import timedelta
import dateutil.parser

def organizer_required(view_func):
    """Decorator to ensure user is logged in and is an organizer."""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Please login to continue'}, status=401)
        if getattr(request.user, 'role', None) != 'organizer':
            return JsonResponse({'success': False, 'message': 'Organizer access required'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@csrf_exempt
@organizer_required
@require_http_methods(["GET"])
def api_organizer_events_list(request):
    """List events for the logged-in organizer."""
    events = Event.objects.filter(organizer=request.user).order_by('-created_at')
    
    results = []
    for e in events:
        sold = e.total_seats - e.available_seats
        revenue = float(sold * e.price)
        
        # Map DB status to frontend expected status if necessary
        frontend_status = e.status
        if e.status == 'published':
            frontend_status = 'active'
            
        results.append({
            'id': e.id,
            'name': e.title,
            'date': e.start_date.isoformat() if e.start_date else None,
            'location': e.venue,
            'capacity': e.total_seats,
            'price': float(e.price),
            'sold': sold,
            'revenue': revenue,
            'category': e.category.name if e.category else 'General',
            'status': frontend_status
        })
        
    return JsonResponse(results, safe=False)

@csrf_exempt
@organizer_required
@require_http_methods(["POST"])
def api_organizer_events_create(request):
    """Create a new event."""
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        date_str = data.get('date', '')
        location = data.get('location', '').strip()
        capacity = int(data.get('capacity', 0))
        price = float(data.get('price', 0))
        category_name = data.get('category', 'Technology')
        status = data.get('status', 'draft')

        # Map frontend status to DB status
        db_status = 'draft'
        if status == 'active':
            db_status = 'published'
            
        # Parse date
        try:
            start_date = dateutil.parser.isoparse(date_str)
        except ValueError:
            start_date = timezone.now() + timedelta(days=7)
            
        end_date = start_date + timedelta(hours=3) # Default 3 hour event
        
        # Get or create category
        slug_base = category_name.lower().replace(' ', '-')
        category, created = Category.objects.get_or_create(
            name=category_name,
            defaults={'slug': slug_base}
        )

        event = Event.objects.create(
            title=name,
            description="A new event created from the organizer dashboard.",
            category=category,
            organizer=request.user,
            start_date=start_date,
            end_date=end_date,
            venue=location,
            price=price,
            total_seats=capacity,
            available_seats=capacity,
            status=db_status
        )

        return JsonResponse({
            'id': event.id,
            'name': event.title,
            'date': event.start_date.isoformat(),
            'location': event.venue,
            'capacity': event.total_seats,
            'price': float(event.price),
            'sold': 0,
            'revenue': 0,
            'category': category.name,
            'status': status
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@organizer_required
@require_http_methods(["PUT"])
def api_organizer_events_update(request, event_id):
    """Update an existing event."""
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
        data = json.loads(request.body)
        
        if 'name' in data:
            event.title = data['name'].strip()
        if 'location' in data:
            event.venue = data['location'].strip()
        if 'capacity' in data:
            new_cap = int(data['capacity'])
            diff = new_cap - event.total_seats
            event.total_seats = new_cap
            event.available_seats += diff
        if 'price' in data:
            event.price = float(data['price'])
        if 'status' in data:
            status = data['status']
            event.status = 'published' if status == 'active' else 'draft'
            
        event.save()
        return JsonResponse({'success': True, 'message': 'Event updated successfully'})
    except Event.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Event not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@organizer_required
@require_http_methods(["DELETE"])
def api_organizer_events_delete(request, event_id):
    """Delete an event."""
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
        event.delete()
        return JsonResponse({'success': True, 'message': 'Event deleted successfully'})
    except Event.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Event not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
