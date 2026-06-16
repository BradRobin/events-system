// ============================================
// BOOKING CART — multi-organizer payment pipeline
// Each organizer uses their own M-Pesa settings; pay per organizer group.
// ============================================

let cartData = null;
let selectedOrganizerKey = null;

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

document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    setupEventListeners();
    updateNavBadgesFromCart();
    clearCartBadgeOnView();
    maybeAutoStartCheckout();
});

function getOrganizerKey(item) {
    if (item.organizer_id) return 'id:' + item.organizer_id;
    const name = item.organizer || item.organizer_name || 'Event Organizer';
    return 'name:' + name;
}

function getOrganizerName(item) {
    return item.organizer || item.organizer_name || 'Event Organizer';
}

function maybeAutoStartCheckout() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== '1') return;
    if (!cartData?.items?.length) return;

    const groups = groupItemsByOrganizer(cartData.items);
    if (groups.length === 1) {
        selectOrganizerGroup(groups[0].key);
        proceedToCheckout();
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    window.history.replaceState({}, '', url.pathname + url.search);
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

    window.addEventListener('checkout-submitted', onCheckoutProgress);
    window.addEventListener('checkout-completed', onCheckoutProgress);
    window.addEventListener('checkout-queue-complete', onCheckoutQueueComplete);
}

function onCheckoutProgress() {
    loadCart();
    if (checkoutViewEl?.style.display === 'block') {
        backToCart();
    }
}

function onCheckoutQueueComplete() {
    loadCart();
    backToCart();
    const notice = document.getElementById('multiOrganizerNotice');
    if (notice && cartData?.items?.length) {
        const remaining = groupItemsByOrganizer(cartData.items);
        if (remaining.length > 1) {
            notice.style.display = 'block';
            notice.querySelector('.notice-text').textContent =
                `${remaining.length} organizers still have unpaid events in your cart. Pay each one separately using their M-Pesa details.`;
        }
    }
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

        for (let i = 0; i < cartData.items.length; i++) {
            const item = cartData.items[i];
            if (!item.organizer && item.organizer_name) item.organizer = item.organizer_name;
            if (!item.organizer) {
                item.organizer = 'Event Organizer';
                item.organizer_name = 'Event Organizer';
            }
            if (!item.ticket_type) item.ticket_type = item.tier || 'regular';
        }

        window.cartData = cartData;
        displayCart();

        if (!cartData.items.length) {
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
    selectedOrganizerKey = null;
    const proceedBtn = document.getElementById('proceedToPaymentBtn');
    if (proceedBtn) proceedBtn.disabled = true;
}

function getSelectedGroupItems() {
    if (!selectedOrganizerKey) return [];
    return cartData.items.filter(item => getOrganizerKey(item) === selectedOrganizerKey);
}

function updateSummaryForOrganizer(organizerKey) {
    if (!organizerKey) {
        hideSummary();
        return;
    }

    const organizerItems = getSelectedGroupItems();
    if (!organizerItems.length) {
        hideSummary();
        return;
    }

    const organizerName = getOrganizerName(organizerItems[0]);
    let subtotal = organizerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = cartData.discount_amount || 0;
    const total = subtotal - discount;

    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(subtotal);
    if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(total);

    const summaryOrganizerEl = document.getElementById('summaryOrganizerName');
    if (summaryOrganizerEl) summaryOrganizerEl.textContent = organizerName;

    const summaryEventCount = document.getElementById('summaryEventCount');
    if (summaryEventCount) {
        summaryEventCount.textContent = organizerItems.length === 1
            ? '1 event'
            : organizerItems.length + ' events';
    }

    if (discount > 0) {
        if (discountRow) discountRow.style.display = 'flex';
        if (discountAmountSpan) discountAmountSpan.textContent = `-${formatCurrency(discount)}`;
    } else if (discountRow) {
        discountRow.style.display = 'none';
    }

    if (cartData.promo_code) {
        if (appliedPromoDiv) appliedPromoDiv.style.display = 'flex';
        if (promoCodeDisplaySpan) promoCodeDisplaySpan.textContent = cartData.promo_code;
    } else if (appliedPromoDiv) {
        appliedPromoDiv.style.display = 'none';
    }

    const bookingSummaryCard = document.querySelector('.booking-summary-card');
    if (bookingSummaryCard) bookingSummaryCard.style.display = 'block';

    selectedOrganizerKey = organizerKey;
    sessionStorage.setItem('selected_organizer_key', organizerKey);
    sessionStorage.setItem('selected_organizer', organizerName);
    sessionStorage.setItem('selected_items', JSON.stringify(organizerItems));
    sessionStorage.setItem('selected_total', total);

    const proceedBtn = document.getElementById('proceedToPaymentBtn');
    if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.textContent = organizerItems.length > 1
            ? `Pay ${organizerName} (${organizerItems.length} events)`
            : `Pay ${organizerName}`;
    }
}

