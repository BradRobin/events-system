// EVENTS MODULE - Live API Integration (Optimized with Infinite Scroll)
// FIXED: Storage quota exceeded error, auth issues
// FIXED: Book ticket shows toast without redirect, prevents duplicate cart items
// FIXED: Wishlist buttons update automatically across all cards
// FIXED: Only buttons are clickable, not the card area
// FIXED: Cross-tab synchronization via storage events
// FIXED: Newest events appear first (client-side sorting - no API changes)
// FIXED: Details button does NOT require login (only Book and Wishlist buttons)
console.log('Events.js loaded');

let currentCategory = "all";
let currentSearch = "";
let filteredEvents = [];
let eventsCatalog = [];
let debounceTimer = null;
let isLoadingMore = false;
let currentPage = 1;
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

// Helper: Safe storage operations
const safeStorage = {
    setItem: function(key, value) {
        try {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            if (valueStr.length > 4 * 1024 * 1024) {
                console.warn(`Storage item ${key} too large, skipping`);
                return false;
            }
            localStorage.setItem(key, valueStr);
            return true;
        } catch(e) {
            if (e.name === 'QuotaExceededError') {
                console.warn(`Storage quota exceeded for ${key}, clearing old data`);
                this.clearOldData();
                try {
                    localStorage.setItem(key, valueStr);
                    return true;
                } catch(e2) {
                    console.error('Still cannot save after cleanup');
                    return false;
                }
            }
            return false;
        }
    },
    getItem: function(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch(e) {
            return null;
        }
    },
    clearOldData: function() {
        const keysToRemove = [
            'eventhub_events_prefetch_v1',
            'eventhub_events_prefetch_old',
            'eventhub_cart_backup',
            'eventhub_old_searches'
        ];
        keysToRemove.forEach(key => {
            try { localStorage.removeItem(key); } catch(e) {}
        });
        try { sessionStorage.clear(); } catch(e) {}
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
    if (token.split('.').length !== 3) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        return Date.now() < exp;
    } catch(e) {
        return !!token;
    }
}

function showToast(message, type) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    if (type === 'success') {
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('wishlist-updated'));
        window.dispatchEvent(new Event('storage'));
    }
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

// Sort events by date descending (newest first)
function sortEventsByDateDescending(events) {
    return [...events].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });
}

// Load events from API
async function loadEventsFromAPI(reset = true) {
    if (reset) {
        currentPage = 1;
        eventsCatalog = [];
        hasMoreEvents = true;
    } else {
        currentPage += 1;
    }
    
    if (!hasMoreEvents && !reset) return false;
    
    try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(PAGE_SIZE));

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
            eventsCatalog = sortEventsByDateDescending(eventsCatalog);
            const totalPages = data.total_pages || 1;
            hasMoreEvents = currentPage < totalPages;
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

// Load wishlist from API
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
                const wishlistArray = Array.from(currentUserWishlist);
                if (wishlistArray.length < 1000) {
                    safeStorage.setItem('event_wishlist', wishlistArray);
                }
                return;
            }
        }
    } catch (error) {
        console.error('Error loading wishlist from API:', error);
    }
    
    const localWishlist = safeStorage.getItem('event_wishlist') || [];
    currentUserWishlist = new Set(localWishlist);
}

