// ============================================
// ATTENDEE PAYMENTS
// Manage payment methods and view transaction history
// ============================================

let currentTab = 'methods';
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadPaymentMethods();
    loadTransactionHistory();
    setupEventListeners();
});

function setupEventListeners() {
    const addMethodBtn = document.getElementById('addPaymentMethodBtn');
    if (addMethodBtn) {
        addMethodBtn.addEventListener('click', showAddMethodModal);
    }
    
    const saveMethodBtn = document.getElementById('savePaymentMethodBtn');
    if (saveMethodBtn) {
        saveMethodBtn.addEventListener('click', addPaymentMethod);
    }
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    
    if (tab === 'methods') {
        document.getElementById('methodsTab').style.display = 'block';
        document.getElementById('historyTab').style.display = 'none';
        loadPaymentMethods();
    } else {
        document.getElementById('methodsTab').style.display = 'none';
        document.getElementById('historyTab').style.display = 'block';
        loadTransactionHistory();
    }
}

async function loadPaymentMethods() {
    Loader.show('Loading payment methods...');
    
    try {
        const methods = await window.AttendeeAPI.payments.getPaymentMethods();
        displayPaymentMethods(methods);
    } catch (error) {
        console.error('Error loading payment methods:', error);
        document.getElementById('paymentMethodsList').innerHTML = 
            '<div class="empty-state"><i class="fas fa-credit-card"></i><p>Failed to load payment methods</p></div>';
    } finally {
        Loader.hide();
    }
}

