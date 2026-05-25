// Payouts Management - Production Ready
// CSRF Token Setup
function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

// API Configuration
const API = {
    getPayouts: '/api/admin/payouts/',
    getStats: '/api/admin/payouts/stats/',
    processPayout: '/api/admin/payouts/process/',
    processAll: '/api/admin/payouts/process-all/',
    getPayoutDetail: (id) => `/api/admin/payouts/${id}/`
};

// State Management
let currentPayouts = [];
let currentPage = 1;
let itemsPerPage = 10;
let selectedPayout = null;
let currentFilters = {
    search: '',
    status: '',
    dateFrom: '',
    dateTo: ''
};

// DOM Elements
const elements = {
    payoutsList: document.getElementById('payoutsList'),
    pagination: document.getElementById('pagination'),
    recordsCount: document.getElementById('recordsCount'),
    searchPayouts: document.getElementById('searchPayouts'),
    statusFilter: document.getElementById('statusFilter'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    processAllBtn: document.getElementById('processAllBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    payoutModal: document.getElementById('payoutModal'),
    payoutInfo: document.getElementById('payoutInfo'),
    transactionRef: document.getElementById('transactionRef'),
    payoutNotes: document.getElementById('payoutNotes'),
    confirmPayoutBtn: document.getElementById('confirmPayoutBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPayouts();
    loadStats();
    attachEventListeners();
});

function attachEventListeners() {
    elements.searchPayouts.addEventListener('input', debounce(applyFilters, 500));
    elements.statusFilter.addEventListener('change', applyFilters);
    elements.dateFrom.addEventListener('change', applyFilters);
    elements.dateTo.addEventListener('change', applyFilters);
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    elements.processAllBtn.addEventListener('click', processAllPending);
    elements.confirmPayoutBtn.addEventListener('click', confirmPayout);
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
}

// Load payouts from API
async function loadPayouts() {
    showLoading(elements.payoutsList, 9);
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            page_size: itemsPerPage,
            ...currentFilters
        });
        
        const response = await fetch(`${API.getPayouts}?${params}`, {
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load payouts');
        
        const data = await response.json();
        currentPayouts = data.results || data;
        renderPayouts();
        renderPagination(data.count || data.length || 0);
    } catch (error) {
        console.error('Error loading payouts:', error);
        showError(elements.payoutsList, 'Failed to load payouts');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(API.getStats, {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        
        document.getElementById('pendingPayouts').textContent = stats.pending_count || 0;
        document.getElementById('totalPendingAmount').textContent = `KSh ${formatNumber(stats.total_pending_amount || 0)}`;
        document.getElementById('totalPaid').textContent = `KSh ${formatNumber(stats.total_paid_amount || 0)}`;
        document.getElementById('paidThisMonth').textContent = `KSh ${formatNumber(stats.paid_this_month || 0)}`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render payouts table
function renderPayouts() {
    if (!currentPayouts || currentPayouts.length === 0) {
        elements.payoutsList.innerHTML = '<tr><td colspan="9" class="text-center">No payouts found</td></tr>';
        elements.recordsCount.textContent = '0 records';
        return;
    }
    
    elements.payoutsList.innerHTML = currentPayouts.map(payout => `
        <tr>
            <td><strong>${escapeHtml(payout.organizer_name || payout.organizer?.name || 'N/A')}</strong>${payout.organizer_email ? `<br><small class="text-muted">${escapeHtml(payout.organizer_email)}</small>` : ''}</td>
            <td>${escapeHtml(payout.period || '-')}</td>
            <td>${payout.events_count || 0}</td>
            <td>KSh ${formatNumber(payout.ticket_sales || 0)}</td>
            <td>KSh ${formatNumber(payout.platform_fee || 0)}</td>
            <td><strong class="amount">KSh ${formatNumber(payout.payout_amount || 0)}</strong></td>
            <td>${getStatusBadge(payout.status)}</td>
            <td>${formatDate(payout.requested_date)}</td>
            <td class="action-buttons">
                ${payout.status === 'pending' ? 
                    `<button class="action-btn process" onclick="openProcessModal(${payout.id})" title="Process">
                        <i class="fas fa-check-circle"></i>
                    </button>` : ''
                }
                <button class="action-btn view" onclick="viewPayoutDetails(${payout.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
             </td>
         </tr>
    `).join('');
    
    elements.recordsCount.textContent = `${currentPayouts.length} records`;
}

// Render pagination
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

// Change page
function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    loadPayouts();
}

// Apply filters
function applyFilters() {
    currentFilters = {
        search: elements.searchPayouts.value,
        status: elements.statusFilter.value,
        dateFrom: elements.dateFrom.value,
        dateTo: elements.dateTo.value
    };
    currentPage = 1;
    loadPayouts();
}

// Reset filters
function resetFilters() {
    elements.searchPayouts.value = '';
    elements.statusFilter.value = '';
    elements.dateFrom.value = '';
    elements.dateTo.value = '';
    applyFilters();
}

// Open process payout modal
async function openProcessModal(payoutId) {
    try {
        const response = await fetch(API.getPayoutDetail(payoutId), {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        
        if (!response.ok) throw new Error('Failed to load payout details');
        
        selectedPayout = await response.json();
        
        elements.payoutInfo.innerHTML = `
            <p><strong>Organizer:</strong> ${escapeHtml(selectedPayout.organizer_name || selectedPayout.organizer?.name)}</p>
            <p><strong>Amount:</strong> KSh ${formatNumber(selectedPayout.payout_amount)}</p>
            <p><strong>Period:</strong> ${escapeHtml(selectedPayout.period || '-')}</p>
            <p><strong>Events:</strong> ${selectedPayout.events_count || 0}</p>
        `;
        
        elements.transactionRef.value = '';
        elements.payoutNotes.value = '';
        elements.payoutModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading payout details:', error);
        showToast('Failed to load payout details', 'error');
    }
}

// Confirm payout processing
async function confirmPayout() {
    const reference = elements.transactionRef.value.trim();
    const notes = elements.payoutNotes.value;
    
    if (!reference) {
        showToast('Please enter a reference number', 'error');
        return;
    }
    
    elements.confirmPayoutBtn.disabled = true;
    elements.confirmPayoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(API.processPayout, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payout_id: selectedPayout.id,
                reference: reference,
                notes: notes
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process payout');
        }
        
        closeModal();
        loadPayouts();
        loadStats();
        showToast('Payout processed successfully', 'success');
    } catch (error) {
        console.error('Error processing payout:', error);
        showToast(error.message, 'error');
    } finally {
        elements.confirmPayoutBtn.disabled = false;
        elements.confirmPayoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm';
    }
}

// Process all pending payouts
async function processAllPending() {
    if (!confirm('Process all pending payouts?')) return;
    
    elements.processAllBtn.disabled = true;
    elements.processAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(API.processAll, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process payouts');
        }
        
        const result = await response.json();
        loadPayouts();
        loadStats();
        showToast(`${result.processed_count || 0} payout(s) processed successfully`, 'success');
    } catch (error) {
        console.error('Error processing all payouts:', error);
        showToast(error.message, 'error');
    } finally {
        elements.processAllBtn.disabled = false;
        elements.processAllBtn.innerHTML = '<i class="fas fa-check-circle"></i> Process All Pending';
    }
}

// View payout details
async function viewPayoutDetails(payoutId) {
    try {
        const response = await fetch(API.getPayoutDetail(payoutId), {
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        
        if (!response.ok) throw new Error('Failed to load payout details');
        
        const payout = await response.json();
        
        elements.payoutInfo.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Organizer:</span>
                <span class="detail-value">${escapeHtml(payout.organizer_name || payout.organizer?.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Period:</span>
                <span class="detail-value">${escapeHtml(payout.period || '-')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Events:</span>
                <span class="detail-value">${payout.events_count || 0}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Ticket Sales:</span>
                <span class="detail-value">KSh ${formatNumber(payout.ticket_sales || 0)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Platform Fee:</span>
                <span class="detail-value">KSh ${formatNumber(payout.platform_fee || 0)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payout Amount:</span>
                <span class="detail-value amount-positive">KSh ${formatNumber(payout.payout_amount || 0)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${getStatusBadge(payout.status)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Requested:</span>
                <span class="detail-value">${formatDate(payout.requested_date)}</span>
            </div>
            ${payout.processed_date ? `
            <div class="detail-row">
                <span class="detail-label">Processed:</span>
                <span class="detail-value">${formatDate(payout.processed_date)}</span>
            </div>
            ` : ''}
            ${payout.reference ? `
            <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">${escapeHtml(payout.reference)}</span>
            </div>
            ` : ''}
        `;
        
        elements.payoutModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading payout details:', error);
        showToast('Failed to load payout details', 'error');
    }
}

// Helper Functions
function getStatusBadge(status) {
    const badges = {
        pending: '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        processing: '<span class="status-badge status-processing"><i class="fas fa-spinner"></i> Processing</span>',
        completed: '<span class="status-badge status-completed"><i class="fas fa-check"></i> Completed</span>'
    };
    return badges[status] || badges.pending;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE');
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
    container.innerHTML = `<tr><td colspan="9" class="text-center error-state"><i class="fas fa-exclamation-circle"></i><p>${message}</p><button class="btn-secondary" onclick="location.reload()">Retry</button></td></tr>`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function closeModal() {
    elements.payoutModal.style.display = 'none';
    selectedPayout = null;
}