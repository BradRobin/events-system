// ============================================
// BOOKING CART - Complete Payment Flow
// No Global Loader - Uses local spinners only
// FIXED: Cart badge disappears when cart page is opened
// FIXED: Consistent toast messages
// FIXED: Events dispatched for navbar updates
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
    updateNavBadgesFromCart();
    clearCartBadgeOnView();
});

// Clear cart badge when viewing the cart page
function clearCartBadgeOnView() {
    const cartBadge = document.getElementById('cartBadgeDropdown');
    const mobileCartBadge = document.getElementById('mobileCartBadge');
    
    if (cartBadge) {
        cartBadge.style.display = 'none';
        cartBadge.textContent = '0';
    }
    if (mobileCartBadge) {
        mobileCartBadge.style.display = 'none';
        mobileCartBadge.textContent = '0';
    }
    
    // Also dispatch event to notify navbar
    window.dispatchEvent(new Event('cart-updated'));
}

function updateNavBadgesFromCart() {
    const navCartBadge = document.getElementById('navCartBadge');
    const cartCount = cartData?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

    if (navCartBadge) {
        if (cartCount > 0) {
            navCartBadge.textContent = cartCount;
            navCartBadge.style.display = 'inline-flex';
        } else {
            navCartBadge.style.display = 'none';
        }
    }

    updateCartCount(cartCount);
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
        
        // Ensure all required properties exist
        cartData.items = cartData.items || [];
        cartData.subtotal = cartData.subtotal || 0;
        cartData.platform_fee = cartData.platform_fee || 0;
        cartData.total = cartData.total || 0;
        cartData.discount_amount = cartData.discount_amount || 0;
        cartData.promo_code = cartData.promo_code || null;
        
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
        showToast('Failed to load your booking cart', 'error');
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
        
        // Dispatch event for navbar update
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('storage'));
        
        showToast(`🛒 Quantity updated for "${item.title}"`, 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    }
}

async function removeItem(itemId) {
    const item = cartData.items.find(i => i.id == itemId);
    const itemTitle = item ? item.title : 'Event';
    
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
        
        // Dispatch events for navbar update
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('storage'));
        
        showToast(`🗑️ "${itemTitle}" removed from your booking cart`, 'info');
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
        
        // Dispatch events for navbar update
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('storage'));
        
        showToast('🗑️ Your booking cart has been cleared', 'info');
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast('Failed to clear booking cart', 'error');
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
        showToast('Could not save cart. Storage may be full.', 'error');
    }
}

async function applyPromoCode(e) {
    e.preventDefault();
    const code = document.getElementById('promoCode')?.value.trim();
    if (!code) { 
        showToast('Please enter a promo code', 'error'); 
        return; 
    }
    
    try {
        if (code.toUpperCase() === 'WELCOME10') {
            const discountAmount = Math.floor(cartData.subtotal * 0.1);
            cartData.discount_amount = discountAmount;
            cartData.promo_code = code.toUpperCase();
            recalculateCartTotals();
            saveCartToLocalStorage();
            displayCart();
            document.getElementById('promoCode').value = '';
            
            // Dispatch event for navbar update
            window.dispatchEvent(new Event('cart-updated'));
            
            showToast(`🎉 Promo code applied! You saved ${formatCurrency(discountAmount)}`, 'success');
        } else {
            showToast('Invalid promo code. Please try again.', 'error');
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
        
        // Dispatch event for navbar update
        window.dispatchEvent(new Event('cart-updated'));
        
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
        showToast('🔐 Please login to complete your booking', 'info');
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
        const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
        const nameInput = document.getElementById('billingName');
        const emailInput = document.getElementById('billingEmail');
        
        if (nameInput) {
            const fullName = user.full_name || user.name || '';
            nameInput.value = fullName;
        }
        if (emailInput) {
            emailInput.value = user.email || '';
        }
    } catch (error) {
        console.error('Error prefilling billing info:', error);
    }
}

function backToCart() {
    checkoutViewEl.style.display = 'none';
    cartContentEl.style.display = 'block';
}

async function processCheckout(e) {
    e.preventDefault();

    // Validate form fields
    const billingName = document.getElementById('billingName')?.value.trim();
    const billingEmail = document.getElementById('billingEmail')?.value.trim();
    
    if (!billingName) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!billingEmail || !isValidEmail(billingEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    if (!window.CheckoutFlow) {
        showToast('Checkout system is loading. Please try again.', 'error');
        return;
    }

    const item = cartData.items[0];
    if (!item) {
        showToast('Your booking cart is empty', 'error');
        return;
    }

    if (cartData.items.length > 1) {
        showToast('Please complete payment for one event at a time.', 'info');
    }

    backToCart();
    const ticketType = item.ticket_type || 'Regular';
    await window.CheckoutFlow.startCheckout(item.id, ticketType, item.quantity);
}

function onCartCheckoutSuccess() {
    if (!cartData.items.length) return;
    
    const completedItem = cartData.items[0];
    const itemTitle = completedItem ? completedItem.title : 'Event';
    
    cartData.items.shift();
    recalculateCartTotals();
    saveCartToLocalStorage();
    displayCart();
    
    if (cartData.items.length > 0) {
        showToast(`✅ Payment complete for "${itemTitle}"! Continue with the next event.`, 'success');
    } else {
        localStorage.removeItem('eventhub_cart');
        updateCartCount(0);
        showToast('✅ All bookings complete! Your tickets have been sent to your email.', 'success');
        setTimeout(() => { window.location.href = '/tickets/'; }, 2000);
    }
    
    // Dispatch events for navbar update
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
}

window.addEventListener('checkout-success', onCartCheckoutSuccess);
window.addEventListener('checkout-submitted', onCartCheckoutSubmitted);

function onCartCheckoutSubmitted() {
    showToast('📱 Payment submitted for approval. Your cart will be updated once confirmed.', 'info');
}

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
    } catch(e) { 
        return 'TBA'; 
    }
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        return `KES ${val.toLocaleString('en-KE')}`;
    } catch(e) { 
        return 'KES 0'; 
    }
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
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 4000);
}

// Make functions global for onclick handlers
window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.removePromoCode = removePromoCode;
window.proceedToCheckout = proceedToCheckout;
window.backToCart = backToCart;
window.cancelPayment = cancelPayment;