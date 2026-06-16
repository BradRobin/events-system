// ============================================
// BOOKING CART - Radio Button Selection
// Only ONE organizer can be selected at a time
// Booking Summary hidden until selection
// ============================================

let cartData = null;
let selectedOrganizer = null;

// DOM Elements
const emptyCartEl = document.getElementById('emptyCart');
const cartContentEl = document.getElementById('cartContent');
const checkoutViewEl = document.getElementById('checkoutView');
const cartItemsEl = document.getElementById('cartItems');
const cartItemCountSpan = document.getElementById('cartItemCount');
const subtotalSpan = document.getElementById('subtotal');
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
    maybeAutoStartCheckout();
});

function maybeAutoStartCheckout() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== '1') return;
    if (!cartData?.items?.length) return;

    if (!selectedOrganizer) {
        const firstOrg = cartData.items[0].organizer || cartData.items[0].organizer_name || 'Event Organizer';
        updateSummaryForOrganizer(firstOrg);
        const radios = document.querySelectorAll('.organizer-radio');
        for (let i = 0; i < radios.length; i++) {
            radios[i].checked = (radios[i].value === firstOrg);
        }
    }

    if (selectedOrganizer) {
        proceedToCheckout();
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.pathname + url.search);
    }
}

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
    if (promoForm) promoForm.addEventListener('submit', applyPromoCode);
    if (checkoutForm) checkoutForm.addEventListener('submit', processCheckout);
}

