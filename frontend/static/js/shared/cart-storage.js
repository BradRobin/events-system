/**
 * Keep booking cart payloads small — event images from the API are often base64
 * and will exceed localStorage quota if stored verbatim.
 */
(function () {
    'use strict';

    const CART_KEY = 'eventhub_cart';
    const MAX_IMAGE_LEN = 512;
    const PLACEHOLDER_IMAGE = '/static/images/placeholder.jpg';

    function slimImage(image) {
        if (!image || typeof image !== 'string') {
            return '';
        }
        if (image.startsWith('data:') || image.length > MAX_IMAGE_LEN) {
            return PLACEHOLDER_IMAGE;
        }
        return image;
    }

    function slimCartItem(item) {
        if (!item) {
            return item;
        }
        return {
            ...item,
            image: slimImage(item.image),
        };
    }

    function slimCart(cart) {
        if (!cart || !Array.isArray(cart.items)) {
            return cart;
        }
        return {
            ...cart,
            items: cart.items.map(slimCartItem),
        };
    }

    function defaultCart() {
        return { items: [], subtotal: 0, platform_fee: 0, total: 0 };
    }

    /** Build a normalized cart line item from an event API object. */
    function buildCartItemFromEvent(event, options) {
        const opts = options || {};
        const tier = opts.tier || opts.ticket_type || 'regular';
        const quantity = opts.quantity || 1;
        const price = opts.price != null ? opts.price : (event.price || 0);
        const organizerName = event.organizer_name || event.organizer || 'Event Organizer';

        return slimCartItem({
            id: event.id,
            title: event.title,
            tier: tier,
            ticket_type: tier,
            price: price,
            quantity: quantity,
            image: event.image || event.banner_image || '',
            date: event.date || event.start_date || event.end_date || '',
            location: event.location || event.venue || '',
            category: event.category_name || event.category || 'Event',
            organizer_id: event.organizer_id || null,
            organizer_name: organizerName,
            organizer: organizerName,
        });
    }

    function loadEventhubCart() {
        const raw = localStorage.getItem(CART_KEY);
        if (!raw) {
            return defaultCart();
        }
        try {
            const cart = JSON.parse(raw);
            if (!cart.items) {
                cart.items = [];
            }
            return slimCart(cart);
        } catch (e) {
            return defaultCart();
        }
    }

    function saveEventhubCart(cart) {
        const payload = slimCart(cart);
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(payload));
            return true;
        } catch (e) {
            if (!e || (e.name !== 'QuotaExceededError' && e.code !== 22)) {
                throw e;
            }
            ['eventhub_bookings', 'eventhub_tickets'].forEach((key) => {
                try {
                    localStorage.removeItem(key);
                } catch (_) {
                    /* ignore */
                }
            });
            const minimal = {
                ...payload,
                items: payload.items.map((item) => ({ ...item, image: '' })),
            };
            localStorage.setItem(CART_KEY, JSON.stringify(minimal));
            return true;
        }
    }

    window.EventhubCartStorage = {
        CART_KEY,
        slimImage,
        slimCartItem,
        slimCart,
        buildCartItemFromEvent,
        loadEventhubCart,
        saveEventhubCart,
        defaultCart,
    };
})();
