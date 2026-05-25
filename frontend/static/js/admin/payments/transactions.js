// Transactions Management - Production Ready with PDF Export

function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

const API = {
    getTransactions: '/api/admin/transactions/',
    getStats: '/api/admin/transactions/stats/',
    refundTransaction: '/api/admin/transactions/refund/',
    exportTransactions: '/api/admin/transactions/export/',
    getTransactionDetail: (id) => `/api/admin/transactions/${id}/`
};

let currentTransactions = [];
let currentPage = 1;
let itemsPerPage = 10;
let selectedTransaction = null;
let currentFilters = {
    search: '',
    status: '',
    dateFrom: '',
    dateTo: ''
};

const elements = {
    transactionsList: document.getElementById('transactionsList'),
    pagination: document.getElementById('pagination'),
    recordsCount: document.getElementById('recordsCount'),
    searchTransactions: document.getElementById('searchTransactions'),
    statusFilter: document.getElementById('statusFilter'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    exportBtn: document.getElementById('exportBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    transactionModal: document.getElementById('transactionModal'),
    transactionModalBody: document.getElementById('transactionModalBody'),
    refundBtn: document.getElementById('refundBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    loadStats();
    attachEventListeners();
});

function attachEventListeners() {
    elements.searchTransactions.addEventListener('input', debounce(applyFilters, 500));
    elements.statusFilter.addEventListener('change', applyFilters);
    elements.dateFrom.addEventListener('change', applyFilters);
    elements.dateTo.addEventListener('change', applyFilters);
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    elements.exportBtn.addEventListener('click', exportTransactionsToPDF);
    elements.refundBtn.addEventListener('click', processRefund);
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
}

async function loadTransactions() {
    showLoading(elements.transactionsList, 7);
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            page_size: itemsPerPage,
            search: currentFilters.search,
            status: currentFilters.status,
            date_from: currentFilters.dateFrom,
            date_to: currentFilters.dateTo
        });
        
        const response = await fetch(`${API.getTransactions}?${params}`, {
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load transactions');
        
        const data = await response.json();
        currentTransactions = data.results || data;
        renderTransactions();
        renderPagination(data.count || data.length || 0);
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError(elements.transactionsList, 'Failed to load transactions');
    }
}

async function loadStats() {
    try {
        const response = await fetch(API.getStats, {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        
        document.getElementById('totalTransactions').textContent = stats.total_count || 0;
        document.getElementById('totalVolume').textContent = `KSh ${formatNumber(stats.total_volume || 0)}`;
        document.getElementById('successCount').textContent = stats.success_count || 0;
        document.getElementById('pendingCount').textContent = stats.pending_count || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function renderTransactions() {
    if (!currentTransactions || currentTransactions.length === 0) {
        elements.transactionsList.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td>\n    </tr>';
        elements.recordsCount.textContent = '0 records';
        return;
    }
    
    elements.transactionsList.innerHTML = currentTransactions.map(transaction => `
        <tr>
            <td><code>${escapeHtml(transaction.transaction_id || transaction.id)}</code></td>
            <td>${formatDateTime(transaction.created_at || transaction.date)}</td>
            <td>${escapeHtml(transaction.customer_name || transaction.customer?.name || 'N/A')}<br><small class="text-muted">${escapeHtml(transaction.customer_email || '')}</small></td>
            <td>${escapeHtml(transaction.event_name || transaction.event?.name || '-')}</td>
            <td class="amount">KSh ${formatNumber(transaction.amount)}</td>
            <td>${getStatusBadge(transaction.status)}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewTransactionDetails('${transaction.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${transaction.status === 'success' ? 
                    `<button class="action-btn refund" onclick="openRefundModal('${transaction.id}')" title="Refund">
                        <i class="fas fa-undo-alt"></i>
                    </button>` : ''
                }
              </td>
         </tr>
    `).join('');
    
    elements.recordsCount.textContent = `${currentTransactions.length} records`;
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHtml = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button onclick="changePage(${i})" class="${currentPage === i ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    
    paginationHtml += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    elements.pagination.innerHTML = paginationHtml;
}

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    loadTransactions();
}

function applyFilters() {
    currentFilters = {
        search: elements.searchTransactions.value,
        status: elements.statusFilter.value,
        dateFrom: elements.dateFrom.value,
        dateTo: elements.dateTo.value
    };
    currentPage = 1;
    loadTransactions();
}

function resetFilters() {
    elements.searchTransactions.value = '';
    elements.statusFilter.value = '';
    elements.dateFrom.value = '';
    elements.dateTo.value = '';
    applyFilters();
}

async function viewTransactionDetails(transactionId) {
    try {
        const response = await fetch(API.getTransactionDetail(transactionId), {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        
        if (!response.ok) throw new Error('Failed to load transaction details');
        
        selectedTransaction = await response.json();
        
        elements.transactionModalBody.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Transaction ID:</span>
                <span class="detail-value"><code>${escapeHtml(selectedTransaction.transaction_id || selectedTransaction.id)}</code></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date & Time:</span>
                <span class="detail-value">${formatDateTime(selectedTransaction.created_at || selectedTransaction.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${escapeHtml(selectedTransaction.customer_name || selectedTransaction.customer?.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${escapeHtml(selectedTransaction.customer_email || selectedTransaction.customer?.email || '-')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${escapeHtml(selectedTransaction.customer_phone || selectedTransaction.customer?.phone || '-')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Event:</span>
                <span class="detail-value">${escapeHtml(selectedTransaction.event_name || selectedTransaction.event?.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value amount-positive">KSh ${formatNumber(selectedTransaction.amount)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${getStatusBadge(selectedTransaction.status)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">${escapeHtml(selectedTransaction.reference || '-')}</span>
            </div>
        `;
        
        elements.refundBtn.style.display = selectedTransaction.status === 'success' ? 'inline-flex' : 'none';
        elements.transactionModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading transaction details:', error);
        showToast('Failed to load transaction details', 'error');
    }
}

function openRefundModal(transactionId) {
    viewTransactionDetails(transactionId);
}

async function processRefund() {
    if (!selectedTransaction) return;
    
    if (!confirm(`Refund KSh ${formatNumber(selectedTransaction.amount)} to ${selectedTransaction.customer_name || selectedTransaction.customer?.name}?`)) {
        return;
    }
    
    elements.refundBtn.disabled = true;
    elements.refundBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(API.refundTransaction, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transaction_id: selectedTransaction.id })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process refund');
        }
        
        closeModal();
        loadTransactions();
        loadStats();
        showToast('Refund processed successfully', 'success');
    } catch (error) {
        console.error('Error processing refund:', error);
        showToast(error.message, 'error');
    } finally {
        elements.refundBtn.disabled = false;
        elements.refundBtn.innerHTML = '<i class="fas fa-undo-alt"></i> Refund';
    }
}

async function exportTransactionsToPDF() {
    showToast('Generating PDF report...', 'info');
    
    try {
        // Fetch all transactions for export (without pagination)
        const params = new URLSearchParams({
            page_size: 1000,
            search: currentFilters.search,
            status: currentFilters.status,
            date_from: currentFilters.dateFrom,
            date_to: currentFilters.dateTo
        });
        
        const response = await fetch(`${API.getTransactions}?${params}`, {
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load transaction data');
        
        const data = await response.json();
        const transactions = data.results || data;
        
        // Also fetch stats for the report
        const statsResponse = await fetch(API.getStats, {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        const stats = await statsResponse.json();
        
        generateTransactionsPDF(transactions, stats);
    } catch (error) {
        console.error('Error exporting transactions:', error);
        showToast('Failed to generate PDF report', 'error');
    }
}

function generateTransactionsPDF(transactions, stats) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(245, 158, 11);
    doc.text('EventHub Payment Transactions Report', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add filter info
    let filterText = '';
    if (currentFilters.search) filterText += `Search: ${currentFilters.search} `;
    if (currentFilters.status) filterText += `Status: ${currentFilters.status} `;
    if (currentFilters.dateFrom) filterText += `From: ${formatDate(currentFilters.dateFrom)} `;
    if (currentFilters.dateTo) filterText += `To: ${formatDate(currentFilters.dateTo)}`;
    if (filterText) {
        doc.text(filterText, 20, 37);
    }
    
    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary Statistics', 20, 50);
    
    const summaryData = [
        ['Total Transactions', formatNumber(stats.total_count || 0)],
        ['Total Volume', `KSh ${formatNumber(stats.total_volume || 0)}`],
        ['Successful Transactions', formatNumber(stats.success_count || 0)],
        ['Pending Transactions', formatNumber(stats.pending_count || 0)],
        ['Failed Transactions', formatNumber(stats.failed_count || 0)],
        ['Refunded Transactions', formatNumber(stats.refunded_count || 0)],
        ['Transactions in Report', formatNumber(transactions.length)]
    ];
    
    doc.autoTable({
        startY: 55,
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
        margin: { left: 20, right: 20 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } }
    });
    
    // Transactions Table
    let yPosition = doc.lastAutoTable.finalY + 10;
    if (yPosition > 180) { doc.addPage(); yPosition = 20; }
    
    doc.setFontSize(14);
    doc.text('Transaction Details', 20, yPosition);
    yPosition += 5;
    
    const transactionsData = transactions.map(transaction => [
        transaction.transaction_id || transaction.id,
        formatDateTime(transaction.created_at || transaction.date),
        transaction.customer_name || transaction.customer?.name || 'N/A',
        transaction.event_name || transaction.event?.name || '-',
        `KSh ${formatNumber(transaction.amount)}`,
        transaction.status
    ]);
    
    if (transactionsData.length) {
        doc.autoTable({
            startY: yPosition,
            head: [['Transaction ID', 'Date & Time', 'Customer', 'Event', 'Amount', 'Status']],
            body: transactionsData,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 }
        });
    } else {
        doc.text('No transaction data available', 20, yPosition + 10);
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`EventHub Transactions Report - Page ${i} of ${pageCount}`, 20, 287);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 292);
    }
    
    doc.save(`transactions_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF report downloaded successfully', 'success');
}

function getStatusBadge(status) {
    const badges = {
        success: '<span class="status-badge status-success"><i class="fas fa-check"></i> Success</span>',
        pending: '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        failed: '<span class="status-badge status-failed"><i class="fas fa-times"></i> Failed</span>',
        refunded: '<span class="status-badge status-refunded"><i class="fas fa-undo-alt"></i> Refunded</span>'
    };
    return badges[status] || badges.pending;
}

function formatNumber(num) {
    if (!num && num !== 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(container, colspan) {
    container.innerHTML = `<tr><td colspan="${colspan}" class="text-center"><div class="loading-spinner"></div>Loading...</td></tr>`;
}

function showError(container, message) {
    container.innerHTML = `<tr><td colspan="7" class="text-center error-state"><i class="fas fa-exclamation-circle"></i><p>${message}</p><button class="btn-secondary" onclick="location.reload()">Retry</button></td></tr>`;
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:1rem 1.5rem;border-radius:8px;background:white;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);z-index:1100;display:flex;align-items:center;gap:0.75rem;border-left:4px solid #10b981;';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

function closeModal() {
    elements.transactionModal.style.display = 'none';
    selectedTransaction = null;
}