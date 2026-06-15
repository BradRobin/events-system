# EventHub: Online Event Management and Ticketing System

## Overview

EventHub is a responsive event discovery and ticketing platform for Kenya. Attendees browse and book events; organizers create and manage them; administrators oversee the platform.

## Portals

| Portal | URL | Audience |
|--------|-----|----------|
| **Attendee** | `/` | Discover events, buy tickets, manage bookings |
| **Organizer** | `/organizer/dashboard/` | Create events, sell tickets, check in attendees |
| **Admin** | `/admin-portal/` | Platform operations (login at `/admin/login/`) |
| **Django admin** | `/django-admin/` | Superuser database admin |

See [docs/PORTALS.md](docs/PORTALS.md) for routes, auth flows, and API prefixes.  
See [docs/CONTENT_AND_SEO_AUDIT.md](docs/CONTENT_AND_SEO_AUDIT.md) for content and SEO standards.

## Technology Stack

- **Backend:** Python, Django, Django REST Framework
- **Frontend:** Django templates, HTML/CSS/JavaScript
- **Database:** SQLite (dev) / PostgreSQL (production)

## Project Structure

```
events-system/
├── config/           # Django settings, URLs
├── accounts/         # Users, auth
├── events/           # Events module
├── bookings/         # Tickets & bookings
├── reviews/          # Event reviews
├── payments/         # Payment orders
├── frontend/
│   ├── static/       # CSS, JS, assets
│   └── templates/    # attendee/, organizer/, admin/, shared/
├── docs/             # Portal guide & content audit
└── requirements.txt
```

## Getting Started

### Prerequisites

- Python 3.10+
- pip

### Installation

```bash
git clone <repository-url>
cd events-system
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open:

- Attendee site: http://localhost:8000/
- Organizer portal: http://localhost:8000/organizer/dashboard/
- Admin portal: http://localhost:8000/admin/login/

### Environment

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Production URL (CSRF, sitemap, legal links) |
| `DATABASE_URL` | PostgreSQL in production |
| `GOOGLE_OAUTH_CLIENT_ID` | Google sign-in |

## SEO

- Public pages expose meta descriptions via `attendee/base.html`
- `/robots.txt` and `/sitemap.xml` are served by Django
- Live platform metrics: `GET /api/platform/stats/`

## Usage

- **Attendees:** Register at `/register/`, browse `/events/`, checkout with M-Pesa, view tickets at `/tickets/`
- **Organizers:** Register with organizer role, manage events at `/organizer/events/`
- **Administrators:** Sign in at `/admin/login/`, use `/admin-portal/` for operations
