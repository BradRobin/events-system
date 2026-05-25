// Events Performance Report JavaScript with PDF Export
let currentPage = 1;
let totalPages = 1;
let currentEventsData = [];

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadEventsReport();
});

async function loadCategories() {
    try {
        const data = await apiRequest('/api/admin/categories/');
        const select = document.getElementById('categoryFilter');
        if (select && data.categories) {
            select.innerHTML = '<option value="">All Categories</option>' + 
                data.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        }
    } catch (error) { console.error('Error loading categories:', error); }
}

async function loadEventsReport() {
    showLoading();
    try {
        await Promise.all([loadEventsTable(), loadSummaryStats()]);
    } catch (error) { console.error('Error loading report:', error); showToast('Failed to load events report', 'error'); }
    finally { hideLoading(); }
}

async function loadEventsTable() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ page: currentPage, start_date: startDate, end_date: endDate, category, status });
        const data = await apiRequest(`/api/admin/reports/events/?${params}`);
        
        currentEventsData = data.events || [];
        displayEvents(currentEventsData);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderEventsPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsPerformanceList').innerHTML = '<tr><td colspan="9">Failed to load data</td></tr>';
    }
}

function displayEvents(events) {
    const tbody = document.getElementById('eventsPerformanceList');
    if (!events?.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No events found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 events';
        return;
    }
    
    tbody.innerHTML = events.map(e => {
        const fillRate = e.capacity > 0 ? (e.sold / e.capacity) * 100 : 0;
        return `
        <tr>
            <td><strong>${escapeHtml(e.title)}</strong></td>
            <td>${escapeHtml(e.organizer_name)}</td>
            <td><span class="category-badge">${e.category || 'Uncategorized'}</span></td>
            <td>${formatDate(e.date)}</td>
            <td class="text-right">${formatNumber(e.sold)} / ${formatNumber(e.capacity)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div class="fill-rate-bar" style="width:100px;height:6px;background:#e2e8f0;border-radius:9999px;overflow:hidden;">
                        <div class="fill-rate-progress" style="width:${fillRate}%;height:100%;background:linear-gradient(90deg,#f59e0b,#ec6408);border-radius:9999px;"></div>
                    </div>
                    <span class="fill-rate-text">${fillRate.toFixed(1)}%</span>
                </div>
            </td>
            <td class="text-right amount">${formatCurrency(e.revenue || 0)}</td>
            <td>${getStatusBadge(e.status)}</td>
            <td class="action-buttons"><button class="action-btn view" onclick="viewEvent(${e.id})"><i class="fas fa-eye"></i></button></td>
        </tr>
    `}).join('');
    document.getElementById('recordsCount').textContent = `Showing ${events.length} events`;
}

async function loadSummaryStats() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, category, status });
        const data = await apiRequest(`/api/admin/reports/events/summary/?${params}`);
        
        if (data.stats) {
            document.getElementById('totalEvents').textContent = formatNumber(data.stats.total_events || 0);
            document.getElementById('totalTicketsSold').textContent = formatNumber(data.stats.total_tickets || 0);
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue || 0);
            document.getElementById('avgFillRate').textContent = `${data.stats.avg_fill_rate || 0}%`;
        }
    } catch (error) { console.error('Error loading summary stats:', error); }
}

function applyFilters() { currentPage = 1; loadEventsReport(); }

function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    applyFilters();
}

async function exportEventsReport() {
    showToast('Generating PDF report...', 'info');
    
    try {
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate = document.getElementById('endDate')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate, category, status });
        const data = await apiRequest(`/api/admin/reports/events/?${params}&page_size=100`);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(245, 158, 11);
        doc.text('EventHub Events Performance Report', 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        if (startDate || endDate) {
            let range = '';
            if (startDate) range += `From: ${formatDate(startDate)} `;
            if (endDate) range += `To: ${formatDate(endDate)}`;
            doc.text(range, 20, 37);
        }
        
        // Summary Stats
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Summary Statistics', 20, 50);
        
        const summaryData = [
            ['Total Events', formatNumber(data.events?.length || 0)],
            ['Total Tickets Sold', formatNumber(data.summary_stats?.total_tickets || 0)],
            ['Total Revenue', formatCurrency(data.summary_stats?.total_revenue || 0)],
            ['Average Fill Rate', `${data.summary_stats?.avg_fill_rate || 0}%`]
        ];
        
        doc.autoTable({
            startY: 55,
            body: summaryData,
            theme: 'striped',
            styles: { cellWidth: 'wrap' },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 } },
            margin: { left: 20, right: 20 }
        });
        
        // Events Table
        let yPosition = doc.lastAutoTable.finalY + 10;
        if (yPosition > 180) { doc.addPage(); yPosition = 20; }
        
        doc.setFontSize(14);
        doc.text('Events Performance Details', 20, yPosition);
        yPosition += 5;
        
        const eventsData = (data.events || []).map(e => {
            const fillRate = e.capacity > 0 ? (e.sold / e.capacity) * 100 : 0;
            return [
                e.title,
                e.organizer_name,
                formatDate(e.date),
                `${formatNumber(e.sold)}/${formatNumber(e.capacity)}`,
                `${fillRate.toFixed(1)}%`,
                formatCurrency(e.revenue || 0),
                e.status
            ];
        });
        
        if (eventsData.length) {
            doc.autoTable({
                startY: yPosition,
                head: [['Event Name', 'Organizer', 'Date', 'Tickets Sold/Capacity', 'Fill Rate', 'Revenue', 'Status']],
                body: eventsData,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
                margin: { left: 20, right: 20 },
                styles: { fontSize: 8, cellPadding: 3 }
            });
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`EventHub Events Report - Page ${i} of ${pageCount}`, 20, 287);
        }
        
        doc.save(`events_report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF report downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Failed to generate PDF report', 'error');
    }
}

function viewEvent(id) { window.open(`/admin-portal/events/detail/?id=${id}`, '_blank'); }

function renderEventsPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changeEventsPage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changeEventsPage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changeEventsPage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changeEventsPage(page) { currentPage = page; loadEventsTable(); }

function formatCurrency(amount) { return `KSh ${Number(amount).toLocaleString('en-KE')}`; }
function formatNumber(num) { return Number(num).toLocaleString('en-KE'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-KE') : 'N/A'; }

function getStatusBadge(s) {
    const classes = { 'published': 'status-published', 'draft': 'status-draft', 'cancelled': 'status-cancelled', 'completed': 'status-published' };
    return `<span class="status-badge ${classes[s] || ''}">${s}</span>`;
}

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