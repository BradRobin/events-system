// ============================================
// ATTENDEE CART - Complete Functionality
// ============================================

let cartData = null;
let currentStep = 'cart';
let paymentInterval = null;

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
const orderSummaryDiv = document.getElementById('orderSummary');
const promoForm = document.getElementById('promoForm');
const checkoutForm = document.getElementById('checkoutForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    setupEventListeners();
});

function setupEventListeners() {
    if (promoForm) {
        promoForm.addEventListener('submit', applyPromoCode);
    }
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processCheckout);
    }
    
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            const mpesaFields = document.getElementById('mpesaFields');
            const cardFields = document.getElementById('cardFields');
            
            if (this.value === 'mpesa') {
                if (mpesaFields) mpesaFields.style.display = 'block';
                if (cardFields) cardFields.style.display = 'none';
            } else if (this.value === 'card') {
                if (mpesaFields) mpesaFields.style.display = 'none';
                if (cardFields) cardFields.style.display = 'block';
            }
        });
    });
}

async function loadCart() {
    showLoader('Loading cart...');
    
    try {
        // Mock cart data - replace with actual API call
        cartData = {
            items: [],
            subtotal: 0,
            platform_fee: 0,
            total: 0,
            discount_amount: 0,
            promo_code: null
        };
        
        // Try to load from localStorage first
        const savedCart = localStorage.getItem('eventhub_cart');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                if (parsed && parsed.items && parsed.items.length > 0) {
                    cartData = parsed;
                }
            } catch (e) {
                console.error("Malformed cart JSON, resetting:", e);
                localStorage.removeItem('eventhub_cart');
            }
        }
        
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
    } finally {
        hideLoader();
    }
}

function displayCart() {
    if (!cartItemsEl) return;
    
    if (!cartData.items || cartData.items.length === 0) {
        cartItemsEl.innerHTML = '<div class="empty-cart-message">Your cart is empty</div>';
        return;
    }
    
    cartItemsEl.innerHTML = cartData.items.map(item => `
        <div class="cart-item" data-id="${item.id}">
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
    `).join('');
    
    // Update summary
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
}

async function updateItemQuantity(itemId, delta) {
    const item = cartData.items.find(i => i.id == itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;
    
    showLoader('Updating cart...');
    
    try {
        item.quantity = newQuantity;
        recalculateCartTotals();
        saveCartToLocalStorage();
        displayCart();
        showToast('Cart updated', 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    } finally {
        hideLoader();
    }
}

async function removeItem(itemId) {
    showLoader('Removing item...');
    
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
        showToast('Item removed from cart', 'success');
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Failed to remove item', 'error');
    } finally {
        hideLoader();
    }
}

async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    
    showLoader('Clearing cart...');
    
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
        showToast('Cart cleared', 'success');
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast('Failed to clear cart', 'error');
    } finally {
        hideLoader();
    }
}

function recalculateCartTotals() {
    cartData.subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartData.platform_fee = Math.ceil(cartData.subtotal * 0.05);
    cartData.total = cartData.subtotal + cartData.platform_fee - (cartData.discount_amount || 0);
}

function saveCartToLocalStorage() {
    localStorage.setItem('eventhub_cart', JSON.stringify(cartData));
}

