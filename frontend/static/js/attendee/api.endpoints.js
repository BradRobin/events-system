// ============================================
// ATTENDEE API ENDPOINTS WRAPPER
// Organized functions for each module
// EventHub Attendee Portal - Complete API Integration
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

// Helper to get the API instance
function getAPI() {
    if (!window.AttendeeAPI) {
        console.error('AttendeeAPI not initialized. Make sure api.service.js loads first.');
        return null;
    }
    return window.AttendeeAPI;
}

// ============================================
// AUTHENTICATION API
// ============================================
const AttendeeAuthAPI = {
    register: (data) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.register, data) : Promise.reject('API not ready');
    },
    login: (credentials) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.login, credentials) : Promise.reject('API not ready');
    },
    logout: () => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.logout, {}) : Promise.reject('API not ready');
    },
    verifyEmail: (token) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.verifyEmail, { token }) : Promise.reject('API not ready');
    },
    resendVerification: (email) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.resendVerification, { email }) : Promise.reject('API not ready');
    },
    forgotPassword: (email) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.forgotPassword, { email }) : Promise.reject('API not ready');
    },
    resetPassword: (token, password) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.resetPassword, { token, password }) : Promise.reject('API not ready');
    },
    changePassword: (currentPassword, newPassword) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.changePassword, { 
            current_password: currentPassword, 
            new_password: newPassword 
        }) : Promise.reject('API not ready');
    },
    refreshToken: () => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.AUTH.refreshToken, {}) : Promise.reject('API not ready');
    }
};

// ============================================
// PROFILE API
// ============================================
const AttendeeProfileAPI = {
    getProfile: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PROFILE.detail) : Promise.reject('API not ready');
    },
    update: (data) => {
        const api = getAPI();
        return api ? api.put(ATTENDEE_API_CONFIG.ENDPOINTS.PROFILE.update, data) : Promise.reject('API not ready');
    },
    uploadAvatar: (file) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post(ATTENDEE_API_CONFIG.ENDPOINTS.PROFILE.uploadAvatar, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteAccount: () => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.PROFILE.deleteAccount) : Promise.reject('API not ready');
    },
    getStats: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PROFILE.stats) : Promise.reject('API not ready');
    }
};

// ============================================
// EVENTS API - COMPLETE
// ============================================
const AttendeeEventsAPI = {
    // Listing & Discovery
    getAll: (page = 1, limit = 20, filters = {}) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit, ...filters });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.list, { params, useCache: true, cacheTTL: 60000 });
    },
    getDetail: (id) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.detail(id)) : Promise.reject('API not ready');
    },
    getFeatured: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.featured, { useCache: true, cacheTTL: 300000 }) : Promise.reject('API not ready');
    },
    getUpcoming: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.upcoming, { useCache: true, cacheTTL: 60000 }) : Promise.reject('API not ready');
    },
    getTrending: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.trending, { useCache: true, cacheTTL: 300000 }) : Promise.reject('API not ready');
    },
    getNearby: (lat, lng, radius = 10) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ lat, lng, radius });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.nearby, { params });
    },
    getCategories: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.categories, { useCache: true, cacheTTL: 3600000 }) : Promise.reject('API not ready');
    },
    search: (query, filters = {}) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ q: query, ...filters });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.search, { params });
    },
    
    // Event Details
    getTicketTypes: (eventId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.tickets(eventId)) : Promise.reject('API not ready');
    },
    getReviews: (eventId, page = 1) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.reviews(eventId), { params });
    },
    getAvailability: (eventId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.availability(eventId)) : Promise.reject('API not ready');
    },
    getSimilar: (eventId, limit = 4) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.similar(eventId), { params });
    },
    getSchedule: (eventId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.schedule(eventId)) : Promise.reject('API not ready');
    },
    getFAQ: (eventId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.faq(eventId)) : Promise.reject('API not ready');
    },
    
    // User Interactions
    save: (eventId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.save(eventId), {}) : Promise.reject('API not ready');
    },
    unsave: (eventId) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.unsave(eventId)) : Promise.reject('API not ready');
    },
    setReminder: (eventId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.reminder(eventId), {}) : Promise.reject('API not ready');
    },
    askQuestion: (eventId, question) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.askQuestion(eventId), { question }) : Promise.reject('API not ready');
    },
    report: (eventId, reason, details = '') => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.EVENTS.report(eventId), { reason, details }) : Promise.reject('API not ready');
    }
};

