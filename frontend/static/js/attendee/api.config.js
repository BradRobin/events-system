// ============================================
// ATTENDEE API CONFIGURATION
// Single source of truth for all attendee endpoints
// EventHub Attendee Portal - Complete Configuration
// ============================================

const ATTENDEE_API_CONFIG = {
    // Base URLs
    BASE_URL: window.location.origin,
    API_BASE: '/api/attendee',
    
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
        // AUTHENTICATION & ACCOUNT
        // ============================================
        AUTH: {
            register: '/auth/register/',
            login: '/auth/login/',
            logout: '/auth/logout/',
            verifyEmail: '/auth/verify-email/',
            resendVerification: '/auth/resend-verification/',
            forgotPassword: '/auth/forgot-password/',
            resetPassword: '/auth/reset-password/',
            changePassword: '/auth/change-password/',
            refreshToken: '/auth/refresh-token/'
        },
        
        // ============================================
        // PROFILE MANAGEMENT
        // ============================================
        PROFILE: {
            detail: '/profile/',
            update: '/profile/update/',
            uploadAvatar: '/profile/upload-avatar/',
            deleteAccount: '/profile/delete-account/',
            stats: '/profile/stats/'
        },
        
        // ============================================
        // EVENT DISCOVERY & BROWSING
        // ============================================
        EVENTS: {
            list: '/events/',
            detail: (id) => `/events/${id}/`,
            featured: '/events/featured/',
            upcoming: '/events/upcoming/',
            trending: '/events/trending/',
            nearby: '/events/nearby/',
            categories: '/events/categories/',
            search: '/events/search/',
            tickets: (id) => `/events/${id}/tickets/`,
            reviews: (id) => `/events/${id}/reviews/`,
            availability: (id) => `/events/${id}/availability/`,
            save: (id) => `/events/${id}/save/`,
            unsave: (id) => `/events/${id}/unsave/`,
            reminder: (id) => `/events/${id}/reminder/`,
            askQuestion: (id) => `/events/${id}/ask-question/`,
            report: (id) => `/events/${id}/report/`,
            similar: (id) => `/events/${id}/similar/`,
            schedule: (id) => `/events/${id}/schedule/`,
            faq: (id) => `/events/${id}/faq/`
        },
        
        // ============================================
        // CART & CHECKOUT
        // ============================================
        CART: {
            view: '/cart/',
            add: '/cart/add/',
            update: (itemId) => `/cart/update/${itemId}/`,
            remove: (itemId) => `/cart/remove/${itemId}/`,
            clear: '/cart/clear/',
            applyPromo: '/cart/apply-promo/',
            removePromo: '/cart/remove-promo/',
            checkout: '/cart/checkout/',
            summary: '/cart/checkout/summary/'
        },
        
        // ============================================
        // PAYMENTS
        // ============================================
        PAYMENTS: {
            mpesaSTKPush: '/payments/mpesa/stk-push/',
            mpesaStatus: (checkoutId) => `/payments/mpesa/status/${checkoutId}/`,
            mpesaCallback: '/payments/mpesa/callback/',
            cardInitialize: '/payments/card/initialize/',
            cardConfirm: '/payments/card/confirm/',
            methods: '/payments/methods/',
            addMethod: '/payments/methods/add/',
            removeMethod: (id) => `/payments/methods/remove/${id}/`,
            transactionHistory: '/payments/transactions/',
            transactionDetail: (id) => `/payments/transactions/${id}/`
        },
        
        // ============================================
        // TICKETS & BOOKINGS
        // ============================================
        TICKETS: {
            list: '/tickets/',
            upcoming: '/tickets/upcoming/',
            past: '/tickets/past/',
            detail: (ticketNumber) => `/tickets/${ticketNumber}/`,
            download: (ticketNumber) => `/tickets/${ticketNumber}/download/`,
            qrCode: (ticketNumber) => `/tickets/${ticketNumber}/qr/`,
            transfer: (ticketNumber) => `/tickets/${ticketNumber}/transfer/`,
            acceptTransfer: (token) => `/tickets/transfer/accept/${token}/`,
            refundRequest: (ticketNumber) => `/tickets/${ticketNumber}/refund-request/`,
            refundRequests: '/tickets/refund-requests/',
            checkinHistory: '/tickets/checkins/'
        },
        
        // ============================================
        // BOOKINGS
        // ============================================
        BOOKINGS: {
            history: '/bookings/',
            detail: (bookingId) => `/bookings/${bookingId}/`,
            cancel: (bookingId) => `/bookings/${bookingId}/cancel/`,
            invoice: (bookingId) => `/bookings/${bookingId}/invoice/`
        },
        
        // ============================================
        // WISHLIST
        // ============================================
        WISHLIST: {
            list: '/wishlist/',
            add: (eventId) => `/wishlist/add/${eventId}/`,
            remove: (eventId) => `/wishlist/remove/${eventId}/`,
            clear: '/wishlist/clear/'
        },
        
        // ============================================
        // REVIEWS & FEEDBACK
        // ============================================
        REVIEWS: {
            myReviews: '/reviews/',
            create: (eventId) => `/reviews/create/${eventId}/`,
            update: (reviewId) => `/reviews/update/${reviewId}/`,
            delete: (reviewId) => `/reviews/delete/${reviewId}/`,
            helpful: (reviewId) => `/reviews/${reviewId}/helpful/`,
            report: (reviewId) => `/reviews/${reviewId}/report/`
        },
        
        // ============================================
        // NOTIFICATIONS
        // ============================================
        NOTIFICATIONS: {
            list: '/notifications/',
            unread: '/notifications/unread/',
            read: (id) => `/notifications/${id}/read/`,
            markAllRead: '/notifications/mark-all-read/',
            preferences: '/notifications/preferences/',
            updatePreferences: '/notifications/preferences/update/'
        },
        
        // ============================================
        // DASHBOARD
        // ============================================
        DASHBOARD: {
            view: '/dashboard/',
            stats: '/dashboard/stats/',
            recentActivity: '/dashboard/recent-activity/',
            recommendations: '/dashboard/recommendations/'
        },
        
        // ============================================
        // SUPPORT
        // ============================================
        SUPPORT: {
            tickets: '/support/tickets/',
            create: '/support/tickets/create/',
            detail: (id) => `/support/tickets/${id}/`,
            reply: (id) => `/support/tickets/${id}/reply/`,
            close: (id) => `/support/tickets/${id}/close/`,
            faq: '/support/faq/'
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ATTENDEE_API_CONFIG;
}

// Make available globally
window.ATTENDEE_API_CONFIG = ATTENDEE_API_CONFIG;

console.log('✅ Attendee API Configuration loaded');