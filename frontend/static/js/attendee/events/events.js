// EVENTS MODULE - Live API Integration
console.log('Events.js loaded');

let currentCategory = "all";
let currentSearch = "";
let filteredEvents = [];
let eventsCatalog = [];

// API endpoints
const API = {
    events: '/api/attendee/events/',
    categories: '/api/attendee/categories/',
};

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 20px;
        border-radius: 12px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function renderStreamLoader(isSearch = false) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    const term = isSearch ? "Retrieving matches..." : "Retrieving active events catalog...";
    
    grid.innerHTML = `
        <div class="stream-loader">
            <div class="stream-loader-spinner"></div>
            <h3 class="stream-loader-title">${isSearch ? "Searching Event Registry" : "Scanning Event Registry"}</h3>
            <div class="stream-loader-steps">
                <div class="loader-step active" id="step-connect">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <span>Connecting to database...</span>
                </div>
                <div class="loader-step pending" id="step-categories">
                    <i class="far fa-circle"></i>
                    <span>Loading filter categories...</span>
                </div>
                <div class="loader-step pending" id="step-events">
                    <i class="far fa-circle"></i>
                    <span>${term}</span>
                </div>
                <div class="loader-step pending" id="step-render">
                    <i class="far fa-circle"></i>
                    <span>Rendering displays...</span>
                </div>
            </div>
        </div>
    `;
}

function updateStep(stepId, status) {
    const el = document.getElementById(stepId);
    if (!el) return;
    
    const icon = el.querySelector('i');
    
    if (status === 'completed') {
        el.className = 'loader-step completed';
        if (icon) {
            icon.className = 'fas fa-check-circle';
        }
    } else if (status === 'active') {
        el.className = 'loader-step active';
        if (icon) {
            icon.className = 'fas fa-circle-notch fa-spin';
        }
    } else if (status === 'pending') {
        el.className = 'loader-step pending';
        if (icon) {
            icon.className = 'far fa-circle';
        }
    }
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

    document.querySelectorAll('.card-image-container--no-image .card-image-skeleton').forEach(skeleton => {
        skeleton.classList.add('is-hidden');
    });
}

function getPrefetchedCatalog() {
    if (!window.EventhubEventsPrefetch) return null;
    const cached = EventhubEventsPrefetch.getCached();
    if (!cached) return null;
    return {
        events: cached.events || [],
        categories: cached.categories || [],
    };
}

function canUsePrefetchedCatalog() {
    return currentCategory === 'all' && !currentSearch;
}

async function loadEventsFromAPI(options = {}) {
    const preferPrefetch = options.preferPrefetch !== false;

    if (preferPrefetch && canUsePrefetchedCatalog()) {
        const prefetched = getPrefetchedCatalog();
        if (prefetched && prefetched.events.length) {
            eventsCatalog = prefetched.events;
            return;
        }
    }

    try {
        const params = new URLSearchParams();

        if (currentCategory !== 'all') {
            params.set('category', currentCategory);
        }

        if (currentSearch) {
            params.set('search', currentSearch);
            params.set('limit', '200');
        } else if (currentCategory === 'all') {
            params.set('limit', '200');
        }

        const url = API.events + (params.toString() ? '?' + params.toString() : '');
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            eventsCatalog = data.events || data.results || [];
            if (canUsePrefetchedCatalog() && window.EventhubEventsPrefetch && eventsCatalog.length) {
                const existing = getPrefetchedCatalog();
                EventhubEventsPrefetch.seed(eventsCatalog, existing ? existing.categories : []);
            }
        } else {
            console.error('Failed to load events:', data.message);
            eventsCatalog = [];
        }
    } catch (error) {
        console.error('Error loading events:', error);
        eventsCatalog = [];
    }
}

async function loadCategoriesFromAPI(options = {}) {
    const preferPrefetch = options.preferPrefetch !== false;

    if (preferPrefetch) {
        const prefetched = getPrefetchedCatalog();
        if (prefetched && prefetched.categories.length) {
            return prefetched.categories;
        }
    }

    try {
        const response = await fetch(API.categories);
        const data = await response.json();
        
        if (data.success && data.categories) {
            if (window.EventhubEventsPrefetch) {
                const existing = getPrefetchedCatalog();
                const events = existing ? existing.events : eventsCatalog;
                if ((events && events.length) || data.categories.length) {
                    EventhubEventsPrefetch.seed(events || [], data.categories);
                }
            }
            return data.categories;
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
        
        // Category button event listeners
        wrapper.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.dataset.category;
                wrapper.querySelectorAll('.category-btn').forEach(b => b.classList.toggle('active', b.dataset.category === currentCategory));
                filterEvents();
            });
        });
    }
    
    // Set up page search listener (Option 1)
    setupPageSearchListener();
}

function setupPageSearchListener() {
    const pageSearchInput = document.getElementById('searchInput');
    if (pageSearchInput) {
        // Create suggestions container dynamically inside search-wrapper
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

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (suggestionsContainer && !pageSearchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.remove('show');
            }
        });

        // Add Enter key listener to save search query
        pageSearchInput.removeEventListener('keydown', handleSearchKeydown);
        pageSearchInput.addEventListener('keydown', handleSearchKeydown);
    }
}

