// EVENTS MODULE - Live API Integration (Optimized with Infinite Scroll)
// FIXED: Unified wishlist with API, fixed auth issues
console.log('Events.js loaded');

let currentCategory = "all";
let currentSearch = "";
let filteredEvents = [];
let eventsCatalog = [];
let debounceTimer = null;
let isLoadingMore = false;
let currentOffset = 0;
const PAGE_SIZE = 12;
let hasMoreEvents = true;
let observer = null;

// API endpoints
const API = {
    events: '/api/attendee/events/',
    categories: '/api/attendee/categories/',
    wishlist: '/api/attendee/wishlist/',
};

// Cache for categories
let cachedCategories = null;
let currentUserWishlist = new Set();

// DOM cache
const domCache = {
    grid: null,
    stats: null,
    get gridElement() {
        if (!this.grid) this.grid = document.getElementById('eventsGrid');
        return this.grid;
    },
    get statsElement() {
        if (!this.stats) this.stats = document.getElementById('searchStats');
        return this.stats;
    }
};

// Helper: Get auth token
function getAuthToken() {
    return localStorage.getItem('attendee_access_token') || localStorage.getItem('access_token');
}

// Helper: Check if user is authenticated
function isAuthenticated() {
    const token = getAuthToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        return Date.now() < exp;
    } catch(e) {
        return !!token;
    }
}

// Helper: Get current user
function getCurrentUser() {
    try {
        const user = localStorage.getItem('attendee_user');
        if (user && user !== 'undefined') {
            return JSON.parse(user);
        }
    } catch(e) {}
    return null;
}

// FIXED: Load wishlist from API (unified)
async function loadWishlistFromAPI() {
    const token = getAuthToken();
    if (!token) {
        currentUserWishlist.clear();
        return;
    }
    
    try {
        const response = await fetch(API.wishlist, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.wishlist) {
                currentUserWishlist.clear();
                data.wishlist.forEach(item => {
                    currentUserWishlist.add(item.event_id || item.id);
                });
                // Also update localStorage for compatibility
                localStorage.setItem('event_wishlist', JSON.stringify(Array.from(currentUserWishlist)));
                return;
            }
        }
    } catch (error) {
        console.error('Error loading wishlist from API:', error);
    }
    
    // Fallback to localStorage
    const localWishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
    currentUserWishlist = new Set(localWishlist);
}

