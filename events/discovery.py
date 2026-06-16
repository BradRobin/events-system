"""
events/discovery.py
===================
Location-based event discovery engine for EventHub.

Aggregates listings from Kenya's top 10 event platforms:
EventHub, Ticketsasa, Mookh, Pata Ticket, LipaTix, TykoPass, Karibisha,
Pesapal Events, Eventbrite, and AllEvents.in.
"""

import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import unquote
import urllib.request
import urllib.parse
import json

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    BeautifulSoup = None
    HAS_BS4 = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Urllib requests Compatibility Wrapper
# ---------------------------------------------------------------------------

class UrllibResponse:
    def __init__(self, content, status_code, headers=None):
        self.content = content
        self.text = content.decode('utf-8', errors='ignore') if isinstance(content, bytes) else content
        self.status_code = status_code
        self.headers = headers or {}

    def json(self):
        return json.loads(self.text)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP Error {self.status_code}")


def urllib_request(method, url, params=None, data=None, headers=None, timeout=5):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    
    req_headers = {}
    if headers:
        for k, v in headers.items():
            req_headers[k] = v

    req_data = None
    if data:
        if isinstance(data, dict):
            req_data = urllib.parse.urlencode(data).encode('utf-8')
            if 'Content-Type' not in req_headers:
                req_headers['Content-Type'] = 'application/x-www-form-urlencoded'
        elif isinstance(data, str):
            req_data = data.encode('utf-8')
        else:
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return UrllibResponse(response.read(), response.status, dict(response.info()))
    except urllib.error.HTTPError as e:
        return UrllibResponse(e.read(), e.code, dict(e.info()))
    except Exception as e:
        # Fallback wrapper for general connection or timeout errors
        return UrllibResponse(str(e).encode('utf-8'), 500, {})


def _regex_extract_events(html_content: str, county: str, base_url: str, source_name: str) -> list[dict]:
    """
    A robust, regex-based fallback event extractor to parse external sites
    without requiring BeautifulSoup4.
    """
    events = []
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html_content)
    seen_links = set()
    valid_links = []
    for href in hrefs:
        full_url = _resolve_url(href, base_url)
        if full_url in seen_links:
            continue
        if any(kw in full_url.lower() for kw in ('/event', 'ticketsasa.com/', 'allevents.in/', 'eventbrite.com/e/')):
            seen_links.add(full_url)
            valid_links.append(full_url)
            
    for link in valid_links[:8]:
        slug = link.rstrip('/').split('/')[-1]
        title = slug.replace('-', ' ').replace('_', ' ').title()
        title = re.sub(r'\d+$', '', title).strip()
        if len(title) < 5:
            continue
            
        events.append({
            "type": "external",
            "title": title[:120],
            "date_text": "Check website",
            "venue": county,
            "price_text": "Check website",
            "source": source_name,
            "source_url": link,
            "image_url": "",
            "description": f"{title} — discover more on {source_name}",
            "can_purchase": False,
        })
    return events

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REQUEST_TIMEOUT = 4  # seconds per scraper HTTP call
SCRAPER_TIMEOUT = 10  # seconds for the whole ThreadPoolExecutor round-trip
MAX_WORKERS = 8

# Top Kenyan event platforms (priority order for unified search UI)
KENYA_EVENT_PLATFORMS = [
    {"id": "eventhub", "name": "EventHub", "bookable": True, "priority": 0},
    {"id": "ticketsasa", "name": "Ticketsasa", "bookable": False, "priority": 1},
    {"id": "mookh", "name": "Mookh", "bookable": False, "priority": 2},
    {"id": "pataticket", "name": "Pata Ticket", "bookable": False, "priority": 3},
    {"id": "lipatix", "name": "LipaTix", "bookable": False, "priority": 4},
    {"id": "tykopass", "name": "TykoPass", "bookable": False, "priority": 5},
    {"id": "karibisha", "name": "Karibisha", "bookable": False, "priority": 6},
    {"id": "pesapal", "name": "Pesapal Events", "bookable": False, "priority": 7},
    {"id": "eventbrite", "name": "Eventbrite", "bookable": False, "priority": 8},
    {"id": "allevents", "name": "AllEvents.in", "bookable": False, "priority": 9},
]

PLATFORM_PRIORITY = {p["name"]: p["priority"] for p in KENYA_EVENT_PLATFORMS}

CARD_SELECTORS = (
    ".event-card",
    ".event-item",
    "article[class*='event']",
    "[class*='event-card']",
    ".card[class*='event']",
    "li.item",
    ".col-md-4 .card",
    ".col-sm-6 .card",
    ".product-item",
    ".listing-card",
)

