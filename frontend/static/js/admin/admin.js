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
            const errorObj = new Error(result.message || result.error || result.detail || 'Request failed');
            if (result.admin_details) {
                errorObj.adminDetails = result.admin_details;
            }
            throw errorObj;
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
            showToast(msg, 'error', error.adminDetails);
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
function showToast(message, type = 'success', adminDetails = null) {
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type === 'error' ? 'toast-error' : ''}`;
    
    let innerHTML = `
        <i class="ri-${type === 'success' ? 'checkbox-circle-line' : 'error-warning-line'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    if (adminDetails) {
        const detailsId = 'error-details-' + Math.random().toString(36).substr(2, 9);
        innerHTML += `
            <div style="margin-top: 8px; width: 100%;">
                <button type="button" class="btn btn-sm btn-outline-danger" 
                        aria-expanded="false" aria-controls="${detailsId}"
                        onclick="const d = document.getElementById('${detailsId}'); const expanded = d.style.display === 'block'; d.style.display = expanded ? 'none' : 'block'; this.setAttribute('aria-expanded', !expanded); event.stopPropagation();">
                    View Details
                </button>
                <div id="${detailsId}" style="display: none; margin-top: 8px; background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; overflow-x: auto; max-height: 200px; font-family: monospace; font-size: 11px; color: #dc3545; text-align: left;">
                    <pre style="margin:0;">${escapeHtml(adminDetails)}</pre>
                </div>
            </div>
        `;
        toast.style.flexDirection = 'column';
        toast.style.alignItems = 'flex-start';
    }
    
    toast.innerHTML = innerHTML;
    document.body.appendChild(toast);
    
    // Auto-dismiss only if no admin details are shown, or maybe increase timeout
    if (!adminDetails) {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        // Add a close button for dismissible error toast
        const closeBtn = document.createElement('i');
        closeBtn.className = 'ri-close-line';
        closeBtn.style.cssText = 'position: absolute; top: 12px; right: 12px; cursor: pointer; font-size: 16px;';
        closeBtn.onclick = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };
        toast.appendChild(closeBtn);
        toast.style.paddingRight = '32px';
    }
}

// Format Currency
function formatCurrency(amount) {
    return `Kes ${Number(amount).toLocaleString('en-KE')}`;
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
    const notificationsList = document.getElementById('notificationsList');
    
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

    if (notificationsList) {
        notificationsList.addEventListener('click', function(e) {
            const item = e.target.closest('.notification-item');
            if (!item || e.target.closest('.mark-read')) return;
            const notificationId = item.dataset.id;
            const redirectUrl = item.dataset.url;
            if (notificationId && redirectUrl) {
                handleNotificationClick(e, notificationId, redirectUrl);
            }
        });
    }
    
    loadNotifications();
    setInterval(loadNotifications, 30000);

    window.addEventListener('pageshow', function() {
        loadNotifications();
    });

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            loadNotifications();
        }
    });
}

function encodeNotificationId(notificationId) {
    return encodeURIComponent(String(notificationId));
}

