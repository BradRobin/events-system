// Bookings Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentFilters = { search: '', status: '', event: '' };

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    loadStats();
    loadEvents();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchBookings');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentFilters.search = this.value;
                currentPage = 1;
                loadBookings();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('bookingStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilters.status = this.value;
            currentPage = 1;
            loadBookings();
        });
    }
    
    const eventFilter = document.getElementById('eventFilter');
    if (eventFilter) {
        eventFilter.addEventListener('change', function() {
            currentFilters.event = this.value;
            currentPage = 1;
            loadBookings();
        });
    }
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/bookings/stats/');
        if (data.stats) {
            document.getElementById('totalBookings').textContent = data.stats.total || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.revenue || 0);
            document.getElementById('pendingBookings').textContent = data.stats.pending || 0;
            document.getElementById('completedBookings').textContent = data.stats.completed || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadBookings() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: currentFilters.search,
            status: currentFilters.status,
            event: currentFilters.event
        });
        
        const data = await apiRequest(`/api/admin/bookings/?${params}`);
        if (data.success) {
            displayBookings(data.bookings);
            if (data.pagination) {
                totalPages = data.pagination.total_pages;
                renderPagination(currentPage, totalPages, (page) => {
                    currentPage = page;
                    loadBookings();
                });
            }
        }
    } catch (error) {
        document.getElementById('bookingsList').innerHTML = '<tr><td colspan="8" class="text-center">Failed to load bookings</td></tr>';
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsList');
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td><strong>#${booking.id}</strong></td>
            <td>${escapeHtml(booking.customer_name)}<br><small class="text-muted">${booking.customer_email}</small></td>
            <td>${escapeHtml(booking.event_title)}</td>
            <td>${booking.tickets} tickets</td>
            <td>${formatCurrency(booking.total)}</td>
            <td>${formatDate(booking.created_at)}</td>
            <td>${getStatusBadge(booking.status)}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewBooking(${booking.id})"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="editBooking(${booking.id})"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

async function loadEvents() {
    try {
        const data = await apiRequest('/api/admin/events/list/');
        if (data.events) {
            const eventFilter = document.getElementById('eventFilter');
            eventFilter.innerHTML = '<option value="">All Events</option>' + 
                data.events.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function applyFilters() {
    currentPage = 1;
    loadBookings();
}

async function viewBooking(id) {
    try {
        const data = await apiRequest(`/api/admin/bookings/${id}/`);
        if (data.booking) {
            const modalBody = document.getElementById('bookingModalBody');
            modalBody.innerHTML = `
                <div class="booking-details">
                    <p><strong>Booking ID:</strong> #${data.booking.id}</p>
                    <p><strong>Customer:</strong> ${escapeHtml(data.booking.customer_name)} (${data.booking.customer_email})</p>
                    <p><strong>Event:</strong> ${escapeHtml(data.booking.event_title)}</p>
                    <p><strong>Date:</strong> ${formatDateTime(data.booking.created_at)}</p>
                    <p><strong>Tickets:</strong> ${data.booking.tickets}</p>
                    <p><strong>Total Amount:</strong> ${formatCurrency(data.booking.total)}</p>
                    <p><strong>Payment Method:</strong> ${data.booking.payment_method || 'N/A'}</p>
                    <p><strong>Status:</strong> ${getStatusBadge(data.booking.status)}</p>
                </div>
                <div class="ticket-list">
                    <h4>Ticket Codes</h4>
                    ${data.booking.ticket_codes.map(code => `<div class="ticket-item"><code>${code}</code></div>`).join('')}
                </div>
            `;
            document.getElementById('bookingModal').style.display = 'flex';
            
            const cancelBtn = document.getElementById('cancelBookingBtn');
            if (data.booking.status === 'pending' || data.booking.status === 'confirmed') {
                cancelBtn.style.display = 'block';
                cancelBtn.onclick = () => cancelBooking(id);
            } else {
                cancelBtn.style.display = 'none';
            }
        }
    } catch (error) {
        showToast('Failed to load booking details', 'error');
    }
}

function editBooking(id) {
    window.location.href = `/admin-portal/bookings/edit/${id}/`;
}

async function cancelBooking(id) {
    showConfirm('Are you sure you want to cancel this booking?', async () => {
        try {
            await apiRequest(`/api/admin/bookings/${id}/cancel/`, 'POST');
            showToast('Booking cancelled successfully');
            closeModal();
            loadBookings();
            loadStats();
        } catch (error) {
            showToast('Failed to cancel booking', 'error');
        }
    });
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

function exportBookings() {
    const params = new URLSearchParams(currentFilters);
    window.open(`/api/admin/bookings/export/?${params}`, '_blank');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