// Toggle wishlist with API
async function toggleWishlistAPI(eventId, eventTitle) {
    const token = getAuthToken();
    if (!token) {
        showToast('🔐 Please login to manage your wishlist', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return false;
    }
    
    const isInWishlist = currentUserWishlist.has(eventId);
    
    try {
        if (!isInWishlist) {
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
                safeStorage.setItem('event_wishlist', Array.from(currentUserWishlist));
                window.dispatchEvent(new Event('wishlist-updated'));
                window.dispatchEvent(new Event('storage'));
                showToast(`❤️ "${eventTitle}" has been saved to your wishlist`, 'success');
                return true;
            } else {
                const data = await response.json();
                if (data.message === 'already in wishlist') {
                    currentUserWishlist.add(eventId);
                    showToast(`❤️ "${eventTitle}" is already in your wishlist`, 'info');
                    return true;
                }
                throw new Error(data.message || 'Failed to add to wishlist');
            }
        } else {
            const response = await fetch(`${API.wishlist}${eventId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                currentUserWishlist.delete(eventId);
                safeStorage.setItem('event_wishlist', Array.from(currentUserWishlist));
                window.dispatchEvent(new Event('wishlist-updated'));
                window.dispatchEvent(new Event('storage'));
                showToast(`🗑️ "${eventTitle}" has been removed from your wishlist`, 'info');
                return false;
            } else {
                throw new Error('Failed to remove from wishlist');
            }
        }
    } catch (error) {
        console.error('Wishlist API error:', error);
        if (!isInWishlist) {
            currentUserWishlist.add(eventId);
            showToast(`❤️ "${eventTitle}" has been saved to your wishlist (offline)`, 'success');
        } else {
            currentUserWishlist.delete(eventId);
            showToast(`🗑️ "${eventTitle}" has been removed from your wishlist`, 'info');
        }
        safeStorage.setItem('event_wishlist', Array.from(currentUserWishlist));
        window.dispatchEvent(new Event('wishlist-updated'));
        window.dispatchEvent(new Event('storage'));
        return !isInWishlist;
    }
}

// Force update all wishlist buttons on the page
function forceUpdateAllWishlistButtons() {
    const wishlistSet = currentUserWishlist;
    
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const eventId = parseInt(btn.dataset.id);
        if (eventId) {
            if (wishlistSet.has(eventId)) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-heart"></i> Remove';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="far fa-heart"></i> Wishlist';
            }
        }
    });
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

// FIXED: Only buttons are clickable, not the card area
// FIXED: Details button - NO login required
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
            <div class="event-card premium-card" data-event-id="${e.id}">
                <div class="card-image-container">
                    ${imageBlock}
                    <div class="card-image-skeleton is-hidden" aria-hidden="true"></div>
                    ${e.featured || e.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                    <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-id="${e.id}" data-title="${escapeHtml(e.title)}">
                        <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove' : 'Wishlist'}
                    </button>
                </div>
                <div class="card-content">
                    <span class="card-category">${escapeHtml(e.category_name || 'Event')}</span>
                    <h3 class="card-title">${escapeHtml(e.title)}</h3>
                    <div class="card-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(e.date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${e.location ? e.location.split(',')[0] : 'TBD'}</span>
                    </div>
                    <div class="card-price">KES ${(e.price || 0).toLocaleString()}</div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn view-details-btn" data-id="${e.id}">
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
    
    // Details button - NO authentication check, anyone can view details
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewDetailsClick);
        btn.addEventListener('click', handleViewDetailsClick);
    });
    
    // Book button - REQUIRES authentication
    document.querySelectorAll('.book-ticket-btn').forEach(btn => {
        btn.removeEventListener('click', handleBookClick);
        btn.addEventListener('click', handleBookClick);
    });
    
    // Wishlist button - REQUIRES authentication
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleWishlistClick);
        btn.addEventListener('click', handleWishlistClick);
    });
}

// FIXED: Details button - NO login required - simply redirect to event detail page
function handleViewDetailsClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    if (eventId) {
        window.location.href = `/events/detail/?id=${eventId}`;
    }
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
    const eventTitle = btn.dataset.title || 'Event';
    
    const wasActive = btn.classList.contains('active');
    btn.classList.toggle('active');
    btn.innerHTML = btn.classList.contains('active') 
        ? '<i class="fas fa-heart"></i> Remove' 
        : '<i class="far fa-heart"></i> Wishlist';
    
    const result = await toggleWishlistAPI(eventId, eventTitle);
    
    if ((result && wasActive) || (!result && !wasActive)) {
        btn.classList.toggle('active');
        btn.innerHTML = btn.classList.contains('active') 
            ? '<i class="fas fa-heart"></i> Remove' 
            : '<i class="far fa-heart"></i> Wishlist';
    }
    
    updateWishlistBadge();
    forceUpdateAllWishlistButtons();
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
    if (!event) {
        showToast('❌ Event details not found', 'error');
        return;
    }
    
    if (event.available_tickets <= 0) {
        showToast('🎫 Sorry, this event is sold out!', 'error');
        return;
    }
    
    let cart = safeStorage.getItem('eventhub_cart') || { items: [], subtotal: 0, total: 0 };
    const existingItem = cart.items.find(i => i.id == id);
    
    if (existingItem) {
        showToast(`⚠️ "${title}" is already in your cart. Proceed to checkout to complete your booking.`, 'info');
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
    
    safeStorage.setItem('eventhub_cart', cart);
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
    
    const formattedPrice = `KES ${event.price.toLocaleString()}`;
    showToast(`✅ "${title}" has been added to your cart. Total: ${formattedPrice}`, 'success');
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

window.resetFilters = resetFilters;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => { 
    safeStorage.clearOldData();
    
    window.addEventListener('storage', function(e) {
        if (e.key === 'event_wishlist') {
            loadWishlistFromAPI();
            forceUpdateAllWishlistButtons();
            updateWishlistBadge();
        }
        if (e.key === 'eventhub_cart') {
            const cartBadge = document.getElementById('cartBadgeDropdown');
            if (cartBadge) {
                const cart = JSON.parse(e.newValue || '{"items":[]}');
                const count = cart.items ? cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
                cartBadge.textContent = count;
                cartBadge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }
    });
    
    window.addEventListener('wishlist-updated', function() {
        loadWishlistFromAPI();
        forceUpdateAllWishlistButtons();
        updateWishlistBadge();
    });
    
    showSkeletonCards(6);
    await loadWishlistFromAPI();
    await loadCategoriesFromAPI();
    await addFilters();
    await loadEventsFromAPI(true);
    await filterAndDisplay();
    setupInfiniteScroll();
    updateWishlistBadge();
});

window.forceUpdateWishlistButtons = function() {
    forceUpdateAllWishlistButtons();
};