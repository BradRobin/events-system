/**
 * EventHub presence heartbeat — reports user activity to the server
 * so admins can see online user counts in real time.
 */
(function () {
    'use strict';

    const HEARTBEAT_URL = '/api/presence/heartbeat/';
    const SESSION_KEY = 'eventhub_presence_sid';
    const MIN_INTERVAL_MS = 30000;
    const PERIODIC_INTERVAL_MS = 60000;

    let lastSentAt = 0;
    let periodicTimer = null;
    let initialized = false;

    function getSessionId() {
        try {
            let sid = sessionStorage.getItem(SESSION_KEY);
            if (!sid) {
                sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID().replace(/-/g, '')
                    : 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
                sessionStorage.setItem(SESSION_KEY, sid);
            }
            return sid;
        } catch (e) {
            return 'sess_' + Date.now();
        }
    }

    function getAccessToken() {
        try {
            return localStorage.getItem('attendee_access_token')
                || localStorage.getItem('organizer_access_token')
                || localStorage.getItem('admin_access_token')
                || localStorage.getItem('access_token')
                || '';
        } catch (e) {
            return '';
        }
    }

    function sendHeartbeat(force) {
        const now = Date.now();
        if (!force && now - lastSentAt < MIN_INTERVAL_MS) {
            return;
        }
        lastSentAt = now;

        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const csrf = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrf && csrf.value) {
            headers['X-CSRFToken'] = csrf.value;
        }

        fetch(HEARTBEAT_URL, {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            keepalive: true,
            body: JSON.stringify({
                session_id: getSessionId(),
                path: window.location.pathname + window.location.search,
            }),
        }).catch(function () {
            /* non-critical */
        });
    }

    function onActivity() {
        sendHeartbeat(false);
    }

    function startPeriodic() {
        if (periodicTimer) return;
        periodicTimer = setInterval(function () {
            sendHeartbeat(true);
        }, PERIODIC_INTERVAL_MS);
    }

    function initPresence() {
        if (initialized) return;
        initialized = true;

        sendHeartbeat(true);
        startPeriodic();

        ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(function (evt) {
            window.addEventListener(evt, onActivity, { passive: true });
        });

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                sendHeartbeat(true);
            }
        });

        window.addEventListener('pagehide', function () {
            sendHeartbeat(true);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPresence);
    } else {
        initPresence();
    }

    window.EventHubPresence = { ping: function () { sendHeartbeat(true); } };
})();