// FIXED: Toggle wishlist with API
async function toggleWishlistAPI(eventId) {
    const token = getAuthToken();
    if (!token) {
        showToast('🔐 Please login to save to wishlist', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return false;
    }
    
    const isInWishlist = currentUserWishlist.has(eventId);
    
    try {
        if (!isInWishlist) {
            // Add to wishlist
            const response = await fetch(API.wishlist, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id: eventId })
            });
            
            if (response.ok) {
                currentUserWishlist.add(eventId);
                localStorage.setItem('event_wishlist', JSON.stringify(Array.from(currentUserWishlist)));
                showToast('❤️ Added to wishlist!', 'success');
                return true;
            } else {
                const data = await response.json();
                if (data.message === 'already in wishlist') {
                    currentUserWishlist.add(eventId);
                    showToast('Already in wishlist', 'info');
                    return true;
                }
                throw new Error(data.message || 'Failed to add to wishlist');
            }
        } else {
            // Remove from wishlist
            const response = await fetch(`${API.wishlist}${eventId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                currentUserWishlist.delete(eventId);
                localStorage.setItem('event_wishlist', JSON.stringify(Array.from(currentUserWishlist)));
                showToast('🗑️ Removed from wishlist', 'info');
                return false;
            } else {
                throw new Error('Failed to remove from wishlist');
            }
        }
    } catch (error) {
        console.error('Wishlist API error:', error);
        // Fallback to localStorage only
        if (!isInWishlist) {
            currentUserWishlist.add(eventId);
            showToast('❤️ Added to wishlist (offline)', 'success');
        } else {
            currentUserWishlist.delete(eventId);
            showToast('🗑️ Removed from wishlist', 'info');
        }
        localStorage.setItem('event_wishlist', JSON.stringify(Array.from(currentUserWishlist)));
        return !isInWishlist;
    }
}

function showToast(message, type) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showSkeletonCards(count = 6) {
    const grid = domCache.gridElement;
    if (!grid) return;
    
    grid.innerHTML = Array(count).fill(`
        <div class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
            <div class="skeleton-actions">
                <div class="skeleton-btn"></div>
                <div class="skeleton-btn"></div>
            </div>
        </div>
    `).join('');
}

function hideSkeletonCards() {
    const skeletons = document.querySelectorAll('.skeleton-card');
    skeletons.forEach(skeleton => skeleton.remove());
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getEventImageUrl(event) {
    return (event.image || event.banner_image || '').trim();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadEventsFromAPI(reset = true) {
    if (reset) {
        currentOffset = 0;
        eventsCatalog = [];
        hasMoreEvents = true;
    }
    
    if (!hasMoreEvents && !reset) return false;
    
    try {
        const params = new URLSearchParams();
        params.set('offset', currentOffset);
        params.set('limit', PAGE_SIZE);

        if (currentCategory !== 'all') {
            params.set('category', currentCategory);
        }

        if (currentSearch) {
            params.set('search', currentSearch);
        }

        const url = API.events + (params.toString() ? '?' + params.toString() : '');
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            if (reset) {
                eventsCatalog = data.events || [];
            } else {
                eventsCatalog.push(...(data.events || []));
            }
            currentOffset += data.events?.length || 0;
            hasMoreEvents = (data.events?.length || 0) === PAGE_SIZE;
            return true;
        } else {
            console.error('Failed to load events:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Error loading events:', error);
        return false;
    }
}

async function loadCategoriesFromAPI() {
    if (cachedCategories) {
        return cachedCategories;
    }
    
    try {
        const response = await fetch(API.categories);
        const data = await response.json();
        
        if (data.success && data.categories) {
            cachedCategories = data.categories;
            return cachedCategories;
        }
        return [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

async function addFilters(categoriesData = null) {
    const container = document.querySelector('.events-page .container');
    if (!container) return;
    
    const header = container.querySelector('.events-header');
    if (!header) return;
    
    if (!categoriesData) {
        categoriesData = await loadCategoriesFromAPI();
    }
    
    const categories = [
        { id: "all", name: "All Events", icon: "fa-calendar-alt" },
        ...categoriesData.map(cat => ({
            id: cat.slug || cat.id,
            name: cat.name,
            icon: cat.icon || "fa-tag"
        }))
    ];
    
    const wrapper = document.getElementById('categoriesWrapper') || document.querySelector('.categories-wrapper');
    if (wrapper) {
        let categoriesHtml = '';
        categories.forEach(cat => {
            categoriesHtml += `<button class="category-btn ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}"><i class="fas ${cat.icon}"></i><span>${cat.name}</span></button>`;
        });
        wrapper.innerHTML = categoriesHtml;
        
        wrapper.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.dataset.category;
                wrapper.querySelectorAll('.category-btn').forEach(b => b.classList.toggle('active', b.dataset.category === currentCategory));
                resetAndReload();
            });
        });
    }
    
    setupPageSearchListener();
}

function setupPageSearchListener() {
    const pageSearchInput = document.getElementById('searchInput');
    if (pageSearchInput) {
        pageSearchInput.removeEventListener('input', handleSearchInput);
        pageSearchInput.addEventListener('input', handleSearchInput);
    }
}

function handleSearchInput(e) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentSearch = e.target.value.toLowerCase().trim();
        resetAndReload();
    }, 300);
}

async function resetAndReload() {
    if (observer) observer.disconnect();
    showSkeletonCards(6);
    await loadWishlistFromAPI();
    await loadEventsFromAPI(true);
    setupInfiniteScroll();
    await filterAndDisplay();
}

async function loadMoreEvents() {
    if (isLoadingMore || !hasMoreEvents) return;
    isLoadingMore = true;
    
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
        const loadingMore = sentinel.querySelector('.loading-more');
        if (loadingMore) loadingMore.style.display = 'block';
    }
    
    await loadEventsFromAPI(false);
    await filterAndDisplay(false);
    
    if (sentinel) {
        const loadingMore = sentinel.querySelector('.loading-more');
        if (loadingMore) loadingMore.style.display = 'none';
    }
    isLoadingMore = false;
}

async function filterAndDisplay(updateStats = true) {
    filteredEvents = [...eventsCatalog];
    
    if (updateStats) {
        const stats = domCache.statsElement;
        if (stats) {
            if (currentSearch) {
                stats.innerHTML = `🔍 Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} for "${currentSearch}"`;
            } else if (currentCategory !== 'all') {
                const categoryName = document.querySelector(`.category-btn[data-category="${currentCategory}"] span`)?.textContent || currentCategory;
                stats.innerHTML = `📂 ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} in ${categoryName}`;
            } else {
                stats.innerHTML = `✨ ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} available`;
            }
        }
    }
    
    renderEvents();
}

function renderEvents() {
    const grid = domCache.gridElement;
    if (!grid) return;
    
    hideSkeletonCards();
    
    if (filteredEvents.length === 0) { 
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Events Available</h3>
                <p>We don't have any events matching your criteria right now.</p>
                <button onclick="resetFilters()" class="btn-browse">
                    <i class="fas fa-redo"></i> Reset Filters
                </button>
            </div>
        `; 
        return; 
    }
    
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    filteredEvents.forEach(e => {
        const inWishlist = currentUserWishlist.has(e.id);
        const imageUrl = getEventImageUrl(e);
        const imageBlock = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" class="card-bg-image" alt="${escapeHtml(e.title)}" loading="lazy" decoding="async" onerror="this.src='/static/images/placeholder.jpg'">`
            : `<div class="card-image-fallback" aria-hidden="true"><i class="fas fa-calendar-alt"></i></div>`;
        
        tempDiv.innerHTML = `
            <div class="event-card premium-card">
                <div class="card-image-container">
                    ${imageBlock}
                    <div class="card-image-skeleton is-hidden" aria-hidden="true"></div>
                    ${e.featured || e.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                    <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-id="${e.id}">
                        <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove' : 'Wishlist'}
                    </button>
                </div>
                <div class="card-content" onclick="window.location.href='/events/detail/?id=${e.id}'">
                    <span class="card-category">${escapeHtml(e.category_name || 'Event')}</span>
                    <h3 class="card-title">${escapeHtml(e.title)}</h3>
                    <div class="card-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(e.date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${e.location ? e.location.split(',')[0] : 'TBD'}</span>
                    </div>
                    <div class="card-price">KES ${(e.price || 0).toLocaleString()}</div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn view-details-btn" onclick="event.stopPropagation();window.location.href='/events/detail/?id=${e.id}'">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="card-action-btn book-ticket-btn" data-id="${e.id}" data-title="${escapeHtml(e.title)}" data-price="${e.price}">
                        <i class="fas fa-ticket-alt"></i> Book Ticket
                    </button>
                </div>
            </div>
        `;
        fragment.appendChild(tempDiv.firstElementChild);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    // Attach event listeners
    document.querySelectorAll('.book-ticket-btn').forEach(btn => {
        btn.removeEventListener('click', handleBookClick);
        btn.addEventListener('click', handleBookClick);
    });
    
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleWishlistClick);
        btn.addEventListener('click', handleWishlistClick);
    });
}

