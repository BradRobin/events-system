// ============================================
// ATTENDEE BOOKINGS - Complete Functionality
// Uses centralized AttendeeAPIEndpoints
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentTab = 'all';
let currentSearch = '';
let currentDateRange = 'all';
let allBookings = [];

// DOM Elements
const bookingsListEl = document.getElementById('bookingsList');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('searchBookings');
const dateRangeSelect = document.getElementById('dateRange');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Wait for API to be ready
    if (window.AttendeeAPIEndpoints && window.AttendeeAPIEndpoints.bookings) {
        loadBookings();
    } else {
        console.error('AttendeeAPI not loaded. Check script order.');
        if (bookingsListEl) {
            bookingsListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Configuration Error</h3>
                    <p>API not initialized. Please refresh the page.</p>
                </div>
            `;
        }
    }
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value;
            currentPage = 1;
            filterAndDisplayBookings();
        }, 500));
    }
    
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            currentDateRange = this.value;
            currentPage = 1;
            filterAndDisplayBookings();
        });
    }
}

// Tab switching
function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    // Update active tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    filterAndDisplayBookings();
}

// Load bookings from API
async function loadBookings() {
    showLoading();
    
    try {
        const result = await window.AttendeeAPIEndpoints.bookings.getHistory(currentPage, 10);
        allBookings = result.results || result.bookings || [];
        filterAndDisplayBookings();
        
        if (result.total_pages) {
            totalPages = result.total_pages;
        } else if (result.pagination && result.pagination.total_pages) {
            totalPages = result.pagination.total_pages;
        }
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError(error.message || 'Failed to load bookings. Please try again.');
    }
}

// Filter and display bookings based on current filters
function filterAndDisplayBookings() {
    let filtered = [...allBookings];
    const now = new Date();
    
    // Filter by tab
    if (currentTab === 'upcoming') {
        filtered = filtered.filter(b => 
            b.status === 'confirmed' && new Date(b.event_date) > now
        );
    } else if (currentTab === 'past') {
        filtered = filtered.filter(b => 
            new Date(b.event_date) < now
        );
    } else if (currentTab === 'cancelled') {
        filtered = filtered.filter(b => b.status === 'cancelled');
    }
    
    // Filter by search
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(b => 
            (b.booking_id && b.booking_id.toLowerCase().includes(searchLower)) ||
            (b.event_title && b.event_title.toLowerCase().includes(searchLower))
        );
    }
    
    // Filter by date range
    if (currentDateRange !== 'all') {
        const days = parseInt(currentDateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filtered = filtered.filter(b => new Date(b.created_at) >= cutoffDate);
    }
    
    // Paginate
    const start = (currentPage - 1) * 10;
    const paginated = filtered.slice(start, start + 10);
    const totalFiltered = filtered.length;
    totalPages = Math.ceil(totalFiltered / 10);
    
    displayBookings(paginated);
    renderPagination(currentPage, totalPages);
    
    // Update empty state if needed
    if (paginated.length === 0 && totalFiltered === 0) {
        showEmptyState();
    }
}

// Display bookings in the UI
function displayBookings(bookings) {
    if (!bookingsListEl) return;
    
    if (!bookings || bookings.length === 0) {
        bookingsListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Bookings Found</h3>
                <p>You haven't made any bookings in this category.</p>
                <a href="/attendee/events/" class="btn-primary">Browse Events</a>
            </div>
        `;
        return;
    }
    
    bookingsListEl.innerHTML = bookings.map(booking => `
        <div class="booking-card" onclick="viewBookingDetail('${booking.booking_id}')">
            <div class="booking-header">
                <div class="booking-info">
                    <span class="booking-id">
                        <i class="fas fa-hashtag"></i> <code>${escapeHtml(booking.booking_id)}</code>
                    </span>
                    <span class="booking-date">
                        <i class="far fa-calendar-alt"></i> Booked on ${formatDate(booking.created_at)}
                    </span>
                </div>
                <div class="booking-status ${booking.status}">
                    <i class="fas ${getStatusIcon(booking.status)}"></i> ${capitalize(booking.status)}
                </div>
            </div>
            <div class="booking-body">
                <h4>${escapeHtml(booking.event_title)}</h4>
                <div class="booking-details">
                    <span><i class="fas fa-calendar"></i> ${formatDate(booking.event_date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(booking.venue)}</span>
                    <span><i class="fas fa-ticket-alt"></i> ${booking.quantity} ticket(s)</span>
                    <span><i class="fas fa-credit-card"></i> ${formatCurrency(booking.total_amount)}</span>
                </div>
            </div>
            <div class="booking-footer">
                <button class="btn-outline" onclick="event.stopPropagation(); viewInvoice('${booking.booking_id}')">
                    <i class="fas fa-download"></i> Invoice
                </button>
                ${booking.status === 'confirmed' && new Date(booking.event_date) > new Date() ? `
                    <button class="btn-danger" onclick="event.stopPropagation(); cancelBooking('${booking.booking_id}')">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                ` : ''}
                <button class="btn-primary" onclick="event.stopPropagation(); viewTickets('${booking.booking_id}')">
                    <i class="fas fa-ticket-alt"></i> View Tickets
                </button>
            </div>
        </div>
    `).join('');
}

