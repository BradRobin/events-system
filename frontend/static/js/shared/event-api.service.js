// ============================================
// COMPLETE EVENT API SERVICE - ALL PORTALS
// Handles: All API calls for Attendee, Organizer, Admin
// ============================================

const EVENT_API_URL = '/api';

class EventApiService {
    constructor() {
        this.token = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    async request(endpoint, options = {}) {
        const url = `${EVENT_API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                const refreshed = await this.refreshAuthToken();
                if (refreshed) return this.request(endpoint, options);
                this.redirectToLogin();
                return null;
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Request failed' }));
                throw new Error(error.message || 'Request failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showToast(error.message, 'error');
            return null;
        }
    }

    async refreshAuthToken() {
        if (!this.refreshToken) return false;
        
        try {
            const response = await fetch(`${EVENT_API_URL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.access;
                localStorage.setItem('access_token', data.access);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        return false;
    }

    redirectToLogin() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login/';
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    setAuthToken(token) {
        this.token = token;
        if (token) localStorage.setItem('access_token', token);
        else localStorage.removeItem('access_token');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login/';
    }
}

const eventApi = new EventApiService();

// ============================================
// ATTENDEE EVENT ENDPOINTS
// ============================================

const AttendeeEvents = {
    // Core Events
    getEvents: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return eventApi.request(`/events/?${params}`);
    },
    getEventDetail: (eventId) => eventApi.request(`/events/${eventId}/`),
    getCategories: () => eventApi.request('/events/categories/'),
    getFeaturedEvents: () => eventApi.request('/events/featured/'),
    getUpcomingEvents: (filter = 'all') => eventApi.request(`/events/upcoming/?filter=${filter}`),
    getTrendingEvents: () => eventApi.request('/events/trending/'),
    getRecommendedEvents: () => eventApi.request('/events/recommended/'),
    getNearbyEvents: (lat, lng) => eventApi.request(`/events/nearby/?lat=${lat}&lng=${lng}`),
    searchEvents: (query, filters = {}) => {
        const params = new URLSearchParams({ q: query, ...filters });
        return eventApi.request(`/events/search/?${params}`);
    },
    getCalendarEvents: (start, end) => eventApi.request(`/events/calendar/?start=${start}&end=${end}`),
    getTicketTypes: (eventId) => eventApi.request(`/events/${eventId}/ticket-types/`),
    checkAvailability: (eventId, quantity) => eventApi.request(`/events/${eventId}/availability/?quantity=${quantity}`),
    getSimilarEvents: (eventId) => eventApi.request(`/events/${eventId}/similar/`),
    getEventsByCategory: (categorySlug, page = 1) => eventApi.request(`/events/category/${categorySlug}/?page=${page}`),
    getEventDates: () => eventApi.request('/events/dates/'),
    getPriceRange: () => eventApi.request('/events/price-range/'),

    // Waitlist
    joinWaitlist: (eventId) => eventApi.request(`/events/${eventId}/waitlist/`, { method: 'POST' }),
    getWaitlistPosition: (eventId) => eventApi.request(`/events/${eventId}/waitlist/position/`),
    leaveWaitlist: (eventId) => eventApi.request(`/events/${eventId}/waitlist/leave/`, { method: 'DELETE' }),

    // Wishlist
    getWishlist: () => eventApi.request('/wishlist/'),
    addToWishlist: (eventId) => eventApi.request(`/wishlist/${eventId}/add/`, { method: 'POST' }),
    removeFromWishlist: (eventId) => eventApi.request(`/wishlist/${eventId}/remove/`, { method: 'DELETE' }),

    // Reminders
    setReminder: (eventId, reminderTime) => eventApi.request(`/events/${eventId}/reminder/`, {
        method: 'POST',
        body: JSON.stringify({ reminder_time: reminderTime })
    }),
    getReminders: () => eventApi.request('/reminders/'),
    removeReminder: (reminderId) => eventApi.request(`/reminders/${reminderId}/`, { method: 'DELETE' }),

    // Bookings
    createBooking: (bookingData) => eventApi.request('/bookings/create/', {
        method: 'POST',
        body: JSON.stringify(bookingData)
    }),
    getMyBookings: () => eventApi.request('/bookings/my/'),
    getBookingDetail: (bookingId) => eventApi.request(`/bookings/${bookingId}/`),
    cancelBooking: (bookingId) => eventApi.request(`/bookings/${bookingId}/cancel/`, { method: 'POST' }),

    // Reviews
    addReview: (eventId, rating, comment) => eventApi.request(`/events/${eventId}/reviews/`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
    }),
    getReviews: (eventId) => eventApi.request(`/events/${eventId}/reviews/`),

