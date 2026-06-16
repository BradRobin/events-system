/**
 * Portal Notifications Hub
 * Shared real-time polling + dropdown UI for attendee and organizer portals.
 */
(function (global) {
    'use strict';

    var POLL_INTERVAL_MS = 30000;

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatRelativeTime(iso) {
        if (!iso) return '';
        var date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '';
        var diffMs = Date.now() - date.getTime();
        var minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return minutes + 'm ago';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return date.toLocaleDateString();
    }

    function PortalNotificationHub(config) {
        this.config = config;
        this.timer = null;
        this.lastUnread = 0;
    }

    PortalNotificationHub.prototype.getAuthHeaders = function () {
        var headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        var token = '';
        try {
            token = localStorage.getItem(this.config.tokenKey) || '';
        } catch (e) {
            token = '';
        }
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }
        if (global.getCSRFToken) {
            headers['X-CSRFToken'] = global.getCSRFToken();
        }
        return headers;
    };

    PortalNotificationHub.prototype.isAuthenticated = function () {
        try {
            return !!localStorage.getItem(this.config.tokenKey);
        } catch (e) {
            return false;
        }
    };

    PortalNotificationHub.prototype.updateBadge = function (count) {
        var badge = document.getElementById(this.config.badgeId);
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'inline-block';
        } else {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
        this.lastUnread = count;
    };

    PortalNotificationHub.prototype.renderList = function (notifications) {
        var container = document.getElementById(this.config.listContainerId);
        if (!container) return;

        if (!notifications || !notifications.length) {
            container.innerHTML = '<div class="empty-state">No notifications</div>';
            return;
        }

        var self = this;
        container.innerHTML = notifications.map(function (notif) {
            var unreadClass = notif.is_read ? '' : ' unread';
            var actionUrl = notif.action_url || notif.redirect_url || self.config.actionUrl(notif);
            var icon = self.config.iconForType(notif.notification_type || notif.type);
            return (
                '<div class="notification-item' + unreadClass + '" data-id="' + notif.id + '" data-url="' + escapeHtml(actionUrl) + '">' +
                    '<div class="notification-icon"><i class="fas ' + icon + '"></i></div>' +
                    '<div class="notification-content">' +
                        '<div class="notification-title">' + escapeHtml(notif.title) + '</div>' +
                        '<div class="notification-message">' + escapeHtml(notif.message) + '</div>' +
                        '<div class="notification-time">' + escapeHtml(formatRelativeTime(notif.created_at)) + '</div>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        container.querySelectorAll('.notification-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var id = item.dataset.id;
                var url = item.dataset.url;
                if (item.classList.contains('unread') && id) {
                    self.markRead(id, false);
                    item.classList.remove('unread');
                }
                if (url && url !== '#') {
                    global.location.href = url;
                }
            });
        });
    };

    PortalNotificationHub.prototype.fetchRecent = async function () {
        if (!this.isAuthenticated()) {
            this.updateBadge(0);
            return null;
        }

        var response = await fetch(this.config.recentUrl, {
            headers: this.getAuthHeaders(),
            credentials: 'same-origin',
        });

        if (response.status === 401) {
            this.updateBadge(0);
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }

        return response.json();
    };

    PortalNotificationHub.prototype.refresh = async function () {
        var container = document.getElementById(this.config.listContainerId);
        var isFirstLoad = container &&
            !container.querySelector('.notification-item') &&
            !container.querySelector('.empty-state');

        if (isFirstLoad) {
            container.innerHTML = '<div class="loading-state">Loading notifications...</div>';
        }

        try {
            var data = await this.fetchRecent();
            if (!data) return;

            var notifications = data.notifications || [];
            var unreadCount = typeof data.unread_count === 'number'
                ? data.unread_count
                : notifications.filter(function (n) { return !n.is_read; }).length;

            this.updateBadge(unreadCount);
            this.renderList(notifications);

            global.dispatchEvent(new CustomEvent('notifications-updated', {
                detail: { unread_count: unreadCount, notifications: notifications, portal: this.config.portal },
            }));
        } catch (error) {
            console.error('[PortalNotifications] refresh failed:', error);
            if (container && isFirstLoad) {
                container.innerHTML = '<div class="empty-state">Unable to load notifications</div>';
            }
        }
    };

    PortalNotificationHub.prototype.markRead = async function (id, refreshAfter) {
        if (refreshAfter === undefined) refreshAfter = true;
        try {
            await fetch(this.config.markReadUrl(id), {
                method: 'POST',
                headers: this.getAuthHeaders(),
                credentials: 'same-origin',
                body: '{}',
            });
            if (refreshAfter) {
                await this.refresh();
            }
        } catch (error) {
            console.error('[PortalNotifications] mark read failed:', error);
        }
    };

    PortalNotificationHub.prototype.markAllRead = async function () {
        try {
            await fetch(this.config.markAllReadUrl, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                credentials: 'same-origin',
                body: '{}',
            });
            var panel = document.getElementById(this.config.panelId);
            if (panel) panel.classList.remove('show');
            await this.refresh();
        } catch (error) {
            console.error('[PortalNotifications] mark all read failed:', error);
        }
    };

    PortalNotificationHub.prototype.start = function () {
        var self = this;
        this.refresh();

        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(function () {
            self.refresh();
        }, POLL_INTERVAL_MS);

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                self.refresh();
            }
        });

        global.addEventListener('pageshow', function () {
            self.refresh();
        });

        global.addEventListener('auth-state-changed', function (e) {
            if (e.detail && e.detail.isLoggedIn) {
                self.refresh();
            } else {
                self.updateBadge(0);
            }
        });
    };

    PortalNotificationHub.prototype.bindDropdown = function () {
        var btn = document.getElementById(this.config.buttonId);
        var panel = document.getElementById(this.config.panelId);
        if (!btn || !panel) return;

        var self = this;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.classList.toggle('show');
            if (panel.classList.contains('open')) {
                panel.classList.add('show');
            }
            self.refresh();
        });

        document.addEventListener('click', function (e) {
            if (!panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove('show');
                panel.classList.remove('open');
            }
        });

        var markAllBtn = document.getElementById(this.config.markAllButtonId);
        if (markAllBtn) {
            markAllBtn.addEventListener('click', function (e) {
                e.preventDefault();
                self.markAllRead();
            });
        }
    };

    function defaultIconForType(type) {
        switch (type) {
            case 'payment':
            case 'booking':
                return 'fa-ticket-alt';
            case 'warning':
                return 'fa-exclamation-triangle';
            case 'announcement':
                return 'fa-bullhorn';
            case 'success':
                return 'fa-check-circle';
            default:
                return 'fa-bell';
        }
    }

    var attendeeHub = null;
    var organizerHub = null;

    function initAttendee() {
        if (!document.getElementById('notificationsList')) return null;
        if (attendeeHub) return attendeeHub;

        attendeeHub = new PortalNotificationHub({
            portal: 'attendee',
            recentUrl: '/api/attendee/notifications/recent/',
            markReadUrl: function (id) { return '/api/attendee/notifications/' + id + '/read/'; },
            markAllReadUrl: '/api/attendee/notifications/mark-all-read/',
            listContainerId: 'notificationsList',
            badgeId: 'notificationBadge',
            buttonId: 'notificationsBtn',
            panelId: 'notificationsPanel',
            markAllButtonId: null,
            tokenKey: 'attendee_access_token',
            actionUrl: function (n) {
                if (n.payment_order_id || n.notification_type === 'payment') return '/tickets/';
                return '/notifications/';
            },
            iconForType: defaultIconForType,
        });

        attendeeHub.start();
        return attendeeHub;
    }

    function initOrganizer() {
        if (!document.getElementById('organizerNotificationsList')) return null;
        if (organizerHub) return organizerHub;

        organizerHub = new PortalNotificationHub({
            portal: 'organizer',
            recentUrl: '/api/organizer/notifications/recent/',
            markReadUrl: function (id) { return '/api/organizer/notifications/' + id + '/read/'; },
            markAllReadUrl: '/api/organizer/notifications/mark-all-read/',
            listContainerId: 'organizerNotificationsList',
            badgeId: 'organizerNotificationBadge',
            buttonId: 'organizerNotificationsBtn',
            panelId: 'organizerNotificationsPanel',
            markAllButtonId: 'organizerMarkAllReadBtn',
            tokenKey: 'organizer_access_token',
            actionUrl: function (n) {
                if (n.requires_action || n.notification_type === 'payment') {
                    return '/organizer/dashboard/';
                }
                return '/organizer/dashboard/';
            },
            iconForType: defaultIconForType,
        });

        organizerHub.bindDropdown();
        organizerHub.start();
        return organizerHub;
    }

    global.loadNotifications = function () {
        if (attendeeHub) attendeeHub.refresh();
    };
    global.loadNotificationCount = function () {
        if (attendeeHub) attendeeHub.refresh();
    };
    global.markAllNotificationsRead = function () {
        if (attendeeHub) attendeeHub.markAllRead();
    };
    global.refreshOrganizerNotifications = function () {
        if (organizerHub) organizerHub.refresh();
    };

    global.PortalNotifications = {
        Hub: PortalNotificationHub,
        initAttendee: initAttendee,
        initOrganizer: initOrganizer,
        getAttendeeHub: function () { return attendeeHub; },
        getOrganizerHub: function () { return organizerHub; },
        POLL_INTERVAL_MS: POLL_INTERVAL_MS,
    };

    function boot() {
        initAttendee();
        initOrganizer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
