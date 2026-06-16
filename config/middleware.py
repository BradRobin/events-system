import logging
import traceback

from django.http import JsonResponse

from accounts.api_errors import context_key_from_path, friendly_message

logger = logging.getLogger(__name__)

class GlobalExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        # Log the exception with full traceback
        logger.error(
            "Unhandled exception processing request for %s: %s",
            request.path,
            exception,
            exc_info=True
        )

        is_api = request.path.startswith('/api/') or request.headers.get('x-requested-with') == 'XMLHttpRequest'

        if is_api:
            context_key = context_key_from_path(request.path)
            user_message = friendly_message(context_key)
            response_data = {
                'success': False,
                'message': user_message,
                'error': user_message,
            }

            user = getattr(request, 'user', None)
            is_admin = (
                user
                and user.is_authenticated
                and (
                    user.is_staff
                    or user.is_superuser
                    or getattr(user, 'role', '') == 'admin'
                )
            )
            if is_admin:
                response_data['admin_details'] = traceback.format_exc()

            return JsonResponse(response_data, status=500)
        else:
            # Let Django's default HTML error handler take over if DEBUG is False
            # Or we could render a custom error page here
            pass

        return None