function setupInfiniteScroll() {
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.height = '20px';
    sentinel.style.margin = '10px 0';
    sentinel.style.textAlign = 'center';
    sentinel.innerHTML = '<div class="loading-more" style="display:none;">Loading more events...</div>';
    
    const existingSentinel = document.getElementById('scroll-sentinel');
    if (existingSentinel) existingSentinel.remove();
    
    const grid = domCache.gridElement;
    if (grid && grid.parentNode) {
        grid.parentNode.appendChild(sentinel);
    }
    
    if (observer) observer.disconnect();
    
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMoreEvents && filteredEvents.length > 0) {
            loadMoreEvents();
        }
    }, { threshold: 0.1 });
    
    observer.observe(sentinel);
}

async function handleWishlistClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    
    // Optimistic UI update
    const wasActive = btn.classList.contains('active');
    btn.classList.toggle('active');
    btn.innerHTML = btn.classList.contains('active') 
        ? '<i class="fas fa-heart"></i> Remove' 
        : '<i class="far fa-heart"></i> Wishlist';
    
    const result = await toggleWishlistAPI(eventId);
    
    // Revert if API call failed
    if ((result && wasActive) || (!result && !wasActive)) {
        btn.classList.toggle('active');
        btn.innerHTML = btn.classList.contains('active') 
            ? '<i class="fas fa-heart"></i> Remove' 
            : '<i class="far fa-heart"></i> Wishlist';
    }
    
    // Update badge
    updateWishlistBadge();
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadgeDropdown');
    if (badge) {
        const count = currentUserWishlist.size;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function handleBookClick(e) {
    e.stopPropagation();
    const id = parseInt(this.dataset.id);
    const title = this.dataset.title;
    const price = parseFloat(this.dataset.price);
    bookTicket(id, title, price);
}

function bookTicket(id, title, price) {
    const token = getAuthToken();
    if (!token) {
        showToast('🔐 Please login to book tickets', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }
    
    const event = eventsCatalog.find(e => e.id == id);
    if (!event) return;
    
    // Add to cart
    const cart = JSON.parse(localStorage.getItem('eventhub_cart') || '{"items":[]}');
    const existingItem = cart.items.find(i => i.id == id);
    
    if (existingItem) {
        window.location.href = '/cart/';
        return;
    }
    
    cart.items.push({
        id: event.id,
        title: event.title,
        category: event.category_name,
        date: event.date,
        location: event.location,
        price: event.price,
        quantity: 1,
        image: event.image
    });
    
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.total = cart.subtotal;
    
    localStorage.setItem('eventhub_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    window.location.href = '/cart/';
}

function resetFilters() {
    currentCategory = "all";
    currentSearch = "";
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
    });
    
    const pageSearchInput = document.getElementById('searchInput');
    if (pageSearchInput) {
        pageSearchInput.value = '';
    }
    
    resetAndReload();
}

// Make functions global
window.resetFilters = resetFilters;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => { 
    showSkeletonCards(6);
    await loadWishlistFromAPI();
    await loadCategoriesFromAPI();
    await addFilters();
    await loadEventsFromAPI(true);
    await filterAndDisplay();
    setupInfiniteScroll();
    updateWishlistBadge();
});