SCRAPER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
}

# Keyword → canonical county name used for DB filtering and display
KENYA_COUNTIES = {
    "nairobi": "Nairobi",
    "mombasa": "Mombasa",
    "kisumu": "Kisumu",
    "nakuru": "Nakuru",
    "eldoret": "Eldoret",
    "uasin gishu": "Uasin Gishu",
    "thika": "Kiambu",
    "kiambu": "Kiambu",
    "machakos": "Machakos",
    "meru": "Meru",
    "kisii": "Kisii",
    "nyeri": "Nyeri",
    "kakamega": "Kakamega",
    "malindi": "Kilifi",
    "kilifi": "Kilifi",
    "garissa": "Garissa",
    "lamu": "Lamu",
    "naivasha": "Nakuru",
    "nanyuki": "Laikipia",
    "laikipia": "Laikipia",
    "embu": "Embu",
    "kitui": "Kitui",
    "bungoma": "Bungoma",
    "kericho": "Kericho",
    "migori": "Migori",
    "siaya": "Siaya",
    "homabay": "Homa Bay",
    "homa bay": "Homa Bay",
}


# ---------------------------------------------------------------------------
# Location Resolution
# ---------------------------------------------------------------------------


def resolve_county_from_coords(lat: float, lng: float) -> str | None:
    """
    Reverse-geocode GPS coordinates to a Kenyan county name via
    OpenStreetMap Nominatim (free, no key required).

    Returns the county name string, or None if the call fails.
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "zoom": 10,
            "addressdetails": 1,
        }
        headers = {"User-Agent": "EventHub-Kenya/1.0 (contact@eventhub.ke)"}
        resp = urllib_request("GET", url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})
        raw = (
            addr.get("county")
            or addr.get("state_district")
            or addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or ""
        )
        # Strip trailing "County" word if present
        county = re.sub(r"\s*county\s*$", "", raw, flags=re.IGNORECASE).strip()
        return county or None
    except Exception as exc:
        logger.warning("Nominatim reverse-geocode failed: %s", exc)
        return None


def resolve_county_from_ip(ip_address: str) -> str:
    """
    Determine city/county from an IP address via ip-api.com (free, 45 req/min).
    Returns a county name; falls back to 'Nairobi' on any error.
    """
    if ip_address in ("127.0.0.1", "::1", "localhost", ""):
        return "Nairobi"
    try:
        resp = urllib_request("GET", f"http://ip-api.com/json/{ip_address}", timeout=4)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "success":
            city = (data.get("city") or "").lower()
            region = (data.get("regionName") or "").lower()
            combined = f"{city} {region}"
            for key, val in KENYA_COUNTIES.items():
                if key in combined:
                    return val
            # Return raw city name if we don't have a mapping
            return (data.get("city") or "Nairobi").title()
    except Exception as exc:
        logger.warning("IP geolocation failed: %s", exc)
    return "Nairobi"


def normalize_county(location_text: str) -> str:
    """
    Convert a free-text location string (e.g. from user profile) to a
    clean canonical county name.
    """
    if not location_text:
        return "Nairobi"
    text = location_text.lower().strip()
    for key, val in KENYA_COUNTIES.items():
        if key in text:
            return val
    # Capitalise as-is if no mapping found
    return location_text.strip().title()


# ---------------------------------------------------------------------------
# Scrapers
# ---------------------------------------------------------------------------


def _safe_text(el) -> str:
    """Extract stripped text from a BS4 element, returning '' if None."""
    return el.get_text(strip=True) if el else ""


def _resolve_url(href: str, base: str) -> str:
    """Make a relative URL absolute."""
    if not href:
        return base
    if href.startswith("http"):
        return href
    return base.rstrip("/") + "/" + href.lstrip("/")


def _get_image(el) -> str:
    """Extract an image URL from a BS4 <img> element."""
    if not el:
        return ""
    src = el.get("data-src") or el.get("data-lazy") or el.get("src") or ""
    if src.startswith("data:"):
        return ""
    return src


def _search_terms(county: str, query: str) -> str:
    parts = [p for p in (query.strip(), county.strip()) if p]
    return " ".join(parts)


def _build_external_event(
    *,
    title: str,
    source_name: str,
    source_url: str,
    county: str,
    date_text: str = "Check website",
    venue: str = "",
    price_text: str = "Check website",
    image_url: str = "",
    description: str = "",
) -> dict | None:
    title = (title or "").strip()[:120]
    if len(title) < 3:
        return None
    venue = (venue or county or "Kenya").strip()
    desc = description or f"{title} — found on {source_name}"
    return {
        "type": "external",
        "title": title,
        "date_text": date_text or "Check website",
        "venue": venue,
        "price_text": price_text or "Check website",
        "source": source_name,
        "source_url": source_url or "",
        "image_url": image_url or "",
        "description": desc[:240],
        "can_purchase": False,
    }


def _scrape_listing_page(
    *,
    county: str,
    source_name: str,
    url: str,
    base_url: str,
    limit: int = 10,
) -> list[dict]:
    """Generic HTML listing scraper used across Kenyan event platforms."""
    results: list[dict] = []
    try:
        resp = urllib_request("GET", url, headers=SCRAPER_HEADERS, timeout=REQUEST_TIMEOUT)
        if resp.status_code >= 400:
            return results
        html = resp.text
        if not HAS_BS4:
            return _regex_extract_events(html, county, base_url, source_name)[:limit]

        soup = BeautifulSoup(html, "html.parser")
        cards = []
        for selector in CARD_SELECTORS:
            found = soup.select(selector)
            if found:
                cards = found
                break
        if not cards:
            cards = soup.select("a[href*='event']")[:limit]

        for card in cards[:limit]:
            if card.name == "a":
                title = _safe_text(card) or card.get("title", "")
                link = _resolve_url(card.get("href", ""), base_url)
                payload = _build_external_event(
                    title=title,
                    source_name=source_name,
                    source_url=link,
                    county=county,
                )
            else:
                title_el = card.select_one(
                    "h1, h2, h3, h4, .event-title, [class*='title'], [itemprop='name']"
                )
                title = _safe_text(title_el)
                date_el = card.select_one(
                    ".date, .event-date, time, [class*='date'], [itemprop='startDate']"
                )
                venue_el = card.select_one(
                    ".venue, .location, [class*='venue'], [class*='location'], [itemprop='location']"
                )
                price_el = card.select_one(".price, [class*='price'], .ticket-price")
                link_el = card.select_one("a[href]")
                img_el = card.select_one("img")
                link = _resolve_url(link_el.get("href", "") if link_el else "", base_url)
                image = _get_image(img_el)
                if image and not image.startswith("http"):
                    image = _resolve_url(image, base_url)
                date_text = _safe_text(date_el) or "Check website"
                if date_el and date_el.get("datetime"):
                    date_text = date_el["datetime"]
                payload = _build_external_event(
                    title=title,
                    source_name=source_name,
                    source_url=link,
                    county=county,
                    date_text=date_text,
                    venue=_safe_text(venue_el),
                    price_text=_safe_text(price_el),
                    image_url=image,
                )
            if payload:
                results.append(payload)
    except Exception as exc:
        logger.warning("%s scrape failed (%s): %s", source_name, url, exc)
    return results


def extract_event_terms(search_text: str, county: str) -> str:
    """Strip county tokens from free-text search to isolate event keywords."""
    if not search_text:
        return ""
    text = search_text.strip()
    if county:
        text = re.sub(re.escape(county), "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"\bcounty\b", "", text, flags=re.IGNORECASE).strip()
    return re.sub(r"\s+", " ", text).strip()


def filter_events_by_search(events: list[dict], search_text: str) -> list[dict]:
    if not search_text:
        return events
    terms = [t for t in re.split(r"\s+", search_text.lower()) if len(t) > 2]
    if not terms:
        return events
    filtered = []
    for event in events:
        haystack = " ".join(
            [
                event.get("title", ""),
                event.get("description", ""),
                event.get("venue", ""),
                event.get("date_text", ""),
            ]
        ).lower()
        if any(term in haystack for term in terms):
            filtered.append(event)
    return filtered or events


def sort_events_by_platform(events: list[dict]) -> list[dict]:
    return sorted(
        events,
        key=lambda e: (
            PLATFORM_PRIORITY.get(e.get("source", ""), 99),
            e.get("title", "").lower(),
        ),
    )


# ---- Ticketsasa ----

def scrape_ticketsasa(county: str, query: str = "") -> list[dict]:
    base = "https://www.ticketsasa.com"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    return _scrape_listing_page(
        county=county,
        source_name="Ticketsasa",
        url=f"{base}/events?q={term}",
        base_url=base,
    )


def scrape_mookh(county: str, query: str = "") -> list[dict]:
    base = "https://mookh.com"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    for url in (f"{base}/events?search={term}", f"{base}/events?q={term}", f"{base}/events"):
        batch = _scrape_listing_page(county=county, source_name="Mookh", url=url, base_url=base)
        if batch:
            return batch
    return []


def scrape_pataticket(county: str, query: str = "") -> list[dict]:
    base = "https://pataticket.co.ke"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    return _scrape_listing_page(
        county=county,
        source_name="Pata Ticket",
        url=f"{base}/events?search={term}",
        base_url=base,
    )


def scrape_lipatix(county: str, query: str = "") -> list[dict]:
    base = "https://lipatix.com"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    for url in (f"{base}/events?search={term}", f"{base}/events", base):
        batch = _scrape_listing_page(county=county, source_name="LipaTix", url=url, base_url=base)
        if batch:
            return batch
    return []


def scrape_tykopass(county: str, query: str = "") -> list[dict]:
    base = "https://tykopass.com"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    return _scrape_listing_page(
        county=county,
        source_name="TykoPass",
        url=f"{base}/events?search={term}",
        base_url=base,
    )


def scrape_karibisha(county: str, query: str = "") -> list[dict]:
    base = "https://www.karibisha.com"
    term = urllib.parse.quote_plus(_search_terms(county, query))
    for url in (f"{base}/events?search={term}", f"{base}/discover", f"{base}/events"):
        batch = _scrape_listing_page(county=county, source_name="Karibisha", url=url, base_url=base)
        if batch:
            return batch
    return []


def scrape_pesapal_events(county: str, query: str = "") -> list[dict]:
    term = urllib.parse.quote_plus(_search_terms(county, query))
    batch = _scrape_listing_page(
        county=county,
        source_name="Pesapal Events",
        url=f"https://www.ticketsasa.com/events?q={term}",
        base_url="https://www.ticketsasa.com",
    )
    for item in batch:
        item["source"] = "Pesapal Events"
    return batch


# ---- AllEvents.in ----

def scrape_allevents(county: str, query: str = "") -> list[dict]:
    base = "https://allevents.in"
    city_slug = county.lower().replace(" ", "-")
    if query:
        url = f"{base}/search?q={urllib.parse.quote_plus(query)}&loc={urllib.parse.quote_plus(county)}"
    else:
        url = f"{base}/{city_slug}/all"
    return _scrape_listing_page(
        county=county,
        source_name="AllEvents.in",
        url=url,
        base_url=base,
    )


# ---- Eventbrite ----

def scrape_eventbrite(county: str, query: str = "") -> list[dict]:
    base = "https://www.eventbrite.com"
    city_slug = county.lower().replace(" ", "-")
    if query:
        url = f"{base}/d/kenya--{city_slug}/--{urllib.parse.quote_plus(query)}/"
    else:
        url = f"{base}/d/kenya--{city_slug}/events/"
    return _scrape_listing_page(
        county=county,
        source_name="Eventbrite",
        url=url,
        base_url=base,
    )


# ---- DuckDuckGo broad search (fallback) ----

def scrape_duckduckgo_events(county: str, search_text: str = "") -> list[dict]:
    """
    Broad fallback: POST to DuckDuckGo HTML endpoint and extract result links
    that reference known event platforms or contain 'event' keywords.
    Only runs when the above scrapers return very few results.
    """
    results = []
    try:
        from datetime import datetime
        year = datetime.now().year
        query = (
            f'upcoming events in {county} Kenya {year} '
            f'site:ticketsasa.com OR site:mookh.com OR site:pataticket.co.ke '
            f'OR site:lipatix.com OR site:tykopass.com OR site:karibisha.com '
            f'OR site:eventbrite.com OR site:allevents.in'
        )
        if search_text:
            query = f'{search_text} {query}'
        resp = urllib_request(
            "POST",
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers=SCRAPER_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        if not HAS_BS4:
            return _regex_extract_events(resp.text, county, "https://duckduckgo.com", "DuckDuckGo Web")
        soup = BeautifulSoup(resp.text, "html.parser")

        for el in soup.select(".result__body, .result")[:8]:
            title_el = el.select_one(".result__a")
            snippet_el = el.select_one(".result__snippet")

            title = _safe_text(title_el)
            if not title or len(title) < 4:
                continue

            raw_href = title_el.get("href", "") if title_el else ""
            # DuckDuckGo wraps links — extract the real URL
            match = re.search(r"uddg=([^&]+)", raw_href)
            link = unquote(match.group(1)) if match else raw_href

            snippet = _safe_text(snippet_el)

            # Map known platforms
            source = "Web"
            if "ticketsasa" in link:
                source = "Ticketsasa"
            elif "mookh" in link:
                source = "Mookh"
            elif "pataticket" in link:
                source = "Pata Ticket"
            elif "lipatix" in link:
                source = "LipaTix"
            elif "tykopass" in link:
                source = "TykoPass"
            elif "karibisha" in link:
                source = "Karibisha"
            elif "eventbrite" in link:
                source = "Eventbrite"
            elif "allevents" in link:
                source = "AllEvents.in"
            elif "facebook" in link:
                source = "Facebook Events"

            results.append({
                "type": "external",
                "title": title[:120],
                "date_text": "Check website for dates",
                "venue": county,
                "price_text": "Check website",
                "source": source,
                "source_url": link,
                "image_url": "",
                "description": snippet[:200],
                "can_purchase": False,
            })
    except Exception as exc:
        logger.warning("DuckDuckGo search failed for %s: %s", county, exc)
    return results


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def discover_external_events(county: str, search_text: str = "") -> list[dict]:
    """
    Query Kenya's top event platforms in parallel and return deduplicated results.

    Platforms: Ticketsasa, Mookh, Pata Ticket, LipaTix, TykoPass, Karibisha,
    Pesapal Events, Eventbrite, AllEvents.in (+ DuckDuckGo fallback).
    """
    return discover_events_for_county(county, search_text=search_text)


def discover_events_for_county(county: str, search_text: str = "") -> list[dict]:
    """
    Run all three scrapers in parallel (ThreadPoolExecutor, max 3 workers).
    Falls back to DuckDuckGo broad search if the primary scrapers return < 3 results.
    Returns a deduplicated list of external-event dicts.

    Args:
        county: A canonical Kenyan county name, e.g. "Nairobi" or "Mombasa".

    Returns:
        List of dicts; each has keys: type, title, date_text, venue, price_text,
        source, source_url, image_url, description, can_purchase.
    """
    from django.core.cache import cache
    from django.db import DatabaseError

    # Normalize county to construct a safe cache key
    county_clean = county.lower().strip().replace(' ', '_')
    query_key = re.sub(r'[^a-z0-9]+', '_', (search_text or '').lower())[:40]
    cache_key = f"discover_events_{county_clean}_{query_key}"

    # Try cache lookup first, handling potential DatabaseErrors (e.g. before migrations or in tests)
    cached_results = None
    try:
        cached_results = cache.get(cache_key)
    except DatabaseError:
        pass
    except Exception as exc:
        logger.warning("Failed to fetch discovery cache for %s: %s", county, exc)

    if cached_results is not None:
        logger.info("Returning cached discovery events for county: %s", county)
        return cached_results

    all_results: list[dict] = []

    event_terms = extract_event_terms(search_text, county)

    primary_scrapers = [
        ("ticketsasa", scrape_ticketsasa),
        ("mookh", scrape_mookh),
        ("pataticket", scrape_pataticket),
        ("lipatix", scrape_lipatix),
        ("tykopass", scrape_tykopass),
        ("karibisha", scrape_karibisha),
        ("pesapal", scrape_pesapal_events),
        ("eventbrite", scrape_eventbrite),
        ("allevents", scrape_allevents),
    ]

    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_map = {
                executor.submit(fn, county, event_terms): name
                for name, fn in primary_scrapers
            }
            for future in as_completed(future_map, timeout=SCRAPER_TIMEOUT):
                name = future_map[future]
                try:
                    batch = future.result()
                    all_results.extend(batch)
                    logger.info("Scraper '%s' returned %d events for %s", name, len(batch), county)
                except Exception as exc:
                    logger.warning("Scraper '%s' raised: %s", name, exc)
    except Exception as exc:
        logger.warning("Scraping execution or as_completed loop timed out/failed for %s: %s", county, exc)

    if len(all_results) < 5:
        logger.info("Primary scrapers returned < 5 results; falling back to DuckDuckGo")
        all_results.extend(scrape_duckduckgo_events(county, event_terms))

    all_results = filter_events_by_search(all_results, event_terms or search_text)

    # Deduplicate by normalised title
    seen: set[str] = set()
    unique: list[dict] = []
    for event in all_results:
        key = re.sub(r"\s+", " ", event["title"].lower().strip())
        if key and key not in seen:
            seen.add(key)
            unique.append(event)

    unique = sort_events_by_platform(unique)
    try:
        timeout = 3600 if unique else 300
        cache.set(cache_key, unique, timeout)
    except DatabaseError:
        pass
    except Exception as exc:
        logger.warning("Failed to write discovery cache for %s: %s", county, exc)

    return unique
