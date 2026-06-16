/**
 * discovery.js — Kenya-wide multi-source event search
 * EventHub Attendee Dashboard
 *
 * Searches EventHub + top Kenyan platforms in parallel:
 * Ticketsasa, Mookh, Pata Ticket, LipaTix, TykoPass, Karibisha,
 * Pesapal Events, Eventbrite, AllEvents.in
 */

(function () {
    'use strict';

    const API_ENDPOINT = '/api/events/discover/';
    const GEO_TIMEOUT = 10_000;
    const FALLBACK_LOC = 'Nairobi';

    const SOURCE_COLORS = {
        'EventHub':         '#f59e0b',
        'Ticketsasa':       '#e11d48',
        'Mookh':            '#7c3aed',
        'Pata Ticket':      '#0ea5e9',
        'LipaTix':          '#16a34a',
        'TykoPass':         '#db2777',
        'Karibisha':        '#2563eb',
        'Pesapal Events':   '#059669',
        'Eventbrite':       '#f97316',
        'AllEvents.in':     '#6366f1',
        'Facebook Events':  '#1877f2',
        'Web':              '#64748b',
    };

    const PLATFORM_CHIPS = [
        'EventHub', 'Ticketsasa', 'Mookh', 'Pata Ticket', 'LipaTix',
        'TykoPass', 'Karibisha', 'Pesapal Events', 'Eventbrite', 'AllEvents.in',
    ];

    let searchForm, searchInput, searchBtn, resultsSection;

    document.addEventListener('DOMContentLoaded', function () {
        searchForm     = document.getElementById('dashboardSearchForm');
        searchInput    = document.getElementById('dashboardSearchInput');
        searchBtn      = document.getElementById('dashboardSearchBtn');
        resultsSection = document.getElementById('discoveryResultsSection');

        if (searchForm) {
            searchForm.addEventListener('submit', handleSearchSubmit);
        }

        const closeBtn = document.getElementById('discoveryCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeResults);
        }

        updateDetectedLocationBadge();
        initDynamicPlaceholder();

        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q && searchInput) {
            searchInput.value = q;
            handleSearchSubmit(new Event('submit'));
        }
    });

    async function handleSearchSubmit(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }

        const userQuery = searchInput ? searchInput.value.trim() : '';

        setSearchLoading(true);
        showLoadingState();

        try {
            const locationPayload = await resolveLocation(userQuery);
            const payload = {
                ...locationPayload,
                search_text: userQuery,
                query: userQuery,
            };
            const parsedDate = extractDateHint(userQuery);
            if (parsedDate) {
                payload.date = parsedDate;
            }
            const data = await fetchDiscovery(payload);
            renderResults(data, userQuery);
        } catch (err) {
            console.error('[Discovery] error:', err);
            showErrorState('Unable to search events right now. Please try again in a moment.');
        } finally {
            setSearchLoading(false);
            if (window.PageLoader && typeof window.PageLoader.hide === 'function') {
                window.PageLoader.hide();
            } else if (typeof window.hideLoader === 'function') {
                window.hideLoader();
            }
        }
    }

    function extractDateHint(text) {
        if (!text) return '';
        const monthYear = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/i);
        if (monthYear) return monthYear[0];
        const iso = text.match(/\b20\d{2}-\d{2}(-\d{2})?\b/);
        if (iso) return iso[0];
        return '';
    }

    function resolveLocation(userQuery) {
        return new Promise((resolve) => {
            if (userQuery && userQuery.length > 1) {
                resolve({ location_text: userQuery });
                return;
            }

            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    }),
                    () => resolve({ location_text: getProfileLocation() }),
                    { timeout: GEO_TIMEOUT, enableHighAccuracy: false }
                );
            } else {
                resolve({ location_text: getProfileLocation() });
            }
        });
    }

    function getProfileLocation() {
        try {
            const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
            return (user.location || '').trim() || FALLBACK_LOC;
        } catch {
            return FALLBACK_LOC;
        }
    }

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

    function renderResults(data, userQuery) {
        if (!resultsSection) return;

        const {
            county = FALLBACK_LOC,
            location_source,
            search_text = userQuery,
            platforms_searched = PLATFORM_CHIPS,
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

        const groupedExternal = groupExternalBySource(external_events, platforms_searched);
        const externalSections = groupedExternal.map(([source, events]) =>
            buildSection(
                'external',
                `<i class="fas fa-globe"></i> ${esc(source)}`,
                `${events.length} event${events.length !== 1 ? 's' : ''} — book on ${esc(source)}`,
                events.map(buildExternalCard).join(''),
                SOURCE_COLORS[source] || SOURCE_COLORS.Web
            )
        ).join('');

        const searchLabel = search_text
            ? `Results for “${esc(search_text)}”`
            : `Events in ${esc(county)}`;

        resultsSection.innerHTML = `
            <div class="discovery-header">
                <div class="discovery-header-left">
                    <h2 class="discovery-title">
                        <i class="fas fa-search"></i>
                        ${searchLabel}
                    </h2>
                    <span class="discovery-location-pill">${locationLabel(location_source)} · ${esc(county)}</span>
                </div>
                <div class="discovery-header-right">
                    <span class="discovery-count">${total} event${total !== 1 ? 's' : ''} across ${platforms_searched.length} sources</span>
                    <button class="disc-close-btn" id="discoveryCloseBtn" title="Close results">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div class="discovery-platforms-row">
                ${platforms_searched.map((name) => `
                    <span class="disc-src-chip" style="--chip-color:${SOURCE_COLORS[name] || '#64748b'}">${esc(name)}</span>
                `).join('')}
            </div>

            ${internal_events.length ? buildSection(
                'eventhub',
                '<i class="fas fa-star"></i> EventHub',
                'Book tickets directly on EventHub — best experience in Kenya',
                internal_events.map(buildInternalCard).join('')
            ) : ''}

            ${externalSections}

            <div class="discovery-disclaimer">
                <i class="fas fa-info-circle"></i>
                EventHub searches ${platforms_searched.length} sources across Kenya. External events open on their original platform.
            </div>
        `;

        const closeBtn = document.getElementById('discoveryCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeResults);

        show(resultsSection);
        scrollToResults();
    }

    function groupExternalBySource(events, platformOrder) {
        const groups = new Map();
        for (const ev of events) {
            const src = ev.source || 'Web';
            if (!groups.has(src)) groups.set(src, []);
            groups.get(src).push(ev);
        }
        const ordered = [];
        for (const name of platformOrder) {
            if (name === 'EventHub') continue;
            if (groups.has(name)) {
                ordered.push([name, groups.get(name)]);
                groups.delete(name);
            }
        }
        for (const [name, list] of groups.entries()) {
            ordered.push([name, list]);
        }
        return ordered;
    }

    function buildSection(type, heading, note, cardsHtml, accentColor) {
        const style = accentColor ? ` style="--section-accent:${accentColor}"` : '';
        return `
            <div class="discovery-section discovery-section--${type}"${style}>
                <div class="discovery-section-header">
                    <span class="discovery-section-badge badge-${type}">${heading}</span>
                    <span class="discovery-section-note">${note}</span>
                </div>
                <div class="discovery-grid">${cardsHtml}</div>
            </div>
        `;
    }

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
                        <i class="fas fa-ticket-alt"></i> Book on EventHub
                    </a>
                </div>
            </div>
        `;
    }

    function buildExternalCard(ev) {
        const color = SOURCE_COLORS[ev.source] || SOURCE_COLORS['Web'];
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
                        <span class="disc-ext-label"><i class="fas fa-external-link-alt"></i> External</span>
                    </div>
                    <a href="${esc(ev.source_url)}" target="_blank" rel="noopener noreferrer"
                       class="disc-btn disc-btn--view" style="--src-color:${color}">
                        <i class="fas fa-external-link-alt"></i> View on ${esc(ev.source)}
                    </a>
                </div>
            </div>
        `;
    }

    function showLoadingState() {
        if (!resultsSection) return;
        resultsSection.innerHTML = `
            <div class="discovery-loading">
                <div class="disc-spinner-wrap">
                    <div class="disc-spinner"></div>
                </div>
                <p class="disc-loading-msg">Searching Kenya's top event platforms…</p>
                <div class="disc-sources-row discovery-platforms-row">
                    ${PLATFORM_CHIPS.map((name) => `
                        <span class="disc-src-chip" style="--chip-color:${SOURCE_COLORS[name] || '#64748b'}">${esc(name)}</span>
                    `).join('')}
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
                <h3>No events found${county ? ` near ${esc(county)}` : ''}</h3>
                <p>${userQuery
                    ? `We searched 10 platforms but couldn't find events matching "<strong>${esc(userQuery)}</strong>".`
                    : 'No upcoming events were found across Kenyan platforms right now.'
                }</p>
                <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1rem">
                    <a href="/events/" class="disc-btn disc-btn--book">Browse EventHub Events</a>
                    <button onclick="window.closeDiscoveryResults()" class="disc-btn disc-btn--ghost">Close</button>
                </div>
            </div>
        `;
    }

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
            if (!searchBtn.dataset.originalText) {
                searchBtn.dataset.originalText = searchBtn.innerHTML;
            }
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
            search_text:         '<i class="fas fa-search"></i> Search',
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

        const placeholders = [
            'Nairobi jazz June 2026',
            'Solfest',
            'Mombasa concerts',
            'Tech summit Nairobi',
        ];
        let index = 0;

        const setPlaceholder = (text) => {
            input.placeholder = `Try: ${text}`;
        };

        setInterval(() => {
            index = (index + 1) % placeholders.length;
            setPlaceholder(placeholders[index]);
        }, 3500);

        setPlaceholder(placeholders[0]);
    }

    window.addEventListener('app-location-resolved', updateDetectedLocationBadge);
    window.closeDiscoveryResults = closeResults;
    window.runDashboardDiscoverySearch = handleSearchSubmit;

})();