    // Share Endpoints
    shareEvent: (eventId, platform) => eventApi.request(`/events/${eventId}/share/`, {
        method: 'POST',
        body: JSON.stringify({ platform })
    }),
    getShareLinks: (eventId) => eventApi.request(`/events/${eventId}/share-links/`),
    getShareAnalytics: (eventId) => eventApi.request(`/events/${eventId}/share-analytics/`),
};

// ============================================
// ORGANIZER EVENT ENDPOINTS
// ============================================

const OrganizerEvents = {
    // Event CRUD
    getMyEvents: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return eventApi.request(`/organizer/events/?${params}`);
    },
    getEventForEdit: (eventId) => eventApi.request(`/organizer/events/${eventId}/`),
    createEvent: (eventData) => eventApi.request('/organizer/events/create/', {
        method: 'POST',
        body: JSON.stringify(eventData)
    }),
    updateEvent: (eventId, eventData) => eventApi.request(`/organizer/events/${eventId}/update/`, {
        method: 'PUT',
        body: JSON.stringify(eventData)
    }),
    deleteEvent: (eventId, permanent = false) => eventApi.request(`/organizer/events/${eventId}/delete/?permanent=${permanent}`, {
        method: 'DELETE'
    }),
    duplicateEvent: (eventId) => eventApi.request(`/organizer/events/${eventId}/duplicate/`, { method: 'POST' }),
    publishEvent: (eventId) => eventApi.request(`/organizer/events/${eventId}/publish/`, { method: 'POST' }),
    unpublishEvent: (eventId) => eventApi.request(`/organizer/events/${eventId}/unpublish/`, { method: 'POST' }),
    cancelEvent: (eventId, reason) => eventApi.request(`/organizer/events/${eventId}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ reason })
    }),

    // Bookings & Attendees
    getEventBookings: (eventId, page = 1) => eventApi.request(`/organizer/events/${eventId}/bookings/?page=${page}`),
    getAttendeeList: (eventId) => eventApi.request(`/organizer/events/${eventId}/attendees/`),
    checkinAttendee: (eventId, bookingId) => eventApi.request(`/organizer/events/${eventId}/checkin/`, {
        method: 'POST',
        body: JSON.stringify({ booking_id: bookingId })
    }),
    cancelBooking: (bookingId) => eventApi.request(`/organizer/bookings/${bookingId}/cancel/`, { method: 'POST' }),

    // Analytics
    getEventAnalytics: (eventId) => eventApi.request(`/organizer/events/${eventId}/analytics/`),
    getCheckinStats: (eventId) => eventApi.request(`/organizer/events/${eventId}/checkin-stats/`),
    getSalesReport: (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return eventApi.request(`/organizer/sales/?${params}`);
    },
    exportEventsData: () => eventApi.request('/organizer/events/export/'),

    // Promotions
    getPromoCodes: (eventId) => eventApi.request(`/organizer/events/${eventId}/promocodes/`),
    createPromoCode: (eventId, promoData) => eventApi.request(`/organizer/events/${eventId}/promocode/create/`, {
        method: 'POST',
        body: JSON.stringify(promoData)
    }),
    updatePromoCode: (eventId, promoId, promoData) => eventApi.request(`/organizer/events/${eventId}/promocode/${promoId}/update/`, {
        method: 'PUT',
        body: JSON.stringify(promoData)
    }),
    deletePromoCode: (eventId, promoId) => eventApi.request(`/organizer/events/${eventId}/promocode/${promoId}/delete/`, { method: 'DELETE' }),

    // Share Endpoints
    getEventShareStats: (eventId) => eventApi.request(`/organizer/events/${eventId}/share-stats/`),
    getSharePerformance: (eventId) => eventApi.request(`/organizer/events/${eventId}/share-performance/`),
};

// ============================================
// ADMIN EVENT ENDPOINTS
// ============================================

const AdminEvents = {
    // Event Management
    getAllEvents: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return eventApi.request(`/admin/events/?${params}`);
    },
    getEventDetailAdmin: (eventId) => eventApi.request(`/admin/events/${eventId}/`),
    approveEvent: (eventId) => eventApi.request(`/admin/events/${eventId}/approve/`, { method: 'POST' }),
    rejectEvent: (eventId, reason) => eventApi.request(`/admin/events/${eventId}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason })
    }),
    featureEvent: (eventId) => eventApi.request(`/admin/events/${eventId}/feature/`, { method: 'POST' }),
    unfeatureEvent: (eventId) => eventApi.request(`/admin/events/${eventId}/unfeature/`, { method: 'DELETE' }),
    deleteEvent: (eventId) => eventApi.request(`/admin/events/${eventId}/delete/`, { method: 'DELETE' }),
    forceCancelEvent: (eventId, reason) => eventApi.request(`/admin/events/${eventId}/force-cancel/`, {
        method: 'POST',
        body: JSON.stringify({ reason })
    }),
    getPendingEvents: () => eventApi.request('/admin/events/pending/'),

    // Categories
    getCategories: () => eventApi.request('/admin/categories/'),
    createCategory: (categoryData) => eventApi.request('/admin/categories/create/', {
        method: 'POST',
        body: JSON.stringify(categoryData)
    }),
    updateCategory: (categoryId, categoryData) => eventApi.request(`/admin/categories/${categoryId}/update/`, {
        method: 'PUT',
        body: JSON.stringify(categoryData)
    }),
    deleteCategory: (categoryId) => eventApi.request(`/admin/categories/${categoryId}/delete/`, { method: 'DELETE' }),

    // Bulk Operations
    bulkApproveEvents: (eventIds) => eventApi.request('/admin/events/bulk/approve/', {
        method: 'POST',
        body: JSON.stringify({ event_ids: eventIds })
    }),
    bulkFeatureEvents: (eventIds) => eventApi.request('/admin/events/bulk/feature/', {
        method: 'POST',
        body: JSON.stringify({ event_ids: eventIds })
    }),
    bulkDeleteEvents: (eventIds) => eventApi.request('/admin/events/bulk/delete/', {
        method: 'DELETE',
        body: JSON.stringify({ event_ids: eventIds })
    }),

    // Reports
    getPlatformStats: () => eventApi.request('/admin/stats/'),
    getOrganizerStats: (organizerId) => eventApi.request(`/admin/organizers/${organizerId}/stats/`),
    getEventPerformanceReport: (type = 'summary') => eventApi.request(`/admin/reports/event-performance/?type=${type}`),

    // Share Endpoints
    getPlatformShareStats: () => eventApi.request('/admin/share-stats/'),
    getTopSharedEvents: (limit = 10) => eventApi.request(`/admin/top-shared-events/?limit=${limit}`),
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

const AuthAPI = {
    login: (credentials) => eventApi.request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),
    register: (userData) => eventApi.request('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    logout: () => eventApi.request('/auth/logout/', { method: 'POST' }),
    getProfile: () => eventApi.request('/auth/profile/'),
    updateProfile: (profileData) => eventApi.request('/auth/profile/update/', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    }),
    changePassword: (passwordData) => eventApi.request('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify(passwordData)
    }),
    resetPassword: (email) => eventApi.request('/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({ email })
    }),
};

// Export globally
window.EventAPI = {
    Attendee: AttendeeEvents,
    Organizer: OrganizerEvents,
    Admin: AdminEvents,
    Auth: AuthAPI
};
