// EVENTS MODULE - Live API Integration (Optimized with Infinite Scroll)
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
};

// Cache for categories
let cachedCategories = null;

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

// Throttle function for scroll events
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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
            img.src = '/static/images/placeholder.jpg';
        }, { once: true });
    });
}

async function loadEventsFromAPI(reset = true) {
    if (reset) {
        currentOffset = 0;
        eventsCatalog = [];
        hasMoreEvents = true;
    }
    
    if (!hasMoreEvents && !reset) return;
    
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
        const wrapper = pageSearchInput.closest('.search-wrapper');
        let suggestionsContainer = document.getElementById('searchSuggestions');
        if (wrapper && !suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'searchSuggestions';
            suggestionsContainer.className = 'search-suggestions';
            wrapper.appendChild(suggestionsContainer);
        }

        pageSearchInput.removeEventListener('input', handleSearchInput);
        pageSearchInput.addEventListener('input', handleSearchInput);

        pageSearchInput.removeEventListener('focus', showSuggestions);
        pageSearchInput.addEventListener('focus', showSuggestions);

        document.addEventListener('click', (e) => {
            if (suggestionsContainer && !pageSearchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.remove('show');
            }
        });

        pageSearchInput.removeEventListener('keydown', handleSearchKeydown);
        pageSearchInput.addEventListener('keydown', handleSearchKeydown);
    }
}

function handleSearchInput(e) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentSearch = e.target.value.toLowerCase().trim();
        resetAndReload();
        showSuggestions();
    }, 300);
}

function showSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    if (recentSearches.length === 0) {
        suggestionsContainer.classList.remove('show');
        return;
    }

    const input = document.getElementById('searchInput');
    const typed = input ? input.value.trim().toLowerCase() : '';
    
    const filteredSearches = typed 
        ? recentSearches.filter(q => q.toLowerCase().includes(typed))
        : recentSearches;

    if (filteredSearches.length === 0) {
        suggestionsContainer.classList.remove('show');
        return;
    }

    suggestionsContainer.innerHTML = `
        <div class="suggestion-header">
            <span>Recent Searches</span>
            <button class="suggestion-clear-btn" id="clearRecentBtn">Clear</button>
        </div>
        ${filteredSearches.map(query => `
            <div class="suggestion-item" data-query="${escapeHtml(query)}">
                <i class="fas fa-history"></i>
                <span>${escapeHtml(query)}</span>
            </div>
        `).join('')}
    `;

    suggestionsContainer.classList.add('show');

    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const query = item.dataset.query;
            if (input) {
                input.value = query;
                currentSearch = query.toLowerCase();
                saveSearchQuery(query);
                resetAndReload();
            }
            suggestionsContainer.classList.remove('show');
        });
    });

    const clearBtn = document.getElementById('clearRecentBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.setItem('recent_searches', JSON.stringify([]));
            suggestionsContainer.classList.remove('show');
        });
    }
}

function handleSearchKeydown(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            saveSearchQuery(query);
        }
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) suggestionsContainer.classList.remove('show');
    }
}

function saveSearchQuery(query) {
    if (!query) return;
    let recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    recentSearches = recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase());
    recentSearches.unshift(query);
    if (recentSearches.length > 5) {
        recentSearches = recentSearches.slice(0, 5);
    }
    localStorage.setItem('recent_searches', JSON.stringify(recentSearches));
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function resetAndReload() {
    if (observer) observer.disconnect();
    showSkeletonCards(6);
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
                stats.innerHTML = `✨ New events coming soon! Check back later.`;
            }
        }
    }
    
    renderEvents();
}

function goToNewsletter() {
    // Navigate to homepage and scroll to newsletter section
    window.location.href = '/#newsletterSection';
}

function renderEvents() {
    const grid = domCache.gridElement;
    if (!grid) return;
    
    hideSkeletonCards();
    
    if (filteredEvents.length === 0) { 
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h3>No Events Available</h3>
                <p>We don't have any events right now. Stay updated with our newsletter!</p>
                <button onclick="goToNewsletter()" class="btn-browse">
                    <i class="fas fa-envelope"></i> Subscribe to Newsletter
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
        const inWishlist = wishlistIds.includes(e.id);
        const imageUrl = getEventImageUrl(e);
        const imageBlock = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" class="card-bg-image is-loading" alt="" loading="lazy" decoding="async">`
            : `<div class="card-image-fallback" aria-hidden="true"><i class="fas fa-calendar-alt"></i></div>`;
        const imageContainerClass = imageUrl ? 'card-image-container' : 'card-image-container card-image-container--no-image';
        
        tempDiv.innerHTML = `
            <div class="event-card premium-card" onclick="window.location.href='/events/detail/?id=${e.id}'">
                <div class="${imageContainerClass}">
                    <div class="card-image-skeleton" aria-hidden="true"></div>
                    ${imageBlock}
                    <div class="card-gradient-overlay"></div>
                    ${e.featured || e.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                    <button class="wishlist-btn" data-id="${e.id}" style="background:${inWishlist ? '#f59e0b' : 'rgba(0,0,0,0.5)'}">
                        <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove' : 'Add to wish list'}
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
                    <button class="card-action-btn view-details-btn" onclick="event.stopPropagation();window.location.href='/events/detail/?id=${e.id}'">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="card-action-btn book-ticket-btn add-to-cart-btn" data-id="${e.id}">
                        <i class="fas fa-ticket-alt"></i> Book Ticket
                    </button>
                </div>
            </div>
        `;
        fragment.appendChild(tempDiv.firstElementChild);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    document.querySelectorAll('.book-ticket-btn').forEach(btn => {
        btn.removeEventListener('click', handleBookClick);
        btn.addEventListener('click', handleBookClick);
    });
    
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleWishlistClick);
        btn.addEventListener('click', handleWishlistClick);
    });

    initEventCardImages();
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
    }
}

function handleBookClick(e) {
    e.stopPropagation();
    const id = parseInt(this.dataset.id);
    bookTicket(id);
}

function handleWishlistClick(e) {
    e.stopPropagation();
    const id = parseInt(this.dataset.id);
    const btn = this;
    toggleWishlist(id, btn);
}

function bookTicket(id) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showToast('🔐 Please login to book tickets', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }
    
    const event = eventsCatalog.find(e => e.id == id);
    if (!event) return;
    
    const storage = window.EventhubCartStorage;
    const cart = storage ? storage.loadEventhubCart() : { items: [], subtotal: 0, platform_fee: 0, total: 0 };

    const existingItem = cart.items.find(i => i.id == id);
    if (existingItem) {
        window.location.href = '/cart/';
        return;
    }

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
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.platform_fee = 0;
    cart.total = cart.subtotal;

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

// Make resetFilters and goToNewsletter available globally
window.resetFilters = resetFilters;
window.goToNewsletter = goToNewsletter;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => { 
    showSkeletonCards(6);
    await loadCategoriesFromAPI();
    await addFilters();
    await loadEventsFromAPI(true);
    await filterAndDisplay();
    setupInfiniteScroll();
});