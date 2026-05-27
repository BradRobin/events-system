
// Events Module - Ready for Django API Integration
const EventsModule = (function() {
    // API endpoints (to be replaced with actual Django URLs)
    const API = {
        events: '/api/attendee/events/',
        categories: '/api/attendee/categories/',
        wishlist: '/api/attendee/wishlist/',
        cart: '/api/attendee/cart/'
    };
    
    // State
    let currentEvents = [];
    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = {
        category: '',
        search: '',
        sort: 'date'
    };
    
    const eventsPerPage = 6;
    
    // DOM Elements
    let eventsGrid, paginationDiv, categoryFilter, sortFilter, searchInput;
    
    // Initialize
    function init() {
        eventsGrid = document.getElementById('eventsGrid');
        paginationDiv = document.getElementById('pagination');
        categoryFilter = document.getElementById('categoryFilter');
        sortFilter = document.getElementById('sortFilter');
        searchInput = document.getElementById('searchInput');
        
        if (!eventsGrid) return;
        
        loadCategories();
        loadEvents();
        attachEventListeners();
    }
    
    // Load categories from API
    async function loadCategories() {
        try {
            const response = await fetch(API.categories);
            const data = await response.json();
            
            if (data.categories && categoryFilter) {
                data.categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categoryFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    // Load events from API
    async function loadEvents() {
        showLoading();
        
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: eventsPerPage,
                category: currentFilters.category,
                search: currentFilters.search,
                ordering: currentFilters.sort
            });
            
            const response = await fetch(`${API.events}?${params}`);
            const data = await response.json();
            
            currentEvents = data.results || [];
            totalPages = Math.ceil(data.count / eventsPerPage) || 1;
            
            renderEvents();
            renderPagination();
        } catch (error) {
            console.error('Error loading events:', error);
            showError('Failed to load events. Please try again.');
        }
    }
    
    // Render events grid
    function renderEvents() {
        if (!eventsGrid) return;
        
        if (currentEvents.length === 0) {
            eventsGrid.innerHTML = '<div class="empty-state">No events found</div>';
            return;
        }
        
        eventsGrid.innerHTML = currentEvents.map(event => `
            <div class="premium-card" data-event-id="${event.id}">
                <div class="card-image-container">
                    <img src="${event.image || '/static/images/placeholder.jpg'}" alt="${event.title}" class="card-bg-image" loading="lazy">
                    <div class="card-gradient-overlay"></div>
                    ${event.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                    <button class="wishlist-btn ${event.in_wishlist ? 'active' : ''}" data-event-id="${event.id}">
                        <i class="${event.in_wishlist ? 'fas' : 'far'} fa-heart"></i>
                        <span>${event.in_wishlist ? 'Saved' : 'Save'}</span>
                    </button>
                </div>
                <div class="card-content" data-event-id="${event.id}">
                    <span class="card-category">${event.category_name || event.category}</span>
                    <h3 class="card-title">${event.title}</h3>
                    <div class="card-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(event.date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                    </div>
                    <div class="card-price">
                        KES ${formatPrice(event.price)}
                        ${event.original_price ? `<span class="original-price">KES ${formatPrice(event.original_price)}</span>` : ''}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn view-details-btn" data-event-id="${event.id}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="card-action-btn add-to-cart-btn" data-event-id="${event.id}">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        `).join('');
        
        // Attach event listeners to dynamically created buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                window.location.href = `/events/detail/?id=${eventId}`;
            });
        });
        
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                await addToCart(eventId);
            });
        });
        
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                await toggleWishlist(eventId, btn);
            });
        });
        
        document.querySelectorAll('.card-content').forEach(card => {
            card.addEventListener('click', () => {
                const eventId = card.dataset.eventId;
                window.location.href = `/events/detail/?id=${eventId}`;
            });
        });
    }
    
    // Add to cart
    async function addToCart(eventId) {
        const token = localStorage.getItem('attendee_access_token');
        
        if (!token) {
            showToast('Please login to add to cart', 'info');
            setTimeout(() => {
                localStorage.setItem('redirect_after_login', '/cart/');
                window.location.href = '/login/';
            }, 1500);
            return;
        }
        
        try {
            const response = await fetch(API.cart, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ event_id: eventId, quantity: 1 })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Added to cart!', 'success');
                updateCartBadge(data.cart_count);
            } else {
                showToast(data.message || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Failed to add to cart', 'error');
        }
    }
    
    // Toggle wishlist
    async function toggleWishlist(eventId, btnElement) {
        const token = localStorage.getItem('attendee_access_token');
        
        if (!token) {
            showToast('Please login to save to wishlist', 'info');
            setTimeout(() => {
                window.location.href = '/login/';
            }, 1500);
            return;
        }
        
        try {
            const response = await fetch(`${API.wishlist}${eventId}/toggle/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const isActive = data.in_wishlist;
                btnElement.classList.toggle('active', isActive);
                btnElement.innerHTML = `<i class="${isActive ? 'fas' : 'far'} fa-heart"></i><span>${isActive ? 'Saved' : 'Save'}</span>`;
                showToast(isActive ? 'Added to wishlist!' : 'Removed from wishlist', 'success');
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
        }
    }
    
    // Render pagination
    function renderPagination() {
        if (!paginationDiv) return;
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-wrapper">';
        html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Previous</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span class="page-dots">...</span>';
            }
        }
        
        html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;
        html += '</div>';
        
        paginationDiv.innerHTML = html;
        
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page && page !== currentPage && page >= 1 && page <= totalPages) {
                    currentPage = page;
                    loadEvents();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
    
    // Attach event listeners
    function attachEventListeners() {
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                currentFilters.category = categoryFilter.value;
                currentPage = 1;
                loadEvents();
            });
        }
        
        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                currentFilters.sort = sortFilter.value;
                currentPage = 1;
                loadEvents();
            });
        }
        
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    currentFilters.search = searchInput.value;
                    currentPage = 1;
                    loadEvents();
                }, 500);
            });
        }
    }
    
    // Helper functions
    function formatDate(dateString) {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    function formatPrice(price) {
        return price ? price.toLocaleString() : '0';
    }
    
    function showLoading() {
        if (eventsGrid) {
            eventsGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading events...</p></div>';
        }
    }
    
    function showError(message) {
        if (eventsGrid) {
            eventsGrid.innerHTML = `<div class="empty-state">${message}</div>`;
        }
    }
    
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    function updateCartBadge(count) {
        const badges = document.querySelectorAll('.cart-count, .cart-count-mobile');
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        });
    }
    
    // Public API
    return {
        init: init,
        refresh: loadEvents
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    EventsModule.init();
});