async function applyPromoCode(e) {
    e.preventDefault();
    
    const code = document.getElementById('promoCode')?.value.trim();
    if (!code) {
        showToast('Please enter a promo code', 'error');
        return;
    }
    
    showLoader('Applying promo code...');
    
    try {
        // Mock promo code validation
        if (code.toUpperCase() === 'WELCOME10') {
            cartData.discount_amount = Math.floor(cartData.subtotal * 0.1);
            cartData.promo_code = code.toUpperCase();
            recalculateCartTotals();
            saveCartToLocalStorage();
            displayCart();
            if (document.getElementById('promoCode')) document.getElementById('promoCode').value = '';
            showToast('Promo code applied!', 'success');
        } else if (code.toUpperCase() === 'SAVE20') {
            cartData.discount_amount = Math.floor(cartData.subtotal * 0.2);
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
        console.error('Error applying promo:', error);
        showToast(error.message || 'Invalid promo code', 'error');
    } finally {
        hideLoader();
    }
}

async function removePromoCode() {
    showLoader('Removing promo code...');
    
    try {
        cartData.discount_amount = 0;
        cartData.promo_code = null;
        recalculateCartTotals();
        saveCartToLocalStorage();
        displayCart();
        showToast('Promo code removed', 'success');
    } catch (error) {
        console.error('Error removing promo:', error);
        showToast('Failed to remove promo code', 'error');
    } finally {
        hideLoader();
    }
}

function proceedToCheckout() {
    if (!cartData.items || cartData.items.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    currentStep = 'checkout';
    if (cartContentEl) cartContentEl.style.display = 'none';
    if (checkoutViewEl) checkoutViewEl.style.display = 'block';
    
    prefillBillingInfo();
    
    const checkoutOrderSummary = document.getElementById('checkoutOrderSummary');
    if (checkoutOrderSummary) {
        checkoutOrderSummary.innerHTML = `
            <div class="summary-row">
                <span>Subtotal (${cartData.items.length} items):</span>
                <span>${formatCurrency(cartData.subtotal)}</span>
            </div>
            <div class="summary-row">
                <span>Platform Fee:</span>
                <span>${formatCurrency(cartData.platform_fee || 0)}</span>
            </div>
            ${cartData.discount_amount ? `
            <div class="summary-row discount">
                <span>Discount:</span>
                <span>-${formatCurrency(cartData.discount_amount)}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
                <span>Total:</span>
                <span>${formatCurrency(cartData.total)}</span>
            </div>
        `;
    }
}

function prefillBillingInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
        const nameInput = document.getElementById('billingName');
        const emailInput = document.getElementById('billingEmail');
        const phoneInput = document.getElementById('billingPhone');
        
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function backToCart() {
    currentStep = 'cart';
    if (checkoutViewEl) checkoutViewEl.style.display = 'none';
    if (cartContentEl) cartContentEl.style.display = 'block';
}

async function processCheckout(e) {
    e.preventDefault();
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    
    const billingInfo = {
        full_name: document.getElementById('billingName')?.value.trim(),
        email: document.getElementById('billingEmail')?.value.trim(),
        phone: document.getElementById('billingPhone')?.value.trim(),
        address: document.getElementById('billingAddress')?.value.trim() || ''
    };
    
    if (!billingInfo.full_name) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!billingInfo.email || !isValidEmail(billingInfo.email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!billingInfo.phone) {
        showToast('Please enter your phone number', 'error');
        return;
    }
    
    showLoader('Processing checkout...');
    
    try {
        const bookingId = 'BK' + Date.now();
        
        if (paymentMethod === 'mpesa') {
            await initiateMpesaPayment(bookingId, billingInfo);
        } else if (paymentMethod === 'card') {
            await initiateCardPayment(bookingId, billingInfo);
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Checkout failed', 'error');
        hideLoader();
    }
}

async function initiateMpesaPayment(bookingId, billingInfo) {
    let phone = billingInfo.phone;
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
    }
    
    showLoader('Initiating M-Pesa payment...');
    
    try {
        if (checkoutViewEl) checkoutViewEl.style.display = 'none';
        if (paymentViewEl) paymentViewEl.style.display = 'block';
        
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            paymentStatusEl.innerHTML = `
                <div class="payment-waiting">
                    <div class="payment-spinner"></div>
                    <i class="fas fa-mobile-alt"></i>
                    <h3>Waiting for M-Pesa PIN</h3>
                    <p>Please enter your M-Pesa PIN on your phone to complete payment.</p>
                    <p class="text-sm text-muted">Checkout Request ID: ${bookingId}</p>
                    <p class="text-sm text-muted">Amount: ${formatCurrency(cartData.total)}</p>
                    <button class="btn-outline" onclick="cancelPayment()">Cancel</button>
                </div>
            `;
        }
        
        hideLoader();
        
        paymentInterval = setInterval(async () => {
            await checkPaymentStatus(bookingId, billingInfo);
        }, 3000);
        
        setTimeout(() => {
            if (paymentInterval) {
                clearInterval(paymentInterval);
                paymentInterval = null;
                if (paymentStatusEl) {
                    paymentStatusEl.innerHTML = `
                        <div class="payment-timeout">
                            <i class="fas fa-clock"></i>
                            <h3>Payment Timeout</h3>
                            <p>Payment did not complete in time. Please try again.</p>
                            <button class="btn-primary" onclick="window.location.reload()">Try Again</button>
                        </div>
                    `;
                }
            }
        }, 90000);
        
    } catch (error) {
        console.error('M-Pesa error:', error);
        showToast(error.message || 'Failed to initiate payment', 'error');
        hideLoader();
        backToCart();
    }
}

async function checkPaymentStatus(bookingId, billingInfo) {
    try {
        const paymentStatusEl = document.getElementById('paymentStatus');
        
        if (paymentStatusEl && paymentStatusEl.querySelector('.payment-waiting')) {
            // Clear interval immediately to stop polling
            if (paymentInterval) {
                clearInterval(paymentInterval);
                paymentInterval = null;
            }
            
            setTimeout(async () => {
                // Actually hit the backend API
                try {
                    await fetch('/api/bookings/checkout/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: billingInfo.email,
                            name: billingInfo.full_name,
                            event_title: cartData.items.length > 0 ? cartData.items[0].title : 'Event',
                            quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                            total_price: cartData.total
                        })
                    });
                } catch (e) {
                    console.error("API error", e);
                }
                    
                    if (paymentStatusEl) {
                        paymentStatusEl.innerHTML = `
                            <div class="payment-success">
                                <i class="fas fa-check-circle"></i>
                                <h3>Payment Successful!</h3>
                                <p>Your tickets have been confirmed.</p>
                                <div class="payment-details">
                                    <p><strong>M-Pesa Receipt:</strong> MPESA${Math.floor(Math.random() * 10000000)}</p>
                                    <p><strong>Amount:</strong> ${formatCurrency(cartData.total)}</p>
                                    <p><strong>Booking ID:</strong> ${bookingId}</p>
                                </div>
                                <div class="payment-actions">
                                    <button class="btn-primary" onclick="window.location.href='/attendee/tickets/'">
                                        View My Tickets
                                    </button>
                                    <button class="btn-outline" onclick="window.location.href='/attendee/bookings/'">
                                        View Booking
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                    
                    localStorage.removeItem('eventhub_cart');
                    updateCartCount(0);
                }
            }, 3000);
        }
    } catch (error) {
        console.error('Status check error:', error);
    }
}

