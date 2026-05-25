// ============================================
// SHARED HELPER FUNCTIONS - All Portals
// Handles: Common utilities, formatting, validation, DOM helpers
// ============================================

// ============================================
// DATE & TIME HELPERS
// ============================================

function formatDate(date, format = 'short') {
    const d = new Date(date);
    if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (format === 'long') return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (format === 'time') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString();
}

function formatDateTime(date) {
    return `${formatDate(date, 'short')} at ${formatDate(date, 'time')}`;
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = new Date(date) - now;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 0) return 'Expired';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return formatDate(date);
}

function getTimeRemaining(endDate) {
    const total = Date.parse(endDate) - Date.parse(new Date());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    
    if (total <= 0) return { expired: true, total: 0 };
    return { days, hours, minutes, seconds, total, expired: false };
}

// ============================================
// CURRENCY HELPERS
// ============================================

function formatCurrency(amount, currency = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

function formatDiscount(amount, type) {
    if (type === 'percentage') return `${amount}% OFF`;
    return `KES ${amount.toLocaleString()} OFF`;
}

// ============================================
// STRING HELPERS
// ============================================

function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateRandomCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9+\-\s()]{10,15}$/;
    return re.test(phone);
}

function validatePassword(password) {
    return { 
        isValid: password.length >= 8,
        strength: getPasswordStrength(password)
    };
}

function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

// ============================================
// URL HELPERS
// ============================================

function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function updateUrlParameter(param, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

function removeUrlParameter(param) {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

// ============================================
// DOM HELPERS
// ============================================

function showElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'block';
}

function hideElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}

function toggleElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addClass(elementId, className) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add(className);
}

function removeClass(elementId, className) {
    const el = document.getElementById(elementId);
    if (el) el.classList.remove(className);
}

function setLoading(elementId, isLoading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isLoading) {
        el.classList.add('loading');
        el.disabled = true;
        el.dataset.originalText = el.innerHTML;
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        el.classList.remove('loading');
        el.disabled = false;
        if (el.dataset.originalText) el.innerHTML = el.dataset.originalText;
    }
}

// ============================================
// STORAGE HELPERS
// ============================================

const storage = {
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    get: (key, defaultValue = null) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    },
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear()
};

// ============================================
// EVENT HANDLING HELPERS
// ============================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// FORM HELPERS
// ============================================

function serializeForm(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    for (let [key, value] of formData.entries()) data[key] = value;
    return data;
}

function clearForm(formElement) {
    if (!formElement) return;
    const inputs = formElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type !== 'submit' && input.type !== 'button') {
            input.value = '';
            if (input.classList.contains('error')) input.classList.remove('error');
        }
    });
}

function showFormError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add('error');
    let errorSpan = input.parentElement.querySelector('.error-message');
    if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'error-message';
        input.parentElement.appendChild(errorSpan);
    }
    errorSpan.innerText = message;
}

function clearFormErrors(formElement) {
    const errors = formElement.querySelectorAll('.error-message');
    errors.forEach(error => error.remove());
    const inputs = formElement.querySelectorAll('.error');
    inputs.forEach(input => input.classList.remove('error'));
}

// ============================================
// PAGINATION HELPERS
// ============================================

function generatePagination(currentPage, totalPages, onPageChange) {
    const container = document.createElement('div');
    container.className = 'pagination';
    
    const createButton = (page, text, isActive = false) => {
        const btn = document.createElement('button');
        btn.innerText = text || page;
        if (isActive) btn.classList.add('active');
        btn.onclick = () => onPageChange(page);
        return btn;
    };
    
    if (currentPage > 1) container.appendChild(createButton(currentPage - 1, 'Prev'));
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            container.appendChild(createButton(i, null, i === currentPage));
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const dots = document.createElement('span');
            dots.innerText = '...';
            container.appendChild(dots);
        }
    }
    
    if (currentPage < totalPages) container.appendChild(createButton(currentPage + 1, 'Next'));
    
    return container;
}

// ============================================
// BROWSER HELPERS
// ============================================

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
}

function openInNewTab(url) {
    window.open(url, '_blank');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// MEDIA HELPERS
// ============================================

function getImageUrl(path, size = 'medium') {
    if (!path) return '/static/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    const sizes = { small: 'w300', medium: 'w600', large: 'w1200' };
    return `${path}${sizes[size] ? `?size=${sizes[size]}` : ''}`;
}

// Export for global use
window.helpers = {
    formatDate, formatDateTime, formatRelativeTime, getTimeRemaining,
    formatCurrency, formatDiscount,
    truncateText, slugify, capitalizeFirst, generateRandomCode,
    validateEmail, validatePhone, validatePassword, getPasswordStrength,
    getUrlParameter, updateUrlParameter, removeUrlParameter,
    showElement, hideElement, toggleElement, addClass, removeClass, setLoading,
    storage,
    debounce, throttle,
    serializeForm, clearForm, showFormError, clearFormErrors,
    generatePagination,
    copyToClipboard, openInNewTab, scrollToTop, scrollToElement,
    getImageUrl
};