// Show loading state
function showLoading() {
    if (bookingsListEl) {
        bookingsListEl.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your bookings...</p>
            </div>
        `;
    }
}

// Show error state
function showError(message) {
    if (bookingsListEl) {
        bookingsListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Bookings</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="loadBookings()">Try Again</button>
            </div>
        `;
    }
}

// Show empty state
function showEmptyState() {
    if (bookingsListEl) {
        bookingsListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Bookings Found</h3>
                <p>You don't have any bookings matching your filters.</p>
                <button class="btn-outline" onclick="resetFilters()">Clear Filters</button>
            </div>
        `;
    }
}

// Reset all filters
function resetFilters() {
    currentTab = 'all';
    currentSearch = '';
    currentDateRange = 'all';
    currentPage = 1;
    
    // Reset UI elements
    if (searchInput) searchInput.value = '';
    if (dateRangeSelect) dateRangeSelect.value = 'all';
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const allTab = document.querySelector('.tab-btn[data-tab="all"]');
    if (allTab) allTab.classList.add('active');
    
    loadBookings();
}

// View booking detail modal
async function viewBookingDetail(bookingId) {
    if (window.Loader) window.Loader.show('Loading booking details...');
    
    try {
        const booking = await window.AttendeeAPIEndpoints.bookings.getDetail(bookingId);
        showBookingDetailModal(booking);
    } catch (error) {
        console.error('Error loading booking details:', error);
        showToast('Failed to load booking details', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

// Show booking detail modal
function showBookingDetailModal(booking) {
    const modalBody = document.getElementById('bookingModalBody');
    const printBtn = document.getElementById('printBookingBtn');
    
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="booking-detail-modal">
            <div class="detail-header">
                <div>
                    <h3>Booking #${escapeHtml(booking.booking_id)}</h3>
                    <span class="booking-status ${booking.status}">
                        <i class="fas ${getStatusIcon(booking.status)}"></i> ${capitalize(booking.status)}
                    </span>
                </div>
                <div class="booking-date-detail">
                    <i class="far fa-calendar-alt"></i> ${formatDateTime(booking.created_at)}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Booking Information</h4>
                <div class="detail-row">
                    <span class="label">Booking ID:</span>
                    <span class="value"><code>${escapeHtml(booking.booking_id)}</code></span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${booking.payment_method || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Transaction ID:</span>
                    <span class="value">${escapeHtml(booking.transaction_id || 'N/A')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total Amount:</span>
                    <span class="value amount">${formatCurrency(booking.total_amount)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Event Information</h4>
                <div class="detail-row">
                    <span class="label">Event:</span>
                    <span class="value">${escapeHtml(booking.event_title)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Date & Time:</span>
                    <span class="value">${formatDateTime(booking.event_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Venue:</span>
                    <span class="value">${escapeHtml(booking.venue)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Location:</span>
                    <span class="value">${escapeHtml(booking.city)}, ${escapeHtml(booking.country)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Tickets</h4>
                <table class="tickets-table">
                    <thead>
                        <tr>
                            <th>Ticket Type</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </thead>
                        <tbody>
                            ${booking.tickets && booking.tickets.length ? booking.tickets.map(t => `
                                <tr>
                                    <td>${escapeHtml(t.ticket_type)}</td>
                                    <td>${t.quantity}</td>
                                    <td>${formatCurrency(t.price)}</td>
                                    <td>${formatCurrency(t.price * t.quantity)}</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="4">No ticket details available</td></tr>
                            `}
                        </tbody>
                        <tfoot>
                            <tr><td colspan="3"><strong>Total</strong></td>
                            <td><strong>${formatCurrency(booking.total_amount)}</strong></td>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    
    // Store booking data for print
    window.currentBooking = booking;
    if (printBtn) printBtn.style.display = 'inline-flex';
    
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'flex';
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none';
    window.currentBooking = null;
}

// Print booking
function printBooking() {
    if (window.currentBooking) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking #${window.currentBooking.booking_id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .status { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
                    .status.confirmed { background: #d1fae5; color: #065f46; }
                    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .label { width: 150px; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background: #f5f5f5; }
                    .total { font-weight: 700; font-size: 1.1em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>EventHub Booking Confirmation</h1>
                    <p>Booking #${window.currentBooking.booking_id}</p>
                    <span class="status ${window.currentBooking.status}">${window.currentBooking.status}</span>
                </div>
                ${document.querySelector('.booking-detail-modal')?.innerHTML || ''}
                <p style="margin-top: 30px; text-align: center; color: #666;">Thank you for choosing EventHub!</p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    const confirmed = confirm('Are you sure you want to cancel this booking? Refunds may take 5-7 business days.');
    if (!confirmed) return;
    
    if (window.Loader) window.Loader.show('Cancelling booking...');
    
    try {
        await window.AttendeeAPIEndpoints.bookings.cancel(bookingId);
        showToast('Booking cancelled successfully', 'success');
        loadBookings();
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast(error.message || 'Failed to cancel booking', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

// View invoice
function viewInvoice(bookingId) {
    window.AttendeeAPIEndpoints.bookings.downloadInvoice(bookingId);
    showToast('Download started', 'success');
}

// View tickets
function viewTickets(bookingId) {
    window.location.href = `/attendee/tickets/?booking=${bookingId}`;
}

// Export bookings
function exportBookings() {
    showToast('Export feature coming soon', 'info');
}

// Render pagination
function renderPagination(current, total) {
    if (!paginationEl || total <= 1) {
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="ellipsis">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < total) {
        if (endPage < total - 1) html += `<span class="ellipsis">...</span>`;
        html += `<button onclick="changePage(${total})">${total}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    paginationEl.innerHTML = html;
}

// Change page
function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        filterAndDisplayBookings();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Helper functions
function getStatusIcon(status) {
    const icons = {
        'confirmed': 'fa-check-circle',
        'pending': 'fa-clock',
        'cancelled': 'fa-times-circle',
        'refunded': 'fa-undo-alt',
        'completed': 'fa-check-double'
    };
    return icons[status] || 'fa-question-circle';
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global for onclick handlers
window.switchTab = switchTab;
window.viewBookingDetail = viewBookingDetail;
window.closeBookingModal = closeBookingModal;
window.printBooking = printBooking;
window.cancelBooking = cancelBooking;
window.viewInvoice = viewInvoice;
window.viewTickets = viewTickets;
window.exportBookings = exportBookings;
window.resetFilters = resetFilters;
window.changePage = changePage;
window.loadBookings = loadBookings;