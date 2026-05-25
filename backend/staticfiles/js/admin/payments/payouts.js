// Payouts Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentPayoutId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadPayouts();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchPayouts');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadPayouts();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadPayouts(); });
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', () => { currentPage = 1; loadPayouts(); });
    if (dateTo) dateTo.addEventListener('change', () => { currentPage = 1; loadPayouts(); });
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/payments/payouts/stats/');
        document.getElementById('pendingPayouts').textContent = data.stats?.pending || 0;
        document.getElementById('totalPendingAmount').textContent = formatCurrency(data.stats?.pending_amount || 0);
        document.getElementById('totalPaid').textContent = formatCurrency(data.stats?.total_paid || 0);
        document.getElementById('paidThisMonth').textContent = formatCurrency(data.stats?.paid_this_month || 0);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadPayouts() {
    const search = document.getElementById('searchPayouts')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    Loader.show('Loading payouts...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            status: status,
            date_from: dateFrom,
            date_to: dateTo
        });
        const data = await apiRequest(`/api/admin/payments/payouts/?${params}`);
        
        displayPayouts(data.payouts);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading payouts:', error);
        document.getElementById('payoutsList').innerHTML = 
            '<tr><td colspan="9" class="text-center">Failed to load payouts</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayPayouts(payouts) {
    const tbody = document.getElementById('payoutsList');
    
    if (!payouts || payouts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No payouts found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = payouts.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.organizer_name)}</strong></td>
            <td>${formatDate(p.period_start)} - ${formatDate(p.period_end)}</td>
            <td>${p.event_count || 0} events</td>
            <td>${formatCurrency(p.ticket_sales || 0)}</td>
            <td>${formatCurrency(p.platform_fee || 0)}</td>
            <td><strong>${formatCurrency(p.amount)}</strong></td>
            <td>${getPayoutStatusBadge(p.status)}</td>
            <td>${formatDate(p.requested_at)}</td>
            <td class="action-buttons">
                ${p.status === 'pending' ? `
                    <button class="action-btn process" onclick="openPayoutModal(${p.id})" title="Process Payout">
                        <i class="fas fa-check-circle"></i> Process
                    </button>
                ` : `
                    <button class="action-btn view" onclick="viewPayout(${p.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `}
             </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${payouts.length} records`;
}

async function openPayoutModal(payoutId) {
    currentPayoutId = payoutId;
    
    try {
        const data = await apiRequest(`/api/admin/payments/payouts/${payoutId}/`);
        const p = data.payout;
        
        document.getElementById('payoutInfo').innerHTML = `
            <p><strong>Organizer:</strong> ${escapeHtml(p.organizer_name)}</p>
            <p><strong>Period:</strong> ${formatDate(p.period_start)} - ${formatDate(p.period_end)}</p>
            <p><strong>Ticket Sales:</strong> ${formatCurrency(p.ticket_sales)}</p>
            <p><strong>Platform Fee:</strong> ${formatCurrency(p.platform_fee)}</p>
            <p><strong>Payout Amount:</strong> <strong style="color: var(--success);">${formatCurrency(p.amount)}</strong></p>
            <p><strong>Payment Details:</strong> ${p.payment_details || 'Not provided'}</p>
        `;
        
        document.getElementById('payoutModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load payout details', 'error');
    }
}

async function confirmPayout() {
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const transactionRef = document.getElementById('transactionRef')?.value;
    const notes = document.getElementById('payoutNotes')?.value;
    
    if (!transactionRef) {
        showToast('Please enter a transaction reference', 'error');
        return;
    }
    
    Loader.show('Processing payout...');
    
    try {
        await apiRequest(`/api/admin/payments/payouts/${currentPayoutId}/process/`, 'POST', {
            payment_method: paymentMethod,
            transaction_ref: transactionRef,
            notes: notes
        });
        showToast('Payout processed successfully', 'success');
        closeModal();
        loadPayouts();
        loadStats();
    } catch (error) {
        showToast('Failed to process payout', 'error');
    } finally {
        Loader.hide();
    }
}

async function processAllPending() {
    showConfirm('Process all pending payouts?', async () => {
        Loader.show('Processing all payouts...');
        
        try {
            await apiRequest('/api/admin/payments/payouts/process-all/', 'POST');
            showToast('All pending payouts processed', 'success');
            loadPayouts();
            loadStats();
        } catch (error) {
            showToast('Failed to process payouts', 'error');
        } finally {
            Loader.hide();
        }
    });
}

function viewPayout(payoutId) {
    window.open(`/admin-portal/payments/payouts/detail/?id=${payoutId}`, '_blank');
}

function closeModal() {
    document.getElementById('payoutModal').style.display = 'none';
    document.getElementById('transactionRef').value = '';
    document.getElementById('payoutNotes').value = '';
    currentPayoutId = null;
}

function applyFilters() {
    currentPage = 1;
    loadPayouts();
}

function resetFilters() {
    document.getElementById('searchPayouts').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentPage = 1;
    loadPayouts();
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
        loadPayouts();
    }
}

function getPayoutStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        'processed': '<span class="status-badge status-info"><i class="fas fa-spinner"></i> Processed</span>',
        'completed': '<span class="status-badge status-success"><i class="fas fa-check-circle"></i> Completed</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
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

window.openPayoutModal = openPayoutModal;
window.confirmPayout = confirmPayout;
window.processAllPending = processAllPending;
window.closeModal = closeModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.changePage = changePage;