// ============================================
// CART API
// ============================================
const AttendeeCartAPI = {
    getCart: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.CART.view) : Promise.reject('API not ready');
    },
    addItem: (eventId, ticketTypeId, quantity, attendeeNames = []) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.CART.add, { 
            event_id: eventId, 
            ticket_type_id: ticketTypeId, 
            quantity, 
            attendee_names: attendeeNames 
        }) : Promise.reject('API not ready');
    },
    updateItem: (itemId, quantity) => {
        const api = getAPI();
        return api ? api.put(ATTENDEE_API_CONFIG.ENDPOINTS.CART.update(itemId), { quantity }) : Promise.reject('API not ready');
    },
    removeItem: (itemId) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.CART.remove(itemId)) : Promise.reject('API not ready');
    },
    clearCart: () => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.CART.clear) : Promise.reject('API not ready');
    },
    applyPromo: (code) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.CART.applyPromo, { code }) : Promise.reject('API not ready');
    },
    removePromo: () => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.CART.removePromo) : Promise.reject('API not ready');
    },
    getCheckoutSummary: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.CART.summary) : Promise.reject('API not ready');
    },
    checkout: (paymentMethod, billingInfo) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.CART.checkout, { 
            payment_method: paymentMethod, 
            billing_info: billingInfo 
        }) : Promise.reject('API not ready');
    }
};

// ============================================
// PAYMENTS API
// ============================================
const AttendeePaymentsAPI = {
    mpesaSTKPush: (bookingId, phoneNumber) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.mpesaSTKPush, { 
            booking_id: bookingId, 
            phone_number: phoneNumber 
        }) : Promise.reject('API not ready');
    },
    mpesaStatus: (checkoutId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.mpesaStatus(checkoutId)) : Promise.reject('API not ready');
    },
    cardInitialize: (bookingId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.cardInitialize, { booking_id: bookingId }) : Promise.reject('API not ready');
    },
    cardConfirm: (paymentIntentId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.cardConfirm, { payment_intent_id: paymentIntentId }) : Promise.reject('API not ready');
    },
    getPaymentMethods: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.methods) : Promise.reject('API not ready');
    },
    addPaymentMethod: (methodData) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.addMethod, methodData) : Promise.reject('API not ready');
    },
    removePaymentMethod: (id) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.removeMethod(id)) : Promise.reject('API not ready');
    },
    getTransactionHistory: (page = 1, limit = 20) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.transactionHistory, { params });
    },
    getTransactionDetail: (id) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.PAYMENTS.transactionDetail(id)) : Promise.reject('API not ready');
    }
};

// ============================================
// TICKETS API
// ============================================
const AttendeeTicketsAPI = {
    getAll: (page = 1, limit = 20) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.list, { params });
    },
    getUpcoming: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.upcoming) : Promise.reject('API not ready');
    },
    getPast: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.past) : Promise.reject('API not ready');
    },
    getDetail: (ticketNumber) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.detail(ticketNumber)) : Promise.reject('API not ready');
    },
    download: (ticketNumber) => {
        const api = getAPI();
        if (api) {
            window.open(ATTENDEE_API_CONFIG.API_BASE + ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.download(ticketNumber), '_blank');
        }
    },
    getQRCode: (ticketNumber) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.qrCode(ticketNumber)) : Promise.reject('API not ready');
    },
    transfer: (ticketNumber, email) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.transfer(ticketNumber), { email }) : Promise.reject('API not ready');
    },
    acceptTransfer: (token) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.acceptTransfer(token), {}) : Promise.reject('API not ready');
    },
    requestRefund: (ticketNumber, reason) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.refundRequest(ticketNumber), { reason }) : Promise.reject('API not ready');
    },
    getRefundRequests: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.refundRequests) : Promise.reject('API not ready');
    },
    getCheckinHistory: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.TICKETS.checkinHistory) : Promise.reject('API not ready');
    }
};

// ============================================
// BOOKINGS API
// ============================================
const AttendeeBookingsAPI = {
    getHistory: (page = 1, limit = 20) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.BOOKINGS.history, { params });
    },
    getDetail: (bookingId) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.BOOKINGS.detail(bookingId)) : Promise.reject('API not ready');
    },
    cancel: (bookingId, reason = '') => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.BOOKINGS.cancel(bookingId), { reason }) : Promise.reject('API not ready');
    },
    downloadInvoice: (bookingId) => {
        const api = getAPI();
        if (api) {
            window.open(ATTENDEE_API_CONFIG.API_BASE + ATTENDEE_API_CONFIG.ENDPOINTS.BOOKINGS.invoice(bookingId), '_blank');
        }
    }
};

// ============================================
// WISHLIST API
// ============================================
const AttendeeWishlistAPI = {
    getList: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.WISHLIST.list) : Promise.reject('API not ready');
    },
    add: (eventId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.WISHLIST.add(eventId), {}) : Promise.reject('API not ready');
    },
    remove: (eventId) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.WISHLIST.remove(eventId)) : Promise.reject('API not ready');
    },
    clear: () => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.WISHLIST.clear) : Promise.reject('API not ready');
    }
};

