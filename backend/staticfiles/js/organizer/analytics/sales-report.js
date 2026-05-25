// ============================================
// ORGANIZER SALES REPORT
// Handles: Sales reports and revenue analytics
// ============================================

let salesData = null;
let startDate = null;
let endDate = null;
let salesChart = null;

document.addEventListener('DOMContentLoaded', () => {
    setupDateRange();
    loadSalesReport();
});

function setupDateRange() {
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');
    
    if (startInput) flatpickr(startInput, { dateFormat: "Y-m-d", onChange: () => loadSalesReport() });
    if (endInput) flatpickr(endInput, { dateFormat: "Y-m-d", onChange: () => loadSalesReport() });
}

async function loadSalesReport() {
    showLoading();
    
    startDate = document.getElementById('reportStartDate')?.value;
    endDate = document.getElementById('reportEndDate')?.value;
    
    const data = await EventAPI.Organizer.getSalesReport(startDate, endDate);
    if (data) {
        salesData = data;
        displaySalesSummary(data);
        displaySalesChart(data);
        displayEventsTable(data);
    }
    
    hideLoading();
}

function displaySalesSummary(data) {
    document.getElementById('statTotalEvents').innerText = data.total_events || 0;
    document.getElementById('statTotalTickets').innerText = (data.total_tickets_sold || 0).toLocaleString();
    document.getElementById('statTotalRevenue').innerText = `KES ${(data.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statAvgRevenue').innerText = `KES ${(data.average_revenue_per_event || 0).toLocaleString()}`;
}

function displaySalesChart(data) {
    const ctx = document.getElementById('salesReportChart')?.getContext('2d');
    if (!ctx || !data.events_data) return;
    
    if (salesChart) salesChart.destroy();
    
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.events_data.map(e => e.event_title),
            datasets: [
                { label: 'Tickets Sold', data: data.events_data.map(e => e.tickets_sold), backgroundColor: '#667eea', borderRadius: 8 },
                { label: 'Revenue (KES)', data: data.events_data.map(e => e.revenue), backgroundColor: '#ec6408', borderRadius: 8, yAxisID: 'y1' }
            ]
        },
        options: { responsive: true, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.label.includes('Revenue') ? 'KES ' + ctx.raw.toLocaleString() : ctx.raw}` } } }, scales: { y: { title: { display: true, text: 'Tickets Sold' } }, y1: { position: 'right', title: { display: true, text: 'Revenue (KES)' }, grid: { drawOnChartArea: false } } } }
    });
}

function displayEventsTable(data) {
    const container = document.getElementById('eventsSalesTable');
    if (!data.events_data || !data.events_data.length) {
        container.innerHTML = '<tr><td colspan="6" class="no-data">No event data available</td></tr>';
        return;
    }
    
    container.innerHTML = data.events_data.map(event => `
        <tr>
            <td><strong>${event.event_title}</strong><br><small>${new Date(event.event_date).toLocaleDateString()}</small></td>
            <td>${event.tickets_sold}/${event.capacity}</td>
            <td>${event.occupancy_rate}%</td>
            <td class="revenue-cell">KES ${event.revenue.toLocaleString()}</td>
            <td class="action-buttons"><button class="btn-view" onclick="viewEventDetails(${event.event_id})">View Details</button></td>
        </tr>
    `).join('');
}

function viewEventDetails(eventId) { window.location.href = `/organizer/events/${eventId}/analytics/`; }

function exportSalesReport() { window.open(`/organizer/sales/export/?start=${startDate || ''}&end=${endDate || ''}`, '_blank'); }

function refreshReport() { loadSalesReport(); }

function showLoading() { const container = document.getElementById('salesReportContent'); if (container) container.style.opacity = '0.5'; }
function hideLoading() { const container = document.getElementById('salesReportContent'); if (container) container.style.opacity = '1'; }
