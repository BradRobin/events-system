// ============================================
// ORGANIZER DATA EXPORT
// Handles: Exporting analytics data to CSV/Excel
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupExportButtons();
});

function setupExportButtons() {
    document.getElementById('exportCSV')?.addEventListener('click', () => exportData('csv'));
    document.getElementById('exportExcel')?.addEventListener('click', () => exportData('excel'));
    document.getElementById('exportPDF')?.addEventListener('click', () => exportData('pdf'));
}

function exportData(format) {
    const reportType = document.getElementById('exportReportType')?.value || 'sales';
    const startDate = document.getElementById('exportStartDate')?.value || '';
    const endDate = document.getElementById('exportEndDate')?.value || '';
    
    window.open(`/organizer/export/?type=${reportType}&format=${format}&start=${startDate}&end=${endDate}`, '_blank');
}

function exportEventBookings(eventId) { window.open(`/organizer/events/${eventId}/bookings/export/`, '_blank'); }
function exportAttendeeList(eventId) { window.open(`/organizer/events/${eventId}/attendees/export/`, '_blank'); }
function exportEventAnalytics(eventId) { window.open(`/organizer/events/${eventId}/analytics/export/`, '_blank'); }

function downloadAsCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
    return [headers.join(','), ...rows].join('\n');
}
