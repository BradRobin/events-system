// ============================================
// ATTENDEE WISHLIST - Complete Functionality
// ============================================

let wishlistItems = [];
let currentSearch = '';
let currentCategory = '';

// DOM Elements
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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadWishlist();
    setupEventListeners();
    setupModalClose();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value.toLowerCase();
            filterAndDisplayWishlist();
        }, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategory = this.value;
            filterAndDisplayWishlist();
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllWishlist);
    }
}

function setupModalClose() {
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal());
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

async function loadWishlist() {
    showLoading();
    
    try {
        // Load wishlist from localStorage
        const savedWishlist = localStorage.getItem('event_wishlist');
        const wishlistIds = savedWishlist ? JSON.parse(savedWishlist) : [];
        
        if (wishlistIds.length === 0) {
            wishlistItems = [];
            updateEmptyState();
            return;
        }
        
        // Fetch events from API
        const events = await fetchEventsByIds(wishlistIds);
        wishlistItems = events;
        
        filterAndDisplayWishlist();
        updateEmptyState();
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showError('Failed to load wishlist');
    } finally {
        hideLoading();
    }
}

async function fetchEventsByIds(ids) {
    if (!ids.length) return [];
    
    try {
        // Replace with your actual API endpoint
        const response = await fetch(`/api/events/?ids=${ids.join(',')}`);
        if (response.ok) {
            const data = await response.json();
            return data.events || [];
        }
    } catch (error) {
        console.warn('API fetch failed, using localStorage events');
    }
    
    // Fallback: return empty array
    return [];
}

function filterAndDisplayWishlist() {
    let filtered = [...wishlistItems];
    
    // Filter by search
    if (currentSearch) {
        filtered = filtered.filter(item => 
            (item.title || '').toLowerCase().includes(currentSearch) ||
            (item.location || '').toLowerCase().includes(currentSearch)
        );
    }
    
    // Filter by category
    if (currentCategory) {
        filtered = filtered.filter(item => (item.category || '').toLowerCase() === currentCategory);
    }
    
    displayWishlist(filtered);
    updateWishlistCount(filtered.length);
}

