// ============================================
// EVENT DETAIL JS - Admin Event Detail
// Location: static/js/admin/events/event-detail.js
// ============================================

let eventId = null;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    eventId = urlParams.get('id');
    
    if (eventId) {
        loadEventDetail();
        loadApprovalHistory();
    }
});

function goBack() {
    window.location.href = '/admin-portal/events/pending/';
}

async function loadEventDetail() {
    Loader.show('Loading event details...');
    
    try {
        const data = await apiRequest(`/api/admin/events/${eventId}/`);
        const event = data.event;
        
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventTitleDetail').textContent = event.title;
        document.getElementById('eventStatus').innerHTML = getStatusBadge(event.status);
        document.getElementById('eventCategory').textContent = event.category_name || 'Uncategorized';
        document.getElementById('eventOrganizer').textContent = event.organizer_name;
        document.getElementById('eventCreated').textContent = formatDateTime(event.created_at);
        document.getElementById('eventStartDate').textContent = formatDateTime(event.start_date);
        document.getElementById('eventEndDate').textContent = formatDateTime(event.end_date);
        document.getElementById('eventRegDeadline').textContent = formatDateTime(event.registration_deadline);
        document.getElementById('eventVenue').textContent = event.venue_name;
        document.getElementById('eventAddress').textContent = event.venue_address || 'N/A';
        document.getElementById('eventCity').textContent = event.city;
        document.getElementById('eventType').innerHTML = event.is_online ? 
            '<span class="badge info">Online Event</span>' : 
            '<span class="badge">In-Person</span>';
        document.getElementById('eventPrice').textContent = formatCurrency(event.min_price);
        document.getElementById('eventTotalSeats').textContent = event.total_capacity;
        document.getElementById('eventSold').textContent = event.sold_tickets || 0;
        document.getElementById('eventAvailable').textContent = event.remaining_tickets;
        document.getElementById('eventRevenue').textContent = formatCurrency(event.total_revenue || 0);
        document.getElementById('eventDescription').innerHTML = event.description;
        
        if (event.banner_image) {
            document.getElementById('eventBanner').style.backgroundImage = `url('${event.banner_image}')`;
        }
        
        // Show approval banner if status is pending
        if (event.status === 'pending') {
            document.getElementById('approvalBanner').style.display = 'block';
        }
        
        // Show ticket types if available
        if (event.ticket_types && event.ticket_types.length > 0) {
            document.getElementById('ticketTypesCard').style.display = 'block';
            displayTicketTypes(event.ticket_types);
        }
        
    } catch (error) {
        console.error('Error loading event:', error);
        showToast('Failed to load event details', 'error');
    } finally {
        Loader.hide();
    }
}

function displayTicketTypes(ticketTypes) {
    const container = document.getElementById('ticketTypesList');
    container.innerHTML = ticketTypes.map(ticket => `
        <div class="ticket-type-card">
            <div class="ticket-type-name">${escapeHtml(ticket.name)}</div>
            <div class="ticket-type-price">${formatCurrency(ticket.price)}</div>
            <div class="ticket-type-info">
                <span>Quantity: ${ticket.quantity}</span>
                <span>Remaining: ${ticket.remaining}</span>
            </div>
            <div class="ticket-type-benefits">${escapeHtml(ticket.benefits) || 'No benefits listed'}</div>
        </div>
    `).join('');
}

async function loadApprovalHistory() {
    try {
        const data = await apiRequest(`/api/admin/events/${eventId}/history/`);
        const container = document.getElementById('approvalHistory');
        
        if (data.history && data.history.length > 0) {
            document.getElementById('historyCard').style.display = 'block';
            container.innerHTML = data.history.map(item => `
                <div class="timeline-item ${item.action}">
                    <div class="timeline-icon">
                        <i class="fas ${item.action === 'approved' ? 'fa-check' : 'fa-times'}"></i>
                    </div>
                    <div class="timeline-content">
                        <h4>${item.action === 'approved' ? 'Approved' : 'Rejected'}</h4>
                        <p>By: ${escapeHtml(item.admin_name)}</p>
                        ${item.reason ? `<p>Reason: ${escapeHtml(item.reason)}</p>` : ''}
                        <small>${formatDateTime(item.created_at)}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function approveEvent() {
    showConfirm('Approve this event? It will be published immediately.', async () => {
        try {
            await apiRequest(`/api/admin/events/${eventId}/approve/`, 'POST');
            showToast('Event approved successfully', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            showToast('Failed to approve event', 'error');
        }
    });
}

function openRejectModal() {
    document.getElementById('rejectModal').style.display = 'flex';
}

function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
}

async function confirmReject() {
    const reason = document.getElementById('rejectionReason')?.value;
    
    if (!reason) {
        showToast('Please provide a rejection reason', 'error');
        return;
    }
    
    try {
        await apiRequest(`/api/admin/events/${eventId}/reject/`, 'POST', { reason: reason });
        showToast('Event rejected. Organizer notified.', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showToast('Failed to reject event', 'error');
    }
}

async function deleteEvent() {
    showConfirm('Delete this event permanently? This cannot be undone.', async () => {
        try {
            await apiRequest(`/api/admin/events/${eventId}/delete/`, 'DELETE');
            showToast('Event deleted');
            setTimeout(() => window.location.href = '/admin-portal/events/pending/', 1500);
        } catch (error) {
            showToast('Failed to delete event', 'error');
        }
    });
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending Approval</span>',
        'approved': '<span class="status-badge status-approved"><i class="fas fa-check-circle"></i> Approved</span>',
        'published': '<span class="status-badge status-published"><i class="fas fa-check-circle"></i> Published</span>',
        'draft': '<span class="status-badge status-draft"><i class="fas fa-edit"></i> Draft</span>',
        'cancelled': '<span class="status-badge status-cancelled"><i class="fas fa-times-circle"></i> Cancelled</span>',
        'completed': '<span class="status-badge status-published"><i class="fas fa-check-double"></i> Completed</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.goBack = goBack;
window.approveEvent = approveEvent;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.confirmReject = confirmReject;
window.deleteEvent = deleteEvent;