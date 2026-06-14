// ============================================
// WISHLIST JS - Works with event IDs from localStorage
// Fetches full event data from API
// FIXED: Loading spinner doesn't get stuck
// FIXED: Clear all wishlist updates all buttons across pages
// FIXED: Only buttons are clickable, not card area
// FIXED: Events dispatched for navbar updates
// ============================================

let wishlistIds = [];
let wishlistItems = [];
let currentSearch = '';
let currentCategory = '';

const wishlistGrid = document.getElementById('wishlistGrid');
const emptyWishlist = document.getElementById('emptyWishlist');
const wishlistInfo = document.getElementById('wishlistInfo');
const wishlistCountSpan = document.getElementById('wishlistCount');
const searchInput = document.getElementById('searchWishlist');
const categoryFilter = document.getElementById('categoryFilter');
const clearAllBtn = document.getElementById('clearAllBtn');
const modal = document.getElementById('shareModal');
const shareLink = document.getElementById('shareLink');
let currentShareEvent = null;
let isLoading = false;

// API endpoints
const API = {
    events: '/api/attendee/events/',
    cart: '/api/attendee/cart/',
    wishlist: '/api/attendee/wishlist/'
};

// Fetch event by ID from API with timeout
async function getEventById(eventId) {
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API.events}${eventId}/`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.event) {
                return data.event;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
        return null;
    }
}

// Try to get event from mock or localStorage cache
function getCachedEvent(eventId) {
    try {
        // Try to get from events catalog if available
        if (window.eventsCatalog) {
            const event = window.eventsCatalog.find(e => e.id == eventId);
            if (event) return event;
        }
        
        // Try to get from featured events
        if (window.featuredEvents) {
            const event = window.featuredEvents.find(e => e.id == eventId);
            if (event) return event;
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Wishlist page loaded');
    loadWishlist();
    setupEventListeners();
    setupModalClose();
    
    // Clear wishlist badge when viewing the wishlist page
    clearWishlistBadgeOnView();
    // Remove heart icon from page header
    removeHeartIconFromHeader();
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', function(e) {
        if (e.key === 'event_wishlist') {
            loadWishlist();
        }
    });
    
    // Listen for wishlist updates from other components
    window.addEventListener('wishlist-updated', function() {
        loadWishlist();
    });
});

function removeHeartIconFromHeader() {
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        const currentHtml = pageHeader.innerHTML;
        pageHeader.innerHTML = currentHtml.replace('<i class="fas fa-heart"></i>', '').trim();
        if (pageHeader.innerHTML === ' My Wishlist') {
            pageHeader.innerHTML = 'My Wishlist';
        }
    }
}

function clearWishlistBadgeOnView() {
    const wishlistBadge = document.getElementById('wishlistBadgeDropdown');
    const mobileWishlistBadge = document.getElementById('mobileWishlistBadge');
    
    if (wishlistBadge) {
        wishlistBadge.style.display = 'none';
        wishlistBadge.textContent = '0';
    }
    if (mobileWishlistBadge) {
        mobileWishlistBadge.style.display = 'none';
        mobileWishlistBadge.textContent = '0';
    }
    
    // Dispatch event to update navbar
    window.dispatchEvent(new Event('wishlist-updated'));
    window.dispatchEvent(new Event('storage'));
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearch = this.value.toLowerCase();
            filterAndDisplay();
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategory = this.value;
            filterAndDisplay();
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllWishlist);
    }
}

function setupModalClose() {
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

async function loadWishlist() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        // Show loading state
        if (wishlistGrid) {
            wishlistGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading your wishlist...</p></div>';
        }
        
        // Get wishlist IDs from storage
        wishlistIds = window.EventhubWishlistStorage
            ? EventhubWishlistStorage.getWishlistIds()
            : (JSON.parse(localStorage.getItem('event_wishlist') || '[]'));
        
        wishlistItems = [];
        
        if (wishlistIds.length === 0) {
            updateEmptyState();
            updateWishlistBadge();
            isLoading = false;
            return;
        }
        
        // Fetch events with timeout and error handling
        const eventPromises = wishlistIds.map(id => getEventById(id));
        const results = await Promise.allSettled(eventPromises);
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const event = result.value;
                wishlistItems.push({
                    id: event.id,
                    title: event.title,
                    price: event.price,
                    image: event.image,
                    location: event.location,
                    date: event.date,
                    category: event.category_name || event.category,
                    original_price: event.original_price,
                    rating: event.rating || 0,
                    rating_count: event.rating_count || 0,
                    available_tickets: event.available_tickets,
                    added_at: new Date().toISOString()
                });
            } else {
                // Try to get from cache
                const failedId = wishlistIds.find(id => {
                    const event = getCachedEvent(id);
                    if (event) {
                        wishlistItems.push({
                            id: event.id,
                            title: event.title,
                            price: event.price,
                            image: event.image,
                            location: event.location,
                            date: event.date,
                            category: event.category_name || event.category,
                            original_price: event.original_price,
                            rating: event.rating || 0,
                            rating_count: event.rating_count || 0,
                            available_tickets: event.available_tickets,
                            added_at: new Date().toISOString()
                        });
                        return true;
                    }
                    return false;
                });
            }
        }
        
        console.log('Loaded wishlist items:', wishlistItems.length);
        
        filterAndDisplay();
        updateEmptyState();
        updateWishlistBadge();
        
        // Dispatch event to update navbar
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        window.dispatchEvent(new Event('storage'));
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        wishlistItems = [];
        updateEmptyState();
        showToast('Failed to load wishlist. Please refresh the page.', 'error');
    } finally {
        isLoading = false;
    }
}

function filterAndDisplay() {
    let filtered = [...wishlistItems];
    
    if (currentSearch) {
        filtered = filtered.filter(item => 
            (item.title || '').toLowerCase().includes(currentSearch) ||
            (item.location || '').toLowerCase().includes(currentSearch) ||
            (item.category || '').toLowerCase().includes(currentSearch)
        );
    }
    
    if (currentCategory) {
        filtered = filtered.filter(item => (item.category || '').toLowerCase() === currentCategory);
    }
    
    displayWishlist(filtered);
    if (wishlistCountSpan) wishlistCountSpan.textContent = filtered.length;
    if (wishlistInfo) wishlistInfo.style.display = filtered.length > 0 ? 'block' : 'none';
}

function generateStars(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    return starsHtml;
}

function displayWishlist(items) {
    if (!wishlistGrid) return;
    
    if (!items || items.length === 0) {
        wishlistGrid.innerHTML = '';
        return;
    }
    
    wishlistGrid.innerHTML = items.map(item => {
        const starsHtml = generateStars(item.rating || 0);
        const ratingText = item.rating_count ? `(${item.rating_count})` : '';
        
        return `
        <div class="wishlist-card" data-event-id="${item.id}">
            <div class="card-image-container">
                <img src="${item.image || '/static/images/placeholder.jpg'}" alt="${escapeHtml(item.title)}" class="card-image" onerror="this.src='/static/images/placeholder.jpg'">
                <div class="card-gradient-overlay"></div>
                <button class="remove-wishlist-btn" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
            <div class="card-content">
                <span class="card-category">${escapeHtml(item.category || 'Event')}</span>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-rating">
                    <div class="card-stars">${starsHtml}</div>
                    <span class="rating-count">${ratingText}</span>
                </div>
                <div class="card-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location || 'TBD')}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(item.date)}</span>
                </div>
                <div class="card-price">KES ${(item.price || 0).toLocaleString()}</div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn view-details-btn" data-id="${item.id}">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="card-action-btn add-to-cart-btn" data-id="${item.id}" data-title="${escapeHtml(item.title)}" data-price="${item.price}">
                    <i class="fas fa-ticket-alt"></i> Book Ticket
                </button>
                <button class="share-btn-icon" data-id="${item.id}">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `}).join('');
    
    attachButtonEventListeners();
}

function attachButtonEventListeners() {
    // Remove buttons
    document.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleRemoveClick);
        btn.addEventListener('click', handleRemoveClick);
    });
    
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewDetailsClick);
        btn.addEventListener('click', handleViewDetailsClick);
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.removeEventListener('click', handleAddToCartClick);
        btn.addEventListener('click', handleAddToCartClick);
    });
    
    // Share buttons
    document.querySelectorAll('.share-btn-icon').forEach(btn => {
        btn.removeEventListener('click', handleShareClick);
        btn.addEventListener('click', handleShareClick);
    });
}

function handleRemoveClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    const eventTitle = btn.dataset.title || 'Event';
    removeFromWishlist(eventId, eventTitle);
}

function handleViewDetailsClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    viewEvent(eventId);
}

function handleAddToCartClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    const eventTitle = btn.dataset.title;
    const eventPrice = parseFloat(btn.dataset.price);
    proceedToBooking(eventId, eventTitle, eventPrice);
}

function handleShareClick(e) {
    e.stopPropagation();
    const btn = this;
    const eventId = parseInt(btn.dataset.id);
    openShareModal(eventId);
}

async function removeFromWishlist(eventId, eventTitle) {
    // Update localStorage
    wishlistIds = wishlistIds.filter(id => id != eventId);
    localStorage.setItem('event_wishlist', JSON.stringify(wishlistIds));
    
    // Update local array
    wishlistItems = wishlistItems.filter(item => item.id != eventId);
    
    // Update UI
    filterAndDisplay();
    updateEmptyState();
    updateWishlistBadge();
    
    // Dispatch events to update all pages
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
    window.dispatchEvent(new Event('storage'));
    
    // Force update all wishlist buttons on the current page
    forceUpdateAllWishlistButtons();
    
    showToast(`🗑️ "${eventTitle}" has been removed from your wishlist`, 'success');
}

async function clearAllWishlist() {
    if (wishlistItems.length === 0) return;
    if (!confirm('Clear your entire wishlist?')) return;
    
    wishlistIds = [];
    wishlistItems = [];
    localStorage.setItem('event_wishlist', JSON.stringify([]));
    
    filterAndDisplay();
    updateEmptyState();
    updateWishlistBadge();
    
    // Dispatch events to update all pages
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
    window.dispatchEvent(new Event('storage'));
    
    // Force update all wishlist buttons on the current page
    forceUpdateAllWishlistButtons();
    
    showToast('🗑️ Your wishlist has been cleared', 'success');
}

function forceUpdateAllWishlistButtons() {
    const wishlistSet = new Set(wishlistIds);
    
    // Update buttons on events page if they exist
    const eventWishlistButtons = document.querySelectorAll('.wishlist-btn');
    eventWishlistButtons.forEach(btn => {
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
    
    // Update buttons on featured events
    const featuredWishlistButtons = document.querySelectorAll('.featured-item .wishlist-btn');
    featuredWishlistButtons.forEach(btn => {
        const eventId = parseInt(btn.dataset.id);
        if (wishlistSet.has(eventId)) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i> Remove';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i> Wishlist';
        }
    });
}

async function proceedToBooking(eventId, eventTitle, eventPrice) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showToast('🔐 Please login to continue with ticket booking', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }

    const event = wishlistItems.find(e => e.id == eventId);
    if (!event) {
        showToast('❌ Event details not found', 'error');
        return;
    }

    if (event.available_tickets <= 0) {
        showToast('🎫 Sorry, this event is sold out!', 'error');
        return;
    }

    // Get existing cart
    let cart = JSON.parse(localStorage.getItem('eventhub_cart') || '{"items":[]}');
    const existingItem = cart.items.find(i => i.id == eventId);
    
    // Check if item already exists in cart
    if (existingItem) {
        showToast(`⚠️ "${event.title}" is already in your cart. Proceed to checkout to complete your booking.`, 'info');
        return;
    }
    
    // Add to cart
    cart.items.push({
        id: event.id,
        title: event.title,
        price: event.price,
        quantity: 1,
        image: event.image,
        location: event.location,
        date: event.date,
        category: event.category
    });
    
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    cart.total = cart.subtotal;
    
    localStorage.setItem('eventhub_cart', JSON.stringify(cart));
    
    // Dispatch events for navbar
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
    
    const formattedPrice = `KES ${event.price.toLocaleString()}`;
    showToast(`✅ "${event.title}" has been added to your cart. Total: ${formattedPrice}`, 'success');
}

function viewEvent(eventId) {
    window.location.href = `/events/detail/?id=${eventId}`;
}

function openShareModal(eventId) {
    const event = wishlistItems.find(e => e.id == eventId);
    if (!event) return;
    currentShareEvent = event;
    if (shareLink) shareLink.value = `${window.location.origin}/events/detail/?id=${event.id}`;
    if (modal) modal.classList.add('show');
}

function closeModal() {
    if (modal) modal.classList.remove('show');
    currentShareEvent = null;
}

function shareOnFacebook() {
    if (!currentShareEvent) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`, '_blank');
}

