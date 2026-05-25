// All Tickets Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentTicketId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    loadTickets();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchTickets');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadTickets();
            }, 500);
        });
    }
    
    const eventFilter = document.getElementById('eventFilter');
    if (eventFilter) {
        eventFilter.addEventListener('change', () => {
            currentPage = 1;
            loadTickets();
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            loadTickets();
        });
    }
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

async function loadTickets() {
    const search = document.getElementById('searchTickets')?.value || '';
    const eventId = document.getElementById('eventFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    Loader.show('Loading tickets...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            event_id: eventId,
            status: status
        });
        const data = await apiRequest(`/api/admin/tickets/?${params}`);
        
        displayTickets(data.tickets);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('ticketsList').innerHTML = 
            '<tr><td colspan="7" class="text-center">Failed to load tickets</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayTickets(tickets) {
    const tbody = document.getElementById('ticketsList');
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No tickets found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = tickets.map(ticket => `
        <tr>
            <td><code>${escapeHtml(ticket.ticket_number)}</code></td>
            <td>
                <strong>${escapeHtml(ticket.attendee_name)}</strong><br>
                <small>${escapeHtml(ticket.attendee_email)}</small>
            </td>
            <td>${escapeHtml(ticket.event_title)}</td>
            <td>#${escapeHtml(ticket.booking_id)}</td>
            <td>${getTicketStatusBadge(ticket.status)}</td>
            <td>${ticket.checked_in_at ? formatDateTime(ticket.checked_in_at) : 'Not checked in'}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewTicket('${ticket.ticket_number}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${ticket.status !== 'checked_in' ? `
                    <button class="action-btn edit" onclick="checkinTicket('${ticket.ticket_number}')" title="Check In">
                        <i class="fas fa-check-circle"></i>
                    </button>
                ` : ''}
                <button class="action-btn" onclick="downloadTicketPDF('${ticket.ticket_number}')" title="Download PDF">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${tickets.length} records`;
}

async function viewTicket(ticketNumber) {
    try {
        const data = await apiRequest(`/api/admin/tickets/${ticketNumber}/`);
        const ticket = data.ticket;
        currentTicketId = ticketNumber;
        
        document.getElementById('ticketModalBody').innerHTML = `
            <div class="ticket-detail">
                <div class="ticket-qr">
                    <img src="${ticket.qr_code_url || '/static/images/qr-placeholder.png'}" alt="QR Code">
                </div>
                <div class="info-row"><span>Ticket Number:</span><strong>${escapeHtml(ticket.ticket_number)}</strong></div>
                <div class="info-row"><span>Attendee:</span><span>${escapeHtml(ticket.attendee_name)}</span></div>
                <div class="info-row"><span>Email:</span><span>${escapeHtml(ticket.attendee_email)}</span></div>
                <div class="info-row"><span>Phone:</span><span>${ticket.attendee_phone || 'N/A'}</span></div>
                <div class="info-row"><span>Event:</span><span>${escapeHtml(ticket.event_title)}</span></div>
                <div class="info-row"><span>Event Date:</span><span>${formatDate(ticket.event_date)}</span></div>
                <div class="info-row"><span>Venue:</span><span>${escapeHtml(ticket.venue)}</span></div>
                <div class="info-row"><span>Status:</span><span>${getTicketStatusBadge(ticket.status)}</span></div>
                ${ticket.checked_in_at ? `<div class="info-row"><span>Checked In At:</span><span>${formatDateTime(ticket.checked_in_at)}</span></div>` : ''}
            </div>
        `;
        
        // Show/hide check-in button
        const checkinBtn = document.getElementById('manualCheckinBtn');
        if (ticket.status === 'checked_in') {
            checkinBtn.style.display = 'none';
        } else {
            checkinBtn.style.display = 'inline-flex';
        }
        
        document.getElementById('ticketModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

async function checkinTicket(ticketNumber) {
    showConfirm('Check in this attendee?', async () => {
        Loader.show('Processing check-in...');
        
        try {
            const data = await apiRequest(`/api/admin/tickets/${ticketNumber}/checkin/`, 'POST');
            
            if (data.success) {
                showToast('Attendee checked in successfully', 'success');
                loadTickets();
            } else {
                showToast(data.message || 'Failed to check in', 'error');
            }
        } catch (error) {
            console.error('Error checking in ticket:', error);
            showToast('Failed to check in attendee', 'error');
        } finally {
            Loader.hide();
        }
    });
}

async function manualCheckinFromModal() {
    await checkinTicket(currentTicketId);
    closeTicketModal();
}

function downloadTicketPDF(ticketNumber) {
    window.open(`/api/admin/tickets/${ticketNumber}/download/`, '_blank');
    showToast('Download started', 'success');
}

function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
    currentTicketId = null;
}

function applyFilters() {
    currentPage = 1;
    loadTickets();
}

function resetFilters() {
    document.getElementById('searchTickets').value = '';
    document.getElementById('eventFilter').value = '';
    document.getElementById('statusFilter').value = '';
    currentPage = 1;
    loadTickets();
}

function exportTickets() {
    const params = new URLSearchParams({
        search: document.getElementById('searchTickets')?.value || '',
        event_id: document.getElementById('eventFilter')?.value || '',
        status: document.getElementById('statusFilter')?.value || ''
    });
    window.open(`/api/admin/tickets/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (total <= 1) {
        container.innerHTML = '';
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
        loadTickets();
    }
}

function getTicketStatusBadge(status) {
    const badges = {
        'valid': '<span class="status-badge status-valid"><i class="fas fa-circle"></i> Valid</span>',
        'checked_in': '<span class="status-badge status-checked-in"><i class="fas fa-check-circle"></i> Checked In</span>',
        'expired': '<span class="status-badge status-expired"><i class="fas fa-clock"></i> Expired</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
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
window.viewTicket = viewTicket;
window.checkinTicket = checkinTicket;
window.downloadTicketPDF = downloadTicketPDF;
window.closeTicketModal = closeTicketModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportTickets = exportTickets;
window.changePage = changePage;
window.manualCheckinFromModal = manualCheckinFromModal;