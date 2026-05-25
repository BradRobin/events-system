// ============================================
// API ENDPOINTS WRAPPER
// Organized functions for each module
// EventHub Admin Portal - Complete API Integration
// ============================================

// Helper function to build query params
function buildParams(filters) {
    const params = {};
    Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params[key] = filters[key];
        }
    });
    return params;
}

// ============================================
// AUTHENTICATION API
// ============================================
const AuthAPI = {
    login: (credentials) => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.login, credentials),
    logout: () => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.logout, {}),
    check: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.AUTH.check),
    forgotPassword: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.forgotPassword, data),
    resetPassword: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.resetPassword, data),
    verifyOTP: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.verifyOTP, data),
    changePassword: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.AUTH.changePassword, data)
};

// ============================================
// DASHBOARD API
// ============================================
const DashboardAPI = {
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.stats, { useCache: true, cacheTTL: 60000 }),
    getRevenueChart: (period = '30') => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.revenueChart, { params: { period } }),
    getCategoryChart: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.categoryChart, { useCache: true }),
    getRecentActivity: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.recentActivity),
    getTopEvents: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.topEvents),
    getPendingCount: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.DASHBOARD.pendingCount)
};

// ============================================
// EVENTS API
// ============================================
const EventsAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.list, { params });
    },
    getPending: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.pending, { params });
    },
    getPendingCount: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.pendingCount, { useCache: true, cacheTTL: 30000 }),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.stats),
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.detail(id)),
    getCategories: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.categories, { useCache: true, cacheTTL: 3600000 }),
    getHistory: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS.history(id)),
    approve: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.EVENTS.approve(id), {}),
    reject: (id, reason, suggestions = '') => API_SERVICE.post(API_CONFIG.ENDPOINTS.EVENTS.reject(id), { reason, suggestions }),
    bulkApprove: (eventIds) => API_SERVICE.post(API_CONFIG.ENDPOINTS.EVENTS.bulkApprove, { event_ids: eventIds }),
    bulkReject: (eventIds, reason) => API_SERVICE.post(API_CONFIG.ENDPOINTS.EVENTS.bulkReject, { event_ids: eventIds, reason }),
    delete: (id) => API_SERVICE.delete(API_CONFIG.ENDPOINTS.EVENTS.delete(id))
};

// ============================================
// EVENTS LIST API (for dropdowns)
// ============================================
const EventsListAPI = {
    getUpcoming: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS_LIST.upcoming, { useCache: true, cacheTTL: 60000 }),
    getAll: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.EVENTS_LIST.list, { useCache: true, cacheTTL: 60000 })
};

// ============================================
// BOOKINGS API
// ============================================
const BookingsAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.BOOKINGS.list, { params });
    },
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.BOOKINGS.detail(id)),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.BOOKINGS.stats),
    refund: (id, reason, notes = '') => API_SERVICE.post(API_CONFIG.ENDPOINTS.BOOKINGS.refund(id), { reason, notes }),
    cancel: (id, reason = '') => API_SERVICE.post(API_CONFIG.ENDPOINTS.BOOKINGS.cancel(id), { reason }),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.BOOKINGS.export, { params });
    }
};

// ============================================
// REFUNDS API
// ============================================
const RefundsAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REFUNDS.list, { params });
    },
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REFUNDS.detail(id)),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.REFUNDS.stats),
    approve: (id, response, refundMethod = 'original') => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.REFUNDS.approve(id), { response, refund_method: refundMethod }),
    reject: (id, response) => API_SERVICE.post(API_CONFIG.ENDPOINTS.REFUNDS.reject(id), { response }),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REFUNDS.export, { params });
    }
};

// ============================================
// PAYMENTS & TRANSACTIONS API
// ============================================
const PaymentsAPI = {
    getTransactions: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYMENTS.transactions, { params });
    },
    getTransactionDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYMENTS.transactionDetail(id)),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYMENTS.stats, { useCache: true, cacheTTL: 60000 }),
    refund: (transactionId) => API_SERVICE.post(API_CONFIG.ENDPOINTS.PAYMENTS.refund, { transaction_id: transactionId }),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYMENTS.export, { params });
    }
};

// ============================================
// PAYOUTS API
// ============================================
const PayoutsAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYOUTS.list, { params });
    },
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYOUTS.detail(id)),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.PAYOUTS.stats, { useCache: true, cacheTTL: 60000 }),
    process: (payoutId, reference, notes = '') => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.PAYOUTS.process, { payout_id: payoutId, reference, notes }),
    processAll: () => API_SERVICE.post(API_CONFIG.ENDPOINTS.PAYOUTS.processAll, {})
};