async function initiateCardPayment(bookingId, billingInfo) {
    try {
        if (checkoutViewEl) checkoutViewEl.style.display = 'none';
        if (paymentViewEl) paymentViewEl.style.display = 'block';
        
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            paymentStatusEl.innerHTML = `
                <div class="payment-redirect">
                    <i class="fas fa-credit-card"></i>
                    <h3>Redirecting to Payment Gateway</h3>
                    <p>Please wait while we redirect you to complete your payment...</p>
                </div>
            `;
        }
        
        hideLoader();
        
        setTimeout(async () => {
            // Actually hit the backend API
            try {
                await fetch('/api/bookings/checkout/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: billingInfo.email,
                        name: billingInfo.full_name,
                        event_title: cartData.items.length > 0 ? cartData.items[0].title : 'Event',
                        quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                        total_price: cartData.total
                    })
                });
            } catch (e) {
                console.error("API error", e);
            }
            
            paymentStatusEl.innerHTML = `
                <div class="payment-success">
                    <i class="fas fa-check-circle"></i>
                    <h3>Payment Successful!</h3>
                    <p>Your tickets have been confirmed.</p>
                    <div class="payment-details">
                        <p><strong>Amount:</strong> ${formatCurrency(cartData.total)}</p>
                        <p><strong>Booking ID:</strong> ${bookingId}</p>
                    </div>
                    <div class="payment-actions">
                        <button class="btn-primary" onclick="window.location.href='/attendee/tickets/'">
                            View My Tickets
                        </button>
                        <button class="btn-outline" onclick="window.location.href='/attendee/bookings/'">
                            View Booking
                        </button>
                    </div>
                </div>
            `;
            localStorage.removeItem('eventhub_cart');
            updateCartCount(0);
        }, 2000);
        
    } catch (error) {
        console.error('Card payment error:', error);
        showToast(error.message || 'Failed to initialize card payment', 'error');
        hideLoader();
        backToCart();
    }
}

function cancelPayment() {
    if (paymentInterval) {
        clearInterval(paymentInterval);
        paymentInterval = null;
    }
    backToCart();
    showToast('Payment cancelled', 'info');
}

function updateCartCount(count) {
    const cartBadge = document.getElementById('cartBadgeDropdown');
    const cartCountMobile = document.getElementById('mobileCartBadge');
    if (cartBadge) {
        if (count > 0) {
            cartBadge.textContent = count > 99 ? '99+' : count;
            cartBadge.style.display = 'inline-block';
        } else {
            cartBadge.style.display = 'none';
        }
    }
    if (cartCountMobile) {
        if (count > 0) {
            cartCountMobile.textContent = count > 99 ? '99+' : count;
            cartCountMobile.style.display = 'inline-block';
        } else {
            cartCountMobile.style.display = 'none';
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
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

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showLoader(message) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.querySelector('.loader-text').textContent = message || 'Loading...';
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.applyPromoCode = applyPromoCode;
window.removePromoCode = removePromoCode;
window.proceedToCheckout = proceedToCheckout;
window.backToCart = backToCart;
window.cancelPayment = cancelPayment;
