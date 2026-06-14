/**
 * discovery.js — Location-Based Event Discovery
 * EventHub Attendee Dashboard
 *
 * Flow:
 *  1. User submits the dashboard search form
 *  2. This module intercepts the submit, tries browser Geolocation
 *  3. Falls back to typed query → user profile location → IP detection
 *  4. POSTs to /api/events/discover/
 *  5. Renders two sections: EventHub events (bookable) + external events (view-only)
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // Config
    // -------------------------------------------------------------------------
    const API_ENDPOINT  = '/api/events/discover/';
    const GEO_TIMEOUT   = 10_000; // ms — browser geolocation timeout
    const FALLBACK_LOC  = 'Nairobi';

    // Source platform accent colours used for external badges
    const SOURCE_COLORS = {
        'Ticketsasa':       '#e11d48',
        'Eventbrite':       '#f97316',
        'AllEvents.in':     '#7c3aed',
        'Facebook Events':  '#1877f2',
        'Web':              '#64748b',
    };

    // -------------------------------------------------------------------------
    // DOM References (populated on DOMContentLoaded)
    // -------------------------------------------------------------------------
    let searchForm, searchInput, searchBtn, resultsSection;

    // -------------------------------------------------------------------------
    // Init
    // -------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        searchForm     = document.getElementById('dashboardSearchForm');
        searchInput    = document.getElementById('dashboardSearchInput');
        searchBtn      = document.getElementById('dashboardSearchBtn');
        resultsSection = document.getElementById('discoveryResultsSection');

        if (searchForm) {
            searchForm.addEventListener('submit', handleSearchSubmit);
        }

        // Wire up a close button if it already exists in the template
        const closeBtn = document.getElementById('discoveryCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeResults);
        }
        
        updateDetectedLocationBadge();
        initDynamicPlaceholder();
    });

    // -------------------------------------------------------------------------
    // Main Search Handler
    // -------------------------------------------------------------------------
    const KENYAN_COUNTIES = [
        'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'uasin gishu',
        'kiambu', 'thika', 'machakos', 'meru', 'kisii', 'nyeri', 'kakamega',
        'malindi', 'kilifi', 'garissa', 'lamu', 'naivasha', 'nanyuki',
        'laikipia', 'embu', 'kitui', 'bungoma', 'kericho', 'migori',
        'siaya', 'homabay', 'homa bay'
    ];

    async function handleSearchSubmit(e) {
        const userQuery = searchInput ? searchInput.value.trim() : '';
        const queryLower = userQuery.toLowerCase();

        // If it's a general search (not empty and not containing a county name),
        // let the form submit normally, redirecting to the search page (/events/search/?q=...)
        const isCountyQuery = userQuery === '' || KENYAN_COUNTIES.some(c => queryLower.includes(c));
        if (!isCountyQuery) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        setSearchLoading(true);
        showLoadingState();

        try {
            const locationPayload = await resolveLocation(userQuery);
            const data = await fetchDiscovery(locationPayload);
            renderResults(data, userQuery);
        } catch (err) {
            console.error('[Discovery] error:', err);
            showErrorState('Unable to find events right now. Please try again in a moment.');
        } finally {
            setSearchLoading(false);
            if (window.PageLoader && typeof window.PageLoader.hide === 'function') {
                window.PageLoader.hide();
            } else if (typeof window.hideLoader === 'function') {
                window.hideLoader();
            }
        }
    }

    // -------------------------------------------------------------------------
    // Location Resolution (3-level fallback)
    // -------------------------------------------------------------------------
    function resolveLocation(userQuery) {
        return new Promise((resolve) => {

            // Priority 1: User typed a specific location / query
            if (userQuery && userQuery.length > 1) {
                resolve({ location_text: userQuery });
                return;
            }

            // Priority 2: Browser Geolocation API
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    }),
                    () => {
                        // Denied or timed out — use profile location
                        resolve({ location_text: getProfileLocation() });
                    },
                    { timeout: GEO_TIMEOUT, enableHighAccuracy: false }
                );
            } else {
                // No Geolocation API available
                resolve({ location_text: getProfileLocation() });
            }
        });
    }

    /** Read user.location from localStorage attendee profile */
    function getProfileLocation() {
        try {
            const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
            return (user.location || '').trim() || FALLBACK_LOC;
        } catch {
            return FALLBACK_LOC;
        }
    }

    // -------------------------------------------------------------------------
    // API Call
    // -------------------------------------------------------------------------
    async function fetchDiscovery(payload) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('attendee_access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
    }

    // -------------------------------------------------------------------------
    // Render Results
    // -------------------------------------------------------------------------
    function renderResults(data, userQuery) {
        if (!resultsSection) return;

        const {
            county        = FALLBACK_LOC,
            location_source,
            internal_events = [],
            external_events = [],
        } = data;

        const total = internal_events.length + external_events.length;

        if (total === 0) {
            renderEmptyState(county, userQuery);
            show(resultsSection);
            scrollToResults();
            return;
        }

        resultsSection.innerHTML = `
            <div class="discovery-header">
                <div class="discovery-header-left">
                    <h2 class="discovery-title">
                        <i class="fas fa-map-marker-alt"></i>
                        Events in ${esc(county)}
                    </h2>
                    <span class="discovery-location-pill">${locationLabel(location_source)}</span>
                </div>
                <div class="discovery-header-right">
                    <span class="discovery-count">${total} event${total !== 1 ? 's' : ''} found</span>
                    <button class="disc-close-btn" id="discoveryCloseBtn" title="Close results">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            ${internal_events.length ? buildSection(
                'eventhub',
                '<i class="fas fa-star"></i> EventHub Events',
                'Tickets available to purchase directly here',
                internal_events.map(buildInternalCard).join('')
            ) : ''}

            ${external_events.length ? buildSection(
                'external',
                '<i class="fas fa-globe"></i> Discovered Locally',
                'View-only — purchase tickets via the event\'s platform',
                external_events.map(buildExternalCard).join('')
            ) : ''}

            <div class="discovery-disclaimer">
                <i class="fas fa-info-circle"></i>
                External events are gathered from public sources. EventHub does not sell tickets for them.
            </div>
        `;

        // Bind close button after render
        const closeBtn = document.getElementById('discoveryCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeResults);

        show(resultsSection);
        scrollToResults();
    }

    function buildSection(type, heading, note, cardsHtml) {
        return `
            <div class="discovery-section">
                <div class="discovery-section-header">
                    <span class="discovery-section-badge badge-${type}">${heading}</span>
                    <span class="discovery-section-note">${note}</span>
                </div>
                <div class="discovery-grid">${cardsHtml}</div>
            </div>
        `;
    }

    // ---- Internal (app) card ----
    function buildInternalCard(ev) {
        const imgStyle = ev.banner_image
            ? `background-image:url('${esc(ev.banner_image)}')`
            : 'background:linear-gradient(135deg,#f59e0b22,#ec640822)';

        const price = ev.price > 0
            ? `KES ${Number(ev.price).toLocaleString('en-KE')}`
            : 'Free';

        const seatsBadge = ev.available_seats > 0
            ? `<span class="disc-seats"><i class="fas fa-chair"></i> ${ev.available_seats} left</span>`
            : `<span class="disc-seats disc-seats--sold">Sold Out</span>`;

        return `
            <div class="discovery-card discovery-card--internal">
                <div class="disc-img" style="${imgStyle}">
                    <span class="disc-platform-badge disc-platform-badge--eh">EventHub</span>
                    ${ev.category ? `<span class="disc-category-tag">${esc(ev.category)}</span>` : ''}
                </div>
                <div class="disc-body">
                    <h3 class="disc-title">${esc(ev.title)}</h3>
                    <div class="disc-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${fmtDate(ev.start_date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${esc(ev.venue || 'TBD')}</span>
                    </div>
                    <div class="disc-row">
                        <span class="disc-price">${price}</span>
                        ${seatsBadge}
                    </div>
                    <a href="${esc(ev.detail_url)}" class="disc-btn disc-btn--book">
                        <i class="fas fa-ticket-alt"></i> Book Tickets
                    </a>
                </div>
            </div>
        `;
    }

    // ---- External (scraped) card ----
    function buildExternalCard(ev) {
        const color    = SOURCE_COLORS[ev.source] || SOURCE_COLORS['Web'];
        const imgStyle = ev.image_url
            ? `background-image:url('${esc(ev.image_url)}')`
            : `background:linear-gradient(135deg,${color}22,${color}55)`;

        const desc = ev.description
            ? `<p class="disc-desc">${esc(ev.description.slice(0, 110))}${ev.description.length > 110 ? '…' : ''}</p>`
            : '';

        return `
            <div class="discovery-card discovery-card--external">
                <div class="disc-img" style="${imgStyle}">
                    <span class="disc-platform-badge disc-platform-badge--ext" style="background:${color}">
                        ${esc(ev.source)}
                    </span>
                </div>
                <div class="disc-body">
                    <h3 class="disc-title">${esc(ev.title)}</h3>
                    <div class="disc-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${esc(ev.date_text || 'Check website')}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${esc(ev.venue || 'TBD')}</span>
                    </div>
                    ${desc}
                    <div class="disc-row">
                        <span class="disc-price-ext">${esc(ev.price_text || 'Check website')}</span>
                        <span class="disc-ext-label"><i class="fas fa-lock"></i> External</span>
                    </div>
                    <a href="${esc(ev.source_url)}" target="_blank" rel="noopener noreferrer"
                       class="disc-btn disc-btn--view" style="--src-color:${color}">
                        <i class="fas fa-external-link-alt"></i> View on ${esc(ev.source)}
                    </a>
                </div>
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Loading / Error / Empty States
    // -------------------------------------------------------------------------
    function showLoadingState() {
        if (!resultsSection) return;
        resultsSection.innerHTML = `
            <div class="discovery-loading">
                <div class="disc-spinner-wrap">
                    <div class="disc-spinner"></div>
                </div>
                <p class="disc-loading-msg">Detecting your location and scanning for local events…</p>
                <div class="disc-sources-row">
                    <span class="disc-src-chip"><i class="fas fa-database"></i> EventHub</span>
                    <span class="disc-src-chip"><i class="fas fa-ticket-alt"></i> Ticketsasa</span>
                    <span class="disc-src-chip"><i class="fas fa-globe"></i> AllEvents.in</span>
                    <span class="disc-src-chip"><i class="fas fa-calendar-check"></i> Eventbrite</span>
                </div>
            </div>
        `;
        show(resultsSection);
    }

    function showErrorState(msg) {
        if (!resultsSection) return;
        resultsSection.innerHTML = `
            <div class="discovery-state-box discovery-state-box--error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${esc(msg)}</p>
                <button onclick="window.closeDiscoveryResults()" class="disc-btn disc-btn--ghost">Dismiss</button>
            </div>
        `;
        show(resultsSection);
    }

    function renderEmptyState(county, userQuery) {
        resultsSection.innerHTML = `
            <div class="discovery-state-box">
                <i class="fas fa-calendar-times"></i>
                <h3>No events found${county ? ` in ${esc(county)}` : ''}</h3>
                <p>${userQuery
                    ? `We couldn't find events matching "<strong>${esc(userQuery)}</strong>".`
                    : 'No upcoming events were found in your area right now.'
                }</p>
                <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1rem">
                    <a href="/events/" class="disc-btn disc-btn--book">Browse EventHub Events</a>
                    <button onclick="window.closeDiscoveryResults()" class="disc-btn disc-btn--ghost">Close</button>
                </div>
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    function closeResults() {
        if (resultsSection) {
            resultsSection.style.display = 'none';
            resultsSection.innerHTML = '';
        }
    }

    function setSearchLoading(isLoading) {
        if (!searchBtn) return;
        if (isLoading) {
            searchBtn.disabled = true;
            searchBtn.dataset.originalText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Searching…';
        } else {
            searchBtn.disabled = false;
            if (searchBtn.dataset.originalText) {
                searchBtn.innerHTML = searchBtn.dataset.originalText;
            }
        }
    }

    function show(el) {
        if (el) el.style.display = 'block';
    }

    function scrollToResults() {
        if (!resultsSection) return;
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
    }

    function locationLabel(source) {
        const map = {
            browser_geolocation: '<i class="fas fa-location-arrow"></i> GPS',
            user_profile:        '<i class="fas fa-user"></i> Profile',
            ip_detection:        '<i class="fas fa-wifi"></i> Network',
        };
        return map[source] || '<i class="fas fa-map-pin"></i> Location';
    }

    function fmtDate(str) {
        if (!str) return 'TBA';
        try {
            const d = new Date(str);
            if (isNaN(d.getTime())) return str;
            return d.toLocaleDateString('en-KE', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch { return str; }
    }

    function esc(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function updateDetectedLocationBadge() {
        const textSpan = document.getElementById('detectedLocationText');
        if (!textSpan) return;
        
        const city = window.AppLocation ? window.AppLocation.getCity() : 'Nairobi';
        const country = window.AppLocation ? window.AppLocation.getCountry() : 'Kenya';
        textSpan.textContent = `${city}, ${country}`;
    }

    function initDynamicPlaceholder() {
        const input = document.getElementById('dashboardSearchInput');
        if (!input) return;
        
        const placeholders = ["Nairobi", "Solfest", "Mombasa", "Karaoke"];
        let index = 0;
        
        const setPlaceholder = (text) => {
            input.placeholder = `e.g. Search for "${text}"`;
        };

        // Cycle through placeholders every 3 seconds
        setInterval(() => {
            index = (index + 1) % placeholders.length;
            setPlaceholder(placeholders[index]);
        }, 3000);
        
        // Initial setup
        setPlaceholder(placeholders[0]);
    }

    // Listen for GeoIP resolutions to update dynamically
    window.addEventListener('app-location-resolved', updateDetectedLocationBadge);

    // ---- Public API (used by inline onclick handlers) ----
    window.closeDiscoveryResults = closeResults;

})();