// ============================================
// REPORTS & ANALYTICS API
// ============================================
const ReportsAPI = {
    getAnalytics: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.analytics, { params: { days } }),
    getSales: (period = 'monthly', startDate = '', endDate = '') => {
        const params = buildParams({ period, start_date: startDate, end_date: endDate });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.sales, { params });
    },
    getEvents: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.events, { params });
    },
    getEventsSummary: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.eventsSummary, { params });
    },
    getKPI: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.kpi, { params: { days } }),
    getRevenueChart: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.revenueChart, { params: { days } }),
    getCategoryChart: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.categoryChart, { params: { days } }),
    getTopEvents: (days = 30, limit = 5) => 
        API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.topEvents, { params: { days, limit } }),
    getUserGrowth: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.userGrowth, { params: { days } }),
    getSummary: (days = 30) => API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.summary, { params: { days } }),
    export: (type, filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.REPORTS.export(type), { params });
    }
};

// ============================================
// PROFILE API
// ============================================
const ProfileAPI = {
    getProfile: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.PROFILE.detail),
    update: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.PROFILE.update, data),
    changePassword: (currentPassword, newPassword) => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.PROFILE.changePassword, { current_password: currentPassword, new_password: newPassword }),
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return API_SERVICE.post(API_CONFIG.ENDPOINTS.PROFILE.uploadAvatar, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.PROFILE.stats)
};

// ============================================
// NOTIFICATIONS API
// ============================================
const NotificationsAPI = {
    getAll: (page = 1) => API_SERVICE.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.list, { params: { page } }),
    getRecent: (limit = 10) => API_SERVICE.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.recent, { params: { limit } }),
    markAsRead: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.read(id), {}),
    markAllAsRead: () => API_SERVICE.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.markAllRead, {}),
    getUnreadCount: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.unreadCount, { useCache: true, cacheTTL: 30000 }),
    delete: (id) => API_SERVICE.delete(API_CONFIG.ENDPOINTS.NOTIFICATIONS.delete(id)),
    broadcast: (title, message, audience, method) => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.broadcast, { title, message, audience, method }),
    getTemplates: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.templates),
    getTemplate: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.templateDetail(id)),
    createTemplate: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.templates, data),
    updateTemplate: (id, data) => API_SERVICE.put(API_CONFIG.ENDPOINTS.NOTIFICATIONS.templateDetail(id), data),
    deleteTemplate: (id) => API_SERVICE.delete(API_CONFIG.ENDPOINTS.NOTIFICATIONS.templateDetail(id))
};

// ============================================
// SETTINGS API
// ============================================
const SettingsAPI = {
    getGeneral: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.SETTINGS.general),
    saveGeneral: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.SETTINGS.general, data),
    getPayment: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.SETTINGS.payment),
    savePayment: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.SETTINGS.payment, data),
    getSecurity: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.SETTINGS.security),
    saveSecurity: (data) => API_SERVICE.post(API_CONFIG.ENDPOINTS.SETTINGS.security, data),
    getApiKey: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.SETTINGS.apiKey),
    regenerateApiKey: () => API_SERVICE.post(API_CONFIG.ENDPOINTS.SETTINGS.regenerateApiKey, {}),
    testMpesa: () => API_SERVICE.post(API_CONFIG.ENDPOINTS.SETTINGS.testMpesa, {}),
    downloadAuditLog: () => window.open(API_CONFIG.API_BASE + API_CONFIG.ENDPOINTS.SETTINGS.auditLogDownload, '_blank')
};

// ============================================
// SUPPORT TICKETS API
// ============================================
const SupportAPI = {
    getTickets: (page = 1, status = 'all', search = '') => {
        const params = buildParams({ page, status, search });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.SUPPORT.tickets, { params });
    },
    getTicketDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.SUPPORT.ticketDetail(id)),
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.SUPPORT.stats),
    sendReply: (id, message, status) => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.SUPPORT.reply(id), { message, status })
};

// ============================================
// TICKETS MANAGEMENT API
// ============================================
const TicketsAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.TICKETS.list, { params });
    },
    getDetail: (ticketNumber) => API_SERVICE.get(API_CONFIG.ENDPOINTS.TICKETS.detail(ticketNumber)),
    verify: (ticketNumber, eventId) => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.TICKETS.verify(ticketNumber), { event_id: eventId }),
    checkin: (ticketNumber) => 
        API_SERVICE.post(API_CONFIG.ENDPOINTS.TICKETS.checkin(ticketNumber), {}),
    download: (ticketNumber) => {
        window.open(API_CONFIG.API_BASE + API_CONFIG.ENDPOINTS.TICKETS.download(ticketNumber), '_blank');
    },
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.TICKETS.export, { params });
    },
    getEventStats: (eventId) => API_SERVICE.get(API_CONFIG.ENDPOINTS.TICKETS.stats(eventId)),
    getRecentCheckins: (eventId) => API_SERVICE.get(API_CONFIG.ENDPOINTS.TICKETS.recentCheckins(eventId))
};

