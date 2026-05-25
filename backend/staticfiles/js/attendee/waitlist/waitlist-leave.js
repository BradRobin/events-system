// ============================================
// ATTENDEE LEAVE WAITLIST
// Handles: Removing user from event waitlist
// ============================================

let currentEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        currentEventId = eventId;
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
}

async function leaveWaitlist(eventId = currentEventId) {
    if (!eventId) {
        showToast('Event not found', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to leave the waitlist? You will lose your spot and won\'t be notified when tickets become available.')) return;
    
    showLoading();
    
    const result = await EventAPI.Attendee.leaveWaitlist(eventId);
    if (result) {
        showToast('You have left the waitlist', 'info');
        
        // Update UI
        const leaveBtn = document.getElementById('leaveWaitlistBtn');
        const joinBtn = document.getElementById('joinWaitlistBtn');
        const waitlistInfo = document.getElementById('waitlistInfo');
        
        if (joinBtn) {
            joinBtn.innerHTML = '<i class="fas fa-clock"></i> Join Waitlist';
            joinBtn.disabled = false;
            joinBtn.classList.remove('active');
        }
        
        if (leaveBtn) leaveBtn.style.display = 'none';
        if (waitlistInfo) waitlistInfo.style.display = 'none';
    }
    
    hideLoading();
}

async function leaveAllWaitlists() {
    // Get all events user is on waitlist for
    const events = await getWaitlistedEvents();
    if (!events.length) return;
    
    if (!confirm(`Leave waitlist for all ${events.length} events?`)) return;
    
    showGlobalLoading();
    
    for (const event of events) {
        await EventAPI.Attendee.leaveWaitlist(event.id);
    }
    
    showToast(`Removed from ${events.length} waitlists`, 'info');
    location.reload();
    
    hideGlobalLoading();
}

async function getWaitlistedEvents() {
    // This would need a dedicated endpoint
    // For now, return empty array
    return [];
}

function showLoading() {
    const btn = document.getElementById('leaveWaitlistBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Leaving...';
    }
}

function hideLoading() {
    const btn = document.getElementById('leaveWaitlistBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Leave Waitlist';
    }
}

function showGlobalLoading() {
    const btn = document.getElementById('leaveAllWaitlistsBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Leaving...';
    }
}

function hideGlobalLoading() {
    const btn = document.getElementById('leaveAllWaitlistsBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Leave All';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
