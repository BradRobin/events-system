// Sales Report JavaScript
let salesChart = null;
let categoryChart = null;
let currentChartType = 'revenue';
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadSalesReport();
    loadCategories();
});

function switchChartType(type) {
    currentChartType = type;
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadSalesChart();
}

async function loadSalesReport() {
    Loader.show('Loading sales report...');
    try {
        await Promise.all([
            loadKPIData(),
            loadSalesChart(),
            loadCategoryChart(),
            loadTopEvents(),
            loadDailySales()
        ]);
    } catch (error) {
        console.error('Error loading sales report:', error);
    } finally {
        Loader.hide();
    }
}

async function loadKPIData() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate });
        const data = await apiRequest(`/api/admin/reports/sales/kpi/?${params}`);
        
        if (data.kpi) {
            document.getElementById('totalSales').textContent = formatCurrency(data.kpi.total_sales || 0);
            document.getElementById('totalTicketsSold').textContent = data.kpi.total_tickets || 0;
            document.getElementById('avgOrderValue').textContent = formatCurrency(data.kpi.avg_order || 0);
            document.getElementById('growthRate').textContent = `${Math.abs(data.kpi.growth || 0)}%`;
            
            updateTrend('salesTrend', data.kpi.trend, data.kpi.growth);
            updateTrend('ticketsTrend', data.kpi.tickets_trend, data.kpi.tickets_growth);
            updateTrend('avgOrderTrend', data.kpi.avg_order_trend, data.kpi.avg_order_growth);
            updateTrend('growthTrend', data.kpi.trend, data.kpi.growth);
        }
    } catch (error) {
        console.error('Error loading KPI data:', error);
    }
}

async function loadSalesChart() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, type: currentChartType });
        const data = await apiRequest(`/api/admin/reports/sales/chart/?${params}`);
        const ctx = document.getElementById('salesChart')?.getContext('2d');
        if (!ctx) return;
        
        if (salesChart) salesChart.destroy();
        
        const label = currentChartType === 'revenue' ? 'Revenue (KSh)' : 'Tickets Sold';
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{ label: label, data: data.values || [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.4, fill: true }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: { y: { ticks: { callback: v => currentChartType === 'revenue' ? formatCurrency(v) : v } } }
            }
        });
    } catch (error) {
        console.error('Error loading sales chart:', error);
    }
}

async function loadCategoryChart() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate });
        const data = await apiRequest(`/api/admin/reports/sales/categories/?${params}`);
        const ctx = document.getElementById('categorySalesChart')?.getContext('2d');
        if (!ctx) return;
        
        if (categoryChart) categoryChart.destroy();
        
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{ data: data.values || [], backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'] }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
        });
    } catch (error) {
        console.error('Error loading category chart:', error);
    }
}

async function loadTopEvents() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, limit: 5 });
        const data = await apiRequest(`/api/admin/reports/sales/top-events/?${params}`);
        const container = document.getElementById('topEventsList');
        
        if (container && data.events?.length) {
            container.innerHTML = data.events.map((e, i) => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">${i+1}. ${escapeHtml(e.title)}</div>
                        <div class="event-stats">${e.tickets_sold} tickets sold</div>
                    </div>
                    <div class="event-revenue">${formatCurrency(e.revenue)}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No data available</div>';
        }
    } catch (error) {
        console.error('Error loading top events:', error);
    }
}

async function loadDailySales() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    try {
        const params = new URLSearchParams({ page: currentPage, period, start_date: startDate, end_date: endDate });
        const data = await apiRequest(`/api/admin/reports/sales/daily/?${params}`);
        const tbody = document.getElementById('dailySalesList');
        
        if (tbody && data.sales?.length) {
            tbody.innerHTML = data.sales.map(day => `
                <tr><td>${formatDate(day.date)}</td><td>${day.orders || 0}</td><td>${day.tickets || 0}</td>
                <td class="revenue">${formatCurrency(day.revenue || 0)}</td><td class="revenue">${formatCurrency(day.avg_order || 0)}</td>
                <td>${escapeHtml(day.top_event || 'N/A')}</td></tr>
            `).join('');
            document.getElementById('recordsCount').textContent = `Showing ${data.sales.length} records`;
        }
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading daily sales:', error);
    }
}

function updateTrend(elementId, direction, percentage) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = `<i class="fas fa-arrow-${direction}"></i> ${Math.abs(percentage)}%`;
    element.className = `kpi-trend ${direction}`;
}

function resetSalesFilters() {
    document.getElementById('period').value = 'monthly';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadSalesReport();
}

function exportSalesReport() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    window.open(`/api/admin/reports/sales/export/?period=${period}&start=${startDate}&end=${endDate}`, '_blank');
    showToast('Export started', 'success');
}

function printReport() { window.print(); }

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) { currentPage = page; loadDailySales(); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-KE') : 'N/A'; }
function formatCurrency(a) { return `KSh ${Number(a).toLocaleString('en-KE')}`; }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }