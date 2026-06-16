// ============================================
// NOTIFICATIONS - Attendee notification center
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentTab = 'notifications';

const API = {
    notifications: '/api/attendee/notifications/',
    markRead: (id) => `/api/attendee/notifications/${id}/read/`,
    markAllRead: '/api/attendee/notifications/mark-all-read/',
};

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
        return;
    }
    loadNotifications();
    loadPreferences();
    setupEventListeners();

    setInterval(function () {
        if (currentTab === 'notifications') {
            loadNotifications(currentPage);
        }
    }, 30000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && currentTab === 'notifications') {
            loadNotifications(currentPage);
        }
    });
});

function setupEventListeners() {
    document.addEventListener('click', function(e) {
        const notificationItem = e.target.closest('.notification-item');
        if (notificationItem && !e.target.closest('.notification-actions')) {
            const notifId = notificationItem.dataset.id;
            if (notificationItem.classList.contains('unread')) {
                markAsRead(notifId);
            }
            const url = notificationItem.dataset.url;
            if (url && url !== '#') {
                window.location.href = url;
            }
        }
    });
}

function normalizeNotification(notif) {
    const type = notif.notification_type || notif.type || 'info';
    let actionUrl = notif.action_url || '#';
    if (actionUrl.indexOf('/tickets/detail/?ticket=') === 0) {
        actionUrl = '/tickets/';
    }
    if (!notif.action_url && notif.payment_order_id) {
        actionUrl = '/tickets/';
    } else if (!notif.action_url && type === 'booking') {
        actionUrl = '/tickets/';
    }
    return {
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type,
        read: notif.is_read != null ? notif.is_read : !!notif.read,
        created_at: notif.created_at,
        action_url: actionUrl,
    };
}

function notificationActionUrl(notif) {
    const type = notif.notification_type || notif.type || 'info';
    if (notif.payment_order_id || type === 'payment' || type === 'booking') {
        return '/tickets/';
    }
    return '#';
}

async function loadNotifications(page = 1) {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    showLoading(container);

    try {
        const token = localStorage.getItem('attendee_access_token');
        const response = await fetch(`${API.notifications}?page=${page}&page_size=10`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'same-origin',
        });

        if (response.status === 401) {
            window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }

        const data = await response.json();
        const raw = data.results || data.notifications || [];
        const notifications = raw.map((n) => normalizeNotification({
            ...n,
            action_url: n.action_url || notificationActionUrl(n),
        }));

        displayNotifications(notifications);
        renderPagination({
            count: data.count || data.pagination?.count || notifications.length,
            total_pages: data.total_pages || data.pagination?.total_pages || 1,
            current_page: data.pagination?.page || page,
        });
        updateUnreadBadge(data.unread_count);
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Could not load notifications</h4>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
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
        updateNotificationCount();
        return;
    }

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}" data-url="${escapeHtml(notif.action_url || '#')}">
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

    updateNotificationCount();
}

function getNotificationIcon(type) {
    const icons = {
        booking: 'fa-ticket-alt',
        reminder: 'fa-bell',
        promotion: 'fa-tag',
        update: 'fa-sync-alt',
        payment: 'fa-credit-card',
        refund: 'fa-undo-alt',
        info: 'fa-bell',
        default: 'fa-bell',
    };
    return icons[type] || icons.default;
}

async function markAsRead(notificationId) {
    try {
        const token = localStorage.getItem('attendee_access_token');
        const response = await fetch(API.markRead(notificationId), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) return;

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
    }
}

async function markAllAsRead() {
    try {
        const token = localStorage.getItem('attendee_access_token');
        const response = await fetch(API.markAllRead, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

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
        showToast('Could not mark notifications as read', 'error');
    }
}

async function loadPreferences() {
    const prefs = getStoredPreferences();
    displayPreferences(prefs);
}

function getStoredPreferences() {
    try {
        return JSON.parse(localStorage.getItem('notification_settings') || '{}');
    } catch (_) {
        return {};
    }
}

function displayPreferences(prefs) {
    const defaults = {
        email_booking: true,
        email_reminder: true,
        email_promotion: false,
        email_event_update: true,
        push_booking: true,
        push_reminder: true,
        push_promotion: false,
        sms_reminder: true,
    };
    const merged = { ...defaults, ...prefs };

    const fields = [
        ['emailBooking', 'email_booking'],
        ['emailReminder', 'email_reminder'],
        ['emailPromotion', 'email_promotion'],
        ['emailEventUpdate', 'email_event_update'],
        ['pushBooking', 'push_booking'],
        ['pushReminder', 'push_reminder'],
        ['pushPromotion', 'push_promotion'],
        ['smsReminder', 'sms_reminder'],
    ];

    fields.forEach(([elementId, key]) => {
        const el = document.getElementById(elementId);
        if (el) el.checked = merged[key] !== false;
    });
}

async function savePreferences() {
    const preferences = {
        email_booking: document.getElementById('emailBooking')?.checked ?? true,
        email_reminder: document.getElementById('emailReminder')?.checked ?? true,
        email_promotion: document.getElementById('emailPromotion')?.checked ?? false,
        email_event_update: document.getElementById('emailEventUpdate')?.checked ?? true,
        push_booking: document.getElementById('pushBooking')?.checked ?? true,
        push_reminder: document.getElementById('pushReminder')?.checked ?? true,
        push_promotion: document.getElementById('pushPromotion')?.checked ?? false,
        sms_reminder: document.getElementById('smsReminder')?.checked ?? true,
    };

    showLoader('Saving preferences...');

    try {
        localStorage.setItem('notification_settings', JSON.stringify(preferences));
        showToast('Preferences saved on this device', 'success');
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Could not save preferences', 'error');
    } finally {
        hideLoader();
    }
}

function updateUnreadBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (typeof count === 'number') {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        return;
    }

    updateNotificationCount();
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

    for (let i = 1; i <= totalPages; i += 1) {
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

window.switchTab = switchTab;
window.markAllAsRead = markAllAsRead;
window.savePreferences = savePreferences;
window.goToPage = goToPage;
