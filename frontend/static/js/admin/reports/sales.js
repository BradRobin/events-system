// Sales Report JavaScript with PDF Export
let salesChart = null;
let categorySalesChart = null;
let currentChartType = 'revenue';
let currentSalesData = null;

document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates();
    loadSalesReport();
});

function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const endDateInput = document.getElementById('endDate');
    const startDateInput = document.getElementById('startDate');
    if (endDateInput) endDateInput.value = endDate.toISOString().split('T')[0];
    if (startDateInput) startDateInput.value = startDate.toISOString().split('T')[0];
}

async function loadSalesReport() {
    const period = document.getElementById('period')?.value || 'monthly';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    showLoading();
    
    try {
        const params = new URLSearchParams({ period });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const data = await apiRequest(`/api/admin/reports/sales/?${params}`);
        currentSalesData = data;
        
        updateSalesKPIs(data.kpis);
        updateSalesChart(data);
        updateTopSellingEvents(data.top_events);
        updateCategorySalesChart(data.categories);
        updateDailySalesTable(data.daily_sales);
    } catch (error) {
        console.error('Error loading sales report:', error);
        showToast('Failed to load sales report', 'error');
    } finally {
        hideLoading();
    }
}

function updateSalesKPIs(kpis) {
    if (!kpis) return;
    document.getElementById('totalSales').textContent = formatCurrency(kpis.total_sales);
    document.getElementById('totalTicketsSold').textContent = formatNumber(kpis.total_tickets);
    document.getElementById('avgOrderValue').textContent = formatCurrency(kpis.avg_order_value);
    document.getElementById('growthRate').textContent = `${kpis.growth_rate}%`;
    
    updateSalesTrend('salesTrend', kpis.sales_trend);
    updateSalesTrend('ticketsTrend', kpis.tickets_trend);
    updateSalesTrend('avgOrderTrend', kpis.avg_order_trend);
}

function updateSalesTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element || !trend) return;
    const direction = trend.percentage >= 0 ? 'up' : 'down';
    element.innerHTML = `<i class="fas fa-arrow-${direction}"></i> ${Math.abs(trend.percentage)}%`;
    element.className = `kpi-trend ${direction}`;
}

function updateSalesChart(data) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    
    if (salesChart) salesChart.destroy();
    
    const datasets = currentChartType === 'revenue' ? [{
        label: 'Revenue (KSh)',
        data: data.revenue_data || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }] : [{
        label: 'Tickets Sold',
        data: data.tickets_data || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }];
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: { labels: data.labels || [], datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => currentChartType === 'revenue' ? formatCurrency(ctx.raw) : formatNumber(ctx.raw) } } },
            scales: { y: { beginAtZero: true, ticks: { callback: (v) => currentChartType === 'revenue' ? formatCurrency(v) : v } } }
        }
    });
}

