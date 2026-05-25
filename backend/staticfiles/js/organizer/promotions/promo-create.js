// ============================================
// ORGANIZER PROMO CREATE
// Handles: Creating new promo codes for events
// ============================================

let currentEventId = null;
let isEditing = false;
let editPromoId = null;

document.addEventListener('DOMContentLoaded', () => {
    currentEventId = getEventIdFromUrl();
    editPromoId = getEditPromoId();
    isEditing = !!editPromoId;
    
    if (currentEventId) {
        loadEventInfo();
        if (isEditing) loadPromoData();
        setupForm();
        generateRandomCode();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/promotions/);
    return match ? match[1] : null;
}

function getEditPromoId() {
    const path = window.location.pathname;
    const match = path.match(/\/promotions\/(\d+)\/edit/);
    return match ? match[1] : null;
}

async function loadEventInfo() {
    const event = await EventAPI.Organizer.getEventForEdit(currentEventId);
    if (event) {
        document.getElementById('eventTitle').innerText = event.title;
        document.getElementById('eventPrice').innerText = `KES ${event.price.toLocaleString()}`;
        document.getElementById('maxDiscountHint').innerText = `Max discount cannot exceed ticket price (KES ${event.price.toLocaleString()})`;
    }
}

async function loadPromoData() {
    const promos = await EventAPI.Organizer.getPromoCodes(currentEventId);
    const promo = promos?.find(p => p.id == editPromoId);
    
    if (promo) {
        document.getElementById('promoCode').value = promo.code;
        document.getElementById('discountType').value = promo.discount_type;
        document.getElementById('discountValue').value = promo.discount_value;
        document.getElementById('maxUses').value = promo.max_uses;
        document.getElementById('validUntil').value = promo.valid_until.split('T')[0];
        document.getElementById('minPurchase').value = promo.min_purchase || '';
        document.getElementById('isActive').checked = promo.is_active;
        
        document.getElementById('formTitle').innerText = 'Edit Promo Code';
        document.getElementById('submitBtn').innerText = 'Update Promo Code';
    }
}

function setupForm() {
    const discountType = document.getElementById('discountType');
    const discountValue = document.getElementById('discountValue');
    
    discountType.addEventListener('change', () => {
        const hint = discountType.value === 'percentage' ? '% off' : 'KES off';
        document.getElementById('discountHint').innerText = hint;
        validateDiscount();
    });
    
    discountValue.addEventListener('input', () => validateDiscount());
    
    document.getElementById('promoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePromoCode();
    });
}

function generateRandomCode() {
    const codeInput = document.getElementById('promoCode');
    if (codeInput.value) return;
    
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += characters.charAt(Math.floor(Math.random() * characters.length));
    codeInput.value = code;
}

function validateDiscount() {
    const type = document.getElementById('discountType').value;
    const value = parseFloat(document.getElementById('discountValue').value);
    const eventPrice = parseFloat(document.getElementById('eventPrice')?.innerText.replace('KES ', '') || 0);
    const errorSpan = document.getElementById('discountError');
    
    if (type === 'percentage') {
        if (value > 100) {
            errorSpan.innerText = 'Percentage discount cannot exceed 100%';
            return false;
        }
    } else {
        if (value > eventPrice) {
            errorSpan.innerText = `Fixed discount cannot exceed ticket price (KES ${eventPrice.toLocaleString()})`;
            return false;
        }
    }
    
    errorSpan.innerText = '';
    return true;
}

async function savePromoCode() {
    if (!validateDiscount()) return;
    
    const promoData = {
        code: document.getElementById('promoCode').value.toUpperCase(),
        discount_type: document.getElementById('discountType').value,
        discount_value: parseFloat(document.getElementById('discountValue').value),
        max_uses: parseInt(document.getElementById('maxUses').value) || null,
        valid_until: document.getElementById('validUntil').value,
        min_purchase: parseFloat(document.getElementById('minPurchase').value) || null,
        is_active: document.getElementById('isActive').checked
    };
    
    if (!promoData.code) {
        showToast('Please enter a promo code', 'error');
        return;
    }
    
    showLoading();
    
    const result = await EventAPI.Organizer.createPromoCode(currentEventId, promoData);
    if (result) {
        showToast(`Promo code ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
        window.location.href = `/organizer/events/${currentEventId}/promotions/`;
    }
    
    hideLoading();
}

function previewDiscount() {
    const type = document.getElementById('discountType').value;
    const value = parseFloat(document.getElementById('discountValue').value);
    const eventPrice = parseFloat(document.getElementById('eventPrice')?.innerText.replace('KES ', '') || 0);
    
    let discountText = '';
    let finalPrice = eventPrice;
    
    if (type === 'percentage') {
        discountText = `${value}% OFF`;
        finalPrice = eventPrice * (1 - value / 100);
    } else {
        discountText = `KES ${value.toLocaleString()} OFF`;
        finalPrice = eventPrice - value;
    }
    
    document.getElementById('discountPreview').innerHTML = `
        <div class="preview-card">
            <div class="preview-label">Customer sees:</div>
            <div class="preview-discount">${discountText}</div>
            <div class="preview-price">
                <span class="original">KES ${eventPrice.toLocaleString()}</span>
                <span class="final">KES ${Math.max(0, finalPrice).toLocaleString()}</span>
            </div>
            <div class="preview-savings">Save ${type === 'percentage' ? value + '%' : 'KES ' + value.toLocaleString()}</div>
        </div>
    `;
}

function showLoading() {
    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
}

function hideLoading() {
    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = isEditing ? 'Update Promo Code' : 'Create Promo Code';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
