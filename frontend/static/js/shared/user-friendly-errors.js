/**
 * User-Friendly Error Messages
 * Sanitizes technical errors before they reach toasts, modals, or inline UI.
 */
(function (global) {
    'use strict';

    var TECHNICAL_PATTERNS = [
        /missing\s+\d+\s+required positional argument/i,
        /takes\s+\d+\s+positional argument/i,
        /admin_required_json/i,
        /_wrapped\s*\(/i,
        /typeerror/i,
        /referenceerror/i,
        /syntaxerror/i,
        /traceback/i,
        /file\s+"[^"]+",\s+line\s+\d+/i,
        /object\s+has\s+no\s+attribute/i,
        /is\s+not\s+defined/i,
        /unexpected\s+token/i,
        /json\.parse/i,
        /cannot\s+read\s+propert/i,
        /failed\s+to\s+fetch/i,
        /networkerror/i,
        /aborterror/i,
        /<\!doctype\s+html/i,
        /internal\s+server\s+error/i,
    ];

  var URL_CONTEXT_RULES = [
        { test: /\/organizers\/pending/i, message: 'The system was unable to fetch pending organizers. Please try again.' },
        { test: /\/organizers/i, message: 'The system was unable to load organizer information. Please try again.' },
        { test: /\/events\/pending/i, message: 'The system was unable to load pending events. Please try again.' },
        { test: /\/events/i, message: 'The system was unable to load events. Please try again.' },
        { test: /\/bookings/i, message: 'The system was unable to load bookings. Please try again.' },
        { test: /\/tickets/i, message: 'The system was unable to load tickets. Please try again.' },
        { test: /\/payments|\/payouts|\/transactions/i, message: 'The system was unable to load payment records. Please try again.' },
        { test: /\/support/i, message: 'The system was unable to load support tickets. Please try again.' },
        { test: /\/notifications/i, message: 'The system was unable to load notifications. Please try again.' },
        { test: /\/users/i, message: 'The system was unable to load user records. Please try again.' },
        { test: /\/reports/i, message: 'The system was unable to generate this report. Please try again.' },
        { test: /\/dashboard/i, message: 'The system was unable to load dashboard data. Please try again.' },
        { test: /\/profile/i, message: 'The system was unable to update your profile. Please try again.' },
        { test: /\/checkout|\/payment-orders|\/cart/i, message: 'Checkout could not be completed. Please try again.' },
        { test: /\/reviews/i, message: 'The system was unable to load reviews. Please try again.' },
        { test: /\/discover|\/platform\/stats/i, message: 'The system was unable to load event recommendations. Please try again.' },
    ];

    var STATUS_MESSAGES = {
        400: 'We could not process that request. Please check your input and try again.',
        401: 'Your session has expired. Please sign in again.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested information could not be found.',
        409: 'This action conflicts with existing data. Please refresh and try again.',
        429: 'Too many requests. Please wait a moment and try again.',
        500: 'The system encountered a problem. Please try again shortly.',
        502: 'The system is temporarily unavailable. Please try again shortly.',
        503: 'The system is temporarily unavailable. Please try again shortly.',
        504: 'The request timed out. Please check your connection and try again.',
    };

    function isTechnicalMessage(text) {
        if (!text || typeof text !== 'string') return true;
        var trimmed = text.trim();
        if (!trimmed) return true;
        if (trimmed.length > 220) return true;
        for (var i = 0; i < TECHNICAL_PATTERNS.length; i++) {
            if (TECHNICAL_PATTERNS[i].test(trimmed)) return true;
        }
        return false;
    }

    function getContextualMessage(url, status) {
        if (url) {
            for (var i = 0; i < URL_CONTEXT_RULES.length; i++) {
                if (URL_CONTEXT_RULES[i].test.test(url)) {
                    return URL_CONTEXT_RULES[i].message;
                }
            }
        }
        if (status && STATUS_MESSAGES[status]) {
            return STATUS_MESSAGES[status];
        }
        return 'Something went wrong. Please try again.';
    }

    function sanitizeUserMessage(raw, options) {
        options = options || {};
        var url = options.url || '';
        var status = options.status;
        var fallback = options.fallback;
        var context = options.context;

        if (context && typeof context === 'string') {
            fallback = context;
        }

        if (!raw || typeof raw !== 'string') {
            return fallback || getContextualMessage(url, status);
        }

        var message = raw.trim();

        if (message.toLowerCase() === 'request failed' || message.toLowerCase() === 'an error occurred') {
            return fallback || getContextualMessage(url, status);
        }

        if (isTechnicalMessage(message)) {
            return fallback || getContextualMessage(url, status);
        }

        // Allow short, human-authored API messages from the backend
        return message;
    }

    function extractApiErrorMessage(payload, options) {
        options = options || {};
        if (!payload || typeof payload !== 'object') {
            return sanitizeUserMessage('', options);
        }

        var raw = payload.message || payload.error || payload.detail || '';
        if (Array.isArray(raw)) raw = raw.join(' ');
        if (typeof raw === 'object') raw = JSON.stringify(raw);

        return sanitizeUserMessage(String(raw || ''), {
            url: options.url,
            status: options.status,
            fallback: options.fallback,
            context: options.context,
        });
    }

    global.UserFriendlyErrors = {
        sanitizeUserMessage: sanitizeUserMessage,
        extractApiErrorMessage: extractApiErrorMessage,
        getContextualMessage: getContextualMessage,
        isTechnicalMessage: isTechnicalMessage,
        STATUS_MESSAGES: STATUS_MESSAGES,
    };

    function wrapGlobalShowToast() {
        var current = global.showToast;
        if (!current || current.__userFriendlyWrapped) {
            return;
        }
        var wrapped = function (message, type) {
            var args = Array.prototype.slice.call(arguments);
            if ((type === 'error' || type === 'danger') && typeof message === 'string') {
                args[0] = sanitizeUserMessage(message, {
                    fallback: 'Something went wrong. Please try again.',
                    url: global.location && global.location.pathname,
                });
            }
            return current.apply(this, args);
        };
        wrapped.__userFriendlyWrapped = true;
        wrapped.__originalShowToast = current;
        global.showToast = wrapped;
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', wrapGlobalShowToast);
        setTimeout(wrapGlobalShowToast, 0);
        setTimeout(wrapGlobalShowToast, 250);
    }
})(typeof window !== 'undefined' ? window : globalThis);