function switchChartType(type) {
    currentChartType = type;
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.chart-btn[data-type="${type}"]`)?.classList.add('active');
    if (currentSalesData) updateSalesChart(currentSalesData);
}

function updateTopSellingEvents(events) {
    const container = document.getElementById('topEventsList');
    if (!container) return;
    
    if (!events?.length) {
        container.innerHTML = '<div class="empty-state">No data available</div>';
        return;
    }
    
    container.innerHTML = events.map((e, i) => `
        <div class="top-event-item">
            <div class="top-event-rank">${i+1}</div>
            <div class="top-event-info">
                <div class="top-event-name">${escapeHtml(e.name)}</div>
                <div class="top-event-meta">${e.category || 'Uncategorized'}</div>
            </div>
            <div class="top-event-stats">
                <div class="top-event-revenue">${formatCurrency(e.revenue)}</div>
                <div class="top-event-tickets">${formatNumber(e.tickets_sold)} tickets</div>
            </div>
        </div>
    `).join('');
}

function updateCategorySalesChart(categories) {
    const ctx = document.getElementById('categorySalesChart')?.getContext('2d');
    if (!ctx || !categories?.length) return;
    
    if (categorySalesChart) categorySalesChart.destroy();
    
    categorySalesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(c => c.name),
            datasets: [{ data: categories.map(c => c.revenue), backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4'] }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } } } }
    });
}

let currentPage = 1;
let itemsPerPage = 10;
let dailySalesData = [];

function updateDailySalesTable(sales) {
    dailySalesData = sales || [];
    const tbody = document.getElementById('dailySalesList');
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = dailySalesData.slice(start, start + itemsPerPage);
    
    if (!paginated.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No data available</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = paginated.map(item => `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td class="text-right">${formatNumber(item.orders)}</td>
            <td class="text-right">${formatNumber(item.tickets_sold)}</td>
            <td class="text-right amount">${formatCurrency(item.revenue)}</td>
            <td class="text-right">${formatCurrency(item.avg_order_value)}</td>
            <td>${escapeHtml(item.top_event || '-')}</td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${paginated.length} of ${dailySalesData.length} records`;
    renderSalesPagination();
}

function renderSalesPagination() {
    const totalPages = Math.ceil(dailySalesData.length / itemsPerPage);
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) { if(container) container.innerHTML = ''; return; }
    
    let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changeSalesPage(${currentPage-1})">&laquo;</button>`;
    for (let i = Math.max(1, currentPage-2); i <= Math.min(totalPages, currentPage+2); i++)
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changeSalesPage(${i})">${i}</button>`;
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changeSalesPage(${currentPage+1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changeSalesPage(page) { currentPage = page; updateDailySalesTable(dailySalesData); }

async function exportSalesReport() {
    showToast('Generating PDF report...', 'info');
    
    try {
        const period = document.getElementById('period')?.value || 'monthly';
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate = document.getElementById('endDate')?.value || '';
        
        const params = new URLSearchParams({ period });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const data = await apiRequest(`/api/admin/reports/sales/?${params}`);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(245, 158, 11);
        doc.text('EventHub Sales Report', 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        const periodText = document.getElementById('period').options[document.getElementById('period').selectedIndex]?.text || period;
        doc.text(`Period: ${periodText}`, 20, 37);
        if (startDate && endDate) doc.text(`Date Range: ${formatDate(startDate)} - ${formatDate(endDate)}`, 20, 44);
        
        // KPI Section
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Sales KPIs', 20, 55);
        
        const kpiData = [
            ['Metric', 'Value', 'Trend'],
            ['Total Sales', formatCurrency(data.kpis?.total_sales || 0), `${data.kpis?.sales_trend?.percentage >= 0 ? '+' : ''}${Math.abs(data.kpis?.sales_trend?.percentage || 0)}%`],
            ['Tickets Sold', formatNumber(data.kpis?.total_tickets || 0), `${data.kpis?.tickets_trend?.percentage >= 0 ? '+' : ''}${Math.abs(data.kpis?.tickets_trend?.percentage || 0)}%`],
            ['Avg Order Value', formatCurrency(data.kpis?.avg_order_value || 0), `${data.kpis?.avg_order_trend?.percentage >= 0 ? '+' : ''}${Math.abs(data.kpis?.avg_order_trend?.percentage || 0)}%`],
            ['Growth Rate', `${data.kpis?.growth_rate || 0}%`, '']
        ];
        
        doc.autoTable({
            startY: 60,
            head: [kpiData[0]],
            body: kpiData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
            margin: { left: 20, right: 20 }
        });
        
        // Top Events
        let yPosition = doc.lastAutoTable.finalY + 10;
        if (yPosition > 180) { doc.addPage(); yPosition = 20; }
        
        doc.setFontSize(14);
        doc.text('Top Selling Events', 20, yPosition);
        yPosition += 5;
        
        const eventsData = (data.top_events || []).map((e, i) => [`#${i+1}`, e.name, formatCurrency(e.revenue), `${formatNumber(e.tickets_sold)} tickets`]);
        
        if (eventsData.length) {
            doc.autoTable({
                startY: yPosition,
                head: [['Rank', 'Event Name', 'Revenue', 'Tickets']],
                body: eventsData,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
                margin: { left: 20, right: 20 }
            });
            yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // Daily Sales Table
        if (yPosition > 180) { doc.addPage(); yPosition = 20; }
        
        doc.setFontSize(14);
        doc.text('Daily Sales Breakdown', 20, yPosition);
        yPosition += 5;
        
        const dailyData = (data.daily_sales || []).slice(0, 20).map(item => [
            formatDate(item.date),
            formatNumber(item.orders),
            formatNumber(item.tickets_sold),
            formatCurrency(item.revenue),
            formatCurrency(item.avg_order_value)
        ]);
        
        if (dailyData.length) {
            doc.autoTable({
                startY: yPosition,
                head: [['Date', 'Orders', 'Tickets', 'Revenue', 'Avg Order']],
                body: dailyData,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
                margin: { left: 20, right: 20 }
            });
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`EventHub Sales Report - Page ${i} of ${pageCount}`, 20, 287);
        }
        
        doc.save(`sales_report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF report downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Failed to generate PDF report', 'error');
    }
}

function resetSalesFilters() {
    const periodSelect = document.getElementById('period');
    if (periodSelect) periodSelect.value = 'monthly';
    setDefaultDates();
    loadSalesReport();
}

function formatCurrency(amount) { return `KSh ${Number(amount).toLocaleString('en-KE')}`; }
function formatNumber(num) { return Number(num).toLocaleString('en-KE'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-KE') : 'N/A'; }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;';
    overlay.innerHTML = '<div class="loading-spinner" style="width:50px;height:50px;border:3px solid #e2e8f0;border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() { const overlay = document.getElementById('loadingOverlay'); if (overlay) overlay.remove(); }

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:1rem 1.5rem;border-radius:8px;background:white;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);z-index:1100;display:flex;align-items:center;gap:0.75rem;border-left:4px solid #10b981;';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}