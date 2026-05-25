// Analytics Dashboard JavaScript
let revenueChart = null;
let categoryChart = null;
let userGrowthChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadAnalyticsData();
    setupEventListeners();
});

function setupEventListeners() {
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', loadAnalyticsData);
    }
}

async function loadAnalyticsData() {
    const days = document.getElementById('dateRange')?.value || '30';
    
    Loader.show('Loading analytics...');
    
    try {
        await Promise.all([
            loadKPIData(days),
            loadRevenueChart(days),
            loadCategoryChart(days),
            loadTopEvents(days),
            loadUserGrowthChart(days),
            loadSummaryStats(days)
        ]);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Failed to load analytics data', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadKPIData(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/kpi/?days=${days}`);
        if (data.kpi) {
            document.getElementById('totalRevenue').textContent = formatCurrency(data.kpi.total_revenue || 0);
            document.getElementById('totalTickets').textContent = data.kpi.total_tickets || 0;
            document.getElementById('activeUsers').textContent = data.kpi.active_users || 0;
            document.getElementById('completedEvents').textContent = data.kpi.completed_events || 0;
            
            // Update trends
            updateTrend('revenueTrend', data.kpi.revenue_trend);
            updateTrend('ticketsTrend', data.kpi.tickets_trend);
            updateTrend('usersTrend', data.kpi.users_trend);
            updateTrend('eventsTrend', data.kpi.events_trend);
        }
    } catch (error) {
        console.error('Error loading KPI data:', error);
    }
}

function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element || !trend) return;
    
    const direction = trend.percentage >= 0 ? 'up' : 'down';
    element.innerHTML = `<i class="fas fa-arrow-${direction}"></i> ${Math.abs(trend.percentage)}%`;
    element.className = `kpi-trend ${direction}`;
}

async function loadRevenueChart(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/revenue-chart/?days=${days}`);
        const ctx = document.getElementById('revenueChart')?.getContext('2d');
        if (!ctx) return;
        
        if (revenueChart) revenueChart.destroy();
        
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Revenue (KSh)',
                    data: data.values || [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: { y: { ticks: { callback: v => formatCurrency(v) } } }
            }
        });
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

async function loadCategoryChart(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/category-chart/?days=${days}`);
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
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

async function loadTopEvents(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/top-events/?days=${days}&limit=5`);
        const container = document.getElementById('topEventsList');
        
        if (container && data.events?.length) {
            container.innerHTML = data.events.map((e, i) => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">${i+1}. ${escapeHtml(e.title)}</div>
                        <div class="event-stats">${e.tickets_sold} tickets sold | ${e.fill_rate}% fill rate</div>
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

async function loadUserGrowthChart(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/user-growth/?days=${days}`);
        const ctx = document.getElementById('userGrowthChart')?.getContext('2d');
        if (!ctx) return;
        
        if (userGrowthChart) userGrowthChart.destroy();
        
        userGrowthChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{ label: 'New Users', data: data.values || [], backgroundColor: '#10b981', borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    } catch (error) {
        console.error('Error loading user growth chart:', error);
    }
}

async function loadSummaryStats(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/summary/?days=${days}`);
        if (data.summary) {
            document.getElementById('summaryEvents').textContent = data.summary.total_events || 0;
            document.getElementById('summaryBookings').textContent = data.summary.total_bookings || 0;
            document.getElementById('summaryOrganizers').textContent = data.summary.total_organizers || 0;
            document.getElementById('conversionRate').textContent = `${data.summary.conversion_rate || 0}%`;
            document.getElementById('avgOrderValue').textContent = formatCurrency(data.summary.avg_order_value || 0);
            document.getElementById('fillRate').textContent = `${data.summary.avg_fill_rate || 0}%`;
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

function exportReport() {
    const days = document.getElementById('dateRange')?.value || '30';
    window.open(`/api/admin/reports/export/?days=${days}`, '_blank');
    showToast('Export started', 'success');
}

function viewAllEvents() {
    window.location.href = '/admin-portal/events/all/';
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