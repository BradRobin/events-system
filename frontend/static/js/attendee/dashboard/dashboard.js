// ============================================
// DASHBOARD MODULE - Dynamically fetches database data
// ============================================

let refreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    setupStatCardNavigation();
    loadDashboardData();
    displayCurrentDate();
    displayGreeting();
    displayUserName();
    setupAutoRefresh();
    window.addEventListener('profile-updated', displayUserName);
});

function setupStatCardNavigation() {
    const navigableCards = [
        { statId: 'totalTickets', href: '/tickets/' },
        { statId: 'upcomingEvents', href: '/events/' },
        { statId: 'reviewsWritten', href: '/tickets/?tab=past' },
    ];

    navigableCards.forEach(({ statId, href }) => {
        const statEl = document.getElementById(statId);
        const card = statEl?.closest('.stat-card');
        if (!card) return;

        card.classList.add('stat-card--clickable');
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${card.querySelector('.stat-info span')?.textContent || 'View'} — open page`);

        const navigate = () => { window.location.href = href; };
        card.addEventListener('click', navigate);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate();
            }
        });
    });
}

function displayGreeting() {
    const greetingTextEl = document.getElementById('greetingText');
    if (greetingTextEl) {
        const hour = new Date().getHours();
        let greeting = "Good Evening";
        if (hour >= 3 && hour < 12) {
            greeting = "Good Morning";
        } else if (hour >= 12 && hour < 18) {
            greeting = "Good Afternoon";
        }
        greetingTextEl.textContent = greeting;
    }
}

function displayCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function getGreetingFirstName(user) {
    if (user.first_name && String(user.first_name).trim()) {
        return String(user.first_name).trim().split(/\s+/)[0];
    }
    const full = window.AccountProfile
        ? AccountProfile.resolveDisplayName(user)
        : (user.full_name || user.name || user.username || 'Attendee');
    return full.split(/\s+/)[0] || full;
}

function displayUserName() {
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
        userNameSpan.textContent = getGreetingFirstName(user);
    }
}

function loadDashboardData() {
    loadStats();
    loadUpcomingTickets();
    loadRecentActivity();
    loadRecommendations();
    loadStatsOverview();
}

async function loadStats() {
    try {
        let stats;
        if (window.AttendeeAPIEndpoints?.dashboard?.getStats) {
            stats = await window.AttendeeAPIEndpoints.dashboard.getStats();
        }
        
        if (stats) {
            const totalTicketsEl = document.getElementById('totalTickets');
            const totalSpentEl = document.getElementById('totalSpent');
            const upcomingEventsEl = document.getElementById('upcomingEvents');
            const reviewsWrittenEl = document.getElementById('reviewsWritten');
            
            if (totalTicketsEl) totalTicketsEl.textContent = formatNumber(stats.total_tickets || 0);
            if (totalSpentEl) totalSpentEl.textContent = formatCurrency(stats.total_spent || 0);
            if (upcomingEventsEl) upcomingEventsEl.textContent = formatNumber(stats.upcoming_events || 0);
            if (reviewsWrittenEl) reviewsWrittenEl.textContent = formatNumber(stats.reviews_written || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUpcomingTickets() {
    const container = document.getElementById('upcomingTicketsList');
    if (!container) return;
    
    try {
        let tickets = [];
        if (window.AttendeeAPIEndpoints?.tickets?.getUpcoming) {
            const result = await window.AttendeeAPIEndpoints.tickets.getUpcoming();
            tickets = result.results || result;
        }
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<div class="empty-state">No upcoming tickets. <a href="/events/">Browse Events</a></div>';
            return;
        }
        
        container.innerHTML = tickets.slice(0, 3).map(ticket => `
            <div class="ticket-item" onclick="viewTicket('${ticket.ticket_number || ticket.id}')">
                <div class="ticket-item-image" style="background-image: url('${ticket.event?.banner_image || ticket.image || '/static/images/placeholder.jpg'}')"></div>
                <div class="ticket-item-info">
                    <div class="ticket-item-title">${escapeHtml(ticket.event?.title || ticket.title || 'Event')}</div>
                    <div class="ticket-item-date">${formatDate(ticket.event?.start_date || ticket.date)}</div>
                </div>
                <div class="ticket-item-price">${formatCurrency(ticket.price)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading upcoming tickets:', error);
        container.innerHTML = '<div class="empty-state">Error loading tickets.</div>';
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    try {
        let activities = [];
        if (window.AttendeeAPIEndpoints?.dashboard?.getRecentActivity) {
            activities = await window.AttendeeAPIEndpoints.dashboard.getRecentActivity();
        }
        
        if (!activities || activities.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent activity. Start booking events!</div>';
            return;
        }
        
        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item activity-${activity.type || 'booking'}" onclick="window.location.href='${activity.action_url || '#'}'" style="cursor: pointer;">
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(activity.title)}</div>
                    <div class="activity-description">${escapeHtml(activity.description || '')}</div>
                    <div class="activity-time">
                        <i class="fas fa-clock"></i>
                        ${formatRelativeTime(activity.created_at || activity.time)}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<div class="empty-state">Error loading activity.</div>';
    }
}

async function loadRecommendations() {
    const container = document.getElementById('recommendationsList');
    if (!container) return;
    
    try {
        let recommendations = [];
        if (window.AttendeeAPIEndpoints?.dashboard?.getRecommendations) {
            recommendations = await window.AttendeeAPIEndpoints.dashboard.getRecommendations();
        }
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<div class="empty-state">No recommended events. <a href="/events/">Browse Events</a></div>';
            return;
        }
        
        container.innerHTML = recommendations.slice(0, 3).map(event => `
            <div class="recommendation-item" onclick="viewEvent(${event.id})">
                <div class="recommendation-image" style="background-image: url('${event.image || event.banner_image || '/static/images/placeholder.jpg'}')"></div>
                <div class="recommendation-info">
                    <div class="recommendation-category">${escapeHtml(event.category_name || event.category || 'General')}</div>
                    <div class="recommendation-title">${escapeHtml(event.title)}</div>
                    <div class="recommendation-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(event.date || event.start_date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location || event.venue || 'TBD')}</span>
                    </div>
                    <div class="recommendation-price">${formatCurrency(event.price)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recommendations:', error);
        container.innerHTML = '<div class="empty-state">Error loading recommendations.</div>';
    }
}

async function loadStatsOverview() {
    try {
        const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
        
        const memberSince = document.getElementById('memberSince');
        const favoriteCategory = document.getElementById('favoriteCategory');
        const eventsAttended = document.getElementById('eventsAttended');
        
        if (memberSince) {
            memberSince.textContent = user.date_joined ? formatDate(user.date_joined) : '2026';
        }
        
        // Fetch stats from backend profile stats endpoint
        if (window.AttendeeAPIEndpoints?.profile?.getStats) {
            const stats = await window.AttendeeAPIEndpoints.profile.getStats();
            if (stats) {
                if (favoriteCategory) favoriteCategory.textContent = stats.favorite_category || 'General';
                if (eventsAttended) eventsAttended.textContent = formatNumber(stats.total_events || 0);
            }
        }
    } catch (error) {
        console.error('Error loading stats overview:', error);
    }
}

function refreshActivity() {
    loadRecentActivity();
    showToast('Activity refreshed!', 'success');
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
    window.location.href = `/tickets/detail/?ticket=${ticketId}`;
}

function viewEvent(eventId) {
    window.location.href = `/events/detail/?id=${eventId}`;
}

function formatNumber(num) {
    return Number(num).toLocaleString('en-KE');
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return 'TBA';
    }
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        if (isNaN(val)) return 'KES 0';
        return `KES ${val.toLocaleString('en-KE')}`;
    } catch (e) {
        return 'KES 0';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 10000;
        padding: 12px 20px; border-radius: 12px; color: white;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        animation: slideInRight 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.refreshActivity = refreshActivity;
window.viewTicket = viewTicket;
window.viewEvent = viewEvent;
