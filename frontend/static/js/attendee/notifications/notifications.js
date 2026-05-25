// ============================================
// ATTENDEE NOTIFICATIONS - Complete Functionality
// ============================================

let currentPage = 1;
let totalPages = 1;
let unreadCount = 0;
let pollingInterval = null;

// DOM Elements
const notificationsList = document.getElementById('notificationsList');
const paginationDiv = document.getElementById('pagination');
const notificationsCount = document.getElementById('notificationsCount');
const markAllReadBtn = document.getElementById('markAllReadBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    loadUnreadCount();
    startPolling();
    setupEventListeners();
});

function setupEventListeners() {
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }
}

function switchTab(tab) {
    const notificationsTab = document.getElementById('notificationsTab');
    const preferencesTab = document.getElementById('preferencesTab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'notifications') {
        notificationsTab.style.display = 'block';
        preferencesTab.style.display = 'none';
        document.querySelector('.tab-btn[data-tab="notifications"]').classList.add('active');
        loadNotifications();
    } else {
        notificationsTab.style.display = 'none';
        preferencesTab.style.display = 'block';
        document.querySelector('.tab-btn[data-tab="preferences"]').classList.add('active');
        loadPreferences();
    }
}

async function loadNotifications() {
    if (!notificationsList) return;
    
    notificationsList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading notifications...</p>
        </div>
    `;
    
    try {
        const result = await window.AttendeeAPIEndpoints.notifications.getList(currentPage, 20);
        const notifications = result.results || result;
        const total = result.count || notifications.length;
        
        totalPages = result.total_pages || Math.ceil(total / 20);
        
        displayNotifications(notifications);
        renderPagination(currentPage, totalPages);
        
        if (notificationsCount) {
            notificationsCount.textContent = `Showing ${notifications.length} of ${total} notifications`;
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        if (notificationsList) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Notifications</h3>
                    <p>Please try again later.</p>
                    <button class="btn-primary" onclick="loadNotifications()">Retry</button>
                </div>
            `;
        }
    }
}

function displayNotifications(notifications) {
    if (!notificationsList) return;
    
    if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>No Notifications</h3>
                <p>You're all caught up! When you have notifications, they'll appear here.</p>
            </div>
        `;
        return;
    }
    
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.is_read ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-icon ${notification.type}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-time">${formatRelativeTime(notification.created_at)}</div>
            </div>
            <div class="notification-actions">
                ${!notification.is_read ? `
                    <button class="mark-read-btn" onclick="markAsRead(${notification.id})" title="Mark as read">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="delete-btn" onclick="deleteNotification(${notification.id})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ${notification.action_url ? `
                    <button class="view-btn" onclick="window.location.href='${notification.action_url}'" title="View">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function markAsRead(notificationId) {
    try {
        await window.AttendeeAPIEndpoints.notifications.markAsRead(notificationId);
        
        const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (item) {
            item.classList.remove('unread');
            const markBtn = item.querySelector('.mark-read-btn');
            if (markBtn) markBtn.remove();
        }
        
        updateUnreadCount(-1);
        
    } catch (error) {
        console.error('Error marking as read:', error);
        showToast('Failed to mark as read', 'error');
    }
}

async function markAllAsRead() {
    if (window.Loader) window.Loader.show('Marking all as read...');
    
    try {
        await window.AttendeeAPIEndpoints.notifications.markAllAsRead();
        
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            const markBtn = item.querySelector('.mark-read-btn');
            if (markBtn) markBtn.remove();
        });
        
        updateUnreadCount(-unreadCount);
        showToast('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking all as read:', error);
        showToast('Failed to mark all as read', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function deleteNotification(notificationId) {
    const confirmed = confirm('Delete this notification?');
    if (!confirmed) return;
    
    if (window.Loader) window.Loader.show('Deleting notification...');
    
    try {
        await window.AttendeeAPIEndpoints.notifications.deleteNotification(notificationId);
        
        const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (item) item.remove();
        
        showToast('Notification deleted', 'success');
        
        const remaining = document.querySelectorAll('.notification-item').length;
        if (remaining === 0) {
            loadNotifications();
        }
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Failed to delete notification', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function loadUnreadCount() {
    try {
        const result = await window.AttendeeAPIEndpoints.notifications.getUnreadCount();
        unreadCount = result.count || 0;
        updateBadge();
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

function updateUnreadCount(delta) {
    unreadCount += delta;
    if (unreadCount < 0) unreadCount = 0;
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function loadPreferences() {
    try {
        const preferences = await window.AttendeeAPIEndpoints.notifications.getPreferences();
        displayPreferences(preferences);
    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast('Failed to load preferences', 'error');
    }
}

function displayPreferences(preferences) {
    // Email preferences
    const emailBooking = document.getElementById('emailBooking');
    const emailReminder = document.getElementById('emailReminder');
    const emailPromotion = document.getElementById('emailPromotion');
    const emailEventUpdate = document.getElementById('emailEventUpdate');
    
    if (emailBooking) emailBooking.checked = preferences.email_booking !== false;
    if (emailReminder) emailReminder.checked = preferences.email_reminder !== false;
    if (emailPromotion) emailPromotion.checked = preferences.email_promotion || false;
    if (emailEventUpdate) emailEventUpdate.checked = preferences.email_event_update !== false;
    
    // Push preferences
    const pushBooking = document.getElementById('pushBooking');
    const pushReminder = document.getElementById('pushReminder');
    const pushPromotion = document.getElementById('pushPromotion');
    
    if (pushBooking) pushBooking.checked = preferences.push_booking !== false;
    if (pushReminder) pushReminder.checked = preferences.push_reminder !== false;
    if (pushPromotion) pushPromotion.checked = preferences.push_promotion || false;
    
    // SMS preferences
    const smsReminder = document.getElementById('smsReminder');
    if (smsReminder) smsReminder.checked = preferences.sms_reminder || false;
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
    
    if (window.Loader) window.Loader.show('Saving preferences...');
    
    try {
        await window.AttendeeAPIEndpoints.notifications.updatePreferences(preferences);
        showToast('Notification preferences saved', 'success');
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Failed to save preferences', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        const previousUnread = unreadCount;
        await loadUnreadCount();
        
        if (unreadCount > previousUnread) {
            if (document.getElementById('notificationsTab').style.display !== 'none') {
                loadNotifications();
            }
            showToast('You have new notifications', 'info');
        }
    }, 30000);
}

function renderPagination(current, total) {
    if (!paginationDiv || total <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadNotifications();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function getNotificationIcon(type) {
    const icons = {
        'booking': 'fa-ticket-alt',
        'payment': 'fa-credit-card',
        'reminder': 'fa-bell',
        'promotion': 'fa-tags',
        'system': 'fa-server',
        'event': 'fa-calendar',
        'refund': 'fa-undo-alt',
        'review': 'fa-star'
    };
    return icons[type] || 'fa-bell';
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
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Make functions global
window.switchTab = switchTab;
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.deleteNotification = deleteNotification;
window.savePreferences = savePreferences;
window.changePage = changePage;