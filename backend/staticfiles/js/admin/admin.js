/* ============================================
   ADMIN CORE JAVASCRIPT
   EventHub Admin Portal - Core Functionality
   ============================================ */

// Global API Request Function
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

// Get CSRF Token from Cookie
function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm Dialog
function showConfirm(message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 400px; max-width: 90%;">
            <div style="padding: 20px 20px 0; display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-question-circle" style="font-size: 24px; color: #f59e0b;"></i>
                <h3 style="margin: 0;">Confirm Action</h3>
            </div>
            <div style="padding: 20px;">
                <p>${message}</p>
            </div>
            <div style="padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn-danger" id="confirmOk">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirmOk').onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };
    document.getElementById('confirmCancel').onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
    };
}

// Format Currency (KES)
function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Status Badge Generator
function getStatusBadge(status) {
    const badges = {
        'published': '<span class="status-badge status-published"><i class="fas fa-check-circle"></i> Published</span>',
        'draft': '<span class="status-badge status-draft"><i class="fas fa-edit"></i> Draft</span>',
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        'cancelled': '<span class="status-badge status-cancelled"><i class="fas fa-times-circle"></i> Cancelled</span>',
        'confirmed': '<span class="status-badge status-confirmed"><i class="fas fa-check-circle"></i> Confirmed</span>',
        'completed': '<span class="status-badge status-completed"><i class="fas fa-check-double"></i> Completed</span>',
        'refunded': '<span class="status-badge status-refunded"><i class="fas fa-undo-alt"></i> Refunded</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

// Loader Global Functions
window.Loader = {
    show: function(message = 'Loading...') {
        // Remove existing loader
        this.hide();
        
        const overlay = document.createElement('div');
        overlay.id = 'globalLoader';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: all 0.3s ease;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = 'text-align: center;';
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            margin: 0 auto 16px;
            border: 3px solid rgba(245, 158, 11, 0.15);
            border-top-color: #f59e0b;
            border-right-color: #f59e0b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        `;
        
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'color: #f59e0b; font-size: 14px; font-weight: 500;';
        
        container.appendChild(spinner);
        container.appendChild(msg);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // Add animation if not present
        if (!document.getElementById('loaderAnimations')) {
            const style = document.createElement('style');
            style.id = 'loaderAnimations';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    },
    
    hide: function() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 200);
        }
    }
};

// Sidebar Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close on window resize (desktop)
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Dropdown toggles
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const parent = this.closest('.nav-dropdown');
            parent.classList.toggle('open');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown.open').forEach(function(d) {
                d.classList.remove('open');
            });
        }
    });
    
    // Highlight active page
    const currentUrl = window.location.pathname;
    document.querySelectorAll('.dropdown-item, .nav-item').forEach(function(link) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && currentUrl.includes(href)) {
            link.classList.add('active');
            const parent = link.closest('.nav-dropdown');
            if (parent) parent.classList.add('open');
        }
    });
    
    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-item, .dropdown-item').forEach(function(link) {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    if (sidebar) sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }, 150);
            }
        });
    });
});

// Export global functions
window.apiRequest = apiRequest;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;
window.getStatusBadge = getStatusBadge;

console.log('✅ Admin core JS loaded');
