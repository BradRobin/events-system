"""Public SEO endpoints: robots.txt and sitemap.xml."""

from django.http import HttpResponse
from django.views.decorators.http import require_GET


# Paths that should not be crawled (prefix match on path)
_DISALLOW_PREFIXES = (
    '/dashboard/',
    '/profile/',
    '/tickets/',
    '/bookings/',
    '/cart/',
    '/wishlist/',
    '/support/',
    '/settings/',
    '/notifications/',
    '/organizer/',
    '/admin-portal/',
    '/admin/',
    '/django-admin/',
    '/api/',
    '/login/',
    '/register/',
)


_PUBLIC_SITEMAP_PATHS = (
    '/',
    '/about/',
    '/contact/',
    '/faq/',
    '/help-center/',
    '/how-it-works/',
    '/privacy/',
    '/terms/',
    '/success-stories/',
    '/customer-stories/',
    '/events/',
    '/events/search/',
    '/reviews/',
)


@require_GET
def robots_txt(request):
    lines = ['User-agent: *']
    for prefix in _DISALLOW_PREFIXES:
        lines.append(f'Disallow: {prefix}')
    lines.append('')
    lines.append(f'Sitemap: {request.build_absolute_uri("/sitemap.xml")}')
    return HttpResponse('\n'.join(lines) + '\n', content_type='text/plain')


@require_GET
def sitemap_xml(request):
  urls = []
  for path in _PUBLIC_SITEMAP_PATHS:
      loc = request.build_absolute_uri(path)
      urls.append(f'  <url><loc>{loc}</loc></url>')

  body = (
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + '\n'.join(urls)
      + '\n</urlset>'
  )
  return HttpResponse(body, content_type='application/xml')
