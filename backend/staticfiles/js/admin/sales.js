// Sales Report JavaScript
let salesChart = null;
let categoryChart = null;
let currentChartType = 'revenue';
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    attachEventListeners();
    loadEventsFilter();
    loadSalesReport();
});

function attachEventListeners() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    const exportBtn = document.getElementById('exportReportBtn');
    const printBtn = document.getElementById('printReportBtn');
    const revenueBtn = document.getElementById('revenueChartBtn');
    const ticketsBtn = document.getElementById('ticketsChartBtn');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', () => loadSalesReport());
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    if (revenueBtn) {
        revenueBtn.addEventListener('click', () => switchChartType('revenue'));
    }
    if (ticketsBtn) {
        ticketsBtn.addEventListener('click', () => switchChartType('tickets'));
    }
    
    const periodSelect = document.getElementById('period');
    if (periodSelect) {
        periodSelect.addEventListener('change', () => loadSalesReport());
    }
}

function switchChartType(type) {
    currentChartType = type;
    const revenueBtn = document.getElementById('revenueChartBtn');
    const ticketsBtn = document.getElementById('ticketsChartBtn');
    
    if (revenueBtn && ticketsBtn) {
        if (type === 'revenue') {
            revenueBtn.classList.add('active');
            ticketsBtn.classList.remove('active');
        } else {
            revenueBtn.classList.remove('active');
            ticketsBtn.classList.add('active');
        }
    }
    loadSalesChart();
}

async function loadEventsFilter() {
    try {
        const data = await apiRequest('/api/admin/events/list/');
        const select = document.getElementById('eventFilter');
        
        if (select && data.events) {
            select.innerHTML = '<option value="">All Events</option>' + 
                data.events.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading events filter:', error);
    }
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
        showToast('Failed to load sales report', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadKPIData() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const eventId = document.getElementById('eventFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, event_id: eventId });
        const data = await apiRequest(`/api/admin/reports/sales/kpi/?${params}`);
        
        if (data.kpi) {
            document.getElementById('totalSales').textContent = formatKES(data.kpi.total_sales || 0);
            document.getElementById('totalTickets').textContent = data.kpi.total_tickets || 0;
            document.getElementById('avgOrder').textContent = formatKES(data.kpi.avg_order || 0);
            document.getElementById('growth').textContent = `${Math.abs(data.kpi.growth || 0)}%`;
            
            // Update trends
            const salesTrend = document.getElementById('salesTrend');
            if (salesTrend && data.kpi.trend) {
                salesTrend.innerHTML = `<i class="fas fa-arrow-${data.kpi.trend}"></i> ${Math.abs(data.kpi.growth)}%`;
                salesTrend.className = `kpi-trend ${data.kpi.trend}`;
            }
            
            const ticketsTrend = document.getElementById('ticketsTrend');
            if (ticketsTrend && data.kpi.tickets_trend) {
                ticketsTrend.innerHTML = `<i class="fas fa-arrow-${data.kpi.tickets_trend}"></i> ${Math.abs(data.kpi.tickets_growth)}%`;
                ticketsTrend.className = `kpi-trend ${data.kpi.tickets_trend}`;
            }
        }
    } catch (error) {
        console.error('Error loading KPI data:', error);
    }
}

async function loadSalesChart() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const eventId = document.getElementById('eventFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, event_id: eventId, type: currentChartType });
        const data = await apiRequest(`/api/admin/reports/sales/chart/?${params}`);
        const ctx = document.getElementById('salesChart')?.getContext('2d');
        if (!ctx) return;
        
        if (salesChart) salesChart.destroy();
        
        const label = currentChartType === 'revenue' ? 'Revenue (KSh)' : 'Tickets Sold';
        
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: label,
                    data: data.values || [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (currentChartType === 'revenue') {
                                    return `Revenue: ${formatKES(context.raw)}`;
                                }
                                return `Tickets: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                if (currentChartType === 'revenue') {
                                    return formatKES(value);
                                }
                                return value;
                            }
                        }
                    }
                }
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
    const eventId = document.getElementById('eventFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, event_id: eventId });
        const data = await apiRequest(`/api/admin/reports/sales/categories/?${params}`);
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;
        
        if (categoryChart) categoryChart.destroy();
        
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${formatKES(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
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
            container.innerHTML = data.events.map((event, index) => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">${index + 1}. ${escapeHtml(event.title)}</div>
                        <div class="event-stats">${event.tickets_sold || 0} tickets sold</div>
                    </div>
                    <div class="event-revenue">${formatKES(event.revenue || 0)}</div>
                </div>
            `).join('');
        } else if (container) {
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
    const eventId = document.getElementById('eventFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, event_id: eventId });
        const data = await apiRequest(`/api/admin/reports/sales/daily/?${params}`);
        const tbody = document.getElementById('dailySalesList');
        const recordsSpan = document.getElementById('recordsCount');
        
        if (tbody && data.sales?.length) {
            tbody.innerHTML = data.sales.map(day => `
                <tr>
                    <td>${formatDate(day.date)}</td>
                    <td class="text-center">${day.orders || 0}</td>
                    <td class="text-center">${day.tickets || 0}</td>
                    <td class="revenue">${formatKES(day.revenue || 0)}</td>
                    <td class="revenue">${formatKES(day.avg_order || 0)}</td>
                    <td>${escapeHtml(day.top_event || 'N/A')}</td>
                </tr>
            `).join('');
            if (recordsSpan) recordsSpan.textContent = `Showing ${data.sales.length} records`;
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No data available</td></tr>';
            if (recordsSpan) recordsSpan.textContent = 'Showing 0 records';
        }
    } catch (error) {
        console.error('Error loading daily sales:', error);
    }
}

function resetFilters() {
    const periodSelect = document.getElementById('period');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const eventSelect = document.getElementById('eventFilter');
    
    if (periodSelect) periodSelect.value = 'monthly';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (eventSelect) eventSelect.value = '';
    
    loadSalesReport();
    showToast('Filters reset', 'success');
}

function exportReport() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const eventId = document.getElementById('eventFilter')?.value || '';
    const params = new URLSearchParams({ period, start_date: startDate, end_date: endDate, event_id: eventId });
    window.open(`/api/admin/reports/sales/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function formatKES(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}