function displayPaymentMethods(methods) {
    const container = document.getElementById('paymentMethodsList');
    
    if (!methods || methods.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <h3>No saved payment methods</h3>
                <p>Add a payment method for faster checkout.</p>
                <button class="btn-primary" onclick="showAddMethodModal()">
                    <i class="fas fa-plus"></i> Add Payment Method
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = methods.map(method => `
        <div class="payment-method-card">
            <div class="method-icon">
                <i class="fab ${getPaymentIcon(method.type)}"></i>
            </div>
            <div class="method-details">
                <div class="method-type">${getMethodDisplayName(method.type)}</div>
                <div class="method-info">
                    ${method.type === 'card' ? 
                        `**** **** **** ${method.last4}` : 
                        method.phone_number ? method.phone_number : method.account_name}
                </div>
                ${method.is_default ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="method-actions">
                ${!method.is_default ? `
                    <button class="action-btn" onclick="setDefaultMethod(${method.id})" title="Set as default">
                        <i class="fas fa-star"></i>
                    </button>
                ` : ''}
                <button class="action-btn danger" onclick="removePaymentMethod(${method.id})" title="Remove">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getPaymentIcon(type) {
    const icons = {
        'card': 'fa-cc-visa',
        'mpesa': 'fa-mobile-alt',
        'paypal': 'fa-paypal'
    };
    return icons[type] || 'fa-credit-card';
}

function getMethodDisplayName(type) {
    const names = {
        'card': 'Credit/Debit Card',
        'mpesa': 'M-Pesa',
        'paypal': 'PayPal'
    };
    return names[type] || type;
}

function showAddMethodModal() {
    const modal = document.getElementById('addMethodModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddMethodModal() {
    const modal = document.getElementById('addMethodModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('addMethodForm').reset();
}

async function addPaymentMethod() {
    const methodType = document.getElementById('methodType').value;
    let methodData = {};
    
    if (methodType === 'card') {
        methodData = {
            type: 'card',
            card_number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
            expiry_month: document.getElementById('expiryMonth').value,
            expiry_year: document.getElementById('expiryYear').value,
            cvv: document.getElementById('cvv').value,
            cardholder_name: document.getElementById('cardholderName').value
        };
        
        if (!methodData.card_number || methodData.card_number.length < 15) {
            showToast('Please enter a valid card number', 'error');
            return;
        }
        
    } else if (methodType === 'mpesa') {
        methodData = {
            type: 'mpesa',
            phone_number: document.getElementById('mpesaPhone').value
        };
        
        if (!methodData.phone_number) {
            showToast('Please enter your M-Pesa phone number', 'error');
            return;
        }
    }
    
    Loader.show('Adding payment method...');
    
    try {
        await window.AttendeeAPI.payments.addPaymentMethod(methodData);
        showToast('Payment method added successfully', 'success');
        closeAddMethodModal();
        loadPaymentMethods();
    } catch (error) {
        console.error('Error adding payment method:', error);
        showToast(error.message || 'Failed to add payment method', 'error');
    } finally {
        Loader.hide();
    }
}

async function setDefaultMethod(methodId) {
    Loader.show('Setting as default...');
    
    try {
        await window.AttendeeAPI.payments.updatePaymentMethod(methodId, { is_default: true });
        showToast('Default payment method updated', 'success');
        loadPaymentMethods();
    } catch (error) {
        console.error('Error setting default:', error);
        showToast('Failed to set default method', 'error');
    } finally {
        Loader.hide();
    }
}

async function removePaymentMethod(methodId) {
    const confirmed = confirm('Are you sure you want to remove this payment method?');
    if (!confirmed) return;
    
    Loader.show('Removing payment method...');
    
    try {
        await window.AttendeeAPI.payments.removePaymentMethod(methodId);
        showToast('Payment method removed', 'success');
        loadPaymentMethods();
    } catch (error) {
        console.error('Error removing payment method:', error);
        showToast('Failed to remove payment method', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadTransactionHistory() {
    Loader.show('Loading transaction history...');
    
    try {
        const result = await window.AttendeeAPI.payments.getTransactionHistory(currentPage, 10);
        displayTransactionHistory(result.results);
        
        if (result.total_pages) {
            totalPages = result.total_pages;
            renderPagination(currentPage, totalPages);
        }
        
        document.getElementById('historyCount').textContent = 
            `Showing ${result.results?.length || 0} of ${result.count || 0} transactions`;
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsList').innerHTML = 
            '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load transactions</p></div>';
    } finally {
        Loader.hide();
    }
}

function displayTransactionHistory(transactions) {
    const container = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No transactions found</h3>
                <p>Your payment history will appear here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(transaction => `
        <div class="transaction-item" onclick="viewTransactionDetail('${transaction.id}')">
            <div class="transaction-icon ${transaction.status}">
                <i class="fas ${getTransactionIcon(transaction.type)}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">
                    ${escapeHtml(transaction.description || transaction.event_title)}
                </div>
                <div class="transaction-meta">
                    <span>${formatDateTime(transaction.created_at)}</span>
                    <span>Reference: ${escapeHtml(transaction.reference)}</span>
                </div>
            </div>
            <div class="transaction-amount ${transaction.type === 'refund' ? 'refund' : ''}">
                ${transaction.type === 'refund' ? '+' : '-'} ${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-status">
                <span class="status-badge status-${transaction.status}">${transaction.status}</span>
            </div>
        </div>
    `).join('');
}

function getTransactionIcon(type) {
    const icons = {
        'payment': 'fa-credit-card',
        'refund': 'fa-undo-alt',
        'payout': 'fa-money-bill-wave'
    };
    return icons[type] || 'fa-receipt';
}

function viewTransactionDetail(transactionId) {
    // Implement transaction detail modal
    showToast('Transaction details coming soon', 'info');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadTransactionHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Format card number input
function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
}

function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
}

// Make functions global
window.switchTab = switchTab;
window.showAddMethodModal = showAddMethodModal;
window.closeAddMethodModal = closeAddMethodModal;
window.addPaymentMethod = addPaymentMethod;
window.setDefaultMethod = setDefaultMethod;
window.removePaymentMethod = removePaymentMethod;
window.changePage = changePage;
window.formatCardNumber = formatCardNumber;
window.formatExpiry = formatExpiry;