// ============================================
// TRANSACTION HISTORY - View past payments
// ============================================

let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => loadTransactionHistory());

function showToast(msg, type) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
    } else {
        alert(msg);
    }
}

function formatCurrency(amt) {
    return 'KES ' + (Number(amt) || 0).toLocaleString('en-KE');
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
}

function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

async function loadTransactionHistory() {
    const container = document.getElementById('transactionsList');
    if (container) container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-pulse"></i> Loading...</div>';
    
    try {
        const result = await window.AttendeeAPI.payments.getTransactionHistory(currentPage, 10);
        displayTransactions(result.results || []);
        totalPages = result.total_pages || 1;
        renderPagination();
        const countEl = document.getElementById('historyCount');
        if (countEl) countEl.textContent = `Showing ${result.results?.length || 0} of ${result.count || 0} transactions`;
    } catch (error) {
        console.error(error);
        if (container) container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Failed to load</h3><button class="btn-primary" onclick="loadTransactionHistory()">Retry</button></div>';
    }
}

function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><h3>No transactions</h3><p>Your payment history will appear here</p><a href="/events/" class="btn-primary">Browse Events</a></div>';
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="transaction-item" onclick="viewTransactionDetail('${t.id}')">
            <div class="transaction-icon ${t.status}"><i class="fas ${getIcon(t.type)}"></i></div>
            <div class="transaction-details">
                <div class="transaction-title">${escapeHtml(t.description || t.event_title || 'Payment')}</div>
                <div class="transaction-meta"><span><i class="far fa-calendar-alt"></i> ${formatDate(t.created_at)}</span><span><i class="fas fa-hashtag"></i> ${escapeHtml(t.reference || t.id)}</span></div>
            </div>
            <div class="transaction-amount ${t.type === 'refund' ? 'refund' : ''}">${t.type === 'refund' ? '+' : '-'} ${formatCurrency(t.amount)}</div>
            <div class="transaction-status"><span class="status-badge status-${t.status}">${getStatus(t.status)}</span></div>
        </div>
    `).join('');
}

function getIcon(type) {
    const icons = { payment: 'fa-credit-card', refund: 'fa-undo-alt', booking: 'fa-ticket-alt' };
    return icons[type] || 'fa-receipt';
}

function getStatus(status) {
    const map = { completed: 'Completed', pending: 'Pending', failed: 'Failed', confirmed: 'Confirmed', approved: 'Approved' };
    return map[status] || status;
}

async function viewTransactionDetail(id) {
    try {
        const t = await window.AttendeeAPI.payments.getTransactionDetail(id);
        showDetailModal(t);
    } catch { showToast('Could not load details', 'error'); }
}

function showDetailModal(transaction) {
    let modal = document.getElementById('transactionDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transactionDetailModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header"><h3>Transaction Details</h3><button class="modal-close" onclick="closeTransactionDetailModal()">&times;</button></div>
                <div class="modal-body" id="transactionDetailBody"></div>
                <div class="modal-footer"><button class="btn-secondary" onclick="closeTransactionDetailModal()">Close</button></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const body = document.getElementById('transactionDetailBody');
    if (body && transaction) {
        body.innerHTML = `
            <div class="detail-row"><span>Transaction ID</span><span>${escapeHtml(transaction.id)}</span></div>
            <div class="detail-row"><span>Date</span><span>${formatDate(transaction.created_at)}</span></div>
            <div class="detail-row"><span>Amount</span><span>${formatCurrency(transaction.amount)}</span></div>
            <div class="detail-row"><span>Status</span><span class="status-badge status-${transaction.status}">${getStatus(transaction.status)}</span></div>
            <div class="detail-row"><span>Reference</span><span>${escapeHtml(transaction.reference || '—')}</span></div>
            <div class="detail-row"><span>Payment Method</span><span>${escapeHtml(transaction.payment_method || 'M-Pesa')}</span></div>
            ${transaction.event_title ? `<div class="detail-row"><span>Event</span><span>${escapeHtml(transaction.event_title)}</span></div>` : ''}
            ${transaction.organizer ? `<div class="detail-row"><span>Organizer</span><span>${escapeHtml(transaction.organizer)}</span></div>` : ''}
            ${transaction.receipt_number ? `<div class="detail-row"><span>Receipt</span><span>${escapeHtml(transaction.receipt_number)}</span></div>` : ''}
        `;
    }
    modal.style.display = 'flex';
}

function closeTransactionDetailModal() {
    const modal = document.getElementById('transactionDetailModal');
    if (modal) modal.style.display = 'none';
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
    let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">&laquo; Prev</button>`;
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next &raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadTransactionHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.loadTransactionHistory = loadTransactionHistory;
window.viewTransactionDetail = viewTransactionDetail;
window.closeTransactionDetailModal = closeTransactionDetailModal;
window.changePage = changePage;