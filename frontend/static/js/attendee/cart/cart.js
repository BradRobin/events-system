// ============================================
// BOOKING CART - Complete Payment Flow
// No Global Loader - Uses local spinners only
// ============================================

let cartData = null;
let paymentTimeout = null;

// DOM Elements
const emptyCartEl = document.getElementById('emptyCart');
const cartContentEl = document.getElementById('cartContent');
const checkoutViewEl = document.getElementById('checkoutView');
const paymentViewEl = document.getElementById('paymentView');
const cartItemsEl = document.getElementById('cartItems');
const cartItemCountSpan = document.getElementById('cartItemCount');
const subtotalSpan = document.getElementById('subtotal');
const platformFeeSpan = document.getElementById('platformFee');
const discountRow = document.getElementById('discountRow');
const discountAmountSpan = document.getElementById('discountAmount');
const totalAmountSpan = document.getElementById('totalAmount');
const appliedPromoDiv = document.getElementById('appliedPromo');
const promoCodeDisplaySpan = document.getElementById('promoCodeDisplay');
const promoForm = document.getElementById('promoForm');
const checkoutForm = document.getElementById('checkoutForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    setupEventListeners();
    
    // Clear cart badge since user is viewing the cart page
    clearCartBadgeOnView();
});

function clearCartBadgeOnView() {
    // Clear cart badge
    const navCartBadge = document.getElementById('navCartBadge');
    const myTicketsBadge = document.getElementById('myTicketsBadge');
    
    if (navCartBadge) navCartBadge.style.display = 'none';
    
    // Update My Tickets badge to only show wishlist count (not cart)
    try {
        const savedWishlist = localStorage.getItem('event_wishlist');
        const wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
        const wishlistCount = wishlist.length;
        
        if (myTicketsBadge) {
            if (wishlistCount > 0) {
                myTicketsBadge.textContent = wishlistCount;
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
    if (promoForm) {
        promoForm.addEventListener('submit', applyPromoCode);
    }
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processCheckout);
    }
}

function loadCart() {
    try {
        if (window.EventhubCartStorage) {
            cartData = window.EventhubCartStorage.loadEventhubCart();
        } else {
            const savedCart = localStorage.getItem('eventhub_cart');
            cartData = savedCart ? JSON.parse(savedCart) : { items: [], subtotal: 0, platform_fee: 0, total: 0 };
        }
        if (!cartData.items) cartData.items = [];
        if (!cartData.subtotal) cartData.subtotal = 0;
        if (!cartData.platform_fee) cartData.platform_fee = 0;
        if (!cartData.total) cartData.total = 0;
        if (cartData.discount_amount === undefined) cartData.discount_amount = 0;
        if (cartData.promo_code === undefined) cartData.promo_code = null;
        
        displayCart();
        
        if (!cartData.items || cartData.items.length === 0) {
            if (emptyCartEl) emptyCartEl.style.display = 'block';
            if (cartContentEl) cartContentEl.style.display = 'none';
        } else {
            if (emptyCartEl) emptyCartEl.style.display = 'none';
            if (cartContentEl) cartContentEl.style.display = 'block';
            updateCartCount(cartData.items.length);
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showToast('Failed to load cart', 'error');
    }
}

function displayCart() {
    try {
        if (!cartItemsEl) return;
        
        if (!cartData.items || cartData.items.length === 0) {
            cartItemsEl.innerHTML = '<div class="empty-cart-message">Your booking cart is empty</div>';
            return;
        }
        
        cartItemsEl.innerHTML = cartData.items.map(item => {
            return `
                <div class="booking-item" data-id="${item.id}">
                    <div class="item-image" style="background-image: url('${item.image || '/static/images/placeholder.jpg'}')"></div>
                    <div class="item-details">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p class="item-type">${escapeHtml(item.category || 'Event')}</p>
                        <p class="item-date">${formatDate(item.date)}</p>
                        <p class="item-venue">${escapeHtml(item.location)}</p>
                    </div>
                    <div class="item-quantity">
                        <button class="qty-btn minus" onclick="updateItemQuantity(${item.id}, -1)">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn plus" onclick="updateItemQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
                    <button class="remove-item" onclick="removeItem(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        if (cartItemCountSpan) cartItemCountSpan.textContent = cartData.items.length;
        if (subtotalSpan) subtotalSpan.textContent = formatCurrency(cartData.subtotal);
        if (platformFeeSpan) platformFeeSpan.textContent = formatCurrency(cartData.platform_fee || 0);
        if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(cartData.total);
        
        if (cartData.discount_amount && cartData.discount_amount > 0) {
            if (discountRow) discountRow.style.display = 'flex';
            if (discountAmountSpan) discountAmountSpan.textContent = `-${formatCurrency(cartData.discount_amount)}`;
        } else {
            if (discountRow) discountRow.style.display = 'none';
        }
        
        if (cartData.promo_code) {
            if (appliedPromoDiv) appliedPromoDiv.style.display = 'flex';
            if (promoCodeDisplaySpan) promoCodeDisplaySpan.textContent = cartData.promo_code;
        } else {
            if (appliedPromoDiv) appliedPromoDiv.style.display = 'none';
        }
    } catch (error) {
        console.error("Error in displayCart:", error);
    }
}

async function updateItemQuantity(itemId, delta) {
    const item = cartData.items.find(i => i.id == itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;
    
    try {
        item.quantity = newQuantity;
        recalculateCartTotals();
        saveCartToLocalStorage();
        displayCart();
        showToast('Booking updated', 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    }
}

async function removeItem(itemId) {
    try {
        cartData.items = cartData.items.filter(i => i.id != itemId);
        recalculateCartTotals();
        saveCartToLocalStorage();
        displayCart();
        
        if (cartData.items.length === 0) {
            if (emptyCartEl) emptyCartEl.style.display = 'block';
            if (cartContentEl) cartContentEl.style.display = 'none';
        }
        
        updateCartCount(cartData.items.length);
        showToast('Event removed from booking', 'success');
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Failed to remove item', 'error');
    }
}

async function clearCart() {
    if (!confirm('Are you sure you want to clear all events from your booking?')) return;
    
    try {
        cartData.items = [];
        cartData.subtotal = 0;
        cartData.total = 0;
        cartData.discount_amount = 0;
        cartData.promo_code = null;
        saveCartToLocalStorage();
        displayCart();
        
        if (emptyCartEl) emptyCartEl.style.display = 'block';
        if (cartContentEl) cartContentEl.style.display = 'none';
        updateCartCount(0);
        showToast('Booking cleared', 'success');
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast('Failed to clear booking', 'error');
    }
}

function recalculateCartTotals() {
    cartData.subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartData.platform_fee = 0;
    cartData.total = cartData.subtotal - (cartData.discount_amount || 0);
}

function saveCartToLocalStorage() {
    try {
        if (window.EventhubCartStorage) {
            window.EventhubCartStorage.saveEventhubCart(cartData);
        } else {
            localStorage.setItem('eventhub_cart', JSON.stringify(cartData));
        }
    } catch (error) {
        console.error('Failed to save cart:', error);
        showToast('Could not save cart — storage may be full. Remove old items and try again.', 'error');
    }
}

async function applyPromoCode(e) {
    e.preventDefault();
    const code = document.getElementById('promoCode')?.value.trim();
    if (!code) { showToast('Please enter a promo code', 'error'); return; }
    
    try {
        if (code.toUpperCase() === 'WELCOME10') {
            cartData.discount_amount = Math.floor(cartData.subtotal * 0.1);
            cartData.promo_code = code.toUpperCase();
            recalculateCartTotals();
            saveCartToLocalStorage();
            displayCart();
            document.getElementById('promoCode').value = '';
            showToast('Promo code applied!', 'success');
        } else {
            showToast('Invalid promo code', 'error');
        }
    } catch (error) {
        showToast('Invalid promo code', 'error');
    }
}

async function removePromoCode() {
    try {
        cartData.discount_amount = 0;
        cartData.promo_code = null;
        recalculateCartTotals();
        saveCartToLocalStorage();
        displayCart();
        showToast('Promo code removed', 'success');
    } catch (error) {
        showToast('Failed to remove promo code', 'error');
    }
}

function proceedToCheckout() {
    const token = localStorage.getItem('attendee_access_token');
    const user = localStorage.getItem('attendee_user');
    
    if (!token || !user) {
        localStorage.setItem('redirect_after_login', '/cart/');
        showToast('Please login to complete your booking', 'info');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 1500);
        return;
    }
    
    if (!cartData.items || cartData.items.length === 0) {
        showToast('Your booking cart is empty', 'error');
        return;
    }
    
    cartContentEl.style.display = 'none';
    checkoutViewEl.style.display = 'block';
    prefillBillingInfo();
    
    const checkoutOrderSummary = document.getElementById('checkoutOrderSummary');
    if (checkoutOrderSummary) {
        checkoutOrderSummary.innerHTML = `
            <div class="summary-row"><span>Subtotal (${cartData.items.length} items):</span><span>${formatCurrency(cartData.subtotal)}</span></div>
            ${cartData.discount_amount ? `<div class="summary-row discount"><span>Discount:</span><span>-${formatCurrency(cartData.discount_amount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total Amount:</span><span>${formatCurrency(cartData.total)}</span></div>
        `;
    }
}

function prefillBillingInfo() {
    try {
        if (window.AccountProfile) {
            // Sync from API in the background to ensure latest data
            AccountProfile.syncFromAPI();

            // Prefill all billing fields from stored profile
            AccountProfile.prefill({
                billingName:  'name',
                billingEmail: 'email'
            });
        } else {
            // Fallback: manual parse
            const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
            const nameInput = document.getElementById('billingName');
            const emailInput = document.getElementById('billingEmail');
            if (nameInput) nameInput.value = user.full_name || user.name || '';
            if (emailInput) emailInput.value = user.email || '';
        }
    } catch (error) {}
}

function backToCart() {
    checkoutViewEl.style.display = 'none';
    cartContentEl.style.display = 'block';
}

async function processCheckout(e) {
    e.preventDefault();

    if (!window.CheckoutFlow) {
        showToast('Checkout is loading. Please try again.', 'error');
        return;
    }

    const item = cartData.items[0];
    if (!item) {
        showToast('Your booking cart is empty', 'error');
        return;
    }

    if (cartData.items.length > 1) {
        showToast('Complete payment for each event one at a time.', 'info');
    }

    backToCart();
    const ticketType = item.ticket_type || 'Regular';
    await window.CheckoutFlow.startCheckout(item.id, ticketType, item.quantity);
}

function onCartCheckoutSuccess() {
    if (!cartData.items.length) return;
    cartData.items.shift();
    recalculateCartTotals();
    saveCartToLocalStorage();
    displayCart();
    if (cartData.items.length > 0) {
        showToast('Payment complete! Continue with the next event in your cart.', 'success');
    } else {
        localStorage.removeItem('eventhub_cart');
        updateCartCount(0);
        showToast('All bookings complete!', 'success');
        setTimeout(() => { window.location.href = '/tickets/'; }, 2000);
    }
}

window.addEventListener('checkout-success', onCartCheckoutSuccess);
window.addEventListener('checkout-submitted', onCartCheckoutSuccess);

function cancelPayment() {
    if (paymentTimeout) {
        clearTimeout(paymentTimeout);
        paymentTimeout = null;
    }
    backToCart();
    showToast('Payment cancelled', 'info');
}

function updateCartCount(count) {
    const cartBadge = document.getElementById('cartBadgeDropdown');
    if (cartBadge) {
        const itemCount = count !== undefined ? count : (cartData?.items?.length || 0);
        if (itemCount > 0) {
            cartBadge.textContent = itemCount > 99 ? '99+' : itemCount;
            cartBadge.style.display = 'inline-block';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        return new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) { return 'TBA'; }
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        return `KES ${val.toLocaleString('en-KE')}`;
    } catch(e) { return 'KES 0'; }
}

function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.removePromoCode = removePromoCode;
window.proceedToCheckout = proceedToCheckout;
window.backToCart = backToCart;
window.cancelPayment = cancelPayment;