function shareOnTwitter() {
    if (!currentShareEvent) return;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${currentShareEvent.title}`)}&url=${encodeURIComponent(`${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`, '_blank');
}

function shareOnWhatsApp() {
    if (!currentShareEvent) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${currentShareEvent.title} - ${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`, '_blank');
}

function shareViaEmail() {
    if (!currentShareEvent) return;
    window.location.href = `mailto:?subject=${encodeURIComponent(`Check out ${currentShareEvent.title}`)}&body=${encodeURIComponent(`${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`;
}

function copyShareLink() {
    if (!shareLink) return;
    shareLink.select();
    document.execCommand('copy');
    showToast('🔗 Event link copied to clipboard', 'success');
}

function updateEmptyState() {
    const hasItems = wishlistItems.length > 0;
    if (wishlistGrid) wishlistGrid.style.display = hasItems ? 'grid' : 'none';
    if (emptyWishlist) emptyWishlist.style.display = hasItems ? 'none' : 'flex';
    if (wishlistInfo) wishlistInfo.style.display = hasItems ? 'block' : 'none';
}

function updateWishlistBadge() {
    const count = wishlistItems.length;
    const badge = document.getElementById('wishlistBadgeDropdown');
    const mobileBadge = document.getElementById('mobileWishlistBadge');
    
    // Only show badge if there are items AND user is NOT on the wishlist page
    const isOnWishlistPage = window.location.pathname.includes('/wishlist/');
    
    if (badge) {
        if (count > 0 && !isOnWishlistPage) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    if (mobileBadge) {
        if (count > 0 && !isOnWishlistPage) {
            mobileBadge.textContent = count;
            mobileBadge.style.display = 'inline-block';
        } else {
            mobileBadge.style.display = 'none';
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) { return 'TBA'; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3500);
}

// Make functions global
window.removeFromWishlist = removeFromWishlist;
window.proceedToBooking = proceedToBooking;
window.viewEvent = viewEvent;
window.openShareModal = openShareModal;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareViaEmail = shareViaEmail;
window.copyShareLink = copyShareLink;
window.clearAllWishlist = clearAllWishlist;
window.forceUpdateAllWishlistButtons = forceUpdateAllWishlistButtons;