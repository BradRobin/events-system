// ============================================
// ATTENDEE API SERVICE
// Handles all API requests for attendee portal
// ============================================

class AttendeeAPIService {
    constructor(config) {
        this.config = config;
        this.pendingRequests = new Map();
        this.cache = new Map();
        this.accessToken = localStorage.getItem('attendee_access_token');
        this.refreshToken = localStorage.getItem('attendee_refresh_token');
    }
    
    // Get CSRF Token from cookies
    getCSRFToken() {
        const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
        return cookieValue ? cookieValue[2] : null;
    }
    
    // Set tokens after login
    setTokens(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('attendee_access_token', access);
        localStorage.setItem('attendee_refresh_token', refresh);
    }
    
    // Clear tokens on logout
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('attendee_access_token');
        localStorage.removeItem('attendee_refresh_token');
    }
    
    // Build full URL
    buildUrl(endpoint, params = {}) {
        let url = `${this.config.API_BASE}${endpoint}`;
        
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        });
        
        const queryString = queryParams.toString();
        if (queryString) url += `?${queryString}`;
        
        return url;
    }
    
    // Generate request key
    getRequestKey(method, url, params, data) {
        return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
    }
    
    // Cancel pending request
    cancelRequest(key) {
        if (this.pendingRequests.has(key)) {
            this.pendingRequests.get(key).abort();
            this.pendingRequests.delete(key);
        }
    }
    
    // Get from cache
    getFromCache(key, ttl = this.config.CACHE_TTL) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < ttl) {
            return cached.data;
        }
        return null;
    }
    
    // Set cache
    setCache(key, data) {
        this.cache.set(key, {
            data: JSON.parse(JSON.stringify(data)),
            timestamp: Date.now()
        });
    }
    
    // Clear cache
    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) this.cache.delete(key);
            }
        } else {
            this.cache.clear();
        }
    }
    
    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) return null;
        
        try {
            const response = await fetch(`${this.config.API_BASE}${this.config.ENDPOINTS.AUTH.refreshToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.access, data.refresh);
                return data.access;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        return null;
    }
    
    // Main request method
    async request(method, endpoint, data = null, options = {}) {
        const {
            params = {},
            headers = {},
            useCache = false,
            cacheTTL = this.config.CACHE_TTL,
            timeout = this.config.TIMEOUT,
            requiresAuth = true
        } = options;
        
        const url = this.buildUrl(endpoint, params);
        const requestKey = this.getRequestKey(method, url, params, data);
        
        // Check cache for GET requests
        if (method === 'GET' && useCache) {
            const cachedData = this.getFromCache(requestKey, cacheTTL);
            if (cachedData) return cachedData;
        }
        
        // Cancel existing request
        this.cancelRequest(requestKey);
        
        // Create abort controller
        const controller = new AbortController();
        this.pendingRequests.set(requestKey, controller);
        
        // Setup timeout
        const timeoutId = setTimeout(() => {
            controller.abort();
            this.pendingRequests.delete(requestKey);
        }, timeout);
        
        // Prepare headers
        const requestHeaders = {
            ...this.config.HEADERS,
            ...headers
        };
        
        // Add CSRF token for non-GET requests
        if (method !== 'GET') {
            requestHeaders['X-CSRFToken'] = this.getCSRFToken();
        }
        
        // Add Authorization header if authenticated
        if (requiresAuth && this.accessToken) {
            requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        // Prepare body
        let body = null;
        if (data) {
            if (data instanceof FormData) {
                body = data;
                delete requestHeaders['Content-Type'];
            } else {
                body = JSON.stringify(data);
            }
        }
        
        try {
            let response = await fetch(url, {
                method,
                headers: requestHeaders,
                body,
                signal: controller.signal
            });
            
            // Handle token expiration
            if (response.status === 401 && requiresAuth) {
                const newToken = await this.refreshAccessToken();
                if (newToken) {
                    requestHeaders['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(url, {
                        method,
                        headers: requestHeaders,
                        body,
                        signal: controller.signal
                    });
                } else {
                    window.location.href = '/attendee/login/';
                    throw new Error('Session expired');
                }
            }
            
            clearTimeout(timeoutId);
            this.pendingRequests.delete(requestKey);
            
            if (!response.ok) {
                const error = await this.handleErrorResponse(response);
                throw error;
            }
            
            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else if (contentType && contentType.includes('application/pdf')) {
                result = await response.blob();
            } else {
                result = await response.text();
            }
            
            if (method === 'GET' && useCache && result) {
                this.setCache(requestKey, result);
            }
            
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            this.pendingRequests.delete(requestKey);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    // Handle error responses
    async handleErrorResponse(response) {
        let errorMessage = 'An error occurred';
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
        } catch (e) {
            errorMessage = response.statusText || errorMessage;
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        
        switch (response.status) {
            case 400:
                error.message = errorMessage || 'Invalid request';
                break;
            case 401:
                error.message = 'Please login to continue';
                break;
            case 403:
                error.message = 'You do not have permission to perform this action';
                break;
            case 404:
                error.message = 'Resource not found';
                break;
            case 409:
                error.message = 'Conflict with existing data';
                break;
            case 429:
                error.message = 'Too many requests. Please try again later';
                break;
            case 500:
                error.message = 'Server error. Please try again later';
                break;
        }
        
        return error;
    }
    
    // Convenience methods
    get(endpoint, options = {}) { return this.request('GET', endpoint, null, options); }
    post(endpoint, data, options = {}) { return this.request('POST', endpoint, data, options); }
    put(endpoint, data, options = {}) { return this.request('PUT', endpoint, data, options); }
    patch(endpoint, data, options = {}) { return this.request('PATCH', endpoint, data, options); }
    delete(endpoint, options = {}) { return this.request('DELETE', endpoint, null, options); }
}

// Create global instance
window.AttendeeAPI = null;

// Initialize when config is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.ATTENDEE_API_CONFIG) {
        window.AttendeeAPI = new AttendeeAPIService(window.ATTENDEE_API_CONFIG);
        console.log('✅ Attendee API Service initialized');
    }
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AttendeeAPIService };
}