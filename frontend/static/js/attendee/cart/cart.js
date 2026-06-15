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
    const ticketType = item.ticket_type || item.tier || 'Regular';
    await window.CheckoutFlow.startCheckout(item.id, ticketType, item.quantity);
}

function removeEventFromCart(eventId) {
    if (!eventId || !cartData?.items?.length) return;
    const idx = cartData.items.findIndex(i => String(i.id) === String(eventId));
    if (idx === -1) return;
    cartData.items.splice(idx, 1);
    recalculateCartTotals();
    saveCartToLocalStorage();
    displayCart();
    updateCartCount(cartData.items.length);
    if (cartData.items.length === 0) {
        if (emptyCartEl) emptyCartEl.style.display = 'block';
        if (cartContentEl) cartContentEl.style.display = 'none';
    }
    window.dispatchEvent(new Event('cart-updated'));
}

function onCartCheckoutSuccess(event) {
    const eventId = event?.detail?.event_id;
    removeEventFromCart(eventId);
    showToast('Payment successful! Your ticket has been issued.', 'success');
}

function onCartCheckoutSubmitted(event) {
    const eventId = event?.detail?.event_id;
    removeEventFromCart(eventId);
    showToast('Payment proof submitted. The organizer will review and approve your booking.', 'info');
}

window.addEventListener('checkout-completed', onCartCheckoutSuccess);
window.addEventListener('checkout-success', onCartCheckoutSuccess);
window.addEventListener('checkout-submitted', onCartCheckoutSubmitted);

function onCartCheckoutSubmittedLegacy() {
    showToast('Payment submitted for approval. Your cart will be updated once confirmed.', 'info');
}

async function initiateMpesaPayment(bookingId, billingInfo) {
    try {
        checkoutViewEl.style.display = 'none';
        paymentViewEl.style.display = 'block';
        
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            paymentStatusEl.innerHTML = `
                <div class="mpesa-payment-initiation">
                    <div class="mpesa-spinner">
                        <div class="mpesa-ring"></div>
                        <div class="mpesa-ring"></div>
                        <div class="mpesa-ring"></div>
                        <div class="mpesa-ring"></div>
                    </div>
                    <i class="fas fa-mobile-alt mpesa-icon"></i>
                    <h3>Initiating M-Pesa Payment</h3>
                    <p>Please wait while we connect to M-Pesa...</p>
                </div>
            `;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (paymentStatusEl) {
            paymentStatusEl.innerHTML = `
                <div class="mpesa-stk-push">
                    <div class="stk-loader">
                        <div class="stk-wave"></div>
                        <div class="stk-wave"></div>
                        <div class="stk-wave"></div>
                    </div>
                    <i class="fas fa-phone-alt stk-icon"></i>
                    <h3>STK Push Sent!</h3>
                    <p>Please check your phone for the M-Pesa prompt</p>
                    <div class="phone-number">${formatPhoneNumber(billingInfo.phone)}</div>
                    <div class="amount">Amount: ${formatCurrency(cartData.total)}</div>
                    <div class="booking-ref">Booking ID: ${bookingId}</div>
                    <button class="btn-outline" onclick="cancelPayment()">Cancel Payment</button>
                </div>
            `;
        }
        
        await completePayment(bookingId, billingInfo);
        
    } catch (error) {
        showToast(error.message || 'Failed to initiate payment', 'error');
        backToCart();
    }
}


    async function completePayment(bookingId, billingInfo) {
    try {
        const token = localStorage.getItem('attendee_access_token');

        // Send real STK Push request to Django backend
        const response = await fetch('/payments/pay/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                phone_number: billingInfo.phone,
                amount: cartData.total,
                event_id: cartData.items[0]?.id,
                quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Payment initiation failed');
        }

        // Poll for payment confirmation
        pollCartPaymentStatus(data.checkout_request_id, billingInfo);

    } catch (error) {
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            paymentStatusEl.innerHTML = `
                <div class="payment-failed">
                    <i class="fas fa-times-circle"></i>
                    <h3>Payment Failed</h3>
                    <p>${error.message || 'Your payment could not be processed. Please try again.'}</p>
                    <button class="btn-outline" onclick="backToCart()">Try Again</button>
                </div>
            `;
        }
    }
    
    // Dispatch events for navbar update
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
}

function pollCartPaymentStatus(checkoutId, billingInfo) {
    let attempts = 0;
    const maxAttempts = 10;
    const paymentStatusEl = document.getElementById('paymentStatus');

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await fetch(`/payments/status/${checkoutId}/`);
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(interval);

                // Save booking to localStorage
                const bookingId = 'BK' + Date.now();
                const newBooking = {
                    id: bookingId,
                    booking_date: new Date().toISOString(),
                    status: 'confirmed',
                    payment_method: 'M-Pesa',
                    receipt_number: data.receipt,
                    total_amount: cartData.total,
                    subtotal: cartData.subtotal,
                    booking_fee: cartData.platform_fee,
                    discount: cartData.discount_amount || 0,
                    billing_info: {
                        name: billingInfo.full_name,
                        email: billingInfo.email,
                        phone: billingInfo.phone
                    },
                    items: cartData.items.map(item => ({
                        id: item.id,
                        title: item.title,
                        category: item.category,
                        date: item.date,
                        location: item.location,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                        ticket_status: 'active',
                        ticket_code: 'TKT' + Math.floor(Math.random() * 1000000)
                    }))
                };

                const existingBookings = JSON.parse(
                    localStorage.getItem('eventhub_bookings') || '[]'
                );
                existingBookings.unshift(newBooking);
                localStorage.setItem('eventhub_bookings', JSON.stringify(existingBookings));

                if (paymentStatusEl) {
                    paymentStatusEl.innerHTML = `
                        <div class="payment-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Booking Confirmed!</h3>
                            <p>Your M-Pesa payment was successful.</p>
                            <div class="payment-details">
                                <p><strong>Booking ID:</strong> ${bookingId}</p>
                                <p><strong>M-Pesa Receipt:</strong> ${data.receipt}</p>
                                <p><strong>Amount Paid:</strong> ${formatCurrency(cartData.total)}</p>
                            </div>
                            <div class="redirect-message">
                                <i class="fas fa-spinner fa-pulse"></i>
                                <p>Redirecting to your bookings...</p>
                            </div>
                        </div>
                    `;
                }

                localStorage.removeItem('eventhub_cart');
                updateCartCount(0);
                setTimeout(() => window.location.href = '/bookings/', 3000);

            } else if (data.status === 'failed' || data.status === 'cancelled') {
                clearInterval(interval);
                if (paymentStatusEl) {
                    paymentStatusEl.innerHTML = `
                        <div class="payment-failed">
                            <i class="fas fa-times-circle"></i>
                            <h3>Payment Failed</h3>
                            <p>Your M-Pesa payment was not completed. Please try again.</p>
                            <button class="btn-outline" onclick="backToCart()">Try Again</button>
                        </div>
                    `;
                }

            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                if (paymentStatusEl) {
                    paymentStatusEl.innerHTML = `
                        <div class="payment-failed">
                            <i class="fas fa-times-circle"></i>
                            <h3>Payment Timed Out</h3>
                            <p>We did not receive payment confirmation. Please try again.</p>
                            <button class="btn-outline" onclick="backToCart()">Try Again</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000);
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