// ============================================
// REVIEWS API
// ============================================
const AttendeeReviewsAPI = {
    getMyReviews: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.myReviews) : Promise.reject('API not ready');
    },
    create: (eventId, data) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.create(eventId), data) : Promise.reject('API not ready');
    },
    update: (reviewId, data) => {
        const api = getAPI();
        return api ? api.put(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.update(reviewId), data) : Promise.reject('API not ready');
    },
    delete: (reviewId) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.delete(reviewId)) : Promise.reject('API not ready');
    },
    markHelpful: (reviewId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.helpful(reviewId), {}) : Promise.reject('API not ready');
    },
    report: (reviewId) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.REVIEWS.report(reviewId), {}) : Promise.reject('API not ready');
    }
};

// ============================================
// NOTIFICATIONS API 
// ============================================

const AttendeeNotificationsAPI = {
    getList: (page = 1, limit = 20) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.list, { params });
    },
    getUnreadCount: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.unread) : Promise.reject('API not ready');
    },
    markAsRead: (id) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.read(id), {}) : Promise.reject('API not ready');
    },
    markAllAsRead: () => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.markAllRead, {}) : Promise.reject('API not ready');
    },
    deleteNotification: (id) => {
        const api = getAPI();
        return api ? api.delete(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.delete(id)) : Promise.reject('API not ready');
    },
    getPreferences: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.preferences) : Promise.reject('API not ready');
    },
    updatePreferences: (preferences) => {
        const api = getAPI();
        return api ? api.put(ATTENDEE_API_CONFIG.ENDPOINTS.NOTIFICATIONS.updatePreferences, preferences) : Promise.reject('API not ready');
    }
};

// ============================================
// DASHBOARD API
// ============================================
const AttendeeDashboardAPI = {
    getDashboard: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.DASHBOARD.view) : Promise.reject('API not ready');
    },
    getStats: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.DASHBOARD.stats) : Promise.reject('API not ready');
    },
    getRecentActivity: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.DASHBOARD.recentActivity) : Promise.reject('API not ready');
    },
    getRecommendations: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.DASHBOARD.recommendations) : Promise.reject('API not ready');
    }
};

// ============================================
// SUPPORT API
// ============================================
const AttendeeSupportAPI = {
    getTickets: (page = 1, limit = 20) => {
        const api = getAPI();
        if (!api) return Promise.reject('API not ready');
        const params = buildParams({ page, limit });
        return api.get(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.tickets, { params });
    },
    createTicket: (subject, category, message, attachments = []) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.create, { subject, category, message, attachments }) : Promise.reject('API not ready');
    },
    getTicketDetail: (id) => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.detail(id)) : Promise.reject('API not ready');
    },
    replyToTicket: (id, message) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.reply(id), { message }) : Promise.reject('API not ready');
    },
    closeTicket: (id) => {
        const api = getAPI();
        return api ? api.post(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.close(id), {}) : Promise.reject('API not ready');
    },
    getFAQ: () => {
        const api = getAPI();
        return api ? api.get(ATTENDEE_API_CONFIG.ENDPOINTS.SUPPORT.faq, { useCache: true, cacheTTL: 86400000 }) : Promise.reject('API not ready');
    }
};

// ============================================
// EXPORT ALL APIs to window
// ============================================
window.AttendeeAPIEndpoints = {
    auth: AttendeeAuthAPI,
    profile: AttendeeProfileAPI,
    events: AttendeeEventsAPI,
    cart: AttendeeCartAPI,
    payments: AttendeePaymentsAPI,
    tickets: AttendeeTicketsAPI,
    bookings: AttendeeBookingsAPI,
    wishlist: AttendeeWishlistAPI,
    reviews: AttendeeReviewsAPI,
    notifications: AttendeeNotificationsAPI,
    dashboard: AttendeeDashboardAPI,
    support: AttendeeSupportAPI,
    
    // Helper methods
    isLoggedIn: () => {
        return !!localStorage.getItem('attendee_access_token');
    },
    logout: async () => {
        try {
            await AttendeeAuthAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('attendee_access_token');
            localStorage.removeItem('attendee_refresh_token');
            localStorage.removeItem('attendee_user');
            window.location.href = '/attendee/login/';
        }
    }
};

// Also expose as window.AttendeeAPI for backward compatibility
window.AttendeeAPI = window.AttendeeAPIEndpoints;

console.log('✅ Attendee API Endpoints ready! Available modules:', Object.keys(window.AttendeeAPI).filter(k => k !== 'service' && k !== 'config'));