function displayWishlist(items) {
    if (!wishlistGrid) return;
    
    if (!items || items.length === 0) {
        wishlistGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-search"></i>
                <h3>No matching events</h3>
                <p>Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }
    
    wishlistGrid.innerHTML = items.map(item => `
        <div class="wishlist-card" data-event-id="${item.id}">
            <div class="card-image-container">
                <img src="${item.image || '/static/images/placeholder.jpg'}" alt="${escapeHtml(item.title)}" class="card-image" onerror="this.src='/static/images/placeholder.jpg'">
                <div class="card-gradient-overlay"></div>
                <button class="remove-wishlist-btn" onclick="event.stopPropagation(); removeFromWishlist(${item.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="card-content" onclick="viewEvent(${item.id})">
                <span class="card-category">${escapeHtml(item.category_name || item.category || 'Event')}</span>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location || 'TBD')}</span>
                </div>
                <div class="card-price">
                    KES ${(item.price || 0).toLocaleString()}
                    ${item.original_price && item.original_price > item.price ? `<span class="original-price">KES ${item.original_price.toLocaleString()}</span>` : ''}
                </div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn view-details-btn" onclick="viewEvent(${item.id})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="card-action-btn add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${item.id})">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="share-btn-icon" onclick="event.stopPropagation(); openShareModal(${item.id})" title="Share">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function removeFromWishlist(eventId) {
    showLoader('Removing from wishlist...');
    
    try {
        // Update localStorage
        const savedWishlist = localStorage.getItem('event_wishlist');
        let wishlistIds = savedWishlist ? JSON.parse(savedWishlist) : [];
        wishlistIds = wishlistIds.filter(id => id != eventId);
        localStorage.setItem('event_wishlist', JSON.stringify(wishlistIds));
        
        // Remove from current items
        wishlistItems = wishlistItems.filter(item => item.id != eventId);
        
        filterAndDisplayWishlist();
        updateEmptyState();
        updateWishlistBadge();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        
        showToast('Removed from wishlist', 'success');
        
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showToast('Failed to remove from wishlist', 'error');
    } finally {
        hideLoader();
    }
}

async function clearAllWishlist() {
    if (wishlistItems.length === 0) return;
    
    const confirmed = confirm('Are you sure you want to clear your entire wishlist?');
    if (!confirmed) return;
    
    showLoader('Clearing wishlist...');
    
    try {
        localStorage.setItem('event_wishlist', JSON.stringify([]));
        wishlistItems = [];
        
        filterAndDisplayWishlist();
        updateEmptyState();
        updateWishlistBadge();
        
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        
        showToast('Wishlist cleared', 'success');
        
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        showToast('Failed to clear wishlist', 'error');
    } finally {
        hideLoader();
    }
}

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
    
    const event = wishlistItems.find(e => e.id === eventId);
    if (!event) return;
    
    showLoader('Adding to cart...');
    
    try {
        let cart = localStorage.getItem('eventhub_cart');
        cart = cart ? JSON.parse(cart) : { items: [], subtotal: 0, platform_fee: 0, total: 0 };
        
        const existingItem = cart.items.find(i => i.id === eventId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({
                id: event.id,
                title: event.title,
                price: event.price,
                quantity: 1,
                image: event.image,
                location: event.location
            });
        }
        
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.platform_fee = Math.ceil(cart.subtotal * 0.05);
        cart.total = cart.subtotal + cart.platform_fee;
        
        localStorage.setItem('eventhub_cart', JSON.stringify(cart));
        
        showToast('Added to cart!', 'success');
        updateCartCount();
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Failed to add to cart', 'error');
    } finally {
        hideLoader();
    }
}

function viewEvent(eventId) {
    window.location.href = `/events/detail/?id=${eventId}`;
}

function openShareModal(eventId) {
    const event = wishlistItems.find(e => e.id === eventId);
    if (!event) return;
    
    currentShareEvent = event;
    const eventUrl = `${window.location.origin}/events/detail/?id=${event.id}`;
    
    if (shareLink) shareLink.value = eventUrl;
    if (modal) modal.classList.add('show');
}

function closeModal() {
    if (modal) modal.classList.remove('show');
    currentShareEvent = null;
}

function shareOnFacebook() {
    if (!currentShareEvent) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
    if (!currentShareEvent) return;
    const text = `Check out ${currentShareEvent.title} on EventHub!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${window.location.origin}/events/detail/?id=${currentShareEvent.id}`)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp() {
    if (!currentShareEvent) return;
    const text = `Check out ${currentShareEvent.title} on EventHub! ${window.location.origin}/events/detail/?id=${currentShareEvent.id}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function shareViaEmail() {
    if (!currentShareEvent) return;
    const subject = `Check out ${currentShareEvent.title}`;
    const body = `I thought you might be interested in ${currentShareEvent.title}. Check it out: ${window.location.origin}/events/detail/?id=${currentShareEvent.id}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function copyShareLink() {
    if (!shareLink) return;
    shareLink.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard!', 'success');
}

function updateWishlistCount(count) {
    if (wishlistCountSpan) {
        wishlistCountSpan.textContent = count;
    }
    if (wishlistInfo) {
        wishlistInfo.style.display = count > 0 ? 'block' : 'none';
    }
}

function updateEmptyState() {
    const hasItems = wishlistItems.length > 0;
    
    if (wishlistGrid) wishlistGrid.style.display = hasItems ? 'grid' : 'none';
    if (emptyWishlist) emptyWishlist.style.display = hasItems ? 'none' : 'flex';
    if (wishlistInfo) wishlistInfo.style.display = hasItems ? 'block' : 'none';
}

function updateWishlistBadge() {
    const wishlistCount = wishlistItems.length;
    const badge = document.getElementById('wishlistBadgeDropdown');
    const mobileBadge = document.getElementById('mobileWishlistBadge');
    
    if (badge) {
        badge.textContent = wishlistCount;
        badge.style.display = wishlistCount > 0 ? 'inline-block' : 'none';
    }
    if (mobileBadge) {
        mobileBadge.textContent = wishlistCount;
        mobileBadge.style.display = wishlistCount > 0 ? 'inline-block' : 'none';
    }
}

function updateCartCount() {
    const cart = localStorage.getItem('eventhub_cart');
    const items = cart ? JSON.parse(cart).items : [];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    
    const badge = document.getElementById('cartBadgeDropdown');
    const mobileBadge = document.getElementById('mobileCartBadge');
    
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (mobileBadge) {
        mobileBadge.textContent = count;
        mobileBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Helper Functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function showLoading() {
    if (wishlistGrid) {
        wishlistGrid.innerHTML = `
            <div class="loading-state" style="grid-column: 1/-1;">
                <div class="loading-spinner"></div>
                <p>Loading your wishlist...</p>
            </div>
        `;
    }
}

function hideLoading() {
    // Handled by display functions
}

function showError(message) {
    if (wishlistGrid) {
        wishlistGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Something went wrong</h3>
                <p>${escapeHtml(message)}</p>
                <button class="btn-browse" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showLoader(message) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        const textEl = loader.querySelector('.loader-text');
        if (textEl) textEl.textContent = message || 'Loading...';
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// Make functions global
window.removeFromWishlist = removeFromWishlist;
window.addToCart = addToCart;
window.viewEvent = viewEvent;
window.openShareModal = openShareModal;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareViaEmail = shareViaEmail;
window.copyShareLink = copyShareLink;
window.clearAllWishlist = clearAllWishlist;