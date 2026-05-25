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
    
    // Payment method selection
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
    if (window.Loader) window.Loader.show('Loading cart...');
    
    try {
        cartData = await window.AttendeeAPIEndpoints.cart.getCart();
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
        if (window.Loader) window.Loader.hide();
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
            <div class="item-image" style="background-image: url('${item.event?.banner_image || '/static/images/placeholder.jpg'}')"></div>
            <div class="item-details">
                <h4>${escapeHtml(item.event?.title || 'Event')}</h4>
                <p class="item-type">${escapeHtml(item.ticket_type?.name || 'Ticket')}</p>
                <p class="item-date">${formatDate(item.event?.start_date)}</p>
                <p class="item-venue">${escapeHtml(item.event?.venue_name || '')}</p>
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
    
    if (window.Loader) window.Loader.show('Updating cart...');
    
    try {
        await window.AttendeeAPIEndpoints.cart.updateItem(itemId, newQuantity);
        await loadCart();
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function removeItem(itemId) {
    if (window.Loader) window.Loader.show('Removing item...');
    
    try {
        await window.AttendeeAPIEndpoints.cart.removeItem(itemId);
        await loadCart();
        showToast('Item removed from cart', 'success');
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Failed to remove item', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function applyPromoCode(e) {
    e.preventDefault();
    
    const code = document.getElementById('promoCode')?.value.trim();
    if (!code) {
        showToast('Please enter a promo code', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Applying promo code...');
    
    try {
        await window.AttendeeAPIEndpoints.cart.applyPromo(code);
        await loadCart();
        if (document.getElementById('promoCode')) document.getElementById('promoCode').value = '';
        showToast('Promo code applied!', 'success');
    } catch (error) {
        console.error('Error applying promo:', error);
        showToast(error.message || 'Invalid promo code', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function removePromoCode() {
    if (window.Loader) window.Loader.show('Removing promo code...');
    
    try {
        await window.AttendeeAPIEndpoints.cart.removePromo();
        await loadCart();
        showToast('Promo code removed', 'success');
    } catch (error) {
        console.error('Error removing promo:', error);
        showToast('Failed to remove promo code', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
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
    
    // Pre-fill billing info from localStorage if available
    prefillBillingInfo();
    
    // Update order summary
    if (orderSummaryDiv) {
        orderSummaryDiv.innerHTML = `
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
                <span>Total Amount:</span>
                <span>${formatCurrency(cartData.total)}</span>
            </div>
        `;
    }
}

async function prefillBillingInfo() {
    try {
        const profile = await window.AttendeeAPIEndpoints.profile.getProfile();
        if (profile) {
            const nameInput = document.getElementById('billingName');
            const emailInput = document.getElementById('billingEmail');
            const phoneInput = document.getElementById('billingPhone');
            
            if (nameInput) nameInput.value = profile.full_name || profile.name || '';
            if (emailInput) emailInput.value = profile.email || '';
            if (phoneInput) phoneInput.value = profile.phone || '';
        }
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
    
    // Validation
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
    
    if (window.Loader) window.Loader.show('Processing checkout...');
    
    try {
        const result = await window.AttendeeAPIEndpoints.cart.checkout(paymentMethod, billingInfo);
        
        if (paymentMethod === 'mpesa') {
            await initiateMpesaPayment(result.booking_id, billingInfo.phone);
        } else if (paymentMethod === 'card') {
            await initiateCardPayment(result.booking_id);
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Checkout failed', 'error');
        if (window.Loader) window.Loader.hide();
    }
}

async function initiateMpesaPayment(bookingId, phone) {
    // Format phone number to 254XXXXXXXXX
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
    }
    
    if (window.Loader) window.Loader.show('Initiating M-Pesa payment...');
    
    try {
        const result = await window.AttendeeAPIEndpoints.payments.mpesaSTKPush(bookingId, formattedPhone);
        
        // Show payment waiting screen
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
                    <p class="text-sm text-muted">Checkout Request ID: ${result.checkout_request_id}</p>
                    <p class="text-sm text-muted">Amount: ${formatCurrency(cartData.total)}</p>
                    <button class="btn-outline" onclick="cancelPayment()">Cancel</button>
                </div>
            `;
        }
        
        // Poll for payment status
        paymentInterval = setInterval(async () => {
            await checkPaymentStatus(result.checkout_request_id, bookingId);
        }, 3000);
        
        // Timeout after 90 seconds
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
        if (window.Loader) window.Loader.hide();
        backToCart();
    }
}

async function checkPaymentStatus(checkoutId, bookingId) {
    try {
        const status = await window.AttendeeAPIEndpoints.payments.mpesaStatus(checkoutId);
        
        if (status.status === 'completed') {
            clearInterval(paymentInterval);
            paymentInterval = null;
            
            const paymentStatusEl = document.getElementById('paymentStatus');
            if (paymentStatusEl) {
                paymentStatusEl.innerHTML = `
                    <div class="payment-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Payment Successful!</h3>
                        <p>Your tickets have been confirmed.</p>
                        <div class="payment-details">
                            <p><strong>M-Pesa Receipt:</strong> ${status.mpesa_receipt}</p>
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
            
            // Clear cart from UI
            updateCartCount(0);
            
        } else if (status.status === 'failed') {
            clearInterval(paymentInterval);
            paymentInterval = null;
            
            const paymentStatusEl = document.getElementById('paymentStatus');
            if (paymentStatusEl) {
                paymentStatusEl.innerHTML = `
                    <div class="payment-failed">
                        <i class="fas fa-times-circle"></i>
                        <h3>Payment Failed</h3>
                        <p>${status.message || 'Payment could not be processed. Please try again.'}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try Again</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Status check error:', error);
    }
}

async function initiateCardPayment(bookingId) {
    try {
        const result = await window.AttendeeAPIEndpoints.payments.cardInitialize(bookingId);
        
        if (result.redirect_url) {
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
            
            setTimeout(() => {
                window.location.href = result.redirect_url;
            }, 2000);
        }
    } catch (error) {
        console.error('Card payment error:', error);
        showToast(error.message || 'Failed to initialize card payment', 'error');
        if (window.Loader) window.Loader.hide();
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
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        if (count > 0) {
            cartBadge.textContent = count > 99 ? '99+' : count;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

// Helper functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE');
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

// Make functions global
window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.applyPromoCode = applyPromoCode;
window.removePromoCode = removePromoCode;
window.proceedToCheckout = proceedToCheckout;
window.backToCart = backToCart;
window.cancelPayment = cancelPayment;