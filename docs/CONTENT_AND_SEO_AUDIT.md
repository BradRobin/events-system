# EventHub — Content, SEO & Documentation Audit

**Audit date:** June 2026  
**Scope:** Attendee (`/`), Organizer (`/organizer/`), Admin (`/admin-portal/`), shared auth, README, legal pages.

---

## Executive summary

EventHub has three portals with **different maturity levels**. The attendee marketing surface has SEO hooks but suffers from **brand drift**, **contradictory claims**, and **placeholder social proof**. Organizer and admin portals are **application UIs** (should be `noindex`) with minimal meta and some **broken detail routes**. Developer docs (`README.md`) reference a non-existent `backend/` folder and omit portal URLs.

**Canonical brand:** **EventHub** (product) — operated under ICTA contact channels where legally required.

---

## Portal voice & audience

| Portal | Audience | Voice | Primary job-to-be-done |
|--------|----------|-------|------------------------|
| **Attendee** | Event-goers in Kenya | Friendly, discovery-focused, plain language | Find events, book tickets, manage bookings |
| **Organizer** | Event hosts / businesses | Operational, metrics-driven, concise | Create events, sell tickets, check in attendees |
| **Admin** | Platform operators | Oversight, approvals, compliance | Moderate users/events, payments, reports |

### Terminology standard

| Use | Avoid |
|-----|-------|
| attendee | customer, buyer (organizer UI) |
| organizer | host (unless marketing) |
| ticket / booking | order (unless payment context) |
| M-Pesa | “credit cards” (unless actually supported) |
| KES | Kes, $ |

---

## SEO inventory

### Implemented (attendee `base.html`)

- `title`, `meta description`, `keywords`, `author`
- Open Graph + Twitter Card tags
- `theme-color`, favicon

### Gaps addressed in this pass

- `robots.txt` and `sitemap.xml` routes
- `noindex` on private/authenticated surfaces
- Absolute `og:image` URLs
- Per-page `meta_description` on key public pages
- Canonical link support via `{% block canonical %}`

### Remaining recommendations

- Add `og-share.png` (1200×630) — favicon is not ideal for social previews
- Dynamic per-event SEO on `/events/detail/?id=`
- JSON-LD: `Organization` (homepage), `FAQPage` (FAQ), `Event` (detail)
- `hreflang` if Kiswahili launches

---

## Brand & contact consistency

| Field | Canonical value |
|-------|-----------------|
| Product name | EventHub |
| Support email | info@ICTA.co.ke |
| Phone | +254 743 042 018 |
| Location | Nairobi, Kenya |
| Copyright | © 2026 EventHub. All rights reserved. |

**Previously conflicting:** `support@eventhub.com`, `legal@eventhub.com`, `Events System Sable` (footer only), `+254 700 000 000` (terms placeholder).

---

## Payment messaging (source of truth)

Checkout implements **M-Pesa** (STK push + manual screenshot upload). Marketing copy must **not** claim Visa/Mastercard unless card rails are added to checkout.

**Aligned pages:** FAQ, Help Center, Terms, How It Works, homepage how-it-works section.

---

## Stats & social proof (source of truth)

| Metric | Source |
|--------|--------|
| Events hosted | `Event.objects.exclude(status='draft').count()` |
| Happy attendees | Sum of non-cancelled ticket quantities |
| Satisfaction % | Average `EventReview.rating` → `(avg/5)*100` |
| Review count / average | `EventReview` aggregate |

**API:** `GET /api/platform/stats/`  
**Pages wired:** Success Stories, About (JS), Homepage (server context)

**Do not use:** hardcoded 10,000+ attendees, 1,248 reviews, `randomuser.me` as verified customers without disclosure.

---

## Page-by-page findings (attendee)

| Page | Status | Notes |
|------|--------|-------|
| Homepage | ⚠️ | Hero fallback stats if DB empty; testimonials are illustrative |
| About | ✅ | Stats via `about.js` + API |
| Contact | ✅ | Contact info aligned to ICTA |
| FAQ | ✅ | M-Pesa accurate |
| Help Center | ✅ | Payment text fixed |
| How It Works | ✅ | Placeholder video removed |
| Privacy / Terms | ⚠️ | Legal boilerplate; dates should be updated together |
| Success Stories | ✅ | Live stats; stories mix user submissions + defaults |
| Reviews | ✅ | Loads from database via API |
| Events list | ✅ | Custom meta |
| Event detail | ⚠️ | Generic title for all events |
| Cart | ✅ | Title fixed to “Cart” |
| Dashboard, tickets, settings | ✅ | `noindex` |

---

## Organizer portal findings

| Issue | Priority |
|-------|----------|
| Missing templates: `event_detail.html`, `attendee_detail.html`, `booking_detail.html` | P0 |
| Two settings UIs (`/settings/` vs `/profile/`) | P1 |
| No Tickets in navbar (FAQ references URL) | P1 |
| Title format inconsistent (`|` vs `-`) | P2 |
| FAQ exposes raw paths / localStorage keys | P2 |
| Orphan templates (`base_organizer.html`, etc.) | P3 |

---

## Admin portal findings

| Issue | Priority |
|-------|----------|
| `noindex` added | Done |
| Top bar stuck on “Dashboard” label | P2 |
| Pending organizers not in sidebar | P1 |
| Settings payment/security → under construction | P2 |
| Three admin entry points (`django-admin`, `/admin/login/`, `/admin-portal/`) — document in PORTALS.md | Done |

---

## Broken links fixed

| Was | Now |
|-----|-----|
| `/attendee/support/faq/` (404) | `/faq/` |
| `/attendee/` error links | `/`, `/events/` |

---

## Developer documentation

| File | Purpose |
|------|---------|
| `README.md` | Setup, portal URLs, project structure |
| `docs/PORTALS.md` | Portal architecture, routes, auth flows |
| `docs/CONTENT_AND_SEO_AUDIT.md` | This audit |
| `DEPLOY_RENDER.md` | Render deployment (legacy host notes) |

---

## Maintenance checklist (quarterly)

1. Run content diff on FAQ vs checkout flow after payment changes
2. Verify `/api/platform/stats/` matches displayed marketing numbers
3. Update legal “Last updated” dates when policies change
4. Audit organizer FAQ for mock-data disclaimers
5. Confirm `SITE_URL` env matches production domain in privacy policy
6. Review testimonials / success stories for team-name conflicts

---

## Priority backlog (not yet implemented)

1. Dynamic event detail SEO (title, description, OG image per event)
2. Merge organizer settings pages; fix missing detail templates
3. Add organizer “Host an event” CTA on attendee navbar/footer
4. Replace homepage testimonials with API-driven reviews or label as “Community highlights”
5. Sponsor section — verify partnerships or remove logos
6. Remove mobile-app claims unless app ships
