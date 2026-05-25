// ============================================
// ATTENDEE WISHLIST - Complete Functionality
// ============================================

let wishlistItems = [];
let currentPage = 1;
let itemsPerPage = 12;
let currentSearch = '';

// DOM Elements
const wishlistGrid = document.getElementById('wishlistGrid');
const wishlistCount = document.getElementById('wishlistCount');
const paginationDiv = document.getElementById('wishlistPagination');
const searchInput = document.getElementById('searchWishlist');
const clearWishlistBtn = document.getElementById('clearWishlistBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadWishlist();
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value;
            currentPage = 1;
            filterAndDisplayWishlist();
        }, 500));
    }
}

async function loadWishlist() {
    if (wishlistGrid) {
        wishlistGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading wishlist...</p>
            </div>
        `;
    }
    
    try {
        const result = await window.AttendeeAPIEndpoints.wishlist.getList();
        wishlistItems = result.results || result;
        
        if (clearWishlistBtn) {
            clearWishlistBtn.style.display = wishlistItems.length > 0 ? 'inline-flex' : 'none';
        }
        
        filterAndDisplayWishlist();
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        if (wishlistGrid) {
            wishlistGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Wishlist</h3>
                    <p>Please try again later.</p>
                    <button class="btn-primary" onclick="loadWishlist()">Retry</button>
                </div>
            `;
        }
    }
}

function filterAndDisplayWishlist() {
    let filtered = [...wishlistItems];
    
    // Filter by search
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(item => 
            item.event?.title?.toLowerCase().includes(searchLower) ||
            item.event?.city?.toLowerCase().includes(searchLower)
        );
    }
    
    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(start, start + itemsPerPage);
    
    displayWishlist(paginatedItems);
    renderPagination(currentPage, totalPages);
    
    if (wishlistCount) {
        wishlistCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }
}

function displayWishlist(items) {
    if (!wishlistGrid) return;
    
    if (!items || items.length === 0) {
        wishlistGrid.innerHTML = `
            <div class="empty-state">
                <i class="far fa-heart"></i>
                <h3>Your wishlist is empty</h3>
                <p>Save events you're interested in to see them here.</p>
                <a href="/attendee/events/" class="btn-primary">Browse Events</a>
            </div>
        `;
        return;
    }
    
    wishlistGrid.innerHTML = items.map(item => `
        <div class="wishlist-card" data-id="${item.event?.id}">
            <div class="wishlist-image" style="background-image: url('${item.event?.banner_image || '/static/images/placeholder-event.jpg'}')">
                ${item.event?.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                <button class="remove-wishlist-btn" onclick="removeFromWishlist(${item.event?.id})" title="Remove from wishlist">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="wishlist-content">
                <h3 class="wishlist-title" onclick="window.location.href='/attendee/events/detail/?id=${item.event?.id}'">
                    ${escapeHtml(item.event?.title)}
                </h3>
                <div class="wishlist-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(item.event?.start_date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.event?.city)}</span>
                </div>
                <div class="wishlist-footer">
                    <div class="wishlist-price">${formatCurrency(item.event?.min_price)}</div>
                    <div class="wishlist-availability">
                        ${item.event?.available_tickets > 0 ? 
                            `<span class="available">${item.event.available_tickets} left</span>` : 
                            '<span class="sold-out">Sold Out</span>'}
                    </div>
                </div>
                <div class="wishlist-actions">
                    ${item.event?.available_tickets > 0 ? `
                        <button class="btn-primary" onclick="bookNow(${item.event?.id})">
                            Book Now
                        </button>
                    ` : ''}
                    <button class="btn-outline" onclick="window.location.href='/attendee/events/detail/?id=${item.event?.id}'">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function removeFromWishlist(eventId) {
    if (window.Loader) window.Loader.show('Removing from wishlist...');
    
    try {
        await window.AttendeeAPIEndpoints.wishlist.remove(eventId);
        showToast('Removed from wishlist', 'success');
        await loadWishlist();
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showToast('Failed to remove from wishlist', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function clearWishlist() {
    const confirmed = confirm('Are you sure you want to clear your entire wishlist?');
    if (!confirmed) return;
    
    if (window.Loader) window.Loader.show('Clearing wishlist...');
    
    try {
        await window.AttendeeAPIEndpoints.wishlist.clear();
        showToast('Wishlist cleared', 'success');
        await loadWishlist();
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        showToast('Failed to clear wishlist', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function bookNow(eventId) {
    window.location.href = `/attendee/events/detail/?id=${eventId}#tickets`;
}

function renderPagination(current, total) {
    if (!paginationDiv || total <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1) {
        currentPage = page;
        filterAndDisplayWishlist();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.bookNow = bookNow;
window.changePage = changePage;