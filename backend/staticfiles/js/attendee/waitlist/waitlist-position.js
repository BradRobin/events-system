// ============================================
// ATTENDEE WAITLIST POSITION
// Handles: Getting and displaying waitlist position
// ============================================

let positionRefreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        startPositionRefresh(eventId);
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
}

async function getWaitlistPosition(eventId) {
    const position = await EventAPI.Attendee.getWaitlistPosition(eventId);
    if (position) {
        displayWaitlistPosition(position);
        return position;
    }
    return null;
}

function displayWaitlistPosition(position) {
    const positionSpan = document.getElementById('waitlistPosition');
    const totalSpan = document.getElementById('waitlistTotal');
    const progressFill = document.getElementById('waitlistProgressFill');
    const positionText = document.getElementById('waitlistPositionText');
    const waitlistInfo = document.getElementById('waitlistInfo');
    
    if (positionSpan) positionSpan.innerText = position.position;
    if (totalSpan) totalSpan.innerText = position.total_waiting;
    
    if (progressFill && position.total_waiting > 0) {
        const progress = (position.position / position.total_waiting) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    if (positionText && position.position) {
        if (position.position === 1) {
            positionText.innerHTML = '<i class="fas fa-crown"></i> You\'re next in line!';
            positionText.classList.add('next-in-line');
        } else if (position.position <= 5) {
            positionText.innerHTML = `<i class="fas fa-fire"></i> You're #${position.position} in line - almost there!`;
            positionText.classList.add('near-front');
        } else {
            positionText.innerHTML = `<i class="fas fa-hourglass-half"></i> You're #${position.position} in line`;
            positionText.classList.remove('near-front', 'next-in-line');
        }
    }
    
    if (waitlistInfo && position.position) {
        waitlistInfo.style.display = 'block';
    }
    
    // Show estimated wait time
    if (position.total_waiting > 0 && position.position) {
        const estimatedTime = calculateEstimatedWaitTime(position.position, position.total_waiting);
        const timeSpan = document.getElementById('estimatedWaitTime');
        if (timeSpan) timeSpan.innerText = estimatedTime;
    }
}

function calculateEstimatedWaitTime(position, total) {
    // Rough estimate - 1 week per 100 people
    const weeks = Math.ceil(position / 100);
    if (weeks <= 1) return 'less than a week';
    if (weeks === 1) return 'about 1 week';
    return `about ${weeks} weeks`;
}

function startPositionRefresh(eventId) {
    // Refresh position every 30 seconds
    if (positionRefreshInterval) clearInterval(positionRefreshInterval);
    
    positionRefreshInterval = setInterval(() => {
        getWaitlistPosition(eventId);
    }, 30000);
}

function stopPositionRefresh() {
    if (positionRefreshInterval) {
        clearInterval(positionRefreshInterval);
        positionRefreshInterval = null;
    }
}

async function getPositionUpdate(eventId) {
    const newPosition = await getWaitlistPosition(eventId);
    if (newPosition && newPosition.position) {
        showPositionNotification(newPosition.position);
    }
}

function showPositionNotification(newPosition) {
    const previousPosition = parseInt(document.getElementById('waitlistPosition')?.innerText || newPosition);
    
    if (newPosition < previousPosition) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `<i class="fas fa-arrow-up"></i> You've moved up to #${newPosition} on the waitlist!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
}

// Create waitlist status bar for event cards
function createWaitlistStatusBadge(eventId, position) {
    if (!position || !position.position) return '';
    
    let badgeClass = 'waitlist-badge';
    let badgeText = `Waitlist #${position.position}`;
    
    if (position.position === 1) {
        badgeClass += ' next';
        badgeText = 'Next in line!';
    } else if (position.position <= 5) {
        badgeClass += ' near-front';
        badgeText = `#${position.position} in waitlist`;
    }
    
    return `<span class="${badgeClass}" title="${position.total_waiting} people waiting">${badgeText}</span>`;
}
