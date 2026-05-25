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
    }
}

async function loadDashboard() {
    if (window.Loader) window.Loader.show('Loading dashboard...');
    
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
        if (window.Loader) window.Loader.hide();
    }
}

async function loadStats() {
    try {
        const stats = await window.AttendeeAPIEndpoints.dashboard.getStats();
        
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
    }
}

function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element || !trend) return;
    
    const isPositive = trend.percentage >= 0;
    element.className = `stat-trend ${isPositive ? 'up' : 'down'}`;
    element.innerHTML = `${isPositive ? '↑' : '↓'} ${Math.abs(trend.percentage)}%`;
}

async function loadUpcomingTickets() {
    const container = document.getElementById('upcomingTicketsList');
    if (!container) return;
    
    try {
        const result = await window.AttendeeAPIEndpoints.tickets.getUpcoming();
        const tickets = result.results || result;
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <h4>No Upcoming Tickets</h4>
                    <p>You don't have any upcoming events.</p>
                    <a href="/attendee/events/" class="btn-sm btn-primary">Browse Events</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tickets.slice(0, 3).map(ticket => `
            <div class="upcoming-ticket" onclick="window.location.href='/attendee/tickets/detail/?ticket=${ticket.ticket_number}'">
                <div class="ticket-event">
                    <h4>${escapeHtml(ticket.event?.title || 'Event')}</h4>
                    <div class="ticket-date">
                        <i class="fas fa-calendar"></i> ${formatDate(ticket.event?.start_date)}
                    </div>
                    <div class="ticket-venue">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(ticket.event?.venue_name || 'TBD')}
                    </div>
                </div>
                <div class="ticket-status ${ticket.status}">
                    ${ticket.checked_in ? 'Checked In' : 'Valid'}
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

async function loadRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    try {
        const activities = await window.AttendeeAPIEndpoints.dashboard.getRecentActivity();
        
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
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(activity.title)}</div>
                    <div class="activity-description">${escapeHtml(activity.description)}</div>
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

async function loadRecommendations() {
    const container = document.getElementById('recommendationsList');
    if (!container) return;
    
    try {
        const recommendations = await window.AttendeeAPIEndpoints.dashboard.getRecommendations();
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <h4>No Recommendations</h4>
                    <p>Start browsing events to get personalized recommendations.</p>
                    <a href="/attendee/events/" class="btn-sm btn-primary">Browse Events</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recommendations.slice(0, 3).map(event => `
            <div class="recommendation-card" onclick="window.location.href='/attendee/events/detail/?id=${event.id}'">
                <div class="recommendation-image" style="background-image: url('${event.banner_image || '/static/images/placeholder-event.jpg'}')"></div>
                <div class="recommendation-content">
                    <h4>${escapeHtml(event.title)}</h4>
                    <div class="recommendation-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(event.start_date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.city)}</span>
                    </div>
                    <div class="recommendation-price">${formatCurrency(event.min_price)}</div>
                    <div class="recommendation-reason">
                        <i class="fas fa-magic"></i> ${escapeHtml(event.match_reason || 'Recommended for you')}
                    </div>
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

async function loadStatsOverview() {
    try {
        const stats = await window.AttendeeAPIEndpoints.dashboard.getStats();
        
        const mostActiveMonth = document.getElementById('mostActiveMonth');
        const favoriteCategory = document.getElementById('favoriteCategory');
        const totalAttended = document.getElementById('totalAttended');
        const memberSince = document.getElementById('memberSince');
        
        if (mostActiveMonth) mostActiveMonth.textContent = stats.most_active_month || '-';
        if (favoriteCategory) favoriteCategory.textContent = stats.favorite_category || '-';
        if (totalAttended) totalAttended.textContent = formatNumber(stats.total_attended || 0);
        if (memberSince) memberSince.textContent = formatDate(stats.member_since);
        
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
        'default': 'fa-bell'
    };
    return icons[type] || icons.default;
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
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
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

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

window.refreshActivity = refreshActivity;