function loadCart() {
    try {
        if (window.EventhubCartStorage) {
            cartData = window.EventhubCartStorage.loadEventhubCart();
        } else {
            const savedCart = localStorage.getItem('eventhub_cart');
            cartData = savedCart ? JSON.parse(savedCart) : { items: [], subtotal: 0, total: 0 };
        }
        
        cartData.items = cartData.items || [];
        cartData.subtotal = cartData.subtotal || 0;
        cartData.total = cartData.total || 0;
        cartData.discount_amount = cartData.discount_amount || 0;
        cartData.promo_code = cartData.promo_code || null;
        
        // Ensure each item has organizer field
        for (let i = 0; i < cartData.items.length; i++) {
            if (!cartData.items[i].organizer && cartData.items[i].organizer_name) {
                cartData.items[i].organizer = cartData.items[i].organizer_name;
            }
            if (!cartData.items[i].organizer) {
                cartData.items[i].organizer = 'Event Organizer';
                cartData.items[i].organizer_name = 'Event Organizer';
            }
        }
        
        displayCart();
        
        if (!cartData.items || cartData.items.length === 0) {
            if (emptyCartEl) emptyCartEl.style.display = 'block';
            if (cartContentEl) cartContentEl.style.display = 'none';
            hideSummary();
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

function hideSummary() {
    const bookingSummaryCard = document.querySelector('.booking-summary-card');
    if (bookingSummaryCard) bookingSummaryCard.style.display = 'none';
    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(0);
    if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(0);
    if (discountRow) discountRow.style.display = 'none';
    if (appliedPromoDiv) appliedPromoDiv.style.display = 'none';
    selectedOrganizer = null;
    const proceedBtn = document.getElementById('proceedToPaymentBtn');
    if (proceedBtn) proceedBtn.disabled = true;
}

function updateSummaryForOrganizer(organizerName) {
    if (!organizerName) {
        hideSummary();
        return;
    }
    
    const organizerItems = cartData.items.filter(item => 
        (item.organizer || item.organizer_name || 'Event Organizer') === organizerName
    );
    
    if (organizerItems.length === 0) {
        hideSummary();
        return;
    }
    
    let subtotal = organizerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = cartData.discount_amount || 0;
    const total = subtotal - discount;
    
    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(subtotal);
    if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(total);
    
    if (discount > 0) {
        if (discountRow) discountRow.style.display = 'flex';
        if (discountAmountSpan) discountAmountSpan.textContent = `-${formatCurrency(discount)}`;
    } else {
        if (discountRow) discountRow.style.display = 'none';
    }
    
    if (cartData.promo_code) {
        if (appliedPromoDiv) appliedPromoDiv.style.display = 'flex';
        if (promoCodeDisplaySpan) promoCodeDisplaySpan.textContent = cartData.promo_code;
    } else {
        if (appliedPromoDiv) appliedPromoDiv.style.display = 'none';
    }
    
    document.querySelector('.booking-summary-card').style.display = 'block';
    selectedOrganizer = organizerName;
    
    sessionStorage.setItem('selected_organizer', organizerName);
    sessionStorage.setItem('selected_items', JSON.stringify(organizerItems));
    sessionStorage.setItem('selected_total', total);
    
    const proceedBtn = document.getElementById('proceedToPaymentBtn');
    if (proceedBtn) proceedBtn.disabled = false;
}

function hasMultipleOrganizers(items) {
    const organizers = new Set();
    for (let i = 0; i < items.length; i++) {
        const organizerName = items[i].organizer || items[i].organizer_name || 'Event Organizer';
        organizers.add(organizerName);
    }
    return organizers.size > 1;
}

function groupItemsByOrganizer(items) {
    const groups = {};
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const orgName = item.organizer || item.organizer_name || 'Event Organizer';
        if (!groups[orgName]) {
            groups[orgName] = { organizer: orgName, items: [], total: 0 };
        }
        groups[orgName].items.push(item);
        groups[orgName].total += item.price * item.quantity;
    }
    return Object.values(groups);
}

function selectOrganizer(organizerName) {
    if (selectedOrganizer === organizerName) {
        hideSummary();
        const radios = document.querySelectorAll('.organizer-radio');
        for (let i = 0; i < radios.length; i++) {
            radios[i].checked = false;
        }
        selectedOrganizer = null;
        sessionStorage.removeItem('selected_organizer');
        sessionStorage.removeItem('selected_items');
        sessionStorage.removeItem('selected_total');
    } else {
        updateSummaryForOrganizer(organizerName);
        const radios = document.querySelectorAll('.organizer-radio');
        for (let i = 0; i < radios.length; i++) {
            radios[i].checked = (radios[i].value === organizerName);
        }
    }
}

function displayCart() {
    if (!cartItemsEl) return;
    
    if (!cartData.items || cartData.items.length === 0) {
        cartItemsEl.innerHTML = '<div class="empty-cart-message">Your booking cart is empty</div>';
        hideSummary();
        return;
    }
    
    if (hasMultipleOrganizers(cartData.items)) {
        const groups = groupItemsByOrganizer(cartData.items);
        let html = '';
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            const isChecked = (selectedOrganizer === group.organizer);
            html += `
                <div class="organizer-group" data-organizer="${escapeHtml(group.organizer)}">
                    <div class="organizer-group-header">
                        <div class="organizer-select">
                            <input type="radio" name="selectedOrganizer" class="organizer-radio" value="${escapeHtml(group.organizer)}" ${isChecked ? 'checked' : ''} onclick="selectOrganizer('${escapeHtml(group.organizer).replace(/'/g, "\\'")}')">
                            <h4>${escapeHtml(group.organizer)}</h4>
                        </div>
                        <span class="organizer-total">${formatCurrency(group.total)}</span>
                    </div>
                    <div class="organizer-group-items">
            `;
            for (let i = 0; i < group.items.length; i++) {
                const item = group.items[i];
                html += `
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
            }
            html += `
                    </div>
                </div>
            `;
        }
        cartItemsEl.innerHTML = html;
        if (!selectedOrganizer) {
            hideSummary();
        } else {
            updateSummaryForOrganizer(selectedOrganizer);
        }
    } else {
        // Single organizer - simple list
        let html = '';
        for (let i = 0; i < cartData.items.length; i++) {
            const item = cartData.items[i];
            html += `
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
        }
        cartItemsEl.innerHTML = html;
        
        if (cartData.items.length > 0) {
            const singleOrganizer = cartData.items[0].organizer || cartData.items[0].organizer_name || 'Event Organizer';
            updateSummaryForOrganizer(singleOrganizer);
        }
    }
    if (cartItemCountSpan) cartItemCountSpan.textContent = cartData.items.length;
}

async function updateItemQuantity(itemId, delta) {
    const item = cartData.items.find(i => i.id == itemId);
    if (!item) return;
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;
    
    item.quantity = newQuantity;
    recalculateCartTotals();
    saveCartToLocalStorage();
    displayCart();
    if (selectedOrganizer) updateSummaryForOrganizer(selectedOrganizer);
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Quantity updated', 'success');
}

async function removeItem(itemId) {
    const item = cartData.items.find(i => i.id == itemId);
    const removedOrganizer = item?.organizer || item?.organizer_name || 'Event Organizer';
    
    cartData.items = cartData.items.filter(i => i.id != itemId);
    recalculateCartTotals();
    saveCartToLocalStorage();
    
    if (selectedOrganizer === removedOrganizer) {
        const stillHasItems = cartData.items.some(i => (i.organizer || i.organizer_name) === selectedOrganizer);
        if (!stillHasItems) {
            selectedOrganizer = null;
            hideSummary();
        } else {
            updateSummaryForOrganizer(selectedOrganizer);
        }
    }
    displayCart();
    
    if (cartData.items.length === 0) {
        if (emptyCartEl) emptyCartEl.style.display = 'block';
        if (cartContentEl) cartContentEl.style.display = 'none';
        hideSummary();
    }
    updateCartCount(cartData.items.length);
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Item removed', 'info');
}

async function clearCart() {
    if (!confirm('Clear all events from your booking?')) return;
    cartData.items = [];
    cartData.subtotal = 0;
    cartData.total = 0;
    cartData.discount_amount = 0;
    cartData.promo_code = null;
    saveCartToLocalStorage();
    displayCart();
    hideSummary();
    if (emptyCartEl) emptyCartEl.style.display = 'block';
    if (cartContentEl) cartContentEl.style.display = 'none';
    updateCartCount(0);
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Cart cleared', 'info');
}

function recalculateCartTotals() {
    let subtotal = 0;
    for (let i = 0; i < cartData.items.length; i++) {
        subtotal += cartData.items[i].price * cartData.items[i].quantity;
    }
    cartData.subtotal = subtotal;
    cartData.total = subtotal - (cartData.discount_amount || 0);
}

function saveCartToLocalStorage() {
    if (window.EventhubCartStorage) {
        window.EventhubCartStorage.saveEventhubCart(cartData);
    } else {
        localStorage.setItem('eventhub_cart', JSON.stringify(cartData));
    }
}

async function applyPromoCode(e) {
    e.preventDefault();
    const code = document.getElementById('promoCode')?.value.trim();
    if (!code) { showToast('Enter a promo code', 'error'); return; }
    
    if (code.toUpperCase() === 'WELCOME10') {
        const discountAmount = Math.floor(cartData.subtotal * 0.1);
        cartData.discount_amount = discountAmount;
        cartData.promo_code = code.toUpperCase();
        recalculateCartTotals();
        saveCartToLocalStorage();
        if (selectedOrganizer) updateSummaryForOrganizer(selectedOrganizer);
        displayCart();
        document.getElementById('promoCode').value = '';
        window.dispatchEvent(new Event('cart-updated'));
        showToast('Promo applied! You saved ' + formatCurrency(discountAmount), 'success');
    } else {
        showToast('Invalid promo code', 'error');
    }
}

async function removePromoCode() {
    cartData.discount_amount = 0;
    cartData.promo_code = null;
    recalculateCartTotals();
    saveCartToLocalStorage();
    if (selectedOrganizer) updateSummaryForOrganizer(selectedOrganizer);
    displayCart();
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Promo removed', 'success');
}

function proceedToCheckout() {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        localStorage.setItem('redirect_after_login', '/cart/');
        showToast('Please login to continue', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
    }
    
    if (!selectedOrganizer) {
        showToast('Select an organizer to proceed', 'error');
        return;
    }
    
    const selectedItems = JSON.parse(sessionStorage.getItem('selected_items') || '[]');
    if (!selectedItems.length) {
        showToast('No items selected', 'error');
        return;
    }
    
    // Show billing form
    if (cartContentEl) cartContentEl.style.display = 'none';
    if (checkoutViewEl) checkoutViewEl.style.display = 'block';
    const bookingSummaryCard = document.querySelector('.booking-summary-card');
    if (bookingSummaryCard) bookingSummaryCard.style.display = 'none';
    
    // Prefill user data
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const nameInput = document.getElementById('billingName');
    const emailInput = document.getElementById('billingEmail');
    if (nameInput) nameInput.value = user.full_name || user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    
    // Update summary
    let subtotal = 0;
    for (let i = 0; i < selectedItems.length; i++) {
        subtotal += selectedItems[i].price * selectedItems[i].quantity;
    }
    const discount = cartData.discount_amount || 0;
    const total = subtotal - discount;
    const summaryEl = document.getElementById('checkoutOrderSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="summary-row"><span>Organizer:</span><span>${escapeHtml(selectedOrganizer)}</span></div>
            <div class="summary-row"><span>Items (${selectedItems.length}):</span><span>${formatCurrency(subtotal)}</span></div>
            ${discount > 0 ? `<div class="summary-row discount"><span>Discount:</span><span>-${formatCurrency(discount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total:</span><span>${formatCurrency(total)}</span></div>
        `;
    }
}

function backToCart() {
    if (checkoutViewEl) checkoutViewEl.style.display = 'none';
    if (cartContentEl) cartContentEl.style.display = 'block';
    if (selectedOrganizer) {
        const bookingSummaryCard = document.querySelector('.booking-summary-card');
        if (bookingSummaryCard) bookingSummaryCard.style.display = 'block';
    }
}

async function processCheckout(e) {
    e.preventDefault();
    
    const billingName = document.getElementById('billingName')?.value.trim();
    const billingEmail = document.getElementById('billingEmail')?.value.trim();
    
    if (!billingName) { showToast('Enter your full name', 'error'); return; }
    if (!billingEmail || !isValidEmail(billingEmail)) { showToast('Enter valid email', 'error'); return; }
    
    const selectedItems = JSON.parse(sessionStorage.getItem('selected_items') || '[]');
    if (!selectedItems.length) { showToast('No items selected', 'error'); return; }
    
    sessionStorage.setItem('checkout_billing_info', JSON.stringify({ name: billingName, email: billingEmail }));
    
    const firstItem = selectedItems[0];
    const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (window.CheckoutFlow && typeof window.CheckoutFlow.startCheckout === 'function') {
        await window.CheckoutFlow.startCheckout(firstItem.id, firstItem.ticket_type || 'regular', totalQuantity);
    } else {
        showToast('Payment system unavailable', 'error');
    }
}

// ========== UTILITIES ==========
function updateCartCount(count) {
    const badge = document.getElementById('cartBadgeDropdown');
    if (badge) {
        const cnt = count !== undefined ? count : (cartData?.items?.length || 0);
        if (cnt > 0) {
            badge.textContent = cnt > 99 ? '99+' : cnt;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) {
        return 'TBA';
    }
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        if (isNaN(val)) return 'KES 0';
        return 'KES ' + val.toLocaleString('en-KE');
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

function showToast(message, type) {
    type = type || 'success';
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + escapeHtml(message) + '</span>';
    document.body.appendChild(toast);
    
    setTimeout(function() {
        if (toast.parentNode) toast.remove();
    }, 4000);
}

// Exports
window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.removePromoCode = removePromoCode;
window.selectOrganizer = selectOrganizer;
window.backToCart = backToCart;
window.proceedToCheckout = proceedToCheckout;