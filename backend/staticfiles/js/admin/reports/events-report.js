// Events Performance Report JavaScript
let currentPage = 1, totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadEventsReport();
});

async function loadCategories() {
    try {
        const data = await apiRequest('/api/admin/categories/');
        const select = document.getElementById('categoryFilter');
        if (select && data.categories) {
            select.innerHTML = '<option value="">All Categories</option>' + 
                data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (error) { console.error('Error loading categories:', error); }
}

async function loadEventsReport() {
    Loader.show('Loading events report...');
    try {
        await Promise.all([loadEventsTable(), loadSummaryStats()]);
    } catch (error) { console.error('Error loading report:', error); }
    finally { Loader.hide(); }
}

async function loadEventsTable() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ page: currentPage, start_date: startDate, end_date: endDate, category, status });
        const data = await apiRequest(`/api/admin/reports/events/?${params}`);
        
        displayEvents(data.events);
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsPerformanceList').innerHTML = '<tr><td colspan="9">Failed to load data</td></tr>';
    }
}

function displayEvents(events) {
    const tbody = document.getElementById('eventsPerformanceList');
    if (!events?.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No events found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 events';
        return;
    }
    
    tbody.innerHTML = events.map(e => `
        <tr>
            <td><strong>${escapeHtml(e.title)}</strong></td>
            <td>${escapeHtml(e.organizer_name)}</td>
            <td><span class="category-badge">${e.category || 'Uncategorized'}</span></td>
            <td>${formatDate(e.date)}</td>
            <td>${e.sold || 0} / ${e.capacity || 0}</td>
            <td><div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${e.fill_rate || 0}%"></div></div><span class="progress-text">${e.fill_rate || 0}%</span></div></td>
            <td class="revenue">${formatCurrency(e.revenue || 0)}</td>
            <td>${getStatusBadge(e.status)}</td>
            <td class="action-buttons"><button class="action-btn view" onclick="viewEvent(${e.id})"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');
    document.getElementById('recordsCount').textContent = `Showing ${events.length} events`;
}

async function loadSummaryStats() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, category, status });
        const data = await apiRequest(`/api/admin/reports/events/summary/?${params}`);
        
        if (data.stats) {
            document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
            document.getElementById('totalTicketsSold').textContent = data.stats.total_tickets || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue || 0);
            document.getElementById('avgFillRate').textContent = `${data.stats.avg_fill_rate || 0}%`;
        }
    } catch (error) { console.error('Error loading summary stats:', error); }
}

function applyFilters() { currentPage = 1; loadEventsReport(); }
function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    applyFilters();
}
function generateReport() { loadEventsReport(); }
function exportEventsReport() {
    const params = new URLSearchParams({
        start_date: document.getElementById('startDate')?.value || '',
        end_date: document.getElementById('endDate')?.value || '',
        category: document.getElementById('categoryFilter')?.value || '',
        status: document.getElementById('statusFilter')?.value || ''
    });
    window.open(`/api/admin/reports/events/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}
function viewEvent(id) { window.open(`/admin-portal/events/detail/?id=${id}`, '_blank'); }

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
}
function changePage(page) { currentPage = page; loadEventsTable(); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-KE') : 'N/A'; }
function formatCurrency(a) { return `KSh ${Number(a).toLocaleString('en-KE')}`; }
function getStatusBadge(s) {
    const badges = { 'published': 'status-published', 'draft': 'status-draft', 'cancelled': 'status-cancelled', 'completed': 'status-published' };
    return `<span class="status-badge ${badges[s] || ''}">${s}</span>`;
}
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }