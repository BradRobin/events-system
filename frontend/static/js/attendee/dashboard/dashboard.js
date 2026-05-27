// ============================================
// ATTENDEE DASHBOARD - Complete Functionality
// ============================================

let refreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    loadUserName();
    loadDashboard();
    setupAutoRefresh();
});

function setCurrentDate() {
    const dateSpan = document.getElementById('currentDate');
    if (dateSpan) {
        dateSpan.textContent = new Date().toLocaleDateString('en-KE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function loadUserName() {
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan && user.name) {
        userNameSpan.textContent = user.name.split(' ')[0];
    } else if (userNameSpan) {
        userNameSpan.textContent = 'Attendee';
    }
}

async function loadDashboard() {
    showLoader('Loading dashboard...');
    
    try {
        await Promise.all([
            loadStats(),
            loadUpcomingTickets(),
            loadRecentActivity(),
            loadRecommendations(),
            loadStatsOverview()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        hideLoader();
    }
}

async function loadStats() {
    try {
        // Try API first, fallback to mock data
        let stats;
        if (window.AttendeeAPIEndpoints?.dashboard?.getStats) {
            stats = await window.AttendeeAPIEndpoints.dashboard.getStats();
        } else {
            stats = getMockStats();
        }
        
        const totalTickets = document.getElementById('totalTickets');
        const totalSpent = document.getElementById('totalSpent');
        const upcomingEvents = document.getElementById('upcomingEvents');
        const reviewsWritten = document.getElementById('reviewsWritten');
        
        if (totalTickets) totalTickets.textContent = formatNumber(stats.total_tickets || 0);
        if (totalSpent) totalSpent.textContent = formatCurrency(stats.total_spent || 0);
        if (upcomingEvents) upcomingEvents.textContent = formatNumber(stats.upcoming_events || 0);
        if (reviewsWritten) reviewsWritten.textContent = formatNumber(stats.reviews_written || 0);
        
        updateTrend('ticketsTrend', stats.tickets_trend);
        updateTrend('spentTrend', stats.spent_trend);
        updateTrend('upcomingTrend', stats.upcoming_trend);
        updateTrend('reviewsTrend', stats.reviews_trend);
        
    } catch (error) {
        console.error('Error loading stats:', error);
        setDefaultStats();
    }
}

function getMockStats() {
    return {
        total_tickets: 8,
        total_spent: 24500,
        upcoming_events: 3,
        reviews_written: 2,
        tickets_trend: { percentage: 12, direction: 'up' },
        spent_trend: { percentage: 8, direction: 'up' },
        upcoming_trend: { percentage: 0, direction: 'flat' },
        reviews_trend: { percentage: 100, direction: 'up' }
    };
}

function setDefaultStats() {
    const totalTickets = document.getElementById('totalTickets');
    const totalSpent = document.getElementById('totalSpent');
    const upcomingEvents = document.getElementById('upcomingEvents');
    const reviewsWritten = document.getElementById('reviewsWritten');
    
    if (totalTickets) totalTickets.textContent = '0';
    if (totalSpent) totalSpent.textContent = 'KSh 0';
    if (upcomingEvents) upcomingEvents.textContent = '0';
    if (reviewsWritten) reviewsWritten.textContent = '0';
}

function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (!trend || trend.percentage === undefined) {
        element.style.display = 'none';
        return;
    }
    
    element.style.display = 'inline-block';
    const isPositive = trend.percentage >= 0;
    element.className = `stat-trend ${isPositive ? 'up' : 'down'}`;
    element.innerHTML = `${isPositive ? '↑' : '↓'} ${Math.abs(trend.percentage)}%`;
}

async function loadUpcomingTickets() {
    const container = document.getElementById('upcomingTicketsList');
    if (!container) return;
    
    try {
        let tickets;
        if (window.AttendeeAPIEndpoints?.tickets?.getUpcoming) {
            const result = await window.AttendeeAPIEndpoints.tickets.getUpcoming();
            tickets = result.results || result;
        } else {
            tickets = getMockUpcomingTickets();
        }
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <h4>No Upcoming Tickets</h4>
                    <p>You don't have any upcoming events.</p>
                    <a href="/events/" class="btn-sm btn-primary">Browse Events</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tickets.slice(0, 3).map(ticket => `
            <div class="ticket-item" onclick="viewTicket('${ticket.id || ticket.ticket_number}')">
                <div class="ticket-image" style="background-image: url('${ticket.event?.banner_image || ticket.image || '/static/images/placeholder.jpg'}')"></div>
                <div class="ticket-info">
                    <h4>${escapeHtml(ticket.event?.title || ticket.title || 'Event')}</h4>
                    <p><i class="fas fa-calendar"></i> ${formatDate(ticket.event?.start_date || ticket.date)}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ticket.event?.venue_name || ticket.location || 'TBD')}</p>
                    <span class="ticket-status ${ticket.status || 'confirmed'}">${ticket.status || 'Confirmed'}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading upcoming tickets:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Unable to Load Tickets</h4>
                <button class="btn-sm btn-outline" onclick="loadUpcomingTickets()">Retry</button>
            </div>
        `;
    }
}

function getMockUpcomingTickets() {
    return [
        { id: 1, ticket_number: 'TKT-001', title: 'Summer Music Festival', date: '2026-06-15', location: 'Nairobi, Kenya', status: 'confirmed', image: null },
        { id: 2, ticket_number: 'TKT-002', title: 'Tech Innovation Summit', date: '2026-07-20', location: 'Mombasa, Kenya', status: 'confirmed', image: null },
        { id: 3, ticket_number: 'TKT-003', title: 'Food & Wine Expo', date: '2026-09-05', location: 'Kisumu, Kenya', status: 'pending', image: null }
    ];
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    try {
        let activities;
        if (window.AttendeeAPIEndpoints?.dashboard?.getRecentActivity) {
            activities = await window.AttendeeAPIEndpoints.dashboard.getRecentActivity();
        } else {
            activities = getMockRecentActivity();
        }
        
        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>No Recent Activity</h4>
                    <p>Your recent activity will appear here.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item" onclick="window.location.href='${activity.action_url || '#'}'">
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${escapeHtml(activity.title)}</div>
                    <div class="activity-time">${formatRelativeTime(activity.created_at)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Unable to Load Activity</h4>
                <button class="btn-sm btn-outline" onclick="loadRecentActivity()">Retry</button>
            </div>
        `;
    }
}

function getMockRecentActivity() {
    return [
        { id: 1, type: 'booking', title: 'Booked ticket for Summer Music Festival', created_at: new Date().toISOString(), action_url: '/attendee/tickets/' },
        { id: 2, type: 'wishlist', title: 'Added Tech Summit to wishlist', created_at: new Date(Date.now() - 86400000).toISOString(), action_url: '/wishlist/' },
        { id: 3, type: 'review', title: 'Wrote a review for Art Exhibition', created_at: new Date(Date.now() - 172800000).toISOString(), action_url: '/attendee/reviews/' },
        { id: 4, type: 'profile', title: 'Updated profile information', created_at: new Date(Date.now() - 345600000).toISOString(), action_url: '/attendee/profile/' }
    ];
}

async function loadRecommendations() {
    const container = document.getElementById('recommendationsList');
    if (!container) return;
    
    try {
        let recommendations;
        if (window.AttendeeAPIEndpoints?.dashboard?.getRecommendations) {
            recommendations = await window.AttendeeAPIEndpoints.dashboard.getRecommendations();
        } else {
            recommendations = getMockRecommendations();
        }
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <h4>No Recommendations</h4>
                    <p>Start browsing events to get personalized recommendations.</p>
                    <a href="/events/" class="btn-sm btn-primary">Browse Events</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recommendations.slice(0, 3).map(event => `
            <div class="recommendation-item" onclick="viewEvent(${event.id})">
                <div class="recommendation-image" style="background-image: url('${event.image || '/static/images/placeholder.jpg'}')"></div>
                <div class="recommendation-info">
                    <h4>${escapeHtml(event.title)}</h4>
                    <p><i class="fas fa-calendar"></i> ${formatDate(event.date)}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location)}</p>
                    <div class="recommendation-price">${formatCurrency(event.price)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recommendations:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Unable to Load Recommendations</h4>
                <button class="btn-sm btn-outline" onclick="loadRecommendations()">Retry</button>
            </div>
        `;
    }
}

function getMockRecommendations() {
    return [
        { id: 4, title: 'Marathon Kenya 2026', date: '2026-08-10', location: 'Eldoret, Kenya', price: 1500, image: null },
        { id: 5, title: 'Entrepreneurship Forum', date: '2026-10-12', location: 'Nairobi, Kenya', price: 4500, image: null },
        { id: 6, title: 'Art Exhibition', date: '2026-11-18', location: 'Nakuru, Kenya', price: 1000, image: null }
    ];
}

async function loadStatsOverview() {
    try {
        const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
        
        const memberSince = document.getElementById('memberSince');
        const favoriteCategory = document.getElementById('favoriteCategory');
        const eventsAttended = document.getElementById('eventsAttended');
        
        if (memberSince) memberSince.textContent = user.date_joined ? formatDate(user.date_joined) : '2024';
        if (favoriteCategory) favoriteCategory.textContent = user.favorite_category || 'Music';
        if (eventsAttended) eventsAttended.textContent = '5';
        
    } catch (error) {
        console.error('Error loading stats overview:', error);
    }
}

function refreshActivity() {
    loadRecentActivity();
    showToast('Activity refreshed', 'success');
}

function setupAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        loadStats();
        loadRecentActivity();
    }, 60000);
}

function getActivityIcon(type) {
    const icons = {
        'booking': 'fa-ticket-alt',
        'payment': 'fa-credit-card',
        'refund': 'fa-undo-alt',
        'review': 'fa-star',
        'checkin': 'fa-check-circle',
        'wishlist': 'fa-heart',
        'profile': 'fa-user-edit',
        'default': 'fa-bell'
    };
    return icons[type] || icons.default;
}

function viewTicket(ticketId) {
    window.location.href = `/attendee/tickets/detail/?id=${ticketId}`;
}

function viewEvent(eventId) {
    window.location.href = `/events/detail/?id=${eventId}`;
}

function formatNumber(num) {
    return Number(num).toLocaleString('en-KE');
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoader(message) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        const loaderText = loader.querySelector('.loader-text');
        if (loaderText) loaderText.textContent = message || 'Loading...';
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global for onclick handlers
window.refreshActivity = refreshActivity;
window.viewTicket = viewTicket;
window.viewEvent = viewEvent;
window.loadUpcomingTickets = loadUpcomingTickets;
window.loadRecentActivity = loadRecentActivity;
window.loadRecommendations = loadRecommendations;
