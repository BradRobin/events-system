// ============================================
// CENTRALIZED API CONFIGURATION
// Single source of truth for all API endpoints
// EventHub Admin Portal - Complete Configuration
// ============================================

const API_CONFIG = {
    // Base URLs
    BASE_URL: window.location.origin,
    API_BASE: '/api/admin',
    
    // Enable/Disable Mock Data (set to false in production)
    USE_MOCK: false,
    
    // Request timeout in milliseconds
    TIMEOUT: 30000,
    
    // Cache TTL in milliseconds
    CACHE_TTL: 300000, // 5 minutes
    
    // Headers
    HEADERS: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    
    // API Endpoints organized by module
    ENDPOINTS: {
        // ============================================
        // AUTHENTICATION & LOGIN
        // ============================================
        AUTH: {
            login: '/auth/login/',
            logout: '/auth/logout/',
            check: '/auth/check/',
            resetPassword: '/auth/reset-password/',
            forgotPassword: '/auth/forgot-password/',
            verifyOTP: '/auth/verify-otp/',
            changePassword: '/auth/change-password/'
        },
        
        // ============================================
        // DASHBOARD
        // ============================================
        DASHBOARD: {
            stats: '/dashboard/stats/',
            revenueChart: '/dashboard/revenue-chart/',
            categoryChart: '/dashboard/category-chart/',
            recentActivity: '/dashboard/recent-activity/',
            topEvents: '/dashboard/top-events/',
            pendingCount: '/dashboard/pending-count/'
        },
        
        // ============================================
        // EVENTS
        // ============================================
        EVENTS: {
            list: '/events/',
            detail: (id) => `/events/${id}/`,
            pending: '/events/pending/',
            pendingCount: '/events/pending/count/',
            stats: '/events/stats/',
            categories: '/categories/',
            approve: (id) => `/events/${id}/approve/`,
            reject: (id) => `/events/${id}/reject/`,
            bulkApprove: '/events/bulk-approve/',
            bulkReject: '/events/bulk-reject/',
            delete: (id) => `/events/${id}/delete/`,
            history: (id) => `/events/${id}/history/`
        },
        
        // ============================================
        // EVENTS LIST (for dropdowns)
        // ============================================
        EVENTS_LIST: {
            upcoming: '/events/upcoming/',
            list: '/events/list/'
        },
        
        // ============================================
        // BOOKINGS
        // ============================================
        BOOKINGS: {
            list: '/bookings/',
            detail: (id) => `/bookings/${id}/`,
            stats: '/bookings/stats/',
            refund: (id) => `/bookings/${id}/refund/`,
            cancel: (id) => `/bookings/${id}/cancel/`,
            export: '/bookings/export/'
        },
        
        // ============================================
        // REFUNDS
        // ============================================
        REFUNDS: {
            list: '/refunds/',
            detail: (id) => `/refunds/${id}/`,
            stats: '/refunds/stats/',
            approve: (id) => `/refunds/${id}/approve/`,
            reject: (id) => `/refunds/${id}/reject/`,
            export: '/refunds/export/'
        },
        
        // ============================================
        // PAYMENTS & TRANSACTIONS
        // ============================================
        PAYMENTS: {
            transactions: '/transactions/',
            transactionDetail: (id) => `/transactions/${id}/`,
            stats: '/transactions/stats/',
            refund: '/transactions/refund/',
            export: '/transactions/export/'
        },
        
        // ============================================
        // PAYOUTS
        // ============================================
        PAYOUTS: {
            list: '/payouts/',
            detail: (id) => `/payouts/${id}/`,
            stats: '/payouts/stats/',
            process: '/payouts/process/',
            processAll: '/payouts/process-all/'
        },
        
        // ============================================
        // REPORTS & ANALYTICS
        // ============================================
        REPORTS: {
            analytics: '/reports/analytics/',
            sales: '/reports/sales/',
            events: '/reports/events/',
            eventsSummary: '/reports/events/summary/',
            kpi: '/reports/kpi/',
            revenueChart: '/reports/revenue-chart/',
            categoryChart: '/reports/category-chart/',
            topEvents: '/reports/top-events/',
            userGrowth: '/reports/user-growth/',
            summary: '/reports/summary/',
            export: (type) => `/reports/${type}/export/`
        },
        
        // ============================================
        // PROFILE
        // ============================================
        PROFILE: {
            detail: '/profile/',
            update: '/profile/update/',
            changePassword: '/profile/change-password/',
            uploadAvatar: '/profile/upload-avatar/',
            stats: '/profile/stats/'
        },
        
        // ============================================
        // NOTIFICATIONS
        // ============================================
        NOTIFICATIONS: {
            list: '/notifications/',
            detail: (id) => `/notifications/${id}/`,
            read: (id) => `/notifications/${id}/read/`,
            delete: (id) => `/notifications/${id}/`,
            broadcast: '/notifications/broadcast/',
            templates: '/notifications/templates/',
            templateDetail: (id) => `/notifications/templates/${id}/`,
            recent: '/notifications/recent/',
            markAllRead: '/notifications/mark-all-read/',
            unreadCount: '/notifications/unread-count/'
        },
        
        // ============================================
        // SETTINGS
        // ============================================
        SETTINGS: {
            general: '/settings/general/',
            payment: '/settings/payment/',
            security: '/settings/security/',
            apiKey: '/settings/api-key/',
            regenerateApiKey: '/settings/regenerate-api-key/',
            testMpesa: '/settings/test-mpesa/',
            auditLogDownload: '/settings/audit-log/download/'
        },
        
        // ============================================
        // SUPPORT TICKETS
        // ============================================
        SUPPORT: {
            tickets: '/support/tickets/',
            ticketDetail: (id) => `/support/tickets/${id}/`,
            reply: (id) => `/support/tickets/${id}/reply/`,
            stats: '/support/stats/'
        },
        
        // ============================================
        // TICKETS MANAGEMENT
        // ============================================
        TICKETS: {
            list: '/tickets/',
            detail: (ticketNumber) => `/tickets/${ticketNumber}/`,
            verify: (ticketNumber) => `/tickets/${ticketNumber}/verify/`,
            checkin: (ticketNumber) => `/tickets/${ticketNumber}/checkin/`,
            download: (ticketNumber) => `/tickets/${ticketNumber}/download/`,
            export: '/tickets/export/',
            stats: (eventId) => `/events/${eventId}/stats/`,
            recentCheckins: (eventId) => `/events/${eventId}/recent-checkins/`
        },
        
        // ============================================
        // CHECK-IN / SCANNER
        // ============================================
        CHECKINS: {
            stats: '/checkins/stats/',
            events: '/checkins/events/',
            recent: '/checkins/recent/',
            eventDetails: (eventId) => `/checkins/event/${eventId}/details/`,
            eventTimeline: (eventId) => `/checkins/event/${eventId}/timeline/`,
            export: '/checkins/export/',
            eventExport: (eventId) => `/checkins/event/${eventId}/export/`
        },
        
        // ============================================
        // USERS MANAGEMENT
        // ============================================
        USERS: {
            list: '/users/',
            detail: (id) => `/users/${id}/`,
            organizers: '/users/organizers/',
            attendees: '/users/attendees/',
            admins: '/users/admins/',
            create: '/users/create/',
            update: (id) => `/users/${id}/update/`,
            delete: (id) => `/users/${id}/delete/`,
            suspend: (id) => `/users/${id}/suspend/`,
            activate: (id) => `/users/${id}/activate/`,
            reactivate: (id) => `/users/${id}/reactivate/`,
            verify: (id) => `/users/${id}/verify/`,
            stats: '/users/stats/',
            resetPassword: (id) => `/users/${id}/reset-password/`,
            export: '/users/export/'
        },
        
        // ============================================
        // ORGANIZERS MANAGEMENT
        // ============================================
        ORGANIZERS: {
            verified: '/organizers/verified/',
            pending: '/organizers/pending/',
            suspended: '/organizers/suspended/',
            stats: '/organizers/stats/',
            pendingStats: '/organizers/pending/stats/',
            detail: (id) => `/organizers/${id}/`,
            approve: (id) => `/organizers/${id}/approve/`,
            verify: (id) => `/organizers/${id}/verify/`,
            reject: (id) => `/organizers/${id}/reject/`,
            suspend: (id) => `/organizers/${id}/suspend/`,
            reactivate: (id) => `/organizers/${id}/reactivate/`
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

// Make available globally
window.API_CONFIG = API_CONFIG;

console.log('✅ API Configuration loaded');