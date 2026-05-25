// Transactions Management
let currentPage = 1, totalPages = 1;
document.addEventListener('DOMContentLoaded', function() { loadTransactions(); loadStats(); setupFilters(); });

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/payments/stats/');
        if (data.stats) {
            document.getElementById('totalTransactions').textContent = data.stats.total || 0;
            document.getElementById('totalVolume').textContent = formatCurrency(data.stats.volume || 0);
            document.getElementById('successRate').textContent = `${data.stats.success_rate || 0}%`;
            document.getElementById('totalRefunds').textContent = formatCurrency(data.stats.refunds || 0);
        }
    } catch (error) { console.error(error); }
}

async function loadTransactions() {
    const params = new URLSearchParams({ page: currentPage, search: currentFilters.search, method: currentFilters.method, status: currentFilters.status });
    const data = await apiRequest(`/api/admin/payments/?${params}`);
    displayTransactions(data.transactions);
    if (data.pagination) { totalPages = data.pagination.total_pages; renderPagination(currentPage, totalPages, (p) => { currentPage = p; loadTransactions(); }); }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsList');
    if (!transactions?.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transactions found</td></tr>'; return; }
    tbody.innerHTML = transactions.map(t => `<tr><td>#${t.id}</td><td>${formatDateTime(t.date)}</td><td>${t.customer_name}</td><td>${t.event_title}</td><td>${formatCurrency(t.amount)}</td><td><span class="payment-method-badge method-${t.method}">${t.method}</span></td><td>${getStatusBadge(t.status)}</td><td><button class="action-btn view" onclick="viewTransaction(${t.id})"><i class="fas fa-eye"></i></button></td></tr>`).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', function() { clearTimeout(timer); timer = setTimeout(() => { currentFilters.search = this.value; currentPage = 1; loadTransactions(); }, 500); });
    }
    document.getElementById('paymentMethod')?.addEventListener('change', function() { currentFilters.method = this.value; currentPage = 1; loadTransactions(); });
    document.getElementById('transactionStatus')?.addEventListener('change', function() { currentFilters.status = this.value; currentPage = 1; loadTransactions(); });
}

let currentFilters = { search: '', method: '', status: '' };
function applyFilters() { currentPage = 1; loadTransactions(); }
function exportTransactions() { window.open(`/api/admin/payments/export/?${new URLSearchParams(currentFilters)}`, '_blank'); }
function viewTransaction(id) { window.open(`/admin-portal/payments/${id}/`, '_blank'); }
