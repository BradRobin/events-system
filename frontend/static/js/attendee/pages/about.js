/**
 * about.js  — Platform Stats Pipeline & Animated Counter
 *
 * 1. Fetches live stats from /api/platform/stats/
 * 2. Updates each .counter[data-target] with real database values
 * 3. Uses IntersectionObserver to trigger the animation on scroll-into-view
 * 4. Falls back gracefully to the hardcoded data-target values if the API fails
 */

(function () {
    'use strict';

    // ── Easing helper ────────────────────────────────────────────────────────
    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    // ── Animate a single counter element ────────────────────────────────────
    function animateCounter(el) {
        const target  = parseInt(el.getAttribute('data-target'), 10) || 0;
        const duration = 2000; // ms
        let startTime  = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed  = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = easeOutExpo(progress);
            el.textContent = Math.floor(eased * target).toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(step);
    }

    // ── Observe the stats section and fire counters once visible ─────────────
    function observeStats(counters) {
        if (!counters.length) return;

        const statsSection = counters[0].closest('.stats-section') || document.body;
        let animated = false;

        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && !animated) {
                        animated = true;
                        counters.forEach(animateCounter);
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.25 }
        );

        observer.observe(statsSection);
    }

    // ── Fetch live stats and patch data-target attributes ────────────────────
    function loadPlatformStats(counters) {
        fetch('/api/platform/stats/')
            .then(function (res) {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(function (data) {
                if (!data.success) throw new Error('API returned failure');

                // Map API fields → counter IDs / positions
                // The template order is: Events Hosted, Happy Attendees, Event Organizers, Satisfaction Rate
                const mapping = [
                    data.events_hosted,
                    data.happy_attendees,
                    data.event_organizers,
                    data.satisfaction_rate,
                ];

                counters.forEach(function (el, idx) {
                    if (mapping[idx] !== undefined && mapping[idx] !== null) {
                        el.setAttribute('data-target', mapping[idx]);
                    }
                });
            })
            .catch(function (err) {
                console.warn('[about.js] Could not fetch platform stats, using fallback targets:', err);
            })
            .finally(function () {
                // Always observe after fetch attempt (success or failure)
                observeStats(counters);
            });
    }

    // ── Entry point ──────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const counters = Array.from(document.querySelectorAll('.counter[data-target]'));
        if (!counters.length) return;

        loadPlatformStats(counters);
    });
}());
