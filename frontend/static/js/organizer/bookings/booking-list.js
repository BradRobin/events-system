// ============================================
// ORGANIZER BOOKING LIST
// Handles: Displaying all bookings for organizer's events
// ============================================

let currentEventId = null;
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        currentEventId = eventId;
        loadEventBookings();
        loadEventInfo();
        setupFilters();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/bookings/);
    return match ? match[1] : null;
}

async function loadEventInfo() {
    const event = await EventAPI.Organizer.getEventForEdit(currentEventId);
    if (event) {
        document.getElementById('eventTitle').innerText = event.title;
        document.getElementById('eventDate').innerText = new Date(event.start_date).toLocaleString();
        document.getElementById('eventVenue').innerText = event.venue;
    }
}

async function loadEventBookings() {
    showLoading();
    
    const data = await EventAPI.Organizer.getEventBookings(currentEventId, currentPage);
    if (data) {
        displayBookings(data.bookings || []);
        totalPages = data.total_pages || 1;
        updatePagination();
        updateStats(data);
    }
    
    hideLoading();
}

function displayBookings(bookings) {
    const container = document.getElementById('bookingsTableBody');
    if (!bookings.length) {
        container.innerHTML = `
            <tr><td colspan="8" class="no-data">
                <i class="fas fa-ticket-alt fa-3x"></i>
                <h3>No Bookings Yet</h3>
                <p>No tickets have been sold for this event yet.</p>
            </td></tr>
        `;
        return;
    }
    
    container.innerHTML = bookings.map(booking => `
        <tr data-booking-id="${booking.id}">
            <td class="booking-id-cell">${booking.booking_id}</td>
            <td>
                <div class="customer-info">
                    <strong>${booking.customer_name}</strong>
                    <div class="customer-contact">${booking.customer_email}</div>
                    <div class="customer-contact">${booking.customer_phone || 'No phone'}</div>
                </div>
            </td>
            <td>${booking.quantity}</td>
            <td>${booking.ticket_type || 'Regular'}</td>
            <td>KES ${booking.total_price.toLocaleString()}</td>
            <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
            <td>
                <span class="status-badge ${booking.status}">${booking.status}</span>
            </td>
            <td class="action-buttons">
                <button class="btn-icon view" onclick="viewBookingDetails('${booking.booking_id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon email" onclick="emailCustomer('${booking.booking_id}')" title="Email Customer">
                    <i class="fas fa-envelope"></i>
                </button>
                ${booking.status === 'confirmed' ? `
                    <button class="btn-icon cancel" onclick="cancelBooking('${booking.booking_id}')" title="Cancel Booking">
                        <i class="fas fa-times-circle"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function updateStats(data) {
    document.getElementById('statTotalBookings').innerText = data.total_bookings || 0;
    document.getElementById('statTotalTickets').innerText = data.total_tickets_sold || 0;
    document.getElementById('statTotalRevenue').innerText = `KES ${(data.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statAvgTickets').innerText = data.total_bookings > 0 ? 
        Math.round(data.total_tickets_sold / data.total_bookings) : 0;
}

function updatePagination() {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';
    
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})">Prev</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="active">${i}</button>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button onclick="changePage(${i})">${i}</button>`;
        }
    }
    
    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})">Next</button>`;
    }
    
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadEventBookings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupFilters() {
    const filterSelect = document.getElementById('bookingStatusFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            loadEventBookings();
        });
    }
    
    const searchInput = document.getElementById('searchBookings');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Implement search functionality
                loadEventBookings();
            }, 500);
        });
    }
}

function viewBookingDetails(bookingId) {
    window.open(`/organizer/bookings/${bookingId}/`, '_blank');
}

function emailCustomer(bookingId) {
    window.location.href = `/organizer/bookings/${bookingId}/email/`;
}

async function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking? The customer will be notified and refunded.')) return;
    
    const result = await EventAPI.Organizer.cancelBooking?.(bookingId);
    if (result) {
        showToast('Booking cancelled', 'success');
        loadEventBookings();
    }
}

function exportBookings() {
    window.open(`/organizer/events/${currentEventId}/bookings/export/`, '_blank');
}

function showLoading() {
    const container = document.getElementById('bookingsTableBody');
    if (container) {
        container.innerHTML = '<tr><td colspan="8" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading bookings...</td></tr>';
    }
}

function hideLoading() {
    // Hidden by displayBookings
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
