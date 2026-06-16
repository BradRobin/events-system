"""
Legacy form-submit endpoints kept for backward compatibility.
Uses the same auth core as the modern JSON API.
"""
import json

from django.contrib.auth import login as django_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .auth import issue_token_pair, login_user
from .api_errors import safe_api_error_response
from .models import User as CustomUser
from .views import PUBLIC_REGISTRATION_ROLES, user_payload


def _login_redirect_for(user, requested_role):
    if user.role == 'admin' or user.is_staff or user.is_superuser:
        return '/admin-portal/dashboard/'
    if user.role == 'organizer':
        return '/organizer/dashboard/'
    if requested_role == 'organizer':
        return '/organizer/dashboard/'
    return '/dashboard/'


@csrf_exempt
@require_http_methods(['POST'])
def login_submit(request):
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        email = (data.get('email') or data.get('username') or '').strip()
        password = data.get('password') or ''
        role = data.get('role', 'attendee')

        if not email or not password:
            return JsonResponse({'success': False, 'error': 'Email and password required'}, status=400)

        user = login_user(email, password)
        if not user:
            return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)
        if not user.is_active:
            return JsonResponse({'success': False, 'error': 'This account is inactive.'}, status=403)
        if role == 'organizer' and user.role != 'organizer' and not user.is_superuser:
            return JsonResponse({'success': False, 'error': 'Not an organizer account'}, status=403)

        django_login(request, user)
        tokens = issue_token_pair(user)
        user_data = user_payload(user)

        return JsonResponse({
            'success': True,
            'redirect_url': _login_redirect_for(user, role),
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': {
                'id': user_data['id'],
                'name': user_data['full_name'],
                'email': user_data['email'],
                'role': user_data['role'],
            },
        })
    except Exception as exc:
        return safe_api_error_response(request, exc, message='Sign in could not be completed. Please try again.')


@csrf_exempt
@require_http_methods(['POST'])
def register_submit(request):
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        password = (data.get('password1') or data.get('password') or '').strip()
        role = (data.get('role') or 'attendee').strip()
        organization_name = (data.get('organization_name') or '').strip()

        if not name or not email or not password:
            return JsonResponse({'success': False, 'error': 'All fields are required'}, status=400)
        if role not in PUBLIC_REGISTRATION_ROLES:
            return JsonResponse({'success': False, 'error': 'Invalid registration role.'}, status=400)
        if role == 'organizer' and not organization_name:
            return JsonResponse({'success': False, 'error': 'Organization name is required for organizers.'}, status=400)
        if CustomUser.objects.filter(username__iexact=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already registered'}, status=400)
        if CustomUser.objects.filter(email__iexact=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already registered'}, status=400)

        try:
            validate_password(password)
        except ValidationError as exc:
            return JsonResponse({'success': False, 'error': exc.messages[0]}, status=400)

        name_parts = name.split(' ', 1)
        user = CustomUser.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else '',
            role=role,
            organization_name=organization_name if role == 'organizer' else '',
            phone=(data.get('phone') or '').strip(),
        )
        django_login(request, user)
        tokens = issue_token_pair(user)
        user_data = user_payload(user)

        redirect_url = '/organizer/dashboard/' if role == 'organizer' else '/dashboard/'
        return JsonResponse({
            'success': True,
            'redirect_url': redirect_url,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': {
                'id': user_data['id'],
                'name': user_data['full_name'],
                'email': user_data['email'],
                'role': user_data['role'],
            },
        }, status=201)
    except Exception as exc:
        return safe_api_error_response(request, exc, message='Registration could not be completed. Please try again.')
