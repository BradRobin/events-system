// ============================================
// ATTENDEE GET REMINDERS
// Handles: Fetching and displaying user's reminders
// ============================================

let remindersList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('remindersContainer')) {
        loadReminders();
    }
});

async function loadReminders() {
    showLoading();
    
    const reminders = await EventAPI.Attendee.getReminders();
    if (reminders && reminders.length) {
        remindersList = reminders;
        displayReminders(reminders);
        updateReminderCount(reminders.length);
    } else {
        displayEmptyState();
    }
    
    hideLoading();
}

function displayReminders(reminders) {
    const container = document.getElementById('remindersContainer');
    if (!container) return;
    
    // Sort by event date (soonest first)
    reminders.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    container.innerHTML = reminders.map(reminder => `
        <div class="reminder-card" data-reminder-id="${reminder.id}" data-event-id="${reminder.event_id}">
            <div class="reminder-event-image">
                ${reminder.event_image ? 
                    `<img src="${reminder.event_image}" alt="${reminder.event_title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
            </div>
            <div class="reminder-info">
                <h3 class="reminder-title">${reminder.event_title}</h3>
                <div class="reminder-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${reminder.event_venue}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(reminder.event_date).toLocaleDateString()}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(reminder.event_date).toLocaleTimeString()}</span>
                </div>
                <div class="reminder-time-info">
                    <i class="fas fa-bell"></i>
                    Reminder: ${formatReminderTime(reminder.reminder_time)} before
                    ${!reminder.reminder_sent ? '<span class="pending">(Pending)</span>' : '<span class="sent">(Sent)</span>'}
                </div>
                <div class="countdown-timer" data-event-date="${reminder.event_date}"></div>
            </div>
            <div class="reminder-actions">
                <button class="btn-remove" onclick="removeReminder(${reminder.id})" title="Remove Reminder">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <a href="/event/${reminder.event_id}/" class="btn-view">View Event</a>
            </div>
        </div>
    `).join('');
    
    // Initialize countdown timers
    initializeCountdownTimers();
}

function initializeCountdownTimers() {
    const timers = document.querySelectorAll('.countdown-timer');
    timers.forEach(timer => {
        const eventDate = new Date(timer.dataset.eventDate);
        updateCountdown(timer, eventDate);
        
        // Update every minute
        setInterval(() => updateCountdown(timer, eventDate), 60000);
    });
}

function updateCountdown(element, eventDate) {
    const now = new Date();
    const diff = eventDate - now;
    
    if (diff <= 0) {
        element.innerHTML = '<span class="event-started">Event has started!</span>';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
    
    let countdownText = '';
    if (days > 0) countdownText += `${days}d `;
    if (hours > 0 || days > 0) countdownText += `${hours}h `;
    countdownText += `${minutes}m`;
    
    element.innerHTML = `<i class="fas fa-hourglass-half"></i> ${countdownText} remaining`;
}

function formatReminderTime(time) {
    const formats = {
        '15_minutes': '15 minutes',
        '1_hour': '1 hour',
        '2_hours': '2 hours',
        '1_day': '1 day',
        '1_week': '1 week'
    };
    return formats[time] || time;
}

function displayEmptyState() {
    const container = document.getElementById('remindersContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash fa-4x"></i>
                <h3>No Reminders Set</h3>
                <p>You haven't set any event reminders yet.</p>
                <a href="/events/" class="btn-browse">Browse Events</a>
            </div>
        `;
    }
}

function updateReminderCount(count) {
    const badge = document.getElementById('reminderCount');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function filterReminders(filter) {
    const cards = document.querySelectorAll('.reminder-card');
    cards.forEach(card => {
        switch(filter) {
            case 'upcoming':
                const eventDate = new Date(card.querySelector('.countdown-timer').dataset.eventDate);
                card.style.display = eventDate > new Date() ? 'block' : 'none';
                break;
            case 'past':
                const pastDate = new Date(card.querySelector('.countdown-timer').dataset.eventDate);
                card.style.display = pastDate < new Date() ? 'block' : 'none';
                break;
            default:
                card.style.display = 'block';
        }
    });
}

function showLoading() {
    const container = document.getElementById('remindersContainer');
    if (container && !container.querySelector('.reminder-card')) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading reminders...</div>';
    }
}

function hideLoading() {
    // Loading hidden by displayReminders or displayEmptyState
}
