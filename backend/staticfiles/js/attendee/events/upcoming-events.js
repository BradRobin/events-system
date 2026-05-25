// ============================================
// ATTENDEE UPCOMING EVENTS
// Handles: Upcoming events with time filters (today, week, month, weekend)
// ============================================

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadUpcomingEvents();
    setupFilterButtons();
});

// Load upcoming events with current filter
async function loadUpcomingEvents() {
    showLoading();
    const events = await EventAPI.Attendee.getUpcomingEvents(currentFilter);
    if (events) {
        displayUpcomingEvents(events);
    }
    hideLoading();
}

// Display upcoming events
function displayUpcomingEvents(events) {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;
    
    if (!events.length) {
        container.innerHTML = `
            <div class="no-upcoming">
                <i class="fas fa-calendar-week fa-4x"></i>
                <h3>No upcoming events</h3>
                <p>Check back later for new events</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="upcoming-event-card" onclick="location.href='/event/${event.id}/'">
            <div class="event-date-box">
                <div class="event-day">${new Date(event.start_date).getDate()}</div>
                <div class="event-month">${new Date(event.start_date).toLocaleString('default', { month: 'short' })}</div>
            </div>
            <div class="event-details">
                <h3>${event.title}</h3>
                <div class="event-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="event-description">${event.description?.substring(0, 100) || ''}...</div>
            </div>
            <div class="event-info-right">
                <div class="event-price">KES ${event.price.toLocaleString()}</div>
                <div class="event-seats ${event.available_seats < 20 ? 'limited' : ''}">
                    ${event.available_seats < 20 ? '🔥 ' : ''}${event.available_seats} left
                </div>
                <button class="btn-book-small">Book Now</button>
            </div>
        </div>
    `).join('');
}

// Setup filter buttons
function setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadUpcomingEvents();
        });
    });
}

// Show loading state
function showLoading() {
    const container = document.getElementById('upcomingEventsList');
    if (container) {
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading events...</div>';
    }
}

function hideLoading() {
    // Loading hidden by displayUpcomingEvents
}

// Get countdown to event
function getEventCountdown(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const diff = event - now;
    
    if (diff <= 0) return 'Event started';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
}
