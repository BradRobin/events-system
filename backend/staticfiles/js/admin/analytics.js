// Analytics Dashboard JavaScript
let revenueChart = null;
let categoryChart = null;
let userGrowthChart = null;

document.addEventListener('DOMContentLoaded', function() {
    attachEventListeners();
    loadAnalyticsData();
});

function attachEventListeners() {
    const dateRange = document.getElementById('dateRange');
    const exportBtn = document.getElementById('exportReportBtn');
    const viewAllBtn = document.getElementById('viewAllEventsBtn');
    
    if (dateRange) {
        dateRange.addEventListener('change', loadAnalyticsData);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAnalyticsReport);
    }
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            window.location.href = '/admin-portal/events/';
        });
    }
}

async function loadAnalyticsData() {
    const days = document.getElementById('dateRange')?.value || '30';
    
    Loader.show('Loading analytics data...');
    
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
        const data = await apiRequest(`/api/admin/analytics/kpi/?days=${days}`);
        
        if (data.kpi) {
            document.getElementById('totalRevenue').textContent = formatKES(data.kpi.total_revenue || 0);
            document.getElementById('totalTickets').textContent = data.kpi.total_tickets || 0;
            document.getElementById('activeUsers').textContent = data.kpi.active_users || 0;
            document.getElementById('completedEvents').textContent = data.kpi.completed_events || 0;
            
            // Update trends
            if (data.kpi.revenue_trend) {
                const revenueTrend = document.getElementById('revenueTrend');
                revenueTrend.innerHTML = `<i class="fas fa-arrow-${data.kpi.revenue_trend.direction}"></i> ${Math.abs(data.kpi.revenue_trend.percentage)}%`;
                revenueTrend.className = `kpi-trend ${data.kpi.revenue_trend.direction}`;
            }
        }
    } catch (error) {
        console.error('Error loading KPI data:', error);
    }
}

async function loadRevenueChart(days) {
    try {
        const data = await apiRequest(`/api/admin/analytics/revenue/?days=${days}`);
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
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: ' + formatKES(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return formatKES(value);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

async function loadCategoryChart(days) {
    try {
        const data = await apiRequest(`/api/admin/analytics/categories/?days=${days}`);
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;
        
        if (categoryChart) categoryChart.destroy();
        
        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { size: 11 },
                            boxWidth: 12
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

async function loadTopEvents(days) {
    try {
        const data = await apiRequest(`/api/admin/analytics/top-events/?days=${days}&limit=5`);
        const container = document.getElementById('topEventsList');
        
        if (container && data.events?.length) {
            container.innerHTML = data.events.map((event, index) => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">
                            ${index + 1}. ${escapeHtml(event.title)}
                        </div>
                        <div class="event-stats">
                            ${event.tickets_sold || 0} tickets sold | 
                            ${event.fill_rate || 0}% fill rate
                        </div>
                    </div>
                    <div class="event-revenue">${formatKES(event.revenue || 0)}</div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="empty-state">No events data available</div>';
        }
    } catch (error) {
        console.error('Error loading top events:', error);
    }
}

async function loadUserGrowthChart(days) {
    try {
        const data = await apiRequest(`/api/admin/analytics/users/?days=${days}`);
        const ctx = document.getElementById('userGrowthChart')?.getContext('2d');
        if (!ctx) return;
        
        if (userGrowthChart) userGrowthChart.destroy();
        
        userGrowthChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'New Users',
                    data: data.values || [],
                    backgroundColor: '#10b981',
                    borderRadius: 8,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.raw + ' new users';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading user growth chart:', error);
    }
}

async function loadSummaryStats(days) {
    try {
        const data = await apiRequest(`/api/admin/analytics/summary/?days=${days}`);
        
        if (data.summary) {
            document.getElementById('summaryEvents').textContent = data.summary.total_events || 0;
            document.getElementById('summaryBookings').textContent = data.summary.total_bookings || 0;
            document.getElementById('summaryRevenue').textContent = formatKES(data.summary.total_revenue || 0);
            document.getElementById('summaryUsers').textContent = data.summary.active_users || 0;
            document.getElementById('conversionRate').textContent = `${data.summary.conversion_rate || 0}%`;
            document.getElementById('avgOrderValue').textContent = formatKES(data.summary.avg_order_value || 0);
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

function exportAnalyticsReport() {
    const days = document.getElementById('dateRange')?.value || '30';
    window.open(`/api/admin/analytics/export/?days=${days}`, '_blank');
    showToast('Export started', 'success');
}

function formatKES(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}