// ============================================
// ORGANIZER API ENDPOINTS WRAPPER
// Organized functions for each module
// EventHub Organizer Portal - Complete API Integration
// ============================================

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
const OrganizerAuthAPI = {
    register: (data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.register, data),
    login: (credentials) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.login, credentials),
    logout: () => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.logout, {}),
    verifyEmail: (token) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.verifyEmail, { token }),
    resendVerification: (email) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.resendVerification, { email }),
    forgotPassword: (email) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.forgotPassword, { email }),
    resetPassword: (token, password) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.resetPassword, { token, password }),
    changePassword: (currentPassword, newPassword) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.changePassword, { current_password: currentPassword, new_password: newPassword }),
    refreshToken: () => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.refreshToken, {}),
    checkStatus: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.AUTH.checkStatus)
};

// ============================================
// PROFILE & BUSINESS API
// ============================================
const OrganizerProfileAPI = {
    getProfile: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.detail),
    update: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.update, data),
    uploadLogo: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.uploadLogo, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    uploadDocuments: (documents) => {
        const formData = new FormData();
        documents.forEach(doc => {
            formData.append('documents', doc);
        });
        return OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.uploadDocuments, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteAccount: () => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.deleteAccount),
    getVerificationStatus: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.verificationStatus),
    submitApplication: (data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.submitApplication, data),
    getBankDetails: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.bankDetails),
    updateBankDetails: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.PROFILE.updateBankDetails, data)
};

// ============================================
// DASHBOARD API
// ============================================
const OrganizerDashboardAPI = {
    getStats: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.stats),
    getRevenue: (period = 'monthly') => {
        const params = buildParams({ period });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.revenue, { params });
    },
    getRecentBookings: (limit = 10) => {
        const params = buildParams({ limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.recentBookings, { params });
    },
    getUpcomingEvents: (limit = 5) => {
        const params = buildParams({ limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.upcomingEvents, { params });
    },
    getPerformance: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.performance),
    getNotifications: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.DASHBOARD.notifications)
};

// ============================================
// EVENT MANAGEMENT API
// ============================================
const OrganizerEventsAPI = {
    getAll: (page = 1, limit = 20, filters = {}) => {
        const params = buildParams({ page, limit, ...filters });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.list, { params });
    },
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.detail(id)),
    create: (data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.create, data),
    update: (id, data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.update(id), data),
    delete: (id) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.delete(id)),
    duplicate: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.duplicate(id), {}),
    submitApproval: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.submitApproval(id), {}),
    cancel: (id, reason) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.cancel(id), { reason }),
    publish: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.publish(id), {}),
    unpublish: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.unpublish(id), {}),
    getStatus: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.status(id)),
    
    // Ticket Types
    getTicketTypes: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.tickets(eventId)),
    addTicketType: (eventId, data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.addTicketType(eventId), data),
    updateTicketType: (eventId, ticketId, data) => 
        OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.updateTicketType(eventId, ticketId), data),
    deleteTicketType: (eventId, ticketId) => 
        OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.deleteTicketType(eventId, ticketId)),
    
    // Schedule
    getSchedule: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.schedule(eventId)),
    addScheduleItem: (eventId, data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.addScheduleItem(eventId), data),
    updateScheduleItem: (eventId, itemId, data) => 
        OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.updateScheduleItem(eventId, itemId), data),
    deleteScheduleItem: (eventId, itemId) => 
        OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.deleteScheduleItem(eventId, itemId)),
    
    // Media
    uploadImage: (eventId, file) => {
        const formData = new FormData();
        formData.append('image', file);
        return OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.uploadImage(eventId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteImage: (eventId, imageId) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.deleteImage(eventId, imageId)),
    uploadGallery: (eventId, files) => {
        const formData = new FormData();
        files.forEach(file => formData.append('gallery', file));
        return OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.uploadGallery(eventId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteGallery: (eventId, imageId) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.deleteGallery(eventId, imageId)),
    
    // Settings & Analytics
    getSettings: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.settings(eventId)),
    updateSettings: (eventId, data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.updateSettings(eventId), data),
    getAnalytics: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.analytics(eventId)),
    getSalesReport: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.salesReport(eventId)),
    getAttendanceReport: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.EVENTS.attendanceReport(eventId))
};

