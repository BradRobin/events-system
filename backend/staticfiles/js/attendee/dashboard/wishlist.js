// ============================================
// ATTENDEE WISHLIST JAVASCRIPT
// Handles: Wishlist display, add/remove items
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
    setupWishlistFilters();
});

async function loadWishlist() {
    showLoading();
    
    try {
        const response = await fetch('/api/user/wishlist/');
        const data = await response.json();
        
        if (data && data.length) {
            displayWishlist(data);
            updateWishlistCount(data.length);
        } else {
            displayEmptyWishlist();
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
        displayEmptyWishlist();
    }
    
    hideLoading();
}

function displayWishlist(items) {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div class="col-md-4 mb-4" data-wishlist-id="${item.id}" data-event-id="${item.event_id}">
            <div class="card wishlist-card h-100">
                <div class="position-relative">
                    ${item.event_image ? 
                        `<img src="${item.event_image}" class="card-img-top" alt="${item.event_title}" style="height: 200px; object-fit: cover;">` : 
                        `<div class="card-img-top bg-gradient d-flex align-items-center justify-content-center" style="height: 200px;">
                            <i class="fas fa-calendar-alt fa-3x text-white"></i>
                        </div>`
                    }
                    <button class="btn-remove-wishlist" onclick="removeFromWishlist(${item.event_id}, this)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${item.event_title}</h5>
                    <p class="card-text text-muted">
                        <i class="fas fa-map-marker-alt"></i> ${item.event_venue}<br>
                        <i class="fas fa-calendar"></i> ${new Date(item.event_date).toLocaleDateString()}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="h5 text-primary mb-0">$${item.event_price}</span>
                        <span class="badge ${item.event_available > 0 ? 'bg-success' : 'bg-danger'}">
                            ${item.event_available} seats left
                        </span>
                    </div>
                </div>
                <div class="card-footer bg-white">
                    <a href="/event/${item.event_id}/" class="btn btn-primary w-100">
                        <i class="fas fa-shopping-cart"></i> Book Now
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

function displayEmptyWishlist() {
    const container = document.getElementById('wishlistContainer');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="card shadow text-center py-5">
                    <i class="fas fa-heart-broken fa-4x text-muted mb-3"></i>
                    <h3>Your Wishlist is Empty</h3>
                    <p>Save events you love to your wishlist and book them later.</p>
                    <a href="/events/" class="btn btn-primary">Browse Events</a>
                </div>
            </div>
        `;
    }
}

async function addToWishlist(eventId, buttonElement) {
    showButtonLoading(buttonElement);
    
    try {
        const response = await fetch('/api/user/wishlist/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ event_id: eventId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Added to wishlist!', 'success');
            if (buttonElement) {
                buttonElement.innerHTML = '<i class="fas fa-heart"></i> Saved';
                buttonElement.disabled = true;
            }
            updateWishlistCount(1);
        } else {
            showToast(data.message || 'Failed to add', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        hideButtonLoading(buttonElement);
    }
}

async function removeFromWishlist(eventId, element) {
    showCardLoading(element);
    
    try {
        const response = await fetch('/api/user/wishlist/remove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ event_id: eventId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const card = element.closest('.col-md-4');
            if (card) {
                card.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => card.remove(), 300);
            }
            showToast('Removed from wishlist', 'success');
            updateWishlistCount(-1);
            
            if (document.querySelectorAll('.wishlist-card').length === 0) {
                displayEmptyWishlist();
            }
        } else {
            showToast(data.message || 'Remove failed', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        hideCardLoading(element);
    }
}

async function clearWishlist() {
    if (!confirm('Remove all events from your wishlist?')) return;
    
    const items = document.querySelectorAll('.wishlist-card');
    if (!items.length) return;
    
    showGlobalLoading();
    
    try {
        const response = await fetch('/api/user/wishlist/clear/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Wishlist cleared', 'success');
            displayEmptyWishlist();
            updateWishlistCount(-items.length);
        } else {
            showToast(data.message || 'Failed to clear', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        hideGlobalLoading();
    }
}

function setupWishlistFilters() {
    const filterSelect = document.getElementById('wishlistFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const filter = this.value;
            const items = document.querySelectorAll('[data-wishlist-id]');
            
            items.forEach(item => {
                const eventDate = new Date(item.dataset.eventDate);
                const now = new Date();
                
                switch(filter) {
                    case 'upcoming':
                        item.style.display = eventDate > now ? 'block' : 'none';
                        break;
                    case 'past':
                        item.style.display = eventDate < now ? 'block' : 'none';
                        break;
                    default:
                        item.style.display = 'block';
                }
            });
        });
    }
}

function updateWishlistCount(change) {
    const badge = document.getElementById('wishlistCount');
    if (badge) {
        const currentCount = parseInt(badge.innerText) || 0;
        badge.innerText = Math.max(0, currentCount + change);
    }
}

function showButtonLoading(button) {
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
}

function hideButtonLoading(button) {
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="far fa-heart"></i> Wishlist';
    }
}

function showCardLoading(element) {
    const card = element.closest('.col-md-4');
    if (card) card.style.opacity = '0.5';
}

function hideCardLoading(element) {
    const card = element.closest('.col-md-4');
    if (card) card.style.opacity = '1';
}

function showGlobalLoading() {
    const btn = document.getElementById('clearWishlistBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
    }
}

function hideGlobalLoading() {
    const btn = document.getElementById('clearWishlistBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Clear All';
    }
}

function showLoading() {
    const container = document.getElementById('wishlistContainer');
    if (container && !container.querySelector('.wishlist-card')) {
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading wishlist...</p></div>';
    }
}

function hideLoading() {
    // Loading hidden by display functions
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-heart' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); display: none; }
    }
`;
document.head.appendChild(style);
