"""
Django settings for EventHub project.
"""

from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().resolve().parent.parent.parent
SECRET_KEY = 'django-insecure-j&#8z0n2)9txjmpi6=8i2h=d8ks8gt4gar#!kb0u0z6jd)im+#'
DEBUG = True
ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'corsheaders',
    'django_extensions',
    
    # Local apps
    'accounts',
    'events',
    'bookings',
    'reviews',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'frontend', 'templates'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'shared'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'shared', 'auth'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'shared', 'components'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'auth'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'dashboard'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'events'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'bookings'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'tickets'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'cart'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'wishlist'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'profile'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'support'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'notifications'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'payments'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'pages'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'errors'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'components'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'attendee', 'sections'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'auth'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'dashboard'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'events'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'tickets'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'bookings'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'attendees'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'payouts'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'promotions'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'reports'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'profile'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'settings'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'support'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'organizer', 'components'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'dashboard'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'events'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'bookings'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'users'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'tickets'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'payments'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'reports'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'settings'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'support'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'notifications'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'profile'),
            os.path.join(BASE_DIR, 'frontend', 'templates', 'admin', 'components'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/tmp/db.sqlite3' if os.environ.get('VERCEL') else BASE_DIR / 'backend' / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend', 'static'),
]
STATIC_ROOT = os.path.join(BASE_DIR, 'backend', 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'backend', 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

# Login URLs
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/'

# Session Settings
SESSION_COOKIE_AGE = 86400
SESSION_SAVE_EVERY_REQUEST = True

# Email Settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF Settings
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}