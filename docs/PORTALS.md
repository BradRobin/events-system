# EventHub Portal Guide

Developer reference for the three user-facing surfaces and how they connect.

---

## URL map

| Portal | Base URL | Login | Dashboard |
|--------|----------|-------|-----------|
| **Attendee** | `/` | `/login/` | `/dashboard/` |
| **Organizer** | `/organizer/` | `/organizer/login/` (→ shared login) | `/organizer/dashboard/` |
| **Admin** | `/admin-portal/` | `/admin/login/` | `/admin-portal/dashboard/` |
| **Django admin** | `/django-admin/` | Django superuser | Built-in |

Attendee routes are also mirrored under `/attendee/` for legacy compatibility (`config/urls.py`).

---

## Authentication

### Shared auth (`frontend/templates/shared/auth/`)

- **Register:** `/register/` — role: `attendee` or `organizer`
- **Login:** `/login/` — role picker (attendee / organizer)
- **Organizer login:** `/organizer/login/` — same template, organizer pre-selected
- **Admin login:** separate UI at `/admin/login/` (not shared auth template)

### API prefixes

| Role | API base |
|------|----------|
| Attendee | `/api/attendee/` |
| Organizer | `/api/organizer/` |
| Admin | `/api/admin/` |

---

## Attendee portal

**Templates:** `frontend/templates/attendee/`  
**URL config:** `config/attendee_urls.py`  
**Base layout:** `attendee/base.html` (SEO-enabled)

### Public marketing pages (indexable)

`/`, `/about/`, `/contact/`, `/faq/`, `/help-center/`, `/how-it-works/`, `/privacy/`, `/terms/`, `/success-stories/`, `/customer-stories/`, `/events/`, `/events/search/`

### Authenticated pages (`noindex`)

`/dashboard/`, `/profile/`, `/tickets/`, `/bookings/`, `/cart/`, `/wishlist/`, `/support/`, `/settings/`, `/notifications/`

### Voice

- Second person (“you”), benefit-led
- Kenya / M-Pesa context where relevant
- CTAs: Browse Events, Get Tickets, Contact Support

---

## Organizer portal

**Templates:** `frontend/templates/organizer/`  
**URL config:** `config/organizer_urls.py`  
**Base layout:** `organizer/base.html` (`noindex`)

### Key routes

| Path | Purpose |
|------|---------|
| `/organizer/events/` | Event list & editor |
| `/organizer/events/create/` | New event |
| `/organizer/tickets/` | Check-in & verification |
| `/organizer/attendees/` | Attendee roster |
| `/organizer/bookings/` | Booking ledger |
| `/organizer/promotions/` | Promo codes |
| `/organizer/reviews/` | Event feedback |
| `/organizer/settings/` | Account settings |
| `/organizer/faq/` | Organizer help |

### Voice

- Imperative, task-oriented (“Create event”, “Approve payment”)
- Refer to buyers as **attendees**
- Currency: **KES**

### Known gaps

- Detail routes for single event/attendee/booking may 500 if templates missing — use list views until fixed
- `/organizer/support/` redirects to FAQ

---

## Admin portal

**Templates:** `frontend/templates/admin/`  
**URL config:** `config/admin_urls.py`  
**Base layout:** `admin/base_admin.html` (`noindex`)

### Modules

Events (pending/all), Users, Organizers, Bookings, Refunds, Tickets, Scanner, Payments, Payouts, Reports, Support, Settings

### Voice

- Platform scope (“all users”, “platform revenue”)
- Neutral, audit-friendly labels

---

## SEO endpoints

| URL | Description |
|-----|-------------|
| `/robots.txt` | Crawl rules; blocks private paths |
| `/sitemap.xml` | Public marketing URLs |
| `/api/platform/stats/` | Live headline metrics (JSON) |

---

## Environment

| Variable | Use |
|----------|-----|
| `SITE_URL` | Canonical site URL (CSRF, privacy links, sitemap) |
| `GOOGLE_OAUTH_CLIENT_ID` | Attendee Google sign-in |

---

## Local development

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open `http://localhost:8000/` (attendee), `/organizer/dashboard/`, `/admin/login/`.
