// ============================================
// ATTENDEE EVENT CALENDAR
// Handles: Calendar view, month/week/day views, event highlighting
// ============================================

let calendar;
let currentView = 'month';

document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    loadEventDates();
    setupViewSwitcher();
});

// Initialize FullCalendar
async function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;
    
    // Load events for calendar
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    
    const events = await EventAPI.Attendee.getCalendarEvents(
        start.toISOString(), 
        end.toISOString()
    );
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        events: events || [],
        eventClick: function(info) {
            window.location.href = `/event/${info.event.id}/`;
        },
        eventDidMount: function(info) {
            // Add tooltip
            info.el.title = `${info.event.title}\n${info.event.extendedProps.venue}\nKES ${info.event.extendedProps.price}`;
        },
        dayMaxEvents: true,
        weekends: true,
        nowIndicator: true,
        height: 'auto',
        themeSystem: 'bootstrap5'
    });
    
    calendar.render();
}

// Load all event dates for highlighting
async function loadEventDates() {
    const dates = await EventAPI.Attendee.getEventDates();
    if (dates && dates.event_dates) {
        // Highlight dates with events
        highlightEventDates(dates.event_dates);
    }
}

// Highlight dates that have events
function highlightEventDates(eventDates) {
    const cells = document.querySelectorAll('.fc-daygrid-day');
    cells.forEach(cell => {
        const date = cell.getAttribute('data-date');
        if (date && eventDates.includes(date)) {
            cell.classList.add('has-event');
            cell.setAttribute('title', 'Events available on this day');
        }
    });
}

// Setup view switcher (calendar/list)
function setupViewSwitcher() {
    const btns = document.querySelectorAll('.view-switch-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = btn.dataset.view;
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchView(view);
        });
    });
}

// Switch between calendar and list view
function switchView(view) {
    const calendarView = document.getElementById('calendarView');
    const listView = document.getElementById('listView');
    
    if (view === 'calendar') {
        calendarView.style.display = 'block';
        listView.style.display = 'none';
        if (calendar) calendar.render();
    } else {
        calendarView.style.display = 'none';
        listView.style.display = 'block';
        loadEventsList();
    }
}

// Load events in list view
async function loadEventsList(startDate = null, endDate = null) {
    const events = await EventAPI.Attendee.getCalendarEvents(startDate, endDate);
    const container = document.getElementById('eventsList');
    
    if (!events || !events.length) {
        container.innerHTML = '<div class="no-events"><i class="fas fa-calendar-times"></i><p>No events found</p></div>';
        return;
    }
    
    // Group events by date
    const groupedEvents = groupEventsByDate(events);
    
    container.innerHTML = Object.keys(groupedEvents).sort().map(date => `
        <div class="date-group">
            <h3 class="date-header">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div class="events-list">
                ${groupedEvents[date].map(event => `
                    <div class="calendar-event-item" onclick="location.href='/event/${event.id}/'">
                        <div class="event-time">${new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div class="event-details">
                            <h4>${event.title}</h4>
                            <p>${event.extendedProps?.venue || event.venue}</p>
                            <span class="event-price">KES ${event.extendedProps?.price || event.price}</span>
                        </div>
                        <div class="event-status">
                            <span class="seats">${event.extendedProps?.available_seats || 0} seats</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Group events by date
function groupEventsByDate(events) {
    const grouped = {};
    events.forEach(event => {
        const date = new Date(event.start).toDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(event);
    });
    return grouped;
}

// Navigate to specific date
function goToDate(date) {
    if (calendar) {
        calendar.gotoDate(date);
    }
}

// Export calendar to iCal
function exportCalendar() {
    window.open('/api/events/calendar/export/', '_blank');
}
