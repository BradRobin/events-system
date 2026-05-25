// ============================================
// ERROR HANDLER JAVASCRIPT
// Handles client-side errors gracefully
// ============================================

class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandlers();
    }
    
    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event);
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event);
        });
        
        // Handle network errors
        window.addEventListener('online', () => {
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionLost();
        });
    }
    
    handleJavaScriptError(event) {
        console.error('JavaScript Error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // Show user-friendly error message
        this.showUserFriendlyError('Something went wrong. Please refresh the page.');
        
        // Optional: Send error to server
        this.reportError({
            type: 'js_error',
            message: event.message,
            stack: event.error?.stack,
            url: window.location.href
        });
    }
    
    handlePromiseRejection(event) {
        console.error('Promise Rejection:', event.reason);
        
        if (event.reason?.status === 401) {
            // Session expired
            this.handleSessionExpired();
        } else if (event.reason?.status === 403) {
            // Permission denied
            this.showUserFriendlyError('You don\'t have permission to perform this action.');
        } else if (event.reason?.status === 404) {
            this.showUserFriendlyError('The requested resource was not found.');
        } else if (event.reason?.status === 429) {
            this.showUserFriendlyError('Too many requests. Please try again later.');
        } else if (event.reason?.status >= 500) {
            this.showUserFriendlyError('Server error. Please try again later.');
        } else if (event.reason?.message === 'Failed to fetch') {
            this.handleNetworkError();
        }
    }
    
    handleSessionExpired() {
        if (confirm('Your session has expired. Please login again to continue.')) {
            window.location.href = '/attendee/login/';
        }
    }
    
    handleNetworkError() {
        this.showUserFriendlyError('Network error. Please check your internet connection.');
        
        // Show retry button
        const retryContainer = document.createElement('div');
        retryContainer.className = 'network-error-toast';
        retryContainer.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-wifi"></i>
                <span>Connection lost. Trying to reconnect...</span>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        document.body.appendChild(retryContainer);
        
        setTimeout(() => {
            if (retryContainer.parentNode) {
                retryContainer.remove();
            }
        }, 10000);
    }
    
    handleConnectionLost() {
        this.showUserFriendlyError('You are offline. Please check your internet connection.');
    }
    
    handleConnectionRestored() {
        this.showUserFriendlyError('Connection restored!', 'success');
        location.reload();
    }
    
    showUserFriendlyError(message, type = 'error') {
        // Use existing toast system
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    async reportError(errorData) {
        try {
            await fetch('/api/attendee/error/report/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(errorData)
            });
        } catch (e) {
            console.error('Failed to report error:', e);
        }
    }
    
    getCSRFToken() {
        const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
        return cookieValue ? cookieValue[2] : null;
    }
    
    // API error handler for fetch requests
    async handleAPIResponse(response, fallbackMessage = 'An error occurred') {
        if (!response.ok) {
            let errorMessage = fallbackMessage;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorData.detail || fallbackMessage;
            } catch (e) {
                // If response is not JSON
                if (response.status === 404) {
                    errorMessage = 'Resource not found';
                } else if (response.status === 403) {
                    errorMessage = 'You do not have permission';
                } else if (response.status === 401) {
                    errorMessage = 'Please login to continue';
                    window.location.href = '/attendee/login/';
                } else if (response.status === 429) {
                    errorMessage = 'Too many requests. Please try again later.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
            }
            
            throw new Error(errorMessage);
        }
        
        return response;
    }
}

// Initialize error handler
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler = new ErrorHandler();
});

// Export for use
window.ErrorHandler = ErrorHandler;
console.log('✅ Error Handler loaded');