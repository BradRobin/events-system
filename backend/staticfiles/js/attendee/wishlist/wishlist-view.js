// ============================================
// ATTENDEE WISHLIST VIEW
// Handles: Displaying user's wishlist
// ============================================

let wishlistItems = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wishlistContainer')) {
        loadWishlist();
    }
    setupWishlistFilters();
});

async function loadWishlist() {
    showLoading();
    
    const wishlist = await EventAPI.Attendee.getWishlist();
    if (wishlist && wishlist.length) {
        wishlistItems = wishlist;
        displayWishlist(wishlist);
        updateWishlistCount(wishlist.length);
    } else {
        displayEmptyState();
    }
    
    hideLoading();
}

function displayWishlist(items) {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;
    
    let filteredItems = items;
    if (currentFilter === 'upcoming') {
        filteredItems = items.filter(item => new Date(item.event_date) > new Date());
    } else if (currentFilter === 'past') {
        filteredItems = items.filter(item => new Date(item.event_date) < new Date());
    }
    
    if (!filteredItems.length) {
        container.innerHTML = `
            <div class="empty-filter">
                <p>No ${currentFilter} events in your wishlist</p>
                <button onclick="resetWishlistFilter()">Show All</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredItems.map(item => `
        <div class="wishlist-card" data-event-id="${item.event_id}" data-event-date="${item.event_date}">
            <div class="wishlist-image">
                ${item.event_image ? 
                    `<img src="${item.event_image}" alt="${item.event_title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                <div class="wishlist-actions">
                    <button class="btn-remove" onclick="removeFromWishlist(${item.event_id})" title="Remove from Wishlist">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            </div>
            <div class="wishlist-info">
                <h3 class="wishlist-title">${item.event_title}</h3>
                <div class="wishlist-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${item.event_venue}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(item.event_date).toLocaleDateString()}</span>
                    <span class="wishlist-price">KES ${item.event_price.toLocaleString()}</span>
                </div>
                <div class="wishlist-footer">
                    <a href="/event/${item.event_id}/" class="btn-view">View Event</a>
                    <button class="btn-book" onclick="bookFromWishlist(${item.event_id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add animation to new cards
    const cards = document.querySelectorAll('.wishlist-card');
    cards.forEach(card => {
        card.style.animation = 'fadeInUp 0.5s ease-out';
    });
}

function setupWishlistFilters() {
    const filterBtns = document.querySelectorAll('.wishlist-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayWishlist(wishlistItems);
        });
    });
}

function resetWishlistFilter() {
    currentFilter = 'all';
    const filterBtns = document.querySelectorAll('.wishlist-filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.wishlist-filter-btn[data-filter="all"]')?.classList.add('active');
    displayWishlist(wishlistItems);
}

function updateWishlistCount(count) {
    const badge = document.getElementById('wishlistCount');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function displayEmptyState() {
    const container = document.getElementById('wishlistContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart-broken fa-4x"></i>
                <h3>Your Wishlist is Empty</h3>
                <p>Save events you love to your wishlist and book them later.</p>
                <a href="/events/" class="btn-browse"><i class="fas fa-calendar-alt"></i> Browse Events</a>
            </div>
        `;
    }
}

async function bookFromWishlist(eventId) {
    window.location.href = `/event/${eventId}/`;
}

function showLoading() {
    const container = document.getElementById('wishlistContainer');
    if (container && !container.querySelector('.wishlist-card')) {
        container.innerHTML = '<div class="loading"><i class="fas fa-heart fa-spin"></i> Loading wishlist...</div>';
    }
}

function hideLoading() {
    // Loading hidden by displayWishlist or displayEmptyState
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
