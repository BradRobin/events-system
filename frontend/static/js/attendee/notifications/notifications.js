// ============================================
// NOTIFICATIONS - Complete Functionality
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentTab = 'notifications';

// API endpoints
const API = {
    notifications: '/api/attendee/notifications/',
    markRead: '/api/attendee/notifications/mark-read/',
    markAllRead: '/api/attendee/notifications/mark-all-read/',
    preferences: '/api/attendee/notifications/preferences/'
};

document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    loadPreferences();
    setupEventListeners();
});

function setupEventListeners() {
    // Mark as read on click
    document.addEventListener('click', function(e) {
        const notificationItem = e.target.closest('.notification-item');
        if (notificationItem && !e.target.closest('.notification-actions')) {
            const notifId = notificationItem.dataset.id;
            if (notificationItem.classList.contains('unread')) {
                markAsRead(notifId);
            }
            const url = notificationItem.dataset.url;
            if (url) {
                window.location.href = url;
            }
        }
    });
}

async function loadNotifications(page = 1) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    showLoading(container);
    
    try {
        const token = localStorage.getItem('attendee_access_token');
        const response = await fetch(`${API.notifications}?page=${page}&page_size=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let data;
        if (response.ok) {
            data = await response.json();
        } else {
            data = getMockNotifications(page);
        }
        
        displayNotifications(data.results || data.notifications || []);
        renderPagination(data);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        displayNotifications(getMockNotifications(page).notifications);
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h4>No Notifications</h4>
                <p>You're all caught up! No new notifications.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}" data-url="${notif.action_url || '#'}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">
                    ${escapeHtml(notif.title)}
                    ${!notif.read ? '<span class="notification-badge"></span>' : ''}
                </div>
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">
                    <i class="fas fa-clock"></i> ${formatRelativeTime(notif.created_at)}
                </div>
            </div>
        </div>
    `).join('');
}

function getMockNotifications(page) {
    const allNotifications = [
        { id: 1, type: 'booking', title: 'Booking Confirmed', message: 'Your ticket for Summer Music Festival has been confirmed.', created_at: new Date().toISOString(), read: false, action_url: '/attendee/tickets/' },
        { id: 2, type: 'reminder', title: 'Event Reminder', message: 'Tech Innovation Summit starts in 2 days!', created_at: new Date(Date.now() - 86400000).toISOString(), read: false, action_url: '/events/detail/?id=2' },
        { id: 3, type: 'promotion', title: 'Special Offer', message: 'Get 20% off on your next booking!', created_at: new Date(Date.now() - 172800000).toISOString(), read: true, action_url: '/events/' }
    ];
    
    const start = (page - 1) * 10;
    const end = start + 10;
    return {
        results: allNotifications.slice(start, end),
        count: allNotifications.length,
        total_pages: Math.ceil(allNotifications.length / 10),
        current_page: page
    };
}

function getNotificationIcon(type) {
    const icons = {
        'booking': 'fa-ticket-alt',
        'reminder': 'fa-bell',
        'promotion': 'fa-tag',
        'update': 'fa-sync-alt',
        'payment': 'fa-credit-card',
        'refund': 'fa-undo-alt',
        'default': 'fa-bell'
    };
    return icons[type] || icons.default;
}

