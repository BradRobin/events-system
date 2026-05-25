// Analytics Dashboard JavaScript with PDF Export
let revenueChart = null;
let categoryChart = null;
let userGrowthChart = null;
let currentData = {};

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
    
    showLoading();
    
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
        hideLoading();
    }
}

async function loadKPIData(days) {
    try {
        const data = await apiRequest(`/api/admin/reports/kpi/?days=${days}`);
        if (data.kpi) {
            document.getElementById('totalRevenue').textContent = formatCurrency(data.kpi.total_revenue || 0);
            document.getElementById('totalTickets').textContent = formatNumber(data.kpi.total_tickets || 0);
            document.getElementById('activeUsers').textContent = formatNumber(data.kpi.active_users || 0);
            document.getElementById('completedEvents').textContent = formatNumber(data.kpi.completed_events || 0);
            
            updateTrend('revenueTrend', data.kpi.revenue_trend);
            updateTrend('ticketsTrend', data.kpi.tickets_trend);
            updateTrend('usersTrend', data.kpi.users_trend);
            updateTrend('eventsTrend', data.kpi.events_trend);
            
            currentData.kpis = data.kpi;
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
        
        currentData.revenueChart = data;
        
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
        
        currentData.categoryChart = data;
        
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
        
        currentData.topEvents = data.events || [];
        
        if (container && data.events?.length) {
            container.innerHTML = data.events.map((e, i) => `
                <div class="top-event-item">
                    <div class="top-event-rank">${i+1}</div>
                    <div class="top-event-info">
                        <div class="top-event-name">${escapeHtml(e.title)}</div>
                        <div class="top-event-meta">${formatNumber(e.tickets_sold)} tickets sold | ${e.fill_rate || 0}% fill rate</div>
                    </div>
                    <div class="top-event-stats">
                        <div class="top-event-revenue">${formatCurrency(e.revenue)}</div>
                    </div>
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
        
        currentData.userGrowth = data;
        
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
            document.getElementById('summaryEvents').textContent = formatNumber(data.summary.total_events || 0);
            document.getElementById('summaryBookings').textContent = formatNumber(data.summary.total_bookings || 0);
            document.getElementById('summaryOrganizers').textContent = formatNumber(data.summary.total_organizers || 0);
            document.getElementById('conversionRate').textContent = `${data.summary.conversion_rate || 0}%`;
            document.getElementById('avgOrderValue').textContent = formatCurrency(data.summary.avg_order_value || 0);
            document.getElementById('fillRate').textContent = `${data.summary.avg_fill_rate || 0}%`;
            
            currentData.summary = data.summary;
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

async function exportReport() {
    const days = document.getElementById('dateRange')?.value || '30';
    
    showToast('Generating PDF report...', 'info');
    
    try {
        await loadAnalyticsData();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(245, 158, 11);
        doc.text('EventHub Analytics Report', 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        const daysText = document.getElementById('dateRange').options[document.getElementById('dateRange').selectedIndex].text;
        doc.text(`Period: ${daysText}`, 20, 37);
        
        // KPI Section
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Key Performance Indicators', 20, 50);
        
        const kpiData = [
            ['Metric', 'Value', 'Trend'],
            ['Total Revenue', currentData.kpis?.total_revenue ? formatCurrency(currentData.kpis.total_revenue) : 'KSh 0', `${currentData.kpis?.revenue_trend?.percentage >= 0 ? '+' : ''}${Math.abs(currentData.kpis?.revenue_trend?.percentage || 0)}%`],
            ['Tickets Sold', formatNumber(currentData.kpis?.total_tickets || 0), `${currentData.kpis?.tickets_trend?.percentage >= 0 ? '+' : ''}${Math.abs(currentData.kpis?.tickets_trend?.percentage || 0)}%`],
            ['Active Users', formatNumber(currentData.kpis?.active_users || 0), `${currentData.kpis?.users_trend?.percentage >= 0 ? '+' : ''}${Math.abs(currentData.kpis?.users_trend?.percentage || 0)}%`],
            ['Completed Events', formatNumber(currentData.kpis?.completed_events || 0), `${currentData.kpis?.events_trend?.percentage >= 0 ? '+' : ''}${Math.abs(currentData.kpis?.events_trend?.percentage || 0)}%`]
        ];
        
        doc.autoTable({
            startY: 55,
            head: [kpiData[0]],
            body: kpiData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
            margin: { left: 20, right: 20 }
        });
        
        // Top Events
        let yPosition = doc.lastAutoTable.finalY + 10;
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Top Performing Events', 20, yPosition);
        yPosition += 5;
        
        const eventsData = (currentData.topEvents || []).map((event, index) => [
            `#${index + 1}`,
            event.title,
            formatCurrency(event.revenue),
            `${formatNumber(event.tickets_sold)} tickets`,
            `${event.fill_rate || 0}% fill rate`
        ]);
        
        if (eventsData.length > 0) {
            doc.autoTable({
                startY: yPosition,
                head: [['Rank', 'Event Name', 'Revenue', 'Tickets', 'Fill Rate']],
                body: eventsData,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
                margin: { left: 20, right: 20 }
            });
            yPosition = doc.lastAutoTable.finalY + 10;
        } else {
            doc.text('No events data available', 20, yPosition + 10);
            yPosition += 20;
        }
        
        // Summary Stats
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Platform Summary', 20, yPosition);
        yPosition += 5;
        
        const summaryData = [
            ['Total Events', formatNumber(currentData.summary?.total_events || 0)],
            ['Total Bookings', formatNumber(currentData.summary?.total_bookings || 0)],
            ['Total Organizers', formatNumber(currentData.summary?.total_organizers || 0)],
            ['Conversion Rate', `${currentData.summary?.conversion_rate || 0}%`],
            ['Average Order Value', formatCurrency(currentData.summary?.avg_order_value || 0)],
            ['Average Fill Rate', `${currentData.summary?.avg_fill_rate || 0}%`]
        ];
        
        doc.autoTable({
            startY: yPosition,
            body: summaryData,
            theme: 'striped',
            styles: { cellWidth: 'wrap' },
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
            margin: { left: 20, right: 20 }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`EventHub Analytics - Page ${i} of ${pageCount}`, 20, 287);
            doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 292);
        }
        
        doc.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF report downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Failed to generate PDF report', 'error');
    }
}

function viewAllEvents() {
    window.location.href = '/admin-portal/events/all/';
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function formatNumber(num) {
    return Number(num).toLocaleString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;';
    overlay.innerHTML = '<div class="loading-spinner" style="width:50px;height:50px;border:3px solid #e2e8f0;border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

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