async function dismissAdminNotification(notificationId, onView = false, force = false) {
    try {
        await fetch(`/api/admin/notifications/${encodeNotificationId(notificationId)}/dismiss/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ on_view: onView, force: force })
        });
    } catch (error) {
        console.error('Error dismissing notification:', error);
    }
}

function getActiveNotificationId() {
    const urlParams = new URLSearchParams(window.location.search);
    return sessionStorage.getItem('admin_active_notification_id') || urlParams.get('from_notification');
}

function clearActiveNotification() {
    sessionStorage.removeItem('admin_active_notification_id');
}

window.dismissAdminNotification = dismissAdminNotification;
window.getActiveNotificationId = getActiveNotificationId;
window.clearActiveNotification = clearActiveNotification;

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const isFirstLoad = !container.querySelector('.notification-item') && !container.querySelector('.empty-state');
    if (isFirstLoad) {
        container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
    }
    
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
        container.innerHTML = notifications.map(n => {
            // Determine dynamic redirect URL based on notification contents
            let redirectUrl = n.redirect_url || '/admin-portal/dashboard/';
            if (!n.redirect_url) {
                const title = n.title ? n.title.toLowerCase() : '';
                const msg = n.message ? n.message.toLowerCase() : '';

                if (title.includes('event') || msg.includes('event')) {
                    if (title.includes('submit') || title.includes('pending') || title.includes('draft') || msg.includes('approval') || msg.includes('submit')) {
                        redirectUrl = '/admin-portal/events/pending/';
                    } else {
                        redirectUrl = '/admin-portal/events/all/';
                    }
                } else if (title.includes('refund') || msg.includes('refund')) {
                    redirectUrl = '/admin-portal/bookings/refunds/';
                } else if (title.includes('organizer') || msg.includes('organizer')) {
                    redirectUrl = '/admin-portal/users/organizers/';
                } else if (title.includes('user') || msg.includes('user') || title.includes('registration') || msg.includes('registration')) {
                    redirectUrl = '/admin-portal/users/';
                } else if (title.includes('support') || title.includes('ticket') || msg.includes('support') || msg.includes('ticket')) {
                    redirectUrl = '/admin-portal/support/';
                } else if (title.includes('payment') || title.includes('transaction') || msg.includes('payment') || msg.includes('transaction')) {
                    redirectUrl = '/admin-portal/payments/';
                } else if (title.includes('payout') || msg.includes('payout')) {
                    redirectUrl = '/admin-portal/payments/payouts/';
                }
            }

            return `
                <div class="notification-item ${!n.is_read ? 'unread' : ''}" data-id="${escapeHtml(n.id)}" data-url="${escapeHtml(redirectUrl)}" style="cursor: pointer;">
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(n.title)}</div>
                        <div class="notification-message">${escapeHtml(n.message)}</div>
                        <div class="notification-time">${formatRelativeTime(n.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
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

window.handleNotificationClick = async function(event, notificationId, redirectUrl) {
    if (event) event.stopPropagation();

    try {
        await fetch(`/api/admin/notifications/${encodeNotificationId(notificationId)}/read/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
    } catch (error) {
        console.error('Error marking as read on click:', error);
    }

    sessionStorage.setItem('admin_active_notification_id', String(notificationId));

    const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
    if (item) item.classList.remove('unread');
    updateNotificationBadge();

    const separator = redirectUrl.includes('?') ? '&' : '?';
    window.location.href = `${redirectUrl}${separator}from_notification=${encodeURIComponent(notificationId)}`;
};

window.markNotificationRead = async function(notificationId) {
    try {
        await fetch(`/api/admin/notifications/${encodeNotificationId(notificationId)}/read/`, {
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

function showConfirm(message, callback) {
    const modalId = 'dynamicConfirmModal';
    let modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
    
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        opacity: 1;
        transition: opacity 0.2s ease-out;
    `;
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        padding: 24px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        transform: scale(0.95);
        transition: transform 0.2s ease-out;
    `;
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 56px; height: 56px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">
                <i class="ri-alert-line"></i>
            </div>
            <h3 style="margin: 0 0 8px; font-weight: 700; color: #1e293b; font-size: 18px;">Confirm Action</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">${escapeHtml(message)}</p>
        </div>
        <div style="display: flex; gap: 12px;">
            <button id="confirmCancelBtn" class="btn-outline" style="flex: 1; min-height: 40px; border-radius: 8px; font-weight: 500; cursor: pointer; border: 1px solid #e2e8f0; background: transparent; color: #1e293b;">Cancel</button>
            <button id="confirmOkBtn" class="btn-primary" style="flex: 1; min-height: 40px; border-radius: 8px; font-weight: 500; cursor: pointer; background: linear-gradient(135deg, #f59e0b, #ec6408); border: none; color: white;">Confirm</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    setTimeout(() => {
        content.style.transform = 'scale(1)';
    }, 10);
    
    const closeModal = () => {
        content.style.transform = 'scale(0.95)';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
    };
    
    modal.querySelector('#confirmCancelBtn').onclick = () => {
        closeModal();
    };
    
    modal.querySelector('#confirmOkBtn').onclick = () => {
        closeModal();
        if (callback) callback();
    };
}

// Export globals
window.apiRequest = apiRequest;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;

console.log('✅ Admin JS loaded');