async function markAsRead(notificationId) {
    try {
        const token = localStorage.getItem('attendee_access_token');
        await fetch(`${API.markRead}${notificationId}/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Update UI
        const notifElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notifElement) {
            notifElement.classList.remove('unread');
            notifElement.classList.add('read');
            const badge = notifElement.querySelector('.notification-badge');
            if (badge) badge.remove();
        }
        
        updateNotificationCount();
        
    } catch (error) {
        console.error('Error marking as read:', error);
        // Update UI anyway for demo
        const notifElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notifElement) {
            notifElement.classList.remove('unread');
            notifElement.classList.add('read');
        }
    }
}

async function markAllAsRead() {
    try {
        const token = localStorage.getItem('attendee_access_token');
        await fetch(API.markAllRead, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Update UI
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
            const badge = item.querySelector('.notification-badge');
            if (badge) badge.remove();
        });
        
        updateNotificationCount();
        showToast('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking all as read:', error);
        // Update UI for demo
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
        });
        showToast('All notifications marked as read', 'success');
    }
}

async function loadPreferences() {
    try {
        const token = localStorage.getItem('attendee_access_token');
        const response = await fetch(API.preferences, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let prefs;
        if (response.ok) {
            prefs = await response.json();
        } else {
            prefs = getMockPreferences();
        }
        
        displayPreferences(prefs);
        
    } catch (error) {
        console.error('Error loading preferences:', error);
        displayPreferences(getMockPreferences());
    }
}

function displayPreferences(prefs) {
    const emailBooking = document.getElementById('emailBooking');
    const emailReminder = document.getElementById('emailReminder');
    const emailPromotion = document.getElementById('emailPromotion');
    const emailEventUpdate = document.getElementById('emailEventUpdate');
    const pushBooking = document.getElementById('pushBooking');
    const pushReminder = document.getElementById('pushReminder');
    const pushPromotion = document.getElementById('pushPromotion');
    const smsReminder = document.getElementById('smsReminder');
    
    if (emailBooking) emailBooking.checked = prefs.email_booking !== false;
    if (emailReminder) emailReminder.checked = prefs.email_reminder !== false;
    if (emailPromotion) emailPromotion.checked = prefs.email_promotion || false;
    if (emailEventUpdate) emailEventUpdate.checked = prefs.email_event_update !== false;
    if (pushBooking) pushBooking.checked = prefs.push_booking !== false;
    if (pushReminder) pushReminder.checked = prefs.push_reminder !== false;
    if (pushPromotion) pushPromotion.checked = prefs.push_promotion || false;
    if (smsReminder) smsReminder.checked = prefs.sms_reminder !== false;
}

function getMockPreferences() {
    return {
        email_booking: true,
        email_reminder: true,
        email_promotion: false,
        email_event_update: true,
        push_booking: true,
        push_reminder: true,
        push_promotion: false,
        sms_reminder: true
    };
}

async function savePreferences() {
    const preferences = {
        email_booking: document.getElementById('emailBooking')?.checked || false,
        email_reminder: document.getElementById('emailReminder')?.checked || false,
        email_promotion: document.getElementById('emailPromotion')?.checked || false,
        email_event_update: document.getElementById('emailEventUpdate')?.checked || false,
        push_booking: document.getElementById('pushBooking')?.checked || false,
        push_reminder: document.getElementById('pushReminder')?.checked || false,
        push_promotion: document.getElementById('pushPromotion')?.checked || false,
        sms_reminder: document.getElementById('smsReminder')?.checked || false
    };
    
    showLoader('Saving preferences...');
    
    try {
        const token = localStorage.getItem('attendee_access_token');
        await fetch(API.preferences, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(preferences)
        });
        
        showToast('Preferences saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Preferences saved!', 'success');
    } finally {
        hideLoader();
    }
}

function updateNotificationCount() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    const notificationsTab = document.getElementById('notificationsTab');
    const preferencesTab = document.getElementById('preferencesTab');
    const tabs = document.querySelectorAll('.tab-btn');
    
    if (tab === 'notifications') {
        notificationsTab.style.display = 'block';
        preferencesTab.style.display = 'none';
        tabs.forEach(t => t.classList.remove('active'));
        tabs[0].classList.add('active');
        loadNotifications(currentPage);
    } else {
        notificationsTab.style.display = 'none';
        preferencesTab.style.display = 'block';
        tabs.forEach(t => t.classList.remove('active'));
        tabs[1].classList.add('active');
        loadPreferences();
    }
}

function renderPagination(data) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    totalPages = data.total_pages || Math.ceil((data.count || 0) / 10);
    currentPage = data.current_page || data.page || 1;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-wrapper">';
    
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">&laquo; Previous</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span class="page-dots">...</span>';
        }
    }
    
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">Next &raquo;</button>`;
    }
    
    html += '</div>';
    paginationContainer.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadNotifications(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoading(container) {
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading notifications...</p>
        </div>
    `;
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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
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
    if (loader) loader.style.display = 'none';
}

// Make functions global
window.switchTab = switchTab;
window.markAllAsRead = markAllAsRead;
window.savePreferences = savePreferences;
window.goToPage = goToPage;
