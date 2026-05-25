// Admin Reports Dashboard JavaScript
let revenueChart = null;
let categoryChart = null;
let userGrowthChart = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDateRange();
    attachEventListeners();
    generateReport();
});

function initializeDateRange() {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
    }
}

function attachEventListeners() {
    const generateBtn = document.getElementById('generateReportBtn');
    const exportBtn = document.getElementById('exportReportBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
}

async function generateReport() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const reportType = document.getElementById('reportType')?.value || 'overview';
    
    Loader.show('Generating report...');
    
    try {
        await Promise.all([
            loadSummaryStats(startDate, endDate, reportType),
            loadRevenueChart(startDate, endDate, reportType),
            loadCategoryChart(startDate, endDate, reportType),
            loadTopEvents(startDate, endDate),
            loadUserGrowthChart(startDate, endDate)
        ]);
        
        showToast('Report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadSummaryStats(startDate, endDate, reportType) {
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, type: reportType });
        const data = await apiRequest(`/api/admin/reports/summary/?${params}`);
        
        if (data.summary) {
            document.getElementById('summaryEvents').textContent = data.summary.total_events || 0;
            document.getElementById('summaryBookings').textContent = data.summary.total_bookings || 0;
            document.getElementById('summaryRevenue').textContent = formatKES(data.summary.total_revenue || 0);
            document.getElementById('summaryUsers').textContent = data.summary.active_users || 0;
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
        throw error;
    }
}

async function loadRevenueChart(startDate, endDate, reportType) {
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, type: reportType });
        const data = await apiRequest(`/api/admin/reports/revenue-chart/?${params}`);
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

async function loadCategoryChart(startDate, endDate, reportType) {
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, type: reportType });
        const data = await apiRequest(`/api/admin/reports/category-chart/?${params}`);
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
                                return `${label}: ${value} (${percentage}%)`;
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

async function loadTopEvents(startDate, endDate) {
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, limit: 5 });
        const data = await apiRequest(`/api/admin/reports/top-events/?${params}`);
        const container = document.getElementById('topEventsList');
        
        if (container && data.events?.length) {
            container.innerHTML = data.events.map(event => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">${escapeHtml(event.title)}</div>
                        <div class="event-stats">${event.tickets_sold || 0} tickets sold</div>
                    </div>
                    <div class="event-revenue">${formatKES(event.revenue || 0)}</div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="empty-state">No events found</div>';
        }
    } catch (error) {
        console.error('Error loading top events:', error);
    }
}

async function loadUserGrowthChart(startDate, endDate) {
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        const data = await apiRequest(`/api/admin/reports/user-growth/?${params}`);
        const ctx = document.getElementById('userGrowthChart')?.getContext('2d');
        if (!ctx) return;
        
        if (userGrowthChart) userGrowthChart.destroy();
        
        userGrowthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'New Users',
                    data: data.values || [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
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
                }
            }
        });
    } catch (error) {
        console.error('Error loading user growth chart:', error);
    }
}

function exportReport() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const reportType = document.getElementById('reportType')?.value || 'overview';
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, type: reportType });
    window.open(`/api/admin/reports/export/?${params}`, '_blank');
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