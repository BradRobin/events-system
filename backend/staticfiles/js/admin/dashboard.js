// Dashboard JavaScript
let revenueChart = null;
let categoryChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    loadRecentEvents();
    loadRecentBookings();
    loadTopEvents();
    initCharts();
});

async function loadDashboardData() {
    try {
        const data = await apiRequest('/api/admin/dashboard/stats/');
        if (data.stats) {
            document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
            document.getElementById('totalTickets').textContent = data.stats.total_tickets || 0;
            document.getElementById('totalUsers').textContent = data.stats.total_users || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentEvents() {
    try {
        const data = await apiRequest('/api/admin/events/recent/');
        const container = document.getElementById('recentEvents');
        if (data.events?.length) {
            container.innerHTML = data.events.map(e => `
                <div class="activity-item">
                    <div><strong>${e.title}</strong><br><small>${formatDate(e.start_date)}</small></div>
                    <span class="status-badge status-${e.status}">${e.status}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = 'No recent events';
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadRecentBookings() {
    try {
        const data = await apiRequest('/api/admin/bookings/recent/');
        const container = document.getElementById('recentBookings');
        if (data.bookings?.length) {
            container.innerHTML = data.bookings.map(b => `
                <div class="activity-item">
                    <div><strong>${b.event_title}</strong><br><small>${b.customer_name} • ${b.tickets} tickets</small></div>
                    <span>${formatCurrency(b.total)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = 'No recent bookings';
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadTopEvents() {
    try {
        const data = await apiRequest('/api/admin/events/top/');
        const container = document.getElementById('topEvents');
        if (data.events?.length) {
            container.innerHTML = data.events.map(e => `
                <div class="activity-item">
                    <div><strong>${e.title}</strong><br><small>${e.tickets_sold} tickets sold</small></div>
                    <span>${formatCurrency(e.revenue)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = 'No data available';
        }
    } catch (error) {
        console.error(error);
    }
}

async function initCharts() {
    await initRevenueChart();
    await initCategoryChart();
}

async function initRevenueChart() {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    
    try {
        const data = await apiRequest('/api/admin/charts/revenue/');
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue (KSh)',
                    data: data.values || [0,0,0,0,0,0],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { ticks: { callback: v => 'KSh ' + v.toLocaleString() } }
                }
            }
        });
    } catch (error) {
        console.error(error);
    }
}

async function initCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    
    try {
        const data = await apiRequest('/api/admin/charts/categories/');
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['Music', 'Tech', 'Business', 'Sports', 'Arts'],
                datasets: [{
                    data: data.values || [30,25,20,15,10],
                    backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6']
                }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    } catch (error) {
        console.error(error);
    }
}

function formatCurrency(amount) {
    return `KSh ${(amount || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
}