// ============================================
// TICKET MANAGEMENT API
// ============================================
const OrganizerTicketsAPI = {
    getAll: (page = 1, limit = 20, filters = {}) => {
        const params = buildParams({ page, limit, ...filters });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.list, { params });
    },
    getDetail: (ticketNumber) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.detail(ticketNumber)),
    scan: (ticketNumber, eventId) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.scan, { ticket_number: ticketNumber, event_id: eventId }),
    verify: (ticketNumber) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.verify(ticketNumber)),
    checkin: (ticketNumber) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.checkin(ticketNumber), {}),
    bulkCheckin: (ticketNumbers, eventId) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.bulkCheckin, { ticket_numbers: ticketNumbers, event_id: eventId }),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.export, { params });
    },
    getStats: (eventId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.stats(eventId)),
    getRecentCheckins: (eventId, limit = 20) => {
        const params = buildParams({ limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.recentCheckins(eventId), { params });
    },
    search: (query, eventId = null) => {
        const params = buildParams({ q: query, event_id: eventId });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.TICKETS.search, { params });
    }
};

// ============================================
// BOOKINGS MANAGEMENT API
// ============================================
const OrganizerBookingsAPI = {
    getAll: (page = 1, limit = 20, filters = {}) => {
        const params = buildParams({ page, limit, ...filters });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.list, { params });
    },
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.detail(id)),
    getEventBookings: (eventId, page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.eventBookings(eventId), { params });
    },
    getStats: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.stats),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.export, { params });
    },
    sendReminder: (bookingId) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.sendReminder(bookingId), {}),
    getAttendee: (bookingId) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.BOOKINGS.viewAttendee(bookingId))
};

// ============================================
// ATTENDEE MANAGEMENT API
// ============================================
const OrganizerAttendeesAPI = {
    getAll: (page = 1, limit = 20, filters = {}) => {
        const params = buildParams({ page, limit, ...filters });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.list, { params });
    },
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.detail(id)),
    getEventAttendees: (eventId, page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.eventAttendees(eventId), { params });
    },
    export: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.export, { params });
    },
    search: (query, eventId = null) => {
        const params = buildParams({ q: query, event_id: eventId });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.search, { params });
    },
    getStats: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.stats),
    sendMessage: (attendeeId, message) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.sendMessage(attendeeId), { message }),
    bulkMessage: (eventId, message, filters = {}) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.ATTENDEES.bulkMessage, { event_id: eventId, message, filters })
};

// ============================================
// PAYOUTS & EARNINGS API
// ============================================
const OrganizerPayoutsAPI = {
    getSummary: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.summary),
    getHistory: (page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.history, { params });
    },
    getUpcoming: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.upcoming),
    requestPayout: (amount) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.request, { amount }),
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.detail(id)),
    getSettings: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.settings),
    updateSettings: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.updateSettings, data),
    getStatements: (year = null) => {
        const params = buildParams({ year });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.statements, { params });
    },
    downloadStatement: (id) => {
        window.open(ORGANIZER_API_CONFIG.API_BASE + ORGANIZER_API_CONFIG.ENDPOINTS.PAYOUTS.downloadStatement(id), '_blank');
    }
};

// ============================================
// PROMOTIONS API
// ============================================
const OrganizerPromotionsAPI = {
    getAll: (page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.list, { params });
    },
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.detail(id)),
    create: (data) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.create, data),
    update: (id, data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.update(id), data),
    delete: (id) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.delete(id)),
    activate: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.activate(id), {}),
    deactivate: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.deactivate(id), {}),
    getStats: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.stats(id)),
    validate: (code, eventId) => {
        const params = buildParams({ code, event_id: eventId });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.PROMOTIONS.validate, { params });
    }
};

// ============================================
// REVIEWS API
// ============================================
const OrganizerReviewsAPI = {
    getAll: (page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.list, { params });
    },
    getEventReviews: (eventId, page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.eventReviews(eventId), { params });
    },
    getDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.detail(id)),
    respond: (id, response) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.respond(id), { response }),
    getStats: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.stats),
    export: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.export, { params });
    }
};

// ============================================
// NOTIFICATIONS API
// ============================================
const OrganizerNotificationsAPI = {
    getList: (page = 1, limit = 20) => {
        const params = buildParams({ page, limit });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.list, { params });
    },
    getUnreadCount: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.unread),
    markAsRead: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.read(id), {}),
    markAllAsRead: () => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.markAllRead, {}),
    getPreferences: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.preferences),
    updatePreferences: (preferences) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.updatePreferences, preferences),
    sendToAttendees: (eventId, title, message) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.NOTIFICATIONS.sendToAttendees, { event_id: eventId, title, message })
};

