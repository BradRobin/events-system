// Transactions Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentTransactionId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadTransactions();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadTransactions();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadTransactions(); });
    
    const methodFilter = document.getElementById('methodFilter');
    if (methodFilter) methodFilter.addEventListener('change', () => { currentPage = 1; loadTransactions(); });
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', () => { currentPage = 1; loadTransactions(); });
    if (dateTo) dateTo.addEventListener('change', () => { currentPage = 1; loadTransactions(); });
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/payments/stats/');
        document.getElementById('totalTransactions').textContent = data.stats?.total || 0;
        document.getElementById('totalVolume').textContent = formatCurrency(data.stats?.total_volume || 0);
        document.getElementById('successCount').textContent = data.stats?.successful || 0;
        document.getElementById('pendingCount').textContent = data.stats?.pending || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadTransactions() {
    const search = document.getElementById('searchTransactions')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const method = document.getElementById('methodFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    Loader.show('Loading transactions...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            status: status,
            method: method,
            date_from: dateFrom,
            date_to: dateTo
        });
        const data = await apiRequest(`/api/admin/payments/transactions/?${params}`);
        
        displayTransactions(data.transactions);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsList').innerHTML = 
            '<tr><td colspan="8" class="text-center">Failed to load transactions</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transactions found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td><code>${escapeHtml(t.transaction_id)}</code></td>
            <td>${formatDateTime(t.created_at)}</td>
            <td>
                <strong>${escapeHtml(t.customer_name)}</strong><br>
                <small>${escapeHtml(t.customer_email)}</small>
            </td>
            <td>${escapeHtml(t.event_title)}</td>
            <td><strong>${formatCurrency(t.amount)}</strong></td>
            <td>${getPaymentMethodBadge(t.payment_method)}</td>
            <td>${getStatusBadge(t.status)}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewTransaction('${t.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${t.status === 'success' ? `
                    <button class="action-btn refund" onclick="openRefundModal('${t.id}')" title="Process Refund">
                        <i class="fas fa-undo-alt"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${transactions.length} records`;
}

async function viewTransaction(transactionId) {
    currentTransactionId = transactionId;
    
    try {
        const data = await apiRequest(`/api/admin/payments/transactions/${transactionId}/`);
        const t = data.transaction;
        
        document.getElementById('transactionModalBody').innerHTML = `
            <div class="info-row"><span>Transaction ID:</span><strong>${escapeHtml(t.transaction_id)}</strong></div>
            <div class="info-row"><span>Date:</span><span>${formatDateTime(t.created_at)}</span></div>
            <div class="info-row"><span>Customer:</span><span>${escapeHtml(t.customer_name)} (${escapeHtml(t.customer_email)})</span></div>
            <div class="info-row"><span>Event:</span><span>${escapeHtml(t.event_title)}</span></div>
            <div class="info-row"><span>Amount:</span><strong class="text-primary">${formatCurrency(t.amount)}</strong></div>
            <div class="info-row"><span>Payment Method:</span><span>${t.payment_method || 'N/A'}</span></div>
            <div class="info-row"><span>Status:</span><span>${getStatusBadge(t.status)}</span></div>
            ${t.mpesa_receipt ? `<div class="info-row"><span>M-Pesa Receipt:</span><span>${escapeHtml(t.mpesa_receipt)}</span></div>` : ''}
            <div class="info-row"><span>Booking ID:</span><span>#${escapeHtml(t.booking_id)}</span></div>
        `;
        
        const refundBtn = document.getElementById('refundBtn');
        if (refundBtn && t.status === 'success') {
            refundBtn.style.display = 'inline-flex';
        } else if (refundBtn) {
            refundBtn.style.display = 'none';
        }
        
        document.getElementById('transactionModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load transaction details', 'error');
    }
}

function openRefundModal(transactionId) {
    currentTransactionId = transactionId;
    const reason = prompt('Please provide a reason for refund:');
    if (reason) {
        processRefund(reason);
    }
}

async function processRefund(reason) {
    Loader.show('Processing refund...');
    
    try {
        await apiRequest(`/api/admin/payments/transactions/${currentTransactionId}/refund/`, 'POST', {
            reason: reason
        });
        showToast('Refund processed successfully', 'success');
        closeModal();
        loadTransactions();
        loadStats();
    } catch (error) {
        showToast('Failed to process refund', 'error');
    } finally {
        Loader.hide();
    }
}

function closeModal() {
    document.getElementById('transactionModal').style.display = 'none';
    currentTransactionId = null;
}

function applyFilters() {
    currentPage = 1;
    loadTransactions();
}

function resetFilters() {
    document.getElementById('searchTransactions').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('methodFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentPage = 1;
    loadTransactions();
}

function exportTransactions() {
    const params = new URLSearchParams({
        search: document.getElementById('searchTransactions')?.value || '',
        status: document.getElementById('statusFilter')?.value || '',
        method: document.getElementById('methodFilter')?.value || '',
        date_from: document.getElementById('dateFrom')?.value || '',
        date_to: document.getElementById('dateTo')?.value || ''
    });
    window.open(`/api/admin/payments/transactions/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadTransactions();
    }
}

function getStatusBadge(status) {
    const badges = {
        'success': '<span class="status-badge status-success"><i class="fas fa-check-circle"></i> Success</span>',
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        'failed': '<span class="status-badge status-failed"><i class="fas fa-times-circle"></i> Failed</span>',
        'refunded': '<span class="status-badge status-refunded"><i class="fas fa-undo-alt"></i> Refunded</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getPaymentMethodBadge(method) {
    const methods = {
        'mpesa': '<span class="payment-method method-mpesa"><i class="fas fa-mobile-alt"></i> M-Pesa</span>',
        'card': '<span class="payment-method method-card"><i class="fas fa-credit-card"></i> Card</span>',
        'bank': '<span class="payment-method method-bank"><i class="fas fa-university"></i> Bank</span>',
        'cash': '<span class="payment-method method-cash"><i class="fas fa-money-bill"></i> Cash</span>'
    };
    return methods[method] || `<span class="payment-method">${method || 'N/A'}</span>`;
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.viewTransaction = viewTransaction;
window.openRefundModal = openRefundModal;
window.closeModal = closeModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportTransactions = exportTransactions;
window.changePage = changePage;