// ============================================
// CHECK-IN / SCANNER API
// ============================================
const CheckinsAPI = {
    getStats: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.stats, { params });
    },
    getEvents: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.events, { params });
    },
    getRecent: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.recent, { params });
    },
    getEventDetails: (eventId) => API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.eventDetails(eventId)),
    getEventTimeline: (eventId) => API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.eventTimeline(eventId)),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.CHECKINS.export, { params });
    },
    exportEvent: (eventId) => {
        window.open(API_CONFIG.API_BASE + API_CONFIG.ENDPOINTS.CHECKINS.eventExport(eventId), '_blank');
    }
};

// ============================================
// USERS MANAGEMENT API
// ============================================
const UsersAPI = {
    getAll: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.list, { params });
    },
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.detail(id)),
    getOrganizers: (page = 1, pageSize = 10) => {
        const params = buildParams({ page, page_size: pageSize });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.organizers, { params });
    },
    getAttendees: (page = 1, pageSize = 10) => {
        const params = buildParams({ page, page_size: pageSize });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.attendees, { params });
    },
    getAdmins: (page = 1, pageSize = 10) => {
        const params = buildParams({ page, page_size: pageSize });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.admins, { params });
    },
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.stats, { useCache: true, cacheTTL: 60000 }),
    suspend: (id, reason) => API_SERVICE.post(API_CONFIG.ENDPOINTS.USERS.suspend(id), { reason }),
    activate: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.USERS.activate(id), {}),
    reactivate: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.USERS.reactivate(id), {}),
    verify: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.USERS.verify(id), {}),
    resetPassword: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.USERS.resetPassword(id), {}),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.USERS.export, { params });
    }
};

// ============================================
// ORGANIZERS MANAGEMENT API
// ============================================
const OrganizersAPI = {
    getVerified: (page = 1, pageSize = 10, filters = {}) => {
        const params = buildParams({ page, page_size: pageSize, ...filters });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.verified, { params });
    },
    getPending: (page = 1, pageSize = 10) => {
        const params = buildParams({ page, page_size: pageSize });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.pending, { params });
    },
    getSuspended: (page = 1, pageSize = 10) => {
        const params = buildParams({ page, page_size: pageSize });
        return API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.suspended, { params });
    },
    getStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.stats, { useCache: true, cacheTTL: 60000 }),
    getPendingStats: () => API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.pendingStats, { useCache: true, cacheTTL: 30000 }),
    getDetail: (id) => API_SERVICE.get(API_CONFIG.ENDPOINTS.ORGANIZERS.detail(id)),
    approve: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.ORGANIZERS.approve(id), {}),
    verify: (id, notes = '') => API_SERVICE.post(API_CONFIG.ENDPOINTS.ORGANIZERS.verify(id), { notes }),
    reject: (id, reason) => API_SERVICE.post(API_CONFIG.ENDPOINTS.ORGANIZERS.reject(id), { reason }),
    suspend: (id, reason) => API_SERVICE.post(API_CONFIG.ENDPOINTS.ORGANIZERS.suspend(id), { reason }),
    reactivate: (id) => API_SERVICE.post(API_CONFIG.ENDPOINTS.ORGANIZERS.reactivate(id), {})
};

// ============================================
// EXPORT ALL APIs
// ============================================
window.API = {
    config: API_CONFIG,
    service: API_SERVICE,
    auth: AuthAPI,
    dashboard: DashboardAPI,
    events: EventsAPI,
    eventsList: EventsListAPI,
    bookings: BookingsAPI,
    refunds: RefundsAPI,
    payments: PaymentsAPI,
    payouts: PayoutsAPI,
    reports: ReportsAPI,
    profile: ProfileAPI,
    notifications: NotificationsAPI,
    settings: SettingsAPI,
    support: SupportAPI,
    tickets: TicketsAPI,
    checkins: CheckinsAPI,
    users: UsersAPI,
    organizers: OrganizersAPI,
    
    // Helper to clear cache
    clearCache: (pattern) => API_SERVICE.clearCache(pattern)
};

console.log('✅ API Endpoints ready! Available modules:', Object.keys(window.API).filter(k => k !== 'service' && k !== 'config'));