// ============================================
// REPORTS API
// ============================================
const OrganizerReportsAPI = {
    getSales: (period = 'monthly', startDate = '', endDate = '') => {
        const params = buildParams({ period, start_date: startDate, end_date: endDate });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.sales, { params });
    },
    getEvents: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.events, { params });
    },
    getAttendees: (filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.attendees, { params });
    },
    getRevenue: (period = 'monthly') => {
        const params = buildParams({ period });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.revenue, { params });
    },
    export: (type, filters = {}) => {
        const params = buildParams(filters);
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.export(type), { params });
    },
    getDashboard: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.dashboard),
    getPerformance: (period = 'monthly') => {
        const params = buildParams({ period });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.REPORTS.performance, { params });
    }
};

// ============================================
// CHECK-IN MANAGEMENT API
// ============================================
const OrganizerCheckinAPI = {
    getDevices: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.devices),
    registerDevice: (deviceName) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.registerDevice, { device_name: deviceName }),
    getDeviceDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.deviceDetail(id)),
    revokeDevice: (id) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.revokeDevice(id)),
    getSessions: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.sessions),
    getActiveSession: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.activeSession),
    createSession: (eventId) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.createSession, { event_id: eventId }),
    closeSession: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.closeSession(id), {}),
    getStats: (eventId = null) => {
        const params = buildParams({ event_id: eventId });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.stats, { params });
    },
    getRealtime: (eventId) => {
        const params = buildParams({ event_id: eventId });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.CHECKIN.realtime, { params });
    }
};

// ============================================
// SETTINGS API
// ============================================
const OrganizerSettingsAPI = {
    getGeneral: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.general),
    updateGeneral: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.updateGeneral, data),
    getPayment: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.payment),
    updatePayment: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.updatePayment, data),
    getNotification: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.notification),
    updateNotification: (data) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.updateNotification, data),
    getTeam: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.team),
    addTeamMember: (email, role) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.addTeamMember, { email, role }),
    updateTeamMember: (id, role) => OrganizerAPI.put(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.updateTeamMember(id), { role }),
    removeTeamMember: (id) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.removeTeamMember(id)),
    getApiKeys: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.apiKeys),
    createApiKey: (name) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.createApiKey, { name }),
    revokeApiKey: (id) => OrganizerAPI.delete(ORGANIZER_API_CONFIG.ENDPOINTS.SETTINGS.revokeApiKey(id))
};

// ============================================
// SUPPORT API
// ============================================
const OrganizerSupportAPI = {
    getTickets: (page = 1, limit = 20, status = 'all') => {
        const params = buildParams({ page, limit, status });
        return OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.tickets, { params });
    },
    createTicket: (subject, category, message, attachments = []) => 
        OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.create, { subject, category, message, attachments }),
    getTicketDetail: (id) => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.detail(id)),
    replyToTicket: (id, message) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.reply(id), { message }),
    closeTicket: (id) => OrganizerAPI.post(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.close(id), {}),
    getFAQ: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.faq, { useCache: true, cacheTTL: 86400000 }),
    getGuides: () => OrganizerAPI.get(ORGANIZER_API_CONFIG.ENDPOINTS.SUPPORT.guides, { useCache: true, cacheTTL: 86400000 })
};

// ============================================
// EXPORT ALL APIs
// ============================================
window.OrganizerAPI = {
    config: ORGANIZER_API_CONFIG,
    service: OrganizerAPI,
    auth: OrganizerAuthAPI,
    profile: OrganizerProfileAPI,
    dashboard: OrganizerDashboardAPI,
    events: OrganizerEventsAPI,
    tickets: OrganizerTicketsAPI,
    bookings: OrganizerBookingsAPI,
    attendees: OrganizerAttendeesAPI,
    payouts: OrganizerPayoutsAPI,
    promotions: OrganizerPromotionsAPI,
    reviews: OrganizerReviewsAPI,
    notifications: OrganizerNotificationsAPI,
    reports: OrganizerReportsAPI,
    checkin: OrganizerCheckinAPI,
    settings: OrganizerSettingsAPI,
    support: OrganizerSupportAPI,
    
    clearCache: (pattern) => OrganizerAPI.clearCache(pattern),
    isLoggedIn: () => !!localStorage.getItem('organizer_access_token'),
    logout: async () => {
        try {
            await OrganizerAuthAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            OrganizerAPI.clearTokens();
            window.location.href = '/organizer/login/';
        }
    }
};

console.log('✅ Organizer API Endpoints ready! Available modules:', Object.keys(window.OrganizerAPI).filter(k => k !== 'service' && k !== 'config'));
