// EVENTS MODULE - Live API Integration (Optimized with Infinite Scroll)
// FIXED: Unified wishlist with API, fixed auth issues
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
};

// Cache for categories
let cachedCategories = null;
<<<<<<< HEAD
let currentUserWishlist = new Set();
=======
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438

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

<<<<<<< HEAD
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
=======
function showImageFallback(img) {
    const container = img.closest('.card-image-container');
    if (!container) return;

    img.remove();
    if (!container.querySelector('.card-image-fallback')) {
        const fallback = document.createElement('div');
        fallback.className = 'card-image-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.innerHTML = '<i class="fas fa-calendar-alt"></i>';
        const overlay = container.querySelector('.card-gradient-overlay');
        container.insertBefore(fallback, overlay);
    }

    const skeleton = container.querySelector('.card-image-skeleton');
    if (skeleton) skeleton.classList.add('is-hidden');
}

function markEventImageLoaded(img) {
    img.classList.remove('is-loading');
    img.classList.add('is-loaded');
    const skeleton = img.closest('.card-image-container')?.querySelector('.card-image-skeleton');
    if (skeleton) skeleton.classList.add('is-hidden');
}

function initEventCardImages() {
    document.querySelectorAll('.card-bg-image.is-loading').forEach(img => {
        const finish = () => markEventImageLoaded(img);
        if (img.complete && img.naturalWidth > 0) {
            finish();
            return;
        }
        img.addEventListener('load', finish, { once: true });
        img.addEventListener('error', () => {
            showImageFallback(img);
        }, { once: true });
    });
}

function getPrefetchedCatalog() {
    if (!window.EventhubEventsPrefetch) return null;
    const cached = EventhubEventsPrefetch.getCached();
    if (!cached) return null;
    return {
        events: cached.events || [],
        categories: cached.categories || [],
        timestamp: cached.timestamp || 0,
    };
}

function canUsePrefetchedCatalog() {
    return currentCategory === 'all' && !currentSearch;
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
}

async function loadEventsFromAPI(reset = true) {
    if (reset) {
        currentPage = 1;
        eventsCatalog = [];
        hasMoreEvents = true;

        if (canUsePrefetchedCatalog()) {
            const prefetched = getPrefetchedCatalog();
            if (prefetched && prefetched.events.length) {
                eventsCatalog = prefetched.events;
                hasMoreEvents = prefetched.events.length >= PAGE_SIZE;
                currentPage = 2;
                return true;
            }
        }
    }
<<<<<<< HEAD
    
    if (!hasMoreEvents && !reset) return false;
    
=======

    if (!hasMoreEvents && !reset) return false;

>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
    try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', currentSearch ? '200' : String(PAGE_SIZE));

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
            const batch = data.events || data.results || [];
            if (reset) {
                eventsCatalog = batch;
            } else {
                eventsCatalog.push(...batch);
            }

            if (canUsePrefetchedCatalog() && window.EventhubEventsPrefetch && eventsCatalog.length) {
                const existing = getPrefetchedCatalog();
                EventhubEventsPrefetch.seed(eventsCatalog, existing ? existing.categories : cachedCategories || []);
            }

            hasMoreEvents = batch.length === PAGE_SIZE && !currentSearch;
            currentPage += 1;
            return true;
        }

        console.error('Failed to load events:', data.message);
        return false;
    } catch (error) {
        console.error('Error loading events:', error);
        return false;
    }
}

async function loadCategoriesFromAPI() {
    const prefetched = getPrefetchedCatalog();
    if (prefetched && prefetched.categories.length) {
        cachedCategories = prefetched.categories;
        return cachedCategories;
    }

    if (cachedCategories) {
        return cachedCategories;
    }

    try {
        const response = await fetch(API.categories);
        const data = await response.json();
        
        if (data.success && data.categories) {
            cachedCategories = data.categories;
            if (window.EventhubEventsPrefetch) {
                const existing = getPrefetchedCatalog();
                const events = existing ? existing.events : eventsCatalog;
                if ((events && events.length) || data.categories.length) {
                    EventhubEventsPrefetch.seed(events || [], data.categories);
                }
            }
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

async function refreshPrefetchedCatalogInBackground(prefetched) {
    if (!window.EventhubEventsPrefetch) return;

    const fresh = await EventhubEventsPrefetch.start();
    if (!fresh || !Array.isArray(fresh.events) || !fresh.events.length) return;
    if (!canUsePrefetchedCatalog()) return;
    if ((fresh.timestamp || 0) <= (prefetched.timestamp || 0)) return;

    eventsCatalog = fresh.events;
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
<<<<<<< HEAD
                stats.innerHTML = `✨ ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} available`;
=======
                stats.innerHTML = `✨ New events coming soon! Check back later.`;
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
            }
        }
    }
    
    renderEvents();
}

<<<<<<< HEAD
=======
function goToNewsletter() {
    // Navigate to homepage and scroll to newsletter section
    window.location.href = '/#newsletterSection';
}

