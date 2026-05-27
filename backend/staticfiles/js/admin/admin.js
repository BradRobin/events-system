/* ============================================
   ADMIN CORE JAVASCRIPT - Complete Working
   EventHub Admin Portal - Core Functionality
   ============================================ */

// Global API Request Function
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        let result;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`Server returned an invalid response (${response.status})`);
            }
            return text;
        }
        
        if (!response.ok) {
            throw new Error(result.message || result.error || result.detail || 'Request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        
        let msg = error.message;
        if (error instanceof SyntaxError || msg.includes('JSON')) {
            msg = 'Server connection error. Please try again.';
        }
        
        // Suppress 404 Not Found from showing toast popups automatically
        if (!msg.includes('404')) {
            showToast(msg, 'error');
        }
        throw error;
    }
}

// Get CSRF Token
function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

// Toast Notification - Bottom Right
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
        <i class="ri-${type === 'success' ? 'checkbox-circle-line' : 'error-warning-line'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format Currency
function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Loader
window.Loader = {
    show: function(message = 'Loading...') {
        this.hide();
        const overlay = document.createElement('div');
        overlay.id = 'globalLoader';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;
        const container = document.createElement('div');
        container.style.cssText = 'text-align: center;';
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            margin: 0 auto 12px;
            border: 2px solid rgba(245,158,11,0.2);
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        `;
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'color: #f59e0b; font-size: 13px;';
        container.appendChild(spinner);
        container.appendChild(msg);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    },
    hide: function() {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.remove();
    }
};

// DOM Ready - Initialize
document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initDropdowns();
    initActivePageHighlighting();
    initNotifications();
    initPendingCount();
});

function initSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');
    
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) closeSidebar();
    });
}

function initDropdowns() {
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const parent = this.closest('.nav-dropdown');
            if (parent) parent.classList.toggle('open');
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown.open').forEach(function(d) {
                d.classList.remove('open');
            });
        }
    });
}

function initActivePageHighlighting() {
    const currentUrl = window.location.pathname;
    
    document.querySelectorAll('.dropdown-item, .nav-item').forEach(function(link) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href !== '/' && currentUrl.includes(href)) {
            link.classList.add('active');
            const parent = link.closest('.nav-dropdown');
            if (parent) parent.classList.add('open');
        }
    });
}

function initNotifications() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    
    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationsPanel.classList.toggle('open');
            loadNotifications();
        });
        
        document.addEventListener('click', function() {
            notificationsPanel.classList.remove('open');
        });
        
        notificationsPanel.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    loadNotifications();
}

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
    
    try {
        const response = await fetch('/api/admin/notifications/recent/');
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
            const data = await response.json();
            displayNotifications(data.notifications, data.unread_count);
        } else {
            throw new Error('API not ready');
        }
    } catch (error) {
        // Show empty state when API is not ready
        container.innerHTML = '<div class="empty-state"><i class="ri-mail-line"></i><p>No notifications</p></div>';
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.style.display = 'none';
    }
}

function displayNotifications(notifications, unreadCount) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="ri-mail-line"></i><p>No notifications</p></div>';
    } else {
        container.innerHTML = notifications.map(n => `
            <div class="notification-item ${!n.is_read ? 'unread' : ''}" data-id="${n.id}">
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(n.title)}</div>
                    <div class="notification-message">${escapeHtml(n.message)}</div>
                    <div class="notification-time">${formatRelativeTime(n.created_at)}</div>
                </div>
                ${!n.is_read ? `<button class="mark-read" onclick="markNotificationRead(${n.id})">✓</button>` : ''}
            </div>
        `).join('');
    }
    
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

window.markNotificationRead = async function(notificationId) {
    try {
        await fetch(`/api/admin/notifications/${notificationId}/read/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
    } catch (error) {
        console.error('Error marking as read:', error);
    }
    
    const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
    if (item) {
        item.classList.remove('unread');
        const markBtn = item.querySelector('.mark-read');
        if (markBtn) markBtn.remove();
    }
    
    updateNotificationBadge();
};

window.markAllAsRead = async function() {
    try {
        await fetch('/api/admin/notifications/mark-all-read/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
    
    document.querySelectorAll('.notification-item.unread').forEach(function(item) {
        item.classList.remove('unread');
        const markBtn = item.querySelector('.mark-read');
        if (markBtn) markBtn.remove();
    });
    
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.style.display = 'none';
};

function updateNotificationBadge() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function initPendingCount() {
    const badge = document.getElementById('pendingBadge');
    if (badge) {
        fetchPendingCount();
        setInterval(fetchPendingCount, 30000);
    }
}

async function fetchPendingCount() {
    const badge = document.getElementById('pendingBadge');
    if (!badge) return;
    
    try {
        const response = await fetch('/api/admin/events/pending/count/');
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const count = data.count || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching pending count:', error);
    }
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

// Export globals
window.apiRequest = apiRequest;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;

console.log('✅ Admin JS loaded');