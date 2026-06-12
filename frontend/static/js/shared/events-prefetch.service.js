// ============================================
// EVENTHUB EVENTS PREFETCH SERVICE
// Async background loading of organizer events
// so the /events/ page renders instantly after login.
// ============================================

(function () {
    const STORAGE_KEY = 'eventhub_events_prefetch_v1';
    const CATALOG_TTL_MS = 30 * 60 * 1000; // 30 minutes
    const EVENTS_URL = '/api/attendee/events/?limit=200&page=1';
    const CATEGORIES_URL = '/api/attendee/categories/';

    let memoryCache = null;
    let prefetchPromise = null;

    function now() {
        return Date.now();
    }

    function isFresh(timestamp) {
        return Boolean(timestamp) && (now() - timestamp) < CATALOG_TTL_MS;
    }

    function readSession() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !isFresh(parsed.timestamp)) {
                sessionStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return parsed;
        } catch (e) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function writeSession(data) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('EventhubEventsPrefetch: sessionStorage write failed', e);
        }
    }

    function normalizeEventsPayload(payload) {
        if (!payload || !payload.success) return [];
        return payload.events || payload.results || [];
    }

    function normalizeCategoriesPayload(payload) {
        if (!payload || !payload.success) return [];
        return payload.categories || [];
    }

    function setCache(events, categories) {
        const entry = {
            events: events || [],
            categories: categories || [],
            timestamp: now(),
        };
        memoryCache = entry;
        writeSession(entry);
        window.dispatchEvent(new CustomEvent('events-prefetch-complete', {
            detail: { events: entry.events, categories: entry.categories },
        }));
        return entry;
    }

    function getCached() {
        if (memoryCache && isFresh(memoryCache.timestamp)) {
            return memoryCache;
        }
        const session = readSession();
        if (session) {
            memoryCache = session;
            return session;
        }
        return null;
    }

    function isReady() {
        const cached = getCached();
        return Boolean(cached && Array.isArray(cached.events));
    }

    async function fetchCatalog() {
        const [eventsResponse, categoriesResponse] = await Promise.all([
            fetch(EVENTS_URL, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }),
            fetch(CATEGORIES_URL, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }),
        ]);

        const [eventsData, categoriesData] = await Promise.all([
            eventsResponse.json(),
            categoriesResponse.json(),
        ]);

        return setCache(
            normalizeEventsPayload(eventsData),
            normalizeCategoriesPayload(categoriesData)
        );
    }

    function start(options = {}) {
        const force = Boolean(options.force);

        if (!force) {
            const cached = getCached();
            if (cached) {
                return Promise.resolve(cached);
            }
        }

        if (prefetchPromise) {
            return prefetchPromise;
        }

        prefetchPromise = fetchCatalog()
            .catch((error) => {
                console.warn('EventhubEventsPrefetch: background fetch failed', error);
                return getCached();
            })
            .finally(() => {
                prefetchPromise = null;
            });

        return prefetchPromise;
    }

    function waitForReady(timeoutMs = 8000) {
        const cached = getCached();
        if (cached) {
            return Promise.resolve(cached);
        }

        return new Promise((resolve) => {
            let settled = false;

            const finish = (data) => {
                if (settled) return;
                settled = true;
                window.removeEventListener('events-prefetch-complete', onComplete);
                clearTimeout(timer);
                resolve(data || getCached());
            };

            const onComplete = (event) => {
                finish(event.detail ? { events: event.detail.events, categories: event.detail.categories, timestamp: now() } : getCached());
            };

            const timer = setTimeout(() => finish(getCached()), timeoutMs);

            window.addEventListener('events-prefetch-complete', onComplete);

            start().then(finish).catch(() => finish(getCached()));
        });
    }

    function seed(events, categories) {
        if (!Array.isArray(events)) return getCached();
        return setCache(events, Array.isArray(categories) ? categories : []);
    }

    function invalidate() {
        memoryCache = null;
        prefetchPromise = null;
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            /* ignore */
        }
    }

    function onAuthStateChanged(event) {
        const detail = event && event.detail;
        if (detail && detail.isLoggedIn === false) {
            invalidate();
            return;
        }
        start();
    }

    window.EventhubEventsPrefetch = {
        start,
        waitForReady,
        getCached,
        isReady,
        seed,
        invalidate,
        onAuthStateChanged,
    };

    window.addEventListener('auth-state-changed', onAuthStateChanged);

    document.addEventListener('DOMContentLoaded', function () {
        const hasAttendeeSession = Boolean(
            localStorage.getItem('attendee_access_token') &&
            localStorage.getItem('attendee_user')
        );
        if (hasAttendeeSession) {
            start();
        }
    });
})();
