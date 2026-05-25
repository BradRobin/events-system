// ============================================
// ATTENDEE DASHBOARD JAVASCRIPT
// Handles: Dashboard stats, upcoming events, activity feed
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadUpcomingEvents();
    loadRecentActivity();
    initCharts();
});

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/user/dashboard/stats/');
        const data = await response.json();
        
        if (data) {
            document.getElementById('totalTickets').innerText = data.total_tickets || 0;
            document.getElementById('upcomingEvents').innerText = data.upcoming_events || 0;
            document.getElementById('totalSpent').innerText = `$${data.total_spent || 0}`;
            document.getElementById('wishlistCount').innerText = data.wishlist_count || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadUpcomingEvents() {
    try {
        const response = await fetch('/api/user/dashboard/upcoming/');
        const data = await response.json();
        const container = document.getElementById('upcomingEventsList');
        
        if (container && data.length) {
            container.innerHTML = data.map(event => `
                <div class="upcoming-event-item d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                    <div class="event-date text-center me-3">
                        <div class="day">${new Date(event.start_date).getDate()}</div>
                        <div class="month">${new Date(event.start_date).toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div class="event-info flex-grow-1">
                        <h6 class="mb-1">${event.title}</h6>
                        <p class="text-muted small mb-0">
                            <i class="fas fa-map-marker-alt"></i> ${event.venue} | 
                            <i class="fas fa-clock"></i> ${new Date(event.start_date).toLocaleTimeString()}
                        </p>
                    </div>
                    <div class="event-action">
                        <a href="/event/${event.id}/" class="btn btn-sm btn-primary">View Ticket</a>
                    </div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="text-center py-4"><p class="text-muted">No upcoming events</p></div>';
        }
    } catch (error) {
        console.error('Error loading upcoming events:', error);
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/user/dashboard/activity/');
        const data = await response.json();
        const container = document.getElementById('recentActivityList');
        
        if (container && data.length) {
            container.innerHTML = data.map(activity => `
                <div class="activity-item d-flex align-items-start mb-3">
                    <div class="activity-icon me-3">
                        <i class="fas ${activity.icon} text-primary"></i>
                    </div>
                    <div class="activity-detail">
                        <p class="mb-0">${activity.message}</p>
                        <small class="text-muted">${getTimeAgo(activity.timestamp)}</small>
                    </div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="text-center py-4"><p class="text-muted">No recent activity</p></div>';
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function initCharts() {
    const ctx = document.getElementById('bookingsChart')?.getContext('2d');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Bookings',
                    data: [5, 8, 12, 7, 15, 20],
                    borderColor: '#ec6408',
                    backgroundColor: 'rgba(236, 100, 8, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }
}

function refreshDashboard() {
    loadDashboardStats();
    loadUpcomingEvents();
    loadRecentActivity();
}
