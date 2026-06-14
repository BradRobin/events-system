// ============================================================
// GLOBAL UNIFIED ERROR HANDLER
// Gracefully intercepts and handles runtime errors, network
// issues, and unhandled promise rejections.
// ============================================================

class GlobalErrorHandler {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        // 1. Capture runtime errors (SyntaxErrors, ReferenceErrors, etc.)
        window.addEventListener('error', (event) => {
            // Ignore script-load issues that don't disrupt app execution
            if (event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                return;
            }
            this.handleError(event.error || new Error(event.message));
        });

        // 2. Capture unhandled promise rejections (failed API requests without catch)
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });

        // 3. Capture network online/offline state changes
        window.addEventListener('online', () => {
            this.showToast('Your internet connection has been restored.', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are currently offline. Please check your network connection.', 'error');
        });
    }

    handleError(error) {
        console.error('[GlobalErrorHandler Error]:', error);
        
        let userMessage = 'An unexpected error occurred. Please refresh or try again.';
        if (error && error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                userMessage = 'Network connection lost. Please check your internet connection.';
            } else if (error instanceof TypeError) {
                userMessage = 'A display error occurred. Please reload the page.';
            } else {
                userMessage = error.message;
            }
        }
        
        this.showToast(userMessage, 'error');
    }

    handlePromiseRejection(reason) {
        console.error('[GlobalErrorHandler Promise Rejection]:', reason);
        
        let userMessage = 'Something went wrong. Please try again.';
        let type = 'error';

        if (reason) {
            const message = reason.message || String(reason);
            
            if (reason.status) {
                switch (reason.status) {
                    case 401:
                        userMessage = 'Your session has expired. Please login again.';
                        type = 'info';
                        this.handleSessionExpired();
                        return;
                    case 403:
                        userMessage = 'You do not have permission to perform this action.';
                        break;
                    case 404:
                        userMessage = 'The requested resource was not found.';
                        type = 'info';
                        break;
                    case 429:
                        userMessage = 'Too many requests. Please slow down and try again.';
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        userMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        userMessage = message;
                }
            } else if (message.includes('Failed to fetch') || message.includes('timeout') || message.includes('NetworkError')) {
                userMessage = 'Network connection failed. Please check your internet connection.';
            } else {
                userMessage = message;
            }
        }

        this.showToast(userMessage, type);
    }

    handleSessionExpired() {
        this.showToast('Session expired. Redirecting to login...', 'info');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 1500);
    }

    showToast(message, type = 'error') {
        // Suppress 404s from popping up as intrusive toasts
        if (message && (message.includes('404') || message.includes('not found') || message.toLowerCase().includes('resource not found'))) {
            return;
        }

        // Try using portal-specific toast system first
        if (window.showToast) {
            try {
                window.showToast(message, type);
                return;
            } catch (e) {
                // fall back
            }
        }

        // Standard custom fallback toast
        const toastId = 'global-error-toast';
        let toast = document.getElementById(toastId);
        if (toast) toast.remove();

        toast = document.createElement('div');
        toast.id = toastId;
        
        let themeColor = '#10b981'; // success
        let iconClass = 'fas fa-check-circle';
        if (type === 'error') {
            themeColor = '#ef4444';
            iconClass = 'fas fa-exclamation-circle';
        } else if (type === 'info' || type === 'primary') {
            themeColor = '#3b82f6';
            iconClass = 'fas fa-info-circle';
        }

        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(8px);
            color: white;
            padding: 14px 22px;
            border-radius: 12px;
            border-left: 4px solid ${themeColor};
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 999999;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 380px;
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        `;

        toast.innerHTML = `
            <i class="${iconClass}" style="color: ${themeColor}; font-size: 18px;"></i>
            <span style="flex: 1; line-height: 1.4;">${this.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 16px; padding: 0 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">&times;</button>
        `;

        if (!document.getElementById('global-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'global-toast-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 300);
            }
        }, 5000);
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.globalErrorHandler = new GlobalErrorHandler();
});

// Export
window.GlobalErrorHandler = GlobalErrorHandler;
console.log('✅ Global Error Handler initialized');