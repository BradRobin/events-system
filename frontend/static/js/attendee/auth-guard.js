// ============================================
// AUTH GUARD - Protected Routes Handler
// ============================================

const AuthGuard = {
    // List of protected paths
    protectedPaths: [
        '/dashboard/',
        '/bookings/',
        '/bookings/detail/',
        '/tickets/',
        '/tickets/detail/',
        '/tickets/qr/',
        '/profile/',
        '/settings/',
        '/cart/',
        '/wishlist/',
        '/checkout/',
        '/notifications/'
    ],
    
    // Check if current path is protected
    isProtectedPath: function(path) {
        // Remove query parameters
        let cleanPath = path.split('?')[0];
        
        // Normalize /attendee prefix
        if (cleanPath.startsWith('/attendee')) {
            cleanPath = cleanPath.substring(9);
            if (!cleanPath.startsWith('/')) {
                cleanPath = '/' + cleanPath;
            }
        }
        
        // Check exact match or starts with protected path
        return this.protectedPaths.some(protectedPath => 
            cleanPath === protectedPath || 
            cleanPath.startsWith(protectedPath)
        );
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        const token = localStorage.getItem('attendee_access_token');
        const user = localStorage.getItem('attendee_user');
        const expiry = localStorage.getItem('attendee_token_expiry');
        
        if (!token || !user) {
            return false;
        }
        
        // Check expiry if exists
        if (expiry) {
            const now = new Date().getTime();
            if (now > parseInt(expiry)) {
                // Token expired, clear storage
                this.logout();
                return false;
            }
        }
        
        return true;
    },
    
    // Get current user
    getCurrentUser: function() {
        const userStr = localStorage.getItem('attendee_user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },
    
    // Get token
    getToken: function() {
        return localStorage.getItem('attendee_access_token');
    },
    
    // Logout
    logout: function(redirectTo = '/') {
        if (window.EventhubEventsPrefetch) {
            window.EventhubEventsPrefetch.invalidate();
        }
        localStorage.removeItem('attendee_access_token');
        localStorage.removeItem('attendee_refresh_token');
        localStorage.removeItem('attendee_user');
        localStorage.removeItem('attendee_token_expiry');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('auth-state-changed', { 
            detail: { isLoggedIn: false, user: null } 
        }));
        
        if (redirectTo) {
            window.location.href = redirectTo;
        }
    },
    
    // Require authentication for current page
    requireAuth: function(redirectUrl = null) {
        if (!this.isAuthenticated()) {
            // Save the current URL to redirect back after login
            const currentUrl = window.location.href;
            localStorage.setItem('redirect_after_login', redirectUrl || currentUrl);
            
            // Show message
            this.showToast('Please login to access this page', 'info');
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = '/login/';
            }, 500);
            
            return false;
        }
        return true;
    },
    
    // Redirect if already logged in (for login/register pages)
    redirectIfAuthenticated: function(redirectUrl = '/dashboard/') {
        if (this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return true;
        }
        return false;
    },
    
    // Show toast message
    showToast: function(message, type = 'success') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 12px;
            color: white;
            font-size: 0.85rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
    
    // Initialize auth guard on page load
    init: function() {
        const currentPath = window.location.pathname;
        
        // Check if current path is protected
        if (this.isProtectedPath(currentPath)) {
            this.requireAuth();
        }
        
        // Handle redirect after login
        const redirectUrl = localStorage.getItem('redirect_after_login');
        if (redirectUrl && this.isAuthenticated()) {
            localStorage.removeItem('redirect_after_login');
            if (window.location.pathname === '/login/' || window.location.pathname === '/register/') {
                window.location.href = redirectUrl;
            }
        }
        
        // Update UI based on auth state
        this.updateUI();

        // Warm events catalog in the background for logged-in attendees
        if (this.isAuthenticated() && window.EventhubEventsPrefetch) {
            window.EventhubEventsPrefetch.start();
        }
        
        // Listen for auth state changes
        window.addEventListener('auth-state-changed', () => {
            this.updateUI();
        });
    },
    
    // Update UI elements based on auth state
    updateUI: function() {
        const isLoggedIn = this.isAuthenticated();
        const user = this.getCurrentUser();
        
        // Update all auth-required elements
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = isLoggedIn ? 'block' : 'none';
        });
        
        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : 'block';
        });
        
        // Update user name displays
        if (isLoggedIn && user) {
            const displayName = window.AccountProfile
                ? AccountProfile.resolveDisplayName(user)
                : (user.full_name || user.name || user.first_name || user.username || 'User');
            document.querySelectorAll('.user-name-display').forEach(el => {
                el.textContent = displayName;
            });
            document.querySelectorAll('.user-initial-display').forEach(el => {
                el.textContent = displayName.charAt(0).toUpperCase();
            });
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    AuthGuard.init();
});

// Make global
window.AuthGuard = AuthGuard;
