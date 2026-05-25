// Refunds Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentRefundId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadRefunds();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchRefunds');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadRefunds();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            loadRefunds();
        });
    }
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', () => { currentPage = 1; loadRefunds(); });
    if (dateTo) dateTo.addEventListener('change', () => { currentPage = 1; loadRefunds(); });
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/refunds/stats/');
        document.getElementById('pendingRefunds').textContent = data.stats?.pending || 0;
        document.getElementById('approvedRefunds').textContent = data.stats?.approved_this_month || 0;
        document.getElementById('rejectedRefunds').textContent = data.stats?.rejected || 0;
        document.getElementById('totalRefundAmount').textContent = formatCurrency(data.stats?.total_amount || 0);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRefunds() {
    const search = document.getElementById('searchRefunds')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    Loader.show('Loading refunds...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            status: status,
            date_from: dateFrom,
            date_to: dateTo
        });
        const data = await apiRequest(`/api/admin/refunds/?${params}`);
        
        displayRefunds(data.refunds);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading refunds:', error);
        document.getElementById('refundsList').innerHTML = 
            '<tr><td colspan="9" class="text-center">Failed to load refunds</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayRefunds(refunds) {
    const tbody = document.getElementById('refundsList');
    
    if (!refunds || refunds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No refund requests found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = refunds.map(refund => `
        <tr>
            <td><strong>#${refund.id}</strong></td>
            <td>${escapeHtml(refund.booking_id)}</td>
            <td>
                <strong>${escapeHtml(refund.customer_name)}</strong><br>
                <small>${escapeHtml(refund.customer_email)}</small>
            </td>
            <td>${escapeHtml(refund.event_title)}</td>
            <td><strong>${formatCurrency(refund.amount)}</strong></td>
            <td>${escapeHtml(refund.reason)}</td>
            <td>${formatDate(refund.requested_date)}</td>
            <td>${getRefundStatusBadge(refund.status)}</td>
            <td class="action-buttons">
                ${refund.status === 'pending' ? `
                    <button class="action-btn view" onclick="openProcessModal(${refund.id})" title="Process">
                        <i class="fas fa-check-circle"></i> Process
                    </button>
                ` : `
                    <button class="action-btn view" onclick="viewRefundDetail(${refund.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `}
            </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${refunds.length} records`;
}

async function openProcessModal(refundId) {
    currentRefundId = refundId;
    
    try {
        const data = await apiRequest(`/api/admin/refunds/${refundId}/`);
        const refund = data.refund;
        
        document.getElementById('processRefundInfo').innerHTML = `
            <p><strong>Request ID:</strong> #${refund.id}</p>
            <p><strong>Booking ID:</strong> ${escapeHtml(refund.booking_id)}</p>
            <p><strong>Customer:</strong> ${escapeHtml(refund.customer_name)}</p>
            <p><strong>Event:</strong> ${escapeHtml(refund.event_title)}</p>
            <p><strong>Amount:</strong> ${formatCurrency(refund.amount)}</p>
            <p><strong>Reason:</strong> ${escapeHtml(refund.reason)}</p>
        `;
        document.getElementById('processRefundModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load refund details', 'error');
    }
}

async function approveRefund() {
    const response = document.getElementById('adminResponse')?.value;
    const refundMethod = document.getElementById('refundMethod')?.value;
    
    Loader.show('Processing refund...');
    
    try {
        await apiRequest(`/api/admin/refunds/${currentRefundId}/approve/`, 'POST', {
            response: response,
            refund_method: refundMethod
        });
        showToast('Refund approved and processed', 'success');
        closeProcessModal();
        loadRefunds();
        loadStats();
    } catch (error) {
        showToast('Failed to process refund', 'error');
    } finally {
        Loader.hide();
    }
}

async function rejectRefund() {
    const response = document.getElementById('adminResponse')?.value;
    
    Loader.show('Rejecting refund...');
    
    try {
        await apiRequest(`/api/admin/refunds/${currentRefundId}/reject/`, 'POST', {
            response: response
        });
        showToast('Refund rejected', 'success');
        closeProcessModal();
        loadRefunds();
        loadStats();
    } catch (error) {
        showToast('Failed to reject refund', 'error');
    } finally {
        Loader.hide();
    }
}

function viewRefundDetail(refundId) {
    window.open(`/admin-portal/refunds/detail/?id=${refundId}`, '_blank');
}

function closeProcessModal() {
    document.getElementById('processRefundModal').style.display = 'none';
    document.getElementById('adminResponse').value = '';
    document.getElementById('refundMethod').value = 'original';
    currentRefundId = null;
}

function applyFilters() {
    currentPage = 1;
    loadRefunds();
}

function resetFilters() {
    document.getElementById('searchRefunds').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentPage = 1;
    loadRefunds();
}

function exportRefunds() {
    const params = new URLSearchParams({
        search: document.getElementById('searchRefunds')?.value || '',
        status: document.getElementById('statusFilter')?.value || '',
        date_from: document.getElementById('dateFrom')?.value || '',
        date_to: document.getElementById('dateTo')?.value || ''
    });
    window.open(`/api/admin/refunds/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadRefunds();
    }
}

function getRefundStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        'approved': '<span class="status-badge status-confirmed"><i class="fas fa-check-circle"></i> Approved</span>',
        'completed': '<span class="status-badge status-confirmed"><i class="fas fa-check-double"></i> Completed</span>',
        'rejected': '<span class="status-badge status-cancelled"><i class="fas fa-times-circle"></i> Rejected</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
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

// Make functions global
window.openProcessModal = openProcessModal;
window.approveRefund = approveRefund;
window.rejectRefund = rejectRefund;
window.closeProcessModal = closeProcessModal;
window.viewRefundDetail = viewRefundDetail;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportRefunds = exportRefunds;
window.changePage = changePage;