function handleSearchInput(e) {
    currentSearch = e.target.value.toLowerCase().trim();
    filterEvents();
    // Show updated list as they type
    showSuggestions();
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
    
    // Filter history based on what is typed (if anything is typed)
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

    // Add click event for suggestion items
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const query = item.dataset.query;
            if (input) {
                input.value = query;
                currentSearch = query.toLowerCase();
                saveSearchQuery(query);
                filterEvents();
            }
            suggestionsContainer.classList.remove('show');
        });
    });

    // Add click event for clear button
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

async function renderFromPrefetchedCatalog(prefetched) {
    eventsCatalog = prefetched.events || [];
    const categoriesData = prefetched.categories || [];

    await addFilters(categoriesData);

    filteredEvents = [...eventsCatalog];
    const stats = document.getElementById('searchStats');
    if (stats) {
        stats.innerHTML = `📅 ${filteredEvents.length} upcoming event${filteredEvents.length !== 1 ? 's' : ''}`;
    }
    renderEvents();

    if (window.EventhubEventsPrefetch) {
        EventhubEventsPrefetch.start().then((fresh) => {
            if (!fresh || !Array.isArray(fresh.events) || !fresh.events.length) return;
            if (!canUsePrefetchedCatalog()) return;
            if (fresh.timestamp <= (prefetched.timestamp || 0)) return;
            eventsCatalog = fresh.events;
            filteredEvents = [...eventsCatalog];
            if (stats) {
                stats.innerHTML = `📅 ${filteredEvents.length} upcoming event${filteredEvents.length !== 1 ? 's' : ''}`;
            }
            renderEvents();
        });
    }
}

async function filterEvents(isInitialLoad = false) {
    if (isInitialLoad) {
        const prefetched = canUsePrefetchedCatalog() ? getPrefetchedCatalog() : null;
        const hasInstantCatalog = Boolean(prefetched && prefetched.events && prefetched.events.length);

        if (hasInstantCatalog) {
            await renderFromPrefetchedCatalog(prefetched);
            return;
        } else {
            renderStreamLoader(false);
            updateStep('step-connect', 'active');

            if (window.EventhubEventsPrefetch) {
                EventhubEventsPrefetch.start();
            }

            const categoriesPromise = loadCategoriesFromAPI({ preferPrefetch: true });
            const eventsPromise = loadEventsFromAPI({ preferPrefetch: true });

            updateStep('step-connect', 'completed');
            updateStep('step-categories', 'active');
            updateStep('step-events', 'active');

            const categoriesData = await categoriesPromise;
            updateStep('step-categories', 'completed');

            await addFilters(categoriesData);

            await eventsPromise;
            updateStep('step-events', 'completed');
            updateStep('step-render', 'active');

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    } else {
        const grid = document.getElementById('eventsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="stream-loader">
                    <div class="stream-loader-spinner"></div>
                    <h3 class="stream-loader-title">Updating stream...</h3>
                </div>
            `;
        }
        await loadEventsFromAPI();
    }

    filteredEvents = [...eventsCatalog];
    
    // Update stats display
    const stats = document.getElementById('searchStats');
    if (stats) {
        if (currentSearch) {
            stats.innerHTML = `🔍 Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} for "${currentSearch}"`;
        } else if (currentCategory !== 'all') {
            const categoryName = document.querySelector(`.category-btn[data-category="${currentCategory}"] span`)?.textContent || currentCategory;
            stats.innerHTML = `📂 ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} in ${categoryName}`;
        } else {
            stats.innerHTML = `📅 ${filteredEvents.length} upcoming event${filteredEvents.length !== 1 ? 's' : ''}`;
        }
    }
    renderEvents();
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

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    if (filteredEvents.length === 0) { 
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No events found</h3>
                <p>Try adjusting your search or browse all events</p>
                <button onclick="resetFilters()" class="btn-browse">
                    <i class="fas fa-redo-alt"></i> Browse All Events
                </button>
            </div>
        `; 
        return; 
    }
    
    const wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
    const wishlistIds = wishlist.map(item => item.id);
    
    grid.innerHTML = filteredEvents.map(e => {
        const inWishlist = wishlistIds.includes(e.id);
        const imageUrl = getEventImageUrl(e);
        const imageBlock = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" class="card-bg-image is-loading" alt="" loading="lazy" decoding="async">`
            : `<div class="card-image-fallback" aria-hidden="true"><i class="fas fa-calendar-alt"></i></div>`;
        const imageContainerClass = imageUrl ? 'card-image-container' : 'card-image-container card-image-container--no-image';
        return `
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
    }).join('');
    
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
    
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
    });
    
    // Clear page search input
    const pageSearchInput = document.getElementById('searchInput');
    if (pageSearchInput) {
        pageSearchInput.value = '';
    }
    
    filterEvents();
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Make resetFilters available globally
window.resetFilters = resetFilters;

document.addEventListener('DOMContentLoaded', async () => { 
    // Initialise and load events catalog with stepped loading screens
    await filterEvents(true); 
});