>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
function renderEvents() {
    const grid = domCache.gridElement;
    if (!grid) return;
    
    hideSkeletonCards();
    
    if (filteredEvents.length === 0) { 
        grid.innerHTML = `
            <div class="empty-state">
<<<<<<< HEAD
                <i class="fas fa-calendar-times"></i>
                <h3>No Events Available</h3>
                <p>We don't have any events matching your criteria right now.</p>
                <button onclick="resetFilters()" class="btn-browse">
                    <i class="fas fa-redo"></i> Reset Filters
=======
                <i class="fas fa-newspaper"></i>
                <h3>No Events Available</h3>
                <p>We don't have any events right now. Stay updated with our newsletter!</p>
                <button onclick="goToNewsletter()" class="btn-browse">
                    <i class="fas fa-envelope"></i> Subscribe to Newsletter
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
                </button>
            </div>
        `; 
        return; 
    }
    
    const wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
    const wishlistIds = wishlist.map(item => item.id);
    
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
<<<<<<< HEAD
                    <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-id="${e.id}">
                        <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove' : 'Wishlist'}
=======
                    <button class="wishlist-btn" data-id="${e.id}" style="background:${inWishlist ? '#f59e0b' : 'rgba(0,0,0,0.5)'}">
                        <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove' : 'Add to wish list'}
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
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

<<<<<<< HEAD
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
=======
function toggleWishlist(id, btn) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showToast('🔐 Please login to save to wishlist', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }
    
    const event = eventsCatalog.find(e => e.id == id);
    if (!event) return;
    
    let wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
    const exists = wishlist.some(item => item.id == id);
    
    if (!exists) {
        wishlist.push({
            id: event.id,
            title: event.title,
            price: event.price,
            image: event.image,
            location: event.location,
            date: event.date,
            category: event.category_name,
            original_price: event.original_price,
            added_at: new Date().toISOString()
        });
        btn.innerHTML = '<i class="fas fa-heart"></i> Remove';
        btn.style.background = '#f59e0b';
        showToast('❤️ Event saved to wishlist!', 'success');
    } else {
        wishlist = wishlist.filter(item => item.id != id);
        btn.innerHTML = '<i class="far fa-heart"></i> Add to wish list';
        btn.style.background = 'rgba(0,0,0,0.5)';
        showToast('🗑️ Removed from wishlist', 'info');
    }
    
    localStorage.setItem('event_wishlist', JSON.stringify(wishlist));
    window.dispatchEvent(new Event('wishlist-updated'));
    
    const badge = document.getElementById('wishlistBadgeDropdown');
    if (badge) {
        badge.textContent = wishlist.length;
        badge.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
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
    
<<<<<<< HEAD
    // Add to cart
    const cart = JSON.parse(localStorage.getItem('eventhub_cart') || '{"items":[]}');
=======
    const storage = window.EventhubCartStorage;
    const cart = storage ? storage.loadEventhubCart() : { items: [], subtotal: 0, platform_fee: 0, total: 0 };

>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
    const existingItem = cart.items.find(i => i.id == id);
    
    if (existingItem) {
        window.location.href = '/cart/';
        return;
    }
<<<<<<< HEAD
    
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
    
=======

    const item = storage
        ? storage.slimCartItem({
            id: event.id,
            title: event.title,
            category: event.category_name,
            date: event.date,
            location: event.location,
            price: event.price,
            image: event.image,
            quantity: 1,
        })
        : {
            id: event.id,
            title: event.title,
            category: event.category_name,
            date: event.date,
            location: event.location,
            price: event.price,
            quantity: 1,
        };

    cart.items.push(item);
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.total = cart.subtotal;
<<<<<<< HEAD
    
    localStorage.setItem('eventhub_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    window.location.href = '/cart/';
=======

    try {
        if (storage) {
            storage.saveEventhubCart(cart);
        } else {
            localStorage.setItem('eventhub_cart', JSON.stringify(cart));
        }
        window.dispatchEvent(new Event('cart-updated'));
        window.location.href = '/cart/';
    } catch (error) {
        console.error('Failed to save cart:', error);
        showToast('Could not save cart. Please clear site data or book from the event page.', 'error');
    }
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
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

<<<<<<< HEAD
// Make functions global
=======
// Make resetFilters and goToNewsletter available globally
>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
window.resetFilters = resetFilters;

// Initialize on page load
<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', async () => { 
=======
document.addEventListener('DOMContentLoaded', async () => {
    if (window.EventhubEventsPrefetch) {
        EventhubEventsPrefetch.start();
    }

    const prefetched = canUsePrefetchedCatalog() ? getPrefetchedCatalog() : null;
    const hasInstantCatalog = Boolean(prefetched && prefetched.events && prefetched.events.length);

    if (hasInstantCatalog) {
        eventsCatalog = prefetched.events;
        cachedCategories = prefetched.categories || null;
        await addFilters(prefetched.categories || null);
        setupInfiniteScroll();
        await filterAndDisplay();
        refreshPrefetchedCatalogInBackground(prefetched);
        return;
    }

>>>>>>> df146b60ff9b84e1bb990f601931434b93456438
    showSkeletonCards(6);
    await loadWishlistFromAPI();
    await loadCategoriesFromAPI();
    await addFilters();
    await loadEventsFromAPI(true);
    await filterAndDisplay();
    setupInfiniteScroll();
    updateWishlistBadge();
});