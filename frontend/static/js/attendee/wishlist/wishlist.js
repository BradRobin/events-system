// ============================================
// WISHLIST JS - Works with event IDs from localStorage
// Fetches full event data from API
// NO INTERNAL LOADING SPINNER
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

// API endpoints
const API = {
    events: '/api/attendee/events/',
    cart: '/api/attendee/cart/',
    wishlist: '/api/attendee/wishlist/'
};

// Fetch event by ID from API
async function getEventById(eventId) {
    try {
        const response = await fetch(`${API.events}${eventId}/`);
        const data = await response.json();
        
        if (data.success && data.event) {
            return data.event;
        }
        return null;
    } catch (error) {
        console.error('Error fetching event:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Wishlist page loaded');
    loadWishlist();
    setupEventListeners();
    setupModalClose();
    
    // Clear wishlist badge since user is viewing the wishlist page
    clearWishlistBadgeOnView();
});

function clearWishlistBadgeOnView() {
    // Clear wishlist badge
    const wishlistBadge = document.getElementById('wishlistBadgeDropdown');
    const mobileWishlistBadge = document.getElementById('mobileWishlistBadge');
    const myTicketsBadge = document.getElementById('myTicketsBadge');
    
    if (wishlistBadge) wishlistBadge.style.display = 'none';
    if (mobileWishlistBadge) mobileWishlistBadge.style.display = 'none';
    
    // Update My Tickets badge to only show cart count (not wishlist)
    try {
        const savedCart = localStorage.getItem('eventhub_cart');
        let cart = { items: [] };
        if (savedCart) cart = JSON.parse(savedCart);
        const cartCount = cart.items ? cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
        
        if (myTicketsBadge) {
            if (cartCount > 0) {
                myTicketsBadge.textContent = cartCount;
                myTicketsBadge.style.display = 'inline-flex';
                myTicketsBadge.style.animation = 'badgePulse 0.5s ease-in-out';
                setTimeout(() => {
                    if (myTicketsBadge) myTicketsBadge.style.animation = '';
                }, 500);
            } else {
                myTicketsBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error updating badge on view:", error);
    }
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
    try {
        const saved = localStorage.getItem('event_wishlist');
        console.log('Raw wishlist IDs:', saved);
        
        if (saved) {
            wishlistIds = JSON.parse(saved);
        } else {
            wishlistIds = [];
        }
        
        wishlistItems = [];
        
        const eventPromises = wishlistIds.map(id => getEventById(id));
        const events = await Promise.all(eventPromises);
        
        for (const event of events) {
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
                    added_at: new Date().toISOString()
                });
            }
        }
        
        console.log('Loaded wishlist items:', wishlistItems.length);
        
        filterAndDisplay();
        updateEmptyState();
        updateWishlistBadge();
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        wishlistItems = [];
        updateEmptyState();
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

// Generate star HTML based on rating
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
        <div class="wishlist-card" data-event-id="${item.id}" onclick="viewEvent(${item.id})">
            <div class="card-image-container">
                <img src="${item.image || '/static/images/placeholder.jpg'}" alt="${escapeHtml(item.title)}" class="card-image" onerror="this.src='/static/images/placeholder.jpg'">
                <div class="card-gradient-overlay"></div>
                <button class="remove-wishlist-btn" onclick="event.stopPropagation(); removeFromWishlist(${item.id})">
                    <i class="fas fa-trash-alt"></i>
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
                <button class="card-action-btn view-details-btn" onclick="event.stopPropagation(); viewEvent(${item.id})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="card-action-btn add-to-cart-btn" onclick="event.stopPropagation(); proceedToBooking(${item.id})">
                    <i class="fas fa-ticket-alt"></i> Book Ticket
                </button>
                <button class="share-btn-icon" onclick="event.stopPropagation(); openShareModal(${item.id})">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

async function removeFromWishlist(eventId) {
    wishlistIds = wishlistIds.filter(id => id != eventId);
    localStorage.setItem('event_wishlist', JSON.stringify(wishlistIds));
    
    wishlistItems = wishlistItems.filter(item => item.id != eventId);
    
    filterAndDisplay();
    updateEmptyState();
    updateWishlistBadge();
    showToast('🗑️ Event removed from your saved list', 'success');
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
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
    showToast('🗑️ Your saved list has been cleared', 'success');
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
}

async function proceedToBooking(eventId) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showToast('🔐 Please login to continue with ticket booking', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }

    if (window.CheckoutFlow) {
        window.CheckoutFlow.startCheckout(eventId, 'Regular', 1);
        return;
    }

    const event = wishlistItems.find(e => e.id == eventId);
    if (!event) {
        showToast('❌ Event details not found', 'error');
        return;
    }

    const storage = window.EventhubCartStorage;
    const cart = storage ? storage.loadEventhubCart() : { items: [], subtotal: 0, platform_fee: 0, total: 0 };

    if (cart.items.find(i => i.id == eventId)) {
        showToast('🎟️ Ticket already in your booking cart', 'info');
        return;
    }

    const slimItem = storage
        ? storage.slimCartItem({
            id: event.id,
            title: event.title,
            price: event.price,
            quantity: 1,
            image: event.image,
            location: event.location,
            date: event.date,
        })
        : {
            id: event.id,
            title: event.title,
            price: event.price,
            quantity: 1,
            location: event.location,
            date: event.date,
        };

    cart.items.push(slimItem);
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    cart.platform_fee = 0;
    cart.total = cart.subtotal;

    try {
        if (storage) {
            storage.saveEventhubCart(cart);
        } else {
            localStorage.setItem('eventhub_cart', JSON.stringify(cart));
        }
        showToast('✅ Ticket added to cart! Proceed to checkout', 'success');
        window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
        console.error('Failed to save cart:', error);
        showToast('Could not save cart. Please clear site data or book from the event page.', 'error');
    }
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
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    if (mobileBadge) {
        if (count > 0) {
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
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
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