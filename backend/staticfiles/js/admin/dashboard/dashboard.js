// Admin Dashboard JavaScript
let revenueChart = null;
let categoryChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    loadDashboardData();
    setupEventListeners();
});

function setupEventListeners() {
    const periodSelect = document.getElementById('revenuePeriod');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            loadRevenueChart();
        });
    }
}

async function loadDashboardData() {
    Loader.show('Loading dashboard...');
    
    try {
        await Promise.all([
            loadStats(),
            loadRevenueChart(),
            loadCategoryChart(),
            loadRecentActivity(),
            loadTopEvents(),
            checkPendingApprovals()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/dashboard/stats/');
        
        if (data.stats) {
            document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
            document.getElementById('totalBookings').textContent = data.stats.total_bookings || 0;
            document.getElementById('totalUsers').textContent = data.stats.total_users || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue || 0);
            
            // Update trends
            if (data.stats.events_trend) {
                updateTrend('eventsTrend', data.stats.events_trend);
            }
            if (data.stats.bookings_trend) {
                updateTrend('bookingsTrend', data.stats.bookings_trend);
            }
            if (data.stats.users_trend) {
                updateTrend('usersTrend', data.stats.users_trend);
            }
            if (data.stats.revenue_trend) {
                updateTrend('revenueTrend', data.stats.revenue_trend);
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const direction = trend.percentage >= 0 ? 'up' : 'down';
    const percentage = Math.abs(trend.percentage);
    
    element.innerHTML = `<i class="fas fa-arrow-${direction}"></i> ${percentage}%`;
    element.className = `trend ${direction}`;
}

async function loadRevenueChart() {
    const period = document.getElementById('revenuePeriod')?.value || '30';
    
    try {
        const data = await apiRequest(`/api/admin/dashboard/revenue-chart/?period=${period}`);
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
                                return 'Revenue: ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
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

async function loadCategoryChart() {
    try {
        const data = await apiRequest('/api/admin/dashboard/category-chart/');
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
                                return `${label}: ${percentage}% (${value} bookings)`;
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

async function loadRecentActivity() {
    try {
        const data = await apiRequest('/api/admin/dashboard/recent-activity/');
        const container = document.getElementById('recentActivity');
        
        if (container && data.activities && data.activities.length > 0) {
            container.innerHTML = data.activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>${escapeHtml(activity.title)}</h4>
                        <p>
                            <i class="fas ${activity.icon}"></i>
                            ${escapeHtml(activity.description)}
                            <span class="activity-badge ${activity.type}">${activity.type}</span>
                        </p>
                    </div>
                    <div class="activity-time">${formatRelativeTime(activity.created_at)}</div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const container = document.getElementById('recentActivity');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load activity</p></div>';
        }
    }
}

async function loadTopEvents() {
    try {
        const data = await apiRequest('/api/admin/dashboard/top-events/');
        const container = document.getElementById('topEvents');
        
        if (container && data.events && data.events.length > 0) {
            container.innerHTML = data.events.map(event => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-name">${escapeHtml(event.title)}</div>
                        <div class="event-stats">${event.tickets_sold || 0} tickets sold</div>
                    </div>
                    <div class="event-revenue">${formatCurrency(event.revenue || 0)}</div>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>No events data available</p></div>';
        }
    } catch (error) {
        console.error('Error loading top events:', error);
        const container = document.getElementById('topEvents');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load top events</p></div>';
        }
    }
}

async function checkPendingApprovals() {
    try {
        const data = await apiRequest('/api/admin/dashboard/pending-count/');
        const alert = document.getElementById('pendingAlert');
        const countText = document.getElementById('pendingCountText');
        
        if (data.pending_count > 0) {
            alert.style.display = 'block';
            countText.textContent = `You have ${data.pending_count} event${data.pending_count > 1 ? 's' : ''} waiting for your review`;
        } else {
            alert.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking pending approvals:', error);
    }
}

function refreshActivity() {
    loadRecentActivity();
    showToast('Activity refreshed', 'success');
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh every 60 seconds
setInterval(function() {
    loadStats();
    loadRecentActivity();
    checkPendingApprovals();
}, 60000);