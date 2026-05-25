/* ============================================
   CHECK-IN HISTORY JAVASCRIPT
   EventHub Admin - Check-in History & Reports
   ============================================ */

let currentPage = 1;
let totalPages = 1;
let currentEventId = null;
let timelineChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    loadCheckinStats();
    setupEventListeners();
});

function setupEventListeners() {
    const eventFilter = document.getElementById('eventFilter');
    if (eventFilter) {
        eventFilter.addEventListener('change', () => {
            currentPage = 1;
            loadEventsTable();
            loadCheckinStats();
        });
    }
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', () => {
        currentPage = 1;
        loadEventsTable();
        loadCheckinStats();
    });
    if (dateTo) dateTo.addEventListener('change', () => {
        currentPage = 1;
        loadEventsTable();
        loadCheckinStats();
    });
}

async function loadEvents() {
    try {
        const data = await apiRequest('/api/admin/events/list/');
        const select = document.getElementById('eventFilter');
        if (select && data.events) {
            select.innerHTML = '<option value="">All Events</option>' + 
                data.events.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

async function loadCheckinStats() {
    const eventId = document.getElementById('eventFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    try {
        const params = new URLSearchParams({ event_id: eventId, date_from: dateFrom, date_to: dateTo });
        const data = await apiRequest(`/api/admin/checkins/stats/?${params}`);
        
        if (data.stats) {
            document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
            document.getElementById('totalTickets').textContent = data.stats.total_tickets || 0;
            document.getElementById('totalCheckedIn').textContent = data.stats.checked_in || 0;
            document.getElementById('avgAttendance').textContent = `${data.stats.avg_attendance || 0}%`;
        }
    } catch (error) {
        console.error('Error loading checkin stats:', error);
    }
}

async function loadEventsTable() {
    const eventId = document.getElementById('eventFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    Loader.show('Loading events data...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            event_id: eventId,
            date_from: dateFrom,
            date_to: dateTo
        });
        const data = await apiRequest(`/api/admin/checkins/events/?${params}`);
        
        displayEvents(data.events);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsList').innerHTML = 
            '<td><td colspan="7" class="text-center">Failed to load events</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayEvents(events) {
    const tbody = document.getElementById('eventsList');
    
    if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No events found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = events.map(event => {
        const attendanceRate = event.total_tickets > 0 
            ? ((event.checked_in / event.total_tickets) * 100).toFixed(1)
            : 0;
        return `
            <tr>
                <td><strong>${escapeHtml(event.title)}</strong></td>
                <td>${formatDate(event.event_date)}</td>
                <td>${escapeHtml(event.venue || 'N/A')}</td>
                <td>${event.total_tickets || 0}</td>
                <td class="text-success">${event.checked_in || 0}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${attendanceRate}%"></div>
                        </div>
                        <span class="progress-text">${attendanceRate}%</span>
                    </div>
                </td>
                <td class="action-buttons">
                    <button class="action-btn view" onclick="viewEventDetails(${event.id}, '${escapeHtml(event.title)}')" title="View Details">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="action-btn edit" onclick="viewEventAttendees(${event.id})" title="View Attendees">
                        <i class="fas fa-users"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${events.length} records`;
}

async function loadRecentCheckins() {
    const eventId = document.getElementById('eventFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    try {
        const params = new URLSearchParams({
            event_id: eventId,
            date_from: dateFrom,
            date_to: dateTo,
            limit: 50
        });
        const data = await apiRequest(`/api/admin/checkins/recent/?${params}`);
        
        displayRecentCheckins(data.checkins);
        
        if (data.pagination) {
            renderCheckinsPagination(data.pagination.current_page, data.pagination.total_pages);
        }
    } catch (error) {
        console.error('Error loading recent checkins:', error);
        document.getElementById('checkinsList').innerHTML = 
            '<tr><td colspan="6" class="text-center">Failed to load check-ins</td></tr>';
    }
}

function displayRecentCheckins(checkins) {
    const tbody = document.getElementById('checkinsList');
    
    if (!checkins || checkins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No check-ins found</td></tr>';
        document.getElementById('checkinsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = checkins.map(checkin => `
        <tr>
            <td><code>${escapeHtml(checkin.ticket_number)}</code></td>
            <td><strong>${escapeHtml(checkin.attendee_name)}</strong></td>
            <td>${escapeHtml(checkin.attendee_email)}</td>
            <td>${escapeHtml(checkin.event_title)}</td>
            <td>${formatDateTime(checkin.checkin_time)}</td>
            <td>${escapeHtml(checkin.checked_by || 'System')}</td>
        </tr>
    `).join('');
    
    document.getElementById('checkinsCount').textContent = `Showing ${checkins.length} records`;
}

async function viewEventDetails(eventId, eventTitle) {
    currentEventId = eventId;
    
    try {
        const data = await apiRequest(`/api/admin/checkins/event/${eventId}/details/`);
        
        document.getElementById('eventModalBody').innerHTML = `
            <div class="event-detail-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div class="stat-card" style="text-align: center; padding: 1rem;">
                    <div class="stat-icon" style="margin: 0 auto 0.5rem;"><i class="fas fa-ticket-alt"></i></div>
                    <h4>Total Tickets</h4>
                    <p class="stat-value" style="font-size: 1.5rem; font-weight: 700;">${data.details.total_tickets || 0}</p>
                </div>
                <div class="stat-card" style="text-align: center; padding: 1rem;">
                    <div class="stat-icon" style="margin: 0 auto 0.5rem;"><i class="fas fa-check-circle"></i></div>
                    <h4>Checked In</h4>
                    <p class="stat-value" style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${data.details.checked_in || 0}</p>
                </div>
                <div class="stat-card" style="text-align: center; padding: 1rem;">
                    <div class="stat-icon" style="margin: 0 auto 0.5rem;"><i class="fas fa-clock"></i></div>
                    <h4>Not Checked In</h4>
                    <p class="stat-value" style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${data.details.not_checked_in || 0}</p>
                </div>
                <div class="stat-card" style="text-align: center; padding: 1rem;">
                    <div class="stat-icon" style="margin: 0 auto 0.5rem;"><i class="fas fa-chart-line"></i></div>
                    <h4>Attendance Rate</h4>
                    <p class="stat-value" style="font-size: 1.5rem; font-weight: 700;">${data.details.attendance_rate || 0}%</p>
                </div>
            </div>
            <div class="checkin-timeline" id="checkinTimeline">
                <h4>Check-in Timeline</h4>
                <canvas id="timelineChart" height="200"></canvas>
            </div>
        `;
        
        loadEventTimeline(eventId);
        document.getElementById('eventModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading event details:', error);
        showToast('Failed to load event details', 'error');
    }
}

async function loadEventTimeline(eventId) {
    try {
        const data = await apiRequest(`/api/admin/checkins/event/${eventId}/timeline/`);
        const ctx = document.getElementById('timelineChart')?.getContext('2d');
        if (!ctx) return;
        
        if (timelineChart) timelineChart.destroy();
        
        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Check-ins',
                    data: data.values || [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
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
                                return `${context.raw} check-ins`;
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
        console.error('Error loading timeline:', error);
    }
}

function viewEventAttendees(eventId) {
    window.open(`/admin-portal/tickets/?event_id=${eventId}`, '_blank');
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    currentEventId = null;
}

function exportCheckinReport() {
    const eventId = document.getElementById('eventFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    const params = new URLSearchParams({
        event_id: eventId,
        date_from: dateFrom,
        date_to: dateTo
    });
    window.open(`/api/admin/checkins/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function exportEventAttendance() {
    if (currentEventId) {
        window.open(`/api/admin/checkins/event/${currentEventId}/export/`, '_blank');
        showToast('Export started', 'success');
    }
}

function printReport() {
    window.print();
}

function applyFilters() {
    currentPage = 1;
    loadEventsTable();
    loadCheckinStats();
    loadRecentCheckins();
}

function resetFilters() {
    document.getElementById('eventFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    applyFilters();
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadEventsTable();
    }
}

function renderCheckinsPagination(current, total) {
    const container = document.getElementById('checkinsPagination');
    if (!container || total <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changeCheckinsPage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changeCheckinsPage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changeCheckinsPage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changeCheckinsPage(page) {
    currentCheckinsPage = page;
    loadRecentCheckins();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.viewEventDetails = viewEventDetails;
window.viewEventAttendees = viewEventAttendees;
window.closeEventModal = closeEventModal;
window.exportCheckinReport = exportCheckinReport;
window.exportEventAttendance = exportEventAttendance;
window.printReport = printReport;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.changePage = changePage;
window.changeCheckinsPage = changeCheckinsPage;