function hasMultipleOrganizers(items) {
    const keys = new Set(items.map(getOrganizerKey));
    return keys.size > 1;
}

function groupItemsByOrganizer(items) {
    const groups = {};
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = getOrganizerKey(item);
        const orgName = getOrganizerName(item);
        if (!groups[key]) {
            groups[key] = {
                key,
                organizer: orgName,
                organizer_id: item.organizer_id,
                items: [],
                total: 0,
            };
        }
        groups[key].items.push(item);
        groups[key].total += item.price * item.quantity;
    }
    return Object.values(groups);
}

function selectOrganizerGroup(organizerKey) {
    if (selectedOrganizerKey === organizerKey) {
        hideSummary();
        selectedOrganizerKey = null;
        sessionStorage.removeItem('selected_organizer_key');
        sessionStorage.removeItem('selected_organizer');
        sessionStorage.removeItem('selected_items');
        sessionStorage.removeItem('selected_total');
        displayCart();
        return;
    }
    updateSummaryForOrganizer(organizerKey);
    displayCart();
}

function payOrganizerGroup(organizerKey) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        localStorage.setItem('redirect_after_login', '/cart/?checkout=1');
        showToast('Please login to continue', 'info');
        setTimeout(() => { window.location.href = '/login/'; }, 1500);
        return;
    }

    selectOrganizerGroup(organizerKey);
    const items = getSelectedGroupItems();
    if (!items.length) {
        showToast('No events for this organizer', 'error');
        return;
    }
    proceedToCheckout();
}

