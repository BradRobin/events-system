// ============================================
// ATTENDEE SETTINGS JAVASCRIPT
// Handles: Notification preferences, privacy settings
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupSettingToggles();
});

async function loadSettings() {
    try {
        const response = await fetch('/api/user/settings/');
        const data = await response.json();
        
        if (data) {
            // Language
            const languageSelect = document.getElementById('language');
            if (languageSelect) languageSelect.value = data.language || 'en';
            
            // Timezone
            const timezoneSelect = document.getElementById('timezone');
            if (timezoneSelect) timezoneSelect.value = data.timezone || 'Africa/Nairobi';
            
            // Currency
            const currencySelect = document.getElementById('currency');
            if (currencySelect) currencySelect.value = data.currency || 'KES';
            
            // Notification toggles
            document.getElementById('emailBooking').checked = data.email_booking || false;
            document.getElementById('emailReminder').checked = data.email_reminder || false;
            document.getElementById('smsReminder').checked = data.sms_reminder || false;
            document.getElementById('promotional').checked = data.promotional || false;
            document.getElementById('profileVisibility').checked = data.profile_visible || false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function setupSettingToggles() {
    // Notification settings form
    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(notificationForm);
            await saveSettings(formData);
        });
    }
    
    // Privacy settings form
    const privacyForm = document.getElementById('privacyForm');
    if (privacyForm) {
        privacyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(privacyForm);
            await saveSettings(formData);
        });
    }
}

async function saveSettings(formData) {
    showLoading();
    
    try {
        const response = await fetch('/api/user/settings/update/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        hideLoading();
    }
}

function showLoading() {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
}

function hideLoading() {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Save Changes';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
