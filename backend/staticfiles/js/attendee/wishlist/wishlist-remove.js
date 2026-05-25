// ============================================
// ATTENDEE REMOVE FROM WISHLIST
// Handles: Removing events from wishlist
// ============================================

async function removeFromWishlist(eventId, buttonElement = null) {
    if (!confirm('Remove this event from your wishlist?')) return;
    
    showLoading(buttonElement || eventId);
    
    const result = await EventAPI.Attendee.removeFromWishlist(eventId);
    if (result) {
        showToast('Event removed from wishlist', 'info');
        
        // Remove from UI
        const card = document.querySelector(`.wishlist-card[data-event-id="${eventId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => card.remove(), 300);
        }
        
        // Update button on event page
        updateEventPageWishlistButton(eventId);
        
        // Update wishlist count
        updateWishlistCount(-1);
        
        // Check if wishlist is empty
        const remainingCards = document.querySelectorAll('.wishlist-card').length;
        if (remainingCards === 0 && typeof displayEmptyState === 'function') {
            displayEmptyState();
        }
    }
    
    hideLoading(buttonElement || eventId);
}

async function removeAllFromWishlist() {
    const cards = document.querySelectorAll('.wishlist-card');
    if (!cards.length) return;
    
    if (!confirm(`Remove all ${cards.length} events from your wishlist?`)) return;
    
    showGlobalLoading();
    
    for (const card of cards) {
        const eventId = parseInt(card.dataset.eventId);
        await EventAPI.Attendee.removeFromWishlist(eventId);
        card.remove();
    }
    
    showToast('Wishlist cleared', 'info');
    
    if (typeof displayEmptyState === 'function') {
        displayEmptyState();
    }
    
    updateWishlistCount(-cards.length);
    
    hideGlobalLoading();
}

function updateEventPageWishlistButton(eventId) {
    const wishlistBtn = document.querySelector(`.add-to-wishlist[data-event-id="${eventId}"]`);
    if (wishlistBtn) {
        wishlistBtn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
        wishlistBtn.classList.remove('active');
        wishlistBtn.disabled = false;
        delete wishlistBtn.dataset.originalHtml;
    }
}

function updateWishlistCount(decrement) {
    const countSpan = document.getElementById('wishlistCount');
    if (countSpan) {
        const currentCount = parseInt(countSpan.innerText) || 0;
        const newCount = Math.max(0, currentCount + decrement);
        countSpan.innerText = newCount;
        countSpan.style.display = newCount > 0 ? 'inline-block' : 'none';
    }
}

function showLoading(target) {
    if (typeof target === 'number') {
        // It's an eventId, find the card
        const card = document.querySelector(`.wishlist-card[data-event-id="${target}"]`);
        if (card) {
            const actions = card.querySelector('.wishlist-actions');
            if (actions) actions.style.opacity = '0.5';
        }
    } else if (target && target.tagName === 'BUTTON') {
        target.disabled = true;
        target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
}

function hideLoading(target) {
    if (typeof target === 'number') {
        const card = document.querySelector(`.wishlist-card[data-event-id="${target}"]`);
        if (card) {
            const actions = card.querySelector('.wishlist-actions');
            if (actions) actions.style.opacity = '1';
        }
    } else if (target && target.tagName === 'BUTTON' && target.dataset.originalHtml) {
        target.disabled = false;
        target.innerHTML = target.dataset.originalHtml;
    }
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
        btn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-heart' : 'fa-heart-broken'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.9);
        }
    }
`;
document.head.appendChild(style);