function displayCart() {
    if (!cartItemsEl) return;

    const notice = document.getElementById('multiOrganizerNotice');
    if (!cartData.items || !cartData.items.length) {
        cartItemsEl.innerHTML = '<div class="empty-cart-message">Your booking cart is empty</div>';
        if (notice) notice.style.display = 'none';
        hideSummary();
        return;
    }

    const multiOrg = hasMultipleOrganizers(cartData.items);
    if (notice) {
        if (multiOrg) {
            const count = groupItemsByOrganizer(cartData.items).length;
            notice.style.display = 'block';
            notice.querySelector('.notice-text').textContent =
                `Your cart has events from ${count} organizers. Each organizer uses their own M-Pesa paybill/till — complete payment separately for each group below.`;
        } else {
            notice.style.display = 'none';
        }
    }

    if (multiOrg) {
        const groups = groupItemsByOrganizer(cartData.items);
        let html = '';
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            const isSelected = selectedOrganizerKey === group.key;
            const safeKey = escapeHtml(group.key).replace(/'/g, "\\'");
            html += `
                <div class="organizer-group ${isSelected ? 'is-selected' : ''}" data-organizer-key="${escapeHtml(group.key)}">
                    <div class="organizer-group-header">
                        <div class="organizer-select">
                            <h4>${escapeHtml(group.organizer)}</h4>
                            <span class="organizer-event-count">${group.items.length} event${group.items.length > 1 ? 's' : ''}</span>
                        </div>
                        <span class="organizer-total">${formatCurrency(group.total)}</span>
                    </div>
                    <p class="organizer-payment-note"><i class="fas fa-mobile-alt"></i> Pays to ${escapeHtml(group.organizer)}&rsquo;s M-Pesa account</p>
                    <div class="organizer-group-items">
            `;
            for (let i = 0; i < group.items.length; i++) {
                const item = group.items[i];
                html += renderBookingItem(item);
            }
            html += `
                    </div>
                    <div class="organizer-group-actions">
                        <button type="button" class="organizer-pay-btn" onclick="payOrganizerGroup('${safeKey}')">
                            <i class="fas fa-mobile-alt"></i> Pay ${escapeHtml(group.organizer)}
                        </button>
                    </div>
                </div>
            `;
        }
        cartItemsEl.innerHTML = html;
        if (selectedOrganizerKey) {
            updateSummaryForOrganizer(selectedOrganizerKey);
        } else {
            hideSummary();
        }
    } else {
        let html = '';
        for (let i = 0; i < cartData.items.length; i++) {
            html += renderBookingItem(cartData.items[i]);
        }
        cartItemsEl.innerHTML = html;
        const singleKey = getOrganizerKey(cartData.items[0]);
        updateSummaryForOrganizer(singleKey);
    }

    if (cartItemCountSpan) cartItemCountSpan.textContent = cartData.items.length;
}

