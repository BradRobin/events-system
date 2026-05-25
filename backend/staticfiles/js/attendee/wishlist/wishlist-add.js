// ============================================
// ATTENDEE ADD TO WISHLIST
// Handles: Adding events to wishlist
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupWishlistButtons();
});

function setupWishlistButtons() {
    const wishlistBtns = document.querySelectorAll('.add-to-wishlist');
    wishlistBtns.forEach(btn => {
        const eventId = btn.dataset.eventId;
        checkWishlistStatus(eventId, btn);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addToWishlist(eventId, btn);
        });
    });
}

async function addToWishlist(eventId, buttonElement) {
    if (!eventId) {
        showToast('Event not found', 'error');
        return;
    }
    
    showLoading(buttonElement);
    
    const result = await EventAPI.Attendee.addToWishlist(eventId);
    if (result) {
        showToast('Event added to wishlist!', 'success');
        
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="fas fa-heart"></i> Saved';
            buttonElement.classList.add('active');
            buttonElement.disabled = true;
        }
        
        // Update wishlist count
        updateWishlistCount(1);
        
        // Add to wishlist page dynamically if open
        addToWishlistPage(eventId);
    }
    
    hideLoading(buttonElement);
}

async function checkWishlistStatus(eventId, buttonElement) {
    const wishlist = await EventAPI.Attendee.getWishlist();
    if (wishlist && wishlist.some(item => item.event_id == eventId)) {
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="fas fa-heart"></i> Saved';
            buttonElement.classList.add('active');
            buttonElement.disabled = true;
        }
        return true;
    }
    return false;
}

function addToWishlistPage(eventId) {
    // If we're on the wishlist page, dynamically add the event
    const container = document.getElementById('wishlistContainer');
    if (container && !document.querySelector(`.wishlist-card[data-event-id="${eventId}"]`)) {
        // Refresh the wishlist
        if (typeof loadWishlist === 'function') {
            loadWishlist();
        }
    }
}

function updateWishlistCount(increment) {
    const countSpan = document.getElementById('wishlistCount');
    if (countSpan) {
        const currentCount = parseInt(countSpan.innerText) || 0;
        countSpan.innerText = currentCount + increment;
        countSpan.style.display = (currentCount + increment) > 0 ? 'inline-block' : 'none';
    }
}

function showLoading(button) {
    if (button) {
        button.disabled = true;
        const originalHtml = button.innerHTML;
        button.dataset.originalHtml = originalHtml;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
}

function hideLoading(button) {
    if (button && button.dataset.originalHtml) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml;
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-heart' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
