// ============================================
// ORGANIZER EVENT ANALYTICS
// Handles: Detailed event performance analytics
// ============================================

let eventId = null;
let analyticsData = null;
let salesChart = null;
let ticketTypeChart = null;

document.addEventListener('DOMContentLoaded', () => {
    eventId = getEventIdFromUrl();
    if (eventId) {
        loadEventAnalytics();
        loadEventInfo();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/analytics/);
    return match ? match[1] : null;
}

async function loadEventInfo() {
    const event = await EventAPI.Organizer.getEventForEdit(eventId);
    if (event) {
        document.getElementById('eventTitle').innerText = event.title;
        document.getElementById('eventPeriod').innerText = `${new Date(event.start_date).toLocaleDateString()} - ${new Date(event.end_date).toLocaleDateString()}`;
    }
}

async function loadEventAnalytics() {
    showLoading();
    
    const data = await EventAPI.Organizer.getEventAnalytics(eventId);
    if (data) {
        analyticsData = data;
        displayOverviewStats(data);
        displaySalesChart(data);
        displayTicketTypeChart(data);
        displayDailySales(data);
        displayPerformanceMetrics(data);
    }
    
    hideLoading();
}

function displayOverviewStats(data) {
    document.getElementById('statTotalTickets').innerText = data.total_tickets_sold?.toLocaleString() || 0;
    document.getElementById('statTotalRevenue').innerText = `KES ${(data.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statOccupancyRate').innerText = `${data.occupancy_rate || 0}%`;
    document.getElementById('statAvgTicketPrice').innerText = `KES ${(data.average_ticket_price || 0).toLocaleString()}`;
    document.getElementById('statCapacity').innerText = data.total_capacity?.toLocaleString() || 0;
    document.getElementById('statRemainingSeats').innerText = (data.total_capacity - data.total_tickets_sold).toLocaleString();
}

function displaySalesChart(data) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx || !data.daily_sales) return;
    
    if (salesChart) salesChart.destroy();
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.daily_sales.map(d => d.date),
            datasets: [
                {
                    label: 'Tickets Sold',
                    data: data.daily_sales.map(d => d.tickets),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Revenue (KES)',
                    data: data.daily_sales.map(d => d.revenue),
                    borderColor: '#ec6408',
                    backgroundColor: 'rgba(236, 100, 8, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.label.includes('Revenue') ? 'KES ' + ctx.raw.toLocaleString() : ctx.raw}` } } },
            scales: { y: { title: { display: true, text: 'Tickets Sold' } }, y1: { position: 'right', title: { display: true, text: 'Revenue (KES)' }, grid: { drawOnChartArea: false } } }
        }
    });
}

function displayTicketTypeChart(data) {
    const ctx = document.getElementById('ticketTypeChart')?.getContext('2d');
    if (!ctx || !data.ticket_type_breakdown) return;
    
    if (ticketTypeChart) ticketTypeChart.destroy();
    
    ticketTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.ticket_type_breakdown.map(t => t.name),
            datasets: [{
                data: data.ticket_type_breakdown.map(t => t.sold),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} tickets (${Math.round(ctx.raw / data.total_tickets_sold * 100)}%)` } } } }
    });
}

function displayDailySales(data) {
    const container = document.getElementById('dailySalesTable');
    if (!container || !data.daily_sales) return;
    
    container.innerHTML = data.daily_sales.slice().reverse().map(day => `
        <tr>
            <td>${day.date}</td>
            <td>${day.tickets}</td>
            <td>KES ${day.revenue.toLocaleString()}</td>
            <td>
                <div class="progress-mini">
                    <div class="progress-fill" style="width: ${(day.tickets / data.total_tickets_sold) * 100}%"></div>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayPerformanceMetrics(data) {
    document.getElementById('metricPeakSalesDay').innerText = getPeakSalesDay(data.daily_sales);
    document.getElementById('metricBestTicketType').innerText = getBestTicketType(data.ticket_type_breakdown);
    document.getElementById('metricProjectedRevenue').innerText = `KES ${calculateProjectedRevenue(data).toLocaleString()}`;
    document.getElementById('metricConversionRate').innerText = `${calculateConversionRate(data)}%`;
}

function getPeakSalesDay(dailySales) {
    if (!dailySales || !dailySales.length) return 'N/A';
    const peak = dailySales.reduce((max, day) => day.tickets > max.tickets ? day : max, dailySales[0]);
    return `${peak.date} (${peak.tickets} tickets)`;
}

function getBestTicketType(ticketTypes) {
    if (!ticketTypes || !ticketTypes.length) return 'N/A';
    const best = ticketTypes.reduce((max, t) => t.sold > max.sold ? t : max, ticketTypes[0]);
    return `${best.name} (${best.sold} sold)`;
}

function calculateProjectedRevenue(data) {
    const daysRemaining = Math.ceil((new Date(data.event_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) return data.total_revenue;
    const dailyAvg = data.total_revenue / (data.days_passed || 1);
    return data.total_revenue + (dailyAvg * daysRemaining);
}

function calculateConversionRate(data) {
    const visitors = data.unique_visitors || data.total_views || 1000;
    return Math.round((data.total_tickets_sold / visitors) * 100);
}

function refreshAnalytics() {
    loadEventAnalytics();
}

function exportAnalytics() {
    window.open(`/organizer/events/${eventId}/analytics/export/`, '_blank');
}

function showLoading() {
    const container = document.getElementById('analyticsContent');
    if (container) container.style.opacity = '0.5';
}

function hideLoading() {
    const container = document.getElementById('analyticsContent');
    if (container) container.style.opacity = '1';
}
