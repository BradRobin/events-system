// ============================================
// ATTENDEE JOIN WAITLIST
// Handles: Adding user to event waitlist when sold out
// ============================================

let currentEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        currentEventId = eventId;
        checkWaitlistStatus(eventId);
        getWaitlistPosition(eventId);
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
}

async function joinWaitlist(eventId = currentEventId) {
    if (!eventId) {
        showToast('Event not found', 'error');
        return;
    }
    
    if (!confirm('Tickets are sold out. Would you like to join the waitlist? You will be notified when tickets become available.')) return;
    
    showLoading();
    
    const result = await EventAPI.Attendee.joinWaitlist(eventId);
    if (result) {
        showToast('Added to waitlist! You will be notified when tickets become available.', 'success');
        
        // Update UI
        const joinBtn = document.getElementById('joinWaitlistBtn');
        if (joinBtn) {
            joinBtn.innerHTML = '<i class="fas fa-check-circle"></i> On Waitlist';
            joinBtn.disabled = true;
            joinBtn.classList.add('active');
        }
        
        // Get waitlist position
        await getWaitlistPosition(eventId);
        
        // Show waitlist info
        document.getElementById('waitlistInfo').style.display = 'block';
    }
    
    hideLoading();
}

async function checkWaitlistStatus(eventId) {
    const position = await EventAPI.Attendee.getWaitlistPosition(eventId);
    const joinBtn = document.getElementById('joinWaitlistBtn');
    
    if (joinBtn && position && position.position) {
        joinBtn.innerHTML = '<i class="fas fa-check-circle"></i> On Waitlist';
        joinBtn.disabled = true;
        joinBtn.classList.add('active');
        document.getElementById('waitlistInfo').style.display = 'block';
    }
}

async function getWaitlistPosition(eventId) {
    const position = await EventAPI.Attendee.getWaitlistPosition(eventId);
    if (position && position.position) {
        updateWaitlistDisplay(position);
    }
}

function updateWaitlistDisplay(position) {
    const positionSpan = document.getElementById('waitlistPosition');
    const totalSpan = document.getElementById('waitlistTotal');
    const notifySpan = document.getElementById('waitlistNotify');
    
    if (positionSpan) positionSpan.innerText = position.position;
    if (totalSpan) totalSpan.innerText = position.total_waiting;
    
    if (notifySpan && position.position <= 5) {
        notifySpan.innerHTML = '<i class="fas fa-fire"></i> You\'re near the front of the line!';
        notifySpan.classList.add('near-front');
    } else if (notifySpan) {
        notifySpan.innerHTML = '<i class="fas fa-hourglass-half"></i> We\'ll notify you when tickets are available';
        notifySpan.classList.remove('near-front');
    }
    
    // Show progress bar
    const progressFill = document.getElementById('waitlistProgressFill');
    if (progressFill && position.total_waiting > 0) {
        const progress = (position.position / position.total_waiting) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

function showLoading() {
    const btn = document.getElementById('joinWaitlistBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
    }
}

function hideLoading() {
    const btn = document.getElementById('joinWaitlistBtn');
    if (btn && btn.innerHTML.includes('Joining')) {
        // Don't reset if already on waitlist
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-clock' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
