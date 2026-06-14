// ============================================
// ACCOUNT PROFILE MODULE
// Secure, centralized user profile store.
// Reads/writes attendee_user in localStorage,
// prefills payment & billing fields across all flows.
// ============================================

const AccountProfile = (() => {

    const STORAGE_KEY = 'attendee_user';

    /**
     * Returns the current stored profile object.
     * Fields: name, full_name, email, phone, ...
     */
    function get() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    /**
     * Merges `data` into the stored profile and saves it.
     * Dispatches a custom 'profile-updated' event on window.
     */
    function save(data) {
        try {
            const current = get();
            const merged = Object.assign({}, current, data);
            if (!merged.name && merged.full_name) {
                merged.name = merged.full_name;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            applyToNavbar(merged);
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: merged }));
            return merged;
        } catch (e) {
            console.error('[AccountProfile] save error:', e);
        }
    }

    /**
     * Fetches fresh profile data from the API and syncs it to localStorage.
     * Silent on failure — does not throw.
     */
    async function syncFromAPI() {
        try {
            const token = localStorage.getItem('attendee_access_token');
            if (!token) return;
            const response = await fetch('/api/attendee/profile/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const profileResponse = await response.json();
                const profile = profileResponse.user || profileResponse;
                save(profile);
            }
        } catch (e) {
            // Silently degrade — local data will be used instead
        }
    }

    /**
     * Prefills a set of form inputs from the stored profile.
     *
     * @param {Object} fieldMap — keys are DOM element IDs, values are profile keys.
     *   Example: { mpesaPhone: 'phone', billingName: 'name', billingEmail: 'email' }
     *
     * When a field is successfully prefilled:
     *   - The input value is set
     *   - A subtle "Autofilled · Edit anytime" hint chip appears below it
     */
    function prefill(fieldMap) {
        const profile = get();

        Object.entries(fieldMap).forEach(([elementId, profileKey]) => {
            const input = document.getElementById(elementId);
            if (!input) return;

            // Resolve value: check both key variations (name / full_name etc.)
            const value = profile[profileKey]
                || profile['full_name']  // fallback for 'name' -> 'full_name'
                || '';

            // Only prefill if there's something to fill and the field is empty
            const effectiveValue = profileKey === 'name'
                ? resolveDisplayName(profile)
                : (profile[profileKey] || '');

            if (!effectiveValue) return;

            // Set the value
            input.value = effectiveValue;

            // Inject autofill hint if not already present
            _injectHint(input, elementId);
        });
    }

    /**
     * Injects a subtle "Autofilled" hint chip below the input field.
     * Safe to call multiple times — only one hint per field.
     */
    function _injectHint(input, id) {
        const hintId = `__autofill_hint_${id}`;
        if (document.getElementById(hintId)) return; // already injected

        const hint = document.createElement('div');
        hint.id = hintId;
        hint.setAttribute('aria-label', 'Field was autofilled from your account');
        hint.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 4px;
            font-size: 0.72rem;
            color: #6366f1;
            font-weight: 500;
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            user-select: none;
        `;
        hint.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Autofilled from your account &middot; Edit anytime
        `;

        // Insert after the input
        if (input.parentNode) {
            input.parentNode.insertBefore(hint, input.nextSibling);
        }

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                hint.style.opacity = '1';
                hint.style.transform = 'translateY(0)';
            });
        });

        // Remove hint if user clears the field manually
        input.addEventListener('input', () => {
            if (!input.value) {
                hint.style.opacity = '0';
            } else {
                hint.style.opacity = '1';
            }
        }, { once: false });
    }

    /**
     * Resolves the best display name from a profile object.
     * Prefers full_name (Google / profile page) over isolated first_name.
     */
    function resolveDisplayName(profile) {
        const p = profile || get();
        if (p.full_name && String(p.full_name).trim()) {
            return String(p.full_name).trim();
        }
        if (p.name && String(p.name).trim()) {
            return String(p.name).trim();
        }
        const combined = [p.first_name, p.last_name]
            .map(part => (part && String(part).trim()) || '')
            .filter(Boolean)
            .join(' ');
        if (combined) return combined;
        if (p.username && String(p.username).trim()) {
            return String(p.username).trim();
        }
        return 'User';
    }

    /**
     * Returns a display-safe full name string for the current user.
     */
    function getDisplayName(profile) {
        return resolveDisplayName(profile);
    }

    /**
     * Short label for compact navbar UI (first name / first word).
     */
    function getNavbarShortName(profile) {
        const full = resolveDisplayName(profile);
        return full.split(/\s+/)[0] || full;
    }

    /**
     * Updates navbar account name and avatar from profile data.
     */
    function applyToNavbar(profile) {
        const p = profile || get();
        const displayName = resolveDisplayName(p);
        const shortName = displayName.split(/\s+/)[0] || displayName;
        const initial = displayName.charAt(0).toUpperCase();

        const desktopName = document.getElementById('desktopUserName');
        const desktopInitial = document.getElementById('desktopUserInitial');
        const profileUserName = document.getElementById('profileUserName');
        const mobileUserName = document.getElementById('mobileUserName');
        const mobileUserInitial = document.getElementById('mobileUserInitial');
        const mobileAccountLabel = document.getElementById('mobileAccountLabel');

        if (desktopName) desktopName.textContent = displayName;
        if (desktopInitial) desktopInitial.textContent = initial;
        if (profileUserName) profileUserName.textContent = shortName;
        if (mobileUserName) mobileUserName.textContent = displayName;
        if (mobileUserInitial) mobileUserInitial.textContent = initial;
        if (mobileAccountLabel) mobileAccountLabel.textContent = shortName;

        const avatarUrl = p.avatar_url;
        const desktopAvatarContainer = document.querySelector('.user-avatar-dropdown');
        const mobileAvatarContainer = document.querySelector('.mobile-user-avatar-dropdown');

        if (avatarUrl) {
            const busted = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            if (desktopAvatarContainer) {
                desktopAvatarContainer.style.backgroundImage = `url(${busted})`;
                desktopAvatarContainer.style.backgroundSize = 'cover';
                desktopAvatarContainer.style.backgroundPosition = 'center';
                if (desktopInitial) desktopInitial.style.display = 'none';
            }
            if (mobileAvatarContainer) {
                mobileAvatarContainer.style.backgroundImage = `url(${busted})`;
                mobileAvatarContainer.style.backgroundSize = 'cover';
                mobileAvatarContainer.style.backgroundPosition = 'center';
                if (mobileUserInitial) mobileUserInitial.style.display = 'none';
            }
        } else {
            if (desktopAvatarContainer) {
                desktopAvatarContainer.style.backgroundImage = 'none';
                if (desktopInitial) desktopInitial.style.display = '';
            }
            if (mobileAvatarContainer) {
                mobileAvatarContainer.style.backgroundImage = 'none';
                if (mobileUserInitial) mobileUserInitial.style.display = '';
            }
        }
    }

    /**
     * Returns the stored phone number, formatted for M-Pesa (254XXXXXXXXX).
     */
    function getMpesaPhone() {
        const p = get();
        const raw = p.phone || '';
        if (!raw) return '';
        let cleaned = raw.replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
        if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
        return cleaned;
    }

    // Public API
    return {
        get,
        save,
        syncFromAPI,
        prefill,
        getDisplayName,
        getNavbarShortName,
        resolveDisplayName,
        applyToNavbar,
        getMpesaPhone,
    };
})();

// Expose globally
window.AccountProfile = AccountProfile;
