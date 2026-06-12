/**
 * Normalize event_wishlist localStorage — supports legacy bare IDs and object entries.
 */
(function () {
    'use strict';

    const WISHLIST_KEY = 'event_wishlist';

    function normalizeEntry(entry) {
        if (entry == null) return null;
        if (typeof entry === 'number' || typeof entry === 'string') {
            const id = parseInt(entry, 10);
            return Number.isFinite(id) ? { id } : null;
        }
        if (typeof entry === 'object' && entry.id != null) {
            return { ...entry, id: parseInt(entry.id, 10) };
        }
        return null;
    }

    function loadWishlist() {
        try {
            const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            const seen = new Set();
            const list = [];
            raw.forEach((entry) => {
                const item = normalizeEntry(entry);
                if (!item || seen.has(item.id)) return;
                seen.add(item.id);
                list.push(item);
            });
            return list;
        } catch (_) {
            return [];
        }
    }

    function saveWishlist(list) {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    }

    function getWishlistIds() {
        return loadWishlist().map((item) => item.id);
    }

    function isInWishlist(eventId) {
        const id = parseInt(eventId, 10);
        return loadWishlist().some((item) => item.id === id);
    }

    function addToWishlist(event) {
        const list = loadWishlist();
        const id = typeof event === 'object' ? parseInt(event.id, 10) : parseInt(event, 10);
        if (!Number.isFinite(id) || isInWishlist(id)) return list;
        const item = typeof event === 'object'
            ? { ...event, id }
            : { id };
        list.push(item);
        saveWishlist(list);
        return list;
    }

    function removeFromWishlist(eventId) {
        const id = parseInt(eventId, 10);
        const list = loadWishlist().filter((item) => item.id !== id);
        saveWishlist(list);
        return list;
    }

    function toggleWishlist(event) {
        const id = typeof event === 'object' ? parseInt(event.id, 10) : parseInt(event, 10);
        if (isInWishlist(id)) {
            return { list: removeFromWishlist(id), added: false };
        }
        return { list: addToWishlist(event), added: true };
    }

    function clearWishlist() {
        saveWishlist([]);
        return [];
    }

    window.EventhubWishlistStorage = {
        WISHLIST_KEY,
        loadWishlist,
        saveWishlist,
        getWishlistIds,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
    };
})();
