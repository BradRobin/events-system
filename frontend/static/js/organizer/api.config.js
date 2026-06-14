// ============================================
// ORGANIZER API CONFIGURATION
// Single source of truth for all organizer endpoints
// ============================================

const ORGANIZER_API_CONFIG = {
    BASE_URL: window.location.origin,
    API_BASE: '/api/organizer',
    USE_MOCK: false,
    TIMEOUT: 30000,
    CACHE_TTL: 300000,
    HEADERS: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    ENDPOINTS: {
        AUTH: {
            register: '/auth/register/',
            login: '/auth/login/',
            logout: '/auth/logout/',
            verifyEmail: '/auth/verify-email/',
            resendVerification: '/auth/resend-verification/',
            forgotPassword: '/auth/forgot-password/',
            resetPassword: '/auth/reset-password/',
            changePassword: '/auth/change-password/',
            refreshToken: '/auth/refresh-token/',
            checkStatus: '/auth/check-status/'
        },
        PROFILE: {
            detail: '/profile/',
            update: '/profile/update/',
            uploadLogo: '/profile/upload-logo/',
            uploadDocuments: '/profile/upload-documents/',
            deleteAccount: '/profile/delete-account/',
            verificationStatus: '/profile/verification-status/',
            submitApplication: '/profile/submit-application/',
            bankDetails: '/profile/bank-details/',
            updateBankDetails: '/profile/bank-details/update/'
        },
        DASHBOARD: {
            stats: '/dashboard/stats/',
            revenue: '/dashboard/revenue/',
            recentBookings: '/dashboard/recent-bookings/',
            upcomingEvents: '/dashboard/upcoming-events/',
            performance: '/dashboard/performance/',
            notifications: '/dashboard/notifications/'
        },
        EVENTS: {
            list: '/events/',
            detail: (id) => `/events/${id}/`,
            create: '/events/create/',
            update: (id) => `/events/${id}/update/`,
            delete: (id) => `/events/${id}/delete/`,
            duplicate: (id) => `/events/${id}/duplicate/`,
            submitApproval: (id) => `/events/${id}/submit-approval/`,
            cancel: (id) => `/events/${id}/cancel/`,
            publish: (id) => `/events/${id}/publish/`,
            unpublish: (id) => `/events/${id}/unpublish/`,
            status: (id) => `/events/${id}/status/`,
            tickets: (id) => `/events/${id}/tickets/`,
            addTicketType: (id) => `/events/${id}/tickets/add/`,
            updateTicketType: (eventId, ticketId) => `/events/${eventId}/tickets/${ticketId}/update/`,
            deleteTicketType: (eventId, ticketId) => `/events/${eventId}/tickets/${ticketId}/delete/`,
            schedule: (id) => `/events/${id}/schedule/`,
            addScheduleItem: (id) => `/events/${id}/schedule/add/`,
            updateScheduleItem: (eventId, itemId) => `/events/${eventId}/schedule/${itemId}/update/`,
            deleteScheduleItem: (eventId, itemId) => `/events/${eventId}/schedule/${itemId}/delete/`,
            uploadImage: (id) => `/events/${id}/upload-image/`,
            deleteImage: (eventId, imageId) => `/events/${eventId}/images/${imageId}/delete/`,
            uploadGallery: (id) => `/events/${id}/upload-gallery/`,
            deleteGallery: (eventId, imageId) => `/events/${eventId}/gallery/${imageId}/delete/`,
            settings: (id) => `/events/${id}/settings/`,
            updateSettings: (id) => `/events/${id}/settings/update/`,
            analytics: (id) => `/events/${id}/analytics/`,
            salesReport: (id) => `/events/${id}/sales-report/`,
            attendanceReport: (id) => `/events/${id}/attendance-report/`
        },
        TICKETS: {
            list: '/tickets/',
            detail: (ticketNumber) => `/tickets/${ticketNumber}/`,
            scan: '/tickets/scan/',
            verify: (ticketNumber) => `/tickets/${ticketNumber}/verify/`,
            checkin: (ticketNumber) => `/tickets/${ticketNumber}/checkin/`,
            bulkCheckin: '/tickets/bulk-checkin/',
            export: '/tickets/export/',
            stats: (eventId) => `/tickets/stats/${eventId}/`,
            recentCheckins: (eventId) => `/tickets/recent-checkins/${eventId}/`,
            search: '/tickets/search/'
        },
        BOOKINGS: {
            list: '/bookings/',
            detail: (id) => `/bookings/${id}/`,
            eventBookings: (eventId) => `/bookings/event/${eventId}/`,
            stats: '/bookings/stats/',
            export: '/bookings/export/',
            sendReminder: (id) => `/bookings/${id}/send-reminder/`,
            viewAttendee: (id) => `/bookings/${id}/attendee/`
        },
        ATTENDEES: {
            list: '/attendees/',
            detail: (id) => `/attendees/${id}/`,
            eventAttendees: (eventId) => `/attendees/event/${eventId}/`,
            export: '/attendees/export/',
            search: '/attendees/search/',
            stats: '/attendees/stats/',
            sendMessage: (id) => `/attendees/${id}/send-message/`,
            bulkMessage: '/attendees/bulk-message/'
        },
        PAYOUTS: {
            summary: '/payouts/summary/',
            history: '/payouts/history/',
            upcoming: '/payouts/upcoming/',
            request: '/payouts/request/',
            detail: (id) => `/payouts/${id}/`,
            settings: '/payouts/settings/',
            updateSettings: '/payouts/settings/update/',
            statements: '/payouts/statements/',
            downloadStatement: (id) => `/payouts/statements/${id}/download/`
        },
        PROMOTIONS: {
            list: '/promotions/',
            detail: (id) => `/promotions/${id}/`,
            create: '/promotions/create/',
            update: (id) => `/promotions/${id}/update/`,
            delete: (id) => `/promotions/${id}/delete/`,
            activate: (id) => `/promotions/${id}/activate/`,
            deactivate: (id) => `/promotions/${id}/deactivate/`,
            stats: (id) => `/promotions/${id}/stats/`,
            validate: '/promotions/validate/'
        },
        REVIEWS: {
            list: '/reviews/',
            eventReviews: (eventId) => `/reviews/event/${eventId}/`,
            detail: (id) => `/reviews/${id}/`,
            respond: (id) => `/reviews/${id}/respond/`,
            stats: '/reviews/stats/',
            export: '/reviews/export/'
        },
        NOTIFICATIONS: {
            list: '/notifications/',
            unread: '/notifications/unread/',
            read: (id) => `/notifications/${id}/read/`,
            markAllRead: '/notifications/mark-all-read/',
            preferences: '/notifications/preferences/',
            updatePreferences: '/notifications/preferences/update/',
            sendToAttendees: '/notifications/send-to-attendees/'
        },
        REPORTS: {
            sales: '/reports/sales/',
            events: '/reports/events/',
            attendees: '/reports/attendees/',
            revenue: '/reports/revenue/',
            export: (type) => `/reports/${type}/export/`,
            dashboard: '/reports/dashboard/',
            performance: '/reports/performance/'
        },
        CHECKIN: {
            devices: '/checkin/devices/',
            registerDevice: '/checkin/devices/register/',
            deviceDetail: (id) => `/checkin/devices/${id}/`,
            revokeDevice: (id) => `/checkin/devices/${id}/revoke/`,
            sessions: '/checkin/sessions/',
            activeSession: '/checkin/sessions/active/',
            createSession: '/checkin/sessions/create/',
            closeSession: (id) => `/checkin/sessions/${id}/close/`,
            stats: '/checkin/stats/',
            realtime: '/checkin/realtime/'
        },
        PAYMENT_ORDERS: {
            pending: '/payment-orders/pending/',
            approve: (id) => `/payment-orders/${id}/approve/`,
            reject: (id) => `/payment-orders/${id}/reject/`,
            screenshot: (id) => `/payment-orders/${id}/screenshot/`,
        },
        SETTINGS: {
            general: '/settings/general/',
            updateGeneral: '/settings/general/update/',
            mpesa: '/settings/mpesa/',
            updateMpesa: '/settings/mpesa/update/',
            payment: '/settings/payment/',
            updatePayment: '/settings/payment/update/',
            notification: '/settings/notification/',
            updateNotification: '/settings/notification/update/',
            team: '/settings/team/',
            addTeamMember: '/settings/team/add/',
            updateTeamMember: (id) => `/settings/team/${id}/update/`,
            removeTeamMember: (id) => `/settings/team/${id}/remove/`,
            apiKeys: '/settings/api-keys/',
            createApiKey: '/settings/api-keys/create/',
            revokeApiKey: (id) => `/settings/api-keys/${id}/revoke/`
        },
        SUPPORT: {
            tickets: '/support/tickets/',
            create: '/support/tickets/create/',
            detail: (id) => `/support/tickets/${id}/`,
            reply: (id) => `/support/tickets/${id}/reply/`,
            close: (id) => `/support/tickets/${id}/close/`,
            faq: '/support/faq/',
            guides: '/support/guides/'
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ORGANIZER_API_CONFIG;
}

// Make available globally
window.ORGANIZER_API_CONFIG = ORGANIZER_API_CONFIG;

console.log('✅ Organizer API Configuration loaded');