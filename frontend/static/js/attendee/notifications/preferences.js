// ============================================
// ATTENDEE NOTIFICATION PREFERENCES - Complete Functionality
// ============================================

// DOM Elements
const emailBooking = document.getElementById('emailBooking');
const emailReminder = document.getElementById('emailReminder');
const emailPromotion = document.getElementById('emailPromotion');
const emailEventUpdate = document.getElementById('emailEventUpdate');
const pushBooking = document.getElementById('pushBooking');
const pushReminder = document.getElementById('pushReminder');
const pushPromotion = document.getElementById('pushPromotion');
const smsReminder = document.getElementById('smsReminder');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreferences();
});

async function loadPreferences() {
    if (window.Loader) window.Loader.show('Loading preferences...');
    
    try {
        const preferences = await window.AttendeeAPIEndpoints.notifications.getPreferences();
        displayPreferences(preferences);
    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast('Failed to load preferences', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayPreferences(preferences) {
    // Email preferences
    if (emailBooking) emailBooking.checked = preferences.email_booking !== false;
    if (emailReminder) emailReminder.checked = preferences.email_reminder !== false;
    if (emailPromotion) emailPromotion.checked = preferences.email_promotion || false;
    if (emailEventUpdate) emailEventUpdate.checked = preferences.email_event_update !== false;
    
    // Push preferences
    if (pushBooking) pushBooking.checked = preferences.push_booking !== false;
    if (pushReminder) pushReminder.checked = preferences.push_reminder !== false;
    if (pushPromotion) pushPromotion.checked = preferences.push_promotion || false;
    
    // SMS preferences
    if (smsReminder) smsReminder.checked = preferences.sms_reminder || false;
}

async function saveAllPreferences() {
    const preferences = {
        email_booking: emailBooking?.checked || false,
        email_reminder: emailReminder?.checked || false,
        email_promotion: emailPromotion?.checked || false,
        email_event_update: emailEventUpdate?.checked || false,
        push_booking: pushBooking?.checked || false,
        push_reminder: pushReminder?.checked || false,
        push_promotion: pushPromotion?.checked || false,
        sms_reminder: smsReminder?.checked || false
    };
    
    if (window.Loader) window.Loader.show('Saving preferences...');
    
    try {
        await window.AttendeeAPIEndpoints.notifications.updatePreferences(preferences);
        showToast('Notification preferences saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast(error.message || 'Failed to save preferences', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make function global
window.saveAllPreferences = saveAllPreferences;