// ============================================
// POST-LOGIN HOOKS
// Triggers async events prefetch immediately after authentication.
// ============================================

(function () {
    function dispatchAuthStateChanged(user, prefix) {
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: {
                isLoggedIn: true,
                user: user,
                role: prefix,
            },
        }));
    }

    function startEventsPrefetch() {
        if (window.EventhubEventsPrefetch && typeof window.EventhubEventsPrefetch.start === 'function') {
            window.EventhubEventsPrefetch.start();
        }
    }

    window.EventhubAuthLoginHooks = {
        onLoginSuccess: function (prefix, user) {
            dispatchAuthStateChanged(user, prefix);
            if (prefix === 'attendee' || prefix === 'organizer') {
                startEventsPrefetch();
            }
        },
    };
})();