function renderBookingItem(item) {
    return `
        <div class="booking-item" data-id="${item.id}">
            <div class="item-image" style="background-image: url('${item.image || '/static/images/placeholder.jpg'}')"></div>
            <div class="item-details">
                <h4>${escapeHtml(item.title)}</h4>
                <p class="item-type">${escapeHtml(item.category || 'Event')} · ${escapeHtml(item.ticket_type || item.tier || 'regular')}</p>
                <p class="item-date">${formatDate(item.date)}</p>
                <p class="item-venue">${escapeHtml(item.location || '')}</p>
            </div>
            <div class="item-quantity">
                <button class="qty-btn minus" onclick="updateItemQuantity(${item.id}, -1)">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn plus" onclick="updateItemQuantity(${item.id}, 1)">+</button>
            </div>
            <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
            <button class="remove-item" onclick="removeItem(${item.id})" aria-label="Remove">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
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
    if (selectedOrganizerKey) updateSummaryForOrganizer(selectedOrganizerKey);
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Quantity updated', 'success');
}

async function removeItem(itemId) {
    const item = cartData.items.find(i => i.id == itemId);
    const removedKey = item ? getOrganizerKey(item) : null;

    cartData.items = cartData.items.filter(i => i.id != itemId);
    recalculateCartTotals();
    saveCartToLocalStorage();

    if (selectedOrganizerKey === removedKey) {
        const stillHas = cartData.items.some(i => getOrganizerKey(i) === selectedOrganizerKey);
        if (!stillHas) {
            selectedOrganizerKey = null;
            hideSummary();
        } else {
            updateSummaryForOrganizer(selectedOrganizerKey);
        }
    }
    displayCart();

    if (!cartData.items.length) {
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
    cartData.subtotal = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartData.total = cartData.subtotal - (cartData.discount_amount || 0);
}

function saveCartToLocalStorage() {
    window.cartData = cartData;
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
        const scopeItems = selectedOrganizerKey ? getSelectedGroupItems() : cartData.items;
        const scopeSubtotal = scopeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountAmount = Math.floor(scopeSubtotal * 0.1);
        cartData.discount_amount = discountAmount;
        cartData.promo_code = code.toUpperCase();
        recalculateCartTotals();
        saveCartToLocalStorage();
        if (selectedOrganizerKey) updateSummaryForOrganizer(selectedOrganizerKey);
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
    if (selectedOrganizerKey) updateSummaryForOrganizer(selectedOrganizerKey);
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

    const selectedItems = getSelectedGroupItems();
    if (!selectedItems.length) {
        showToast('Select an organizer group to pay', 'error');
        return;
    }

    if (cartContentEl) cartContentEl.style.display = 'none';
    if (checkoutViewEl) checkoutViewEl.style.display = 'block';
    const bookingSummaryCard = document.querySelector('.booking-summary-card');
    if (bookingSummaryCard) bookingSummaryCard.style.display = 'none';
    const notice = document.getElementById('multiOrganizerNotice');
    if (notice) notice.style.display = 'none';

    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const nameInput = document.getElementById('billingName');
    const emailInput = document.getElementById('billingEmail');
    if (nameInput) nameInput.value = user.full_name || user.name || '';
    if (emailInput) emailInput.value = user.email || '';

    const organizerName = getOrganizerName(selectedItems[0]);
    const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = cartData.discount_amount || 0;
    const total = subtotal - discount;

    const summaryEl = document.getElementById('checkoutOrderSummary');
    if (summaryEl) {
        let itemsHtml = selectedItems.map(item => `
            <div class="checkout-summary-item">
                <span>${escapeHtml(item.title)} × ${item.quantity}</span>
                <span>${formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');

        summaryEl.innerHTML = `
            <div class="checkout-organizer-banner">
                <i class="fas fa-mobile-alt"></i>
                <div>
                    <strong>Paying ${escapeHtml(organizerName)}</strong>
                    <p>Each event is paid separately using this organizer&rsquo;s M-Pesa details.</p>
                </div>
            </div>
            ${itemsHtml}
            <div class="summary-row"><span>Subtotal (${selectedItems.length} event${selectedItems.length > 1 ? 's' : ''}):</span><span>${formatCurrency(subtotal)}</span></div>
            ${discount > 0 ? `<div class="summary-row discount"><span>Discount:</span><span>-${formatCurrency(discount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total for this organizer:</span><span>${formatCurrency(total)}</span></div>
        `;
    }

    const checkoutTitle = document.getElementById('checkoutBillingTitle');
    if (checkoutTitle) {
        checkoutTitle.textContent = selectedItems.length > 1
            ? `Checkout — ${organizerName} (${selectedItems.length} payments)`
            : `Checkout — ${organizerName}`;
    }
}

function backToCart() {
    if (checkoutViewEl) checkoutViewEl.style.display = 'none';
    if (cartContentEl) cartContentEl.style.display = 'block';
    loadCart();
    if (selectedOrganizerKey) {
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

    const selectedItems = getSelectedGroupItems();
    if (!selectedItems.length) { showToast('No items selected', 'error'); return; }

    const billingInfo = { name: billingName, email: billingEmail };
    sessionStorage.setItem('checkout_billing_info', JSON.stringify(billingInfo));

    if (window.CheckoutFlow && typeof window.CheckoutFlow.startOrganizerCheckout === 'function') {
        await window.CheckoutFlow.startOrganizerCheckout(selectedItems, billingInfo);
    } else if (window.CheckoutFlow && typeof window.CheckoutFlow.startCheckout === 'function') {
        const first = selectedItems[0];
        await window.CheckoutFlow.startCheckout(first.id, first.ticket_type || 'regular', first.quantity);
    } else {
        showToast('Payment system unavailable', 'error');
    }
}

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
    } catch (e) {
        return 'TBA';
    }
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        if (isNaN(val)) return 'KES 0';
        return 'KES ' + val.toLocaleString('en-KE');
    } catch (e) {
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

window.cartData = cartData;
window.displayCart = displayCart;
window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.removePromoCode = removePromoCode;
window.selectOrganizerGroup = selectOrganizerGroup;
window.payOrganizerGroup = payOrganizerGroup;
window.backToCart = backToCart;
window.proceedToCheckout = proceedToCheckout;
