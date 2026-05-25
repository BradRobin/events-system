// ============================================
// ATTENDEE TICKETS - Complete Functionality
// ============================================

let currentTab = 'upcoming';
let currentSearch = '';
let allTickets = [];

// DOM Elements
const ticketsList = document.getElementById('ticketsList');
const searchInput = document.getElementById('searchTickets');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    setupEventListeners();
    
    // Check if on QR page
    if (window.location.pathname.includes('/qr/')) {
        loadQRCode();
    }
    
    // Check if on detail page
    if (window.location.pathname.includes('/detail/')) {
        loadTicketDetail();
    }
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value;
            filterAndDisplayTickets();
        }, 500));
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update active tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    
    filterAndDisplayTickets();
}

async function loadTickets() {
    if (ticketsList) {
        ticketsList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading tickets...</p>
            </div>
        `;
    }
    
    try {
        let result;
        
        if (currentTab === 'upcoming') {
            result = await window.AttendeeAPIEndpoints.tickets.getUpcoming();
        } else {
            result = await window.AttendeeAPIEndpoints.tickets.getPast();
        }
        
        allTickets = result.results || result;
        filterAndDisplayTickets();
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        if (ticketsList) {
            ticketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Tickets</h3>
                    <p>Please try again later.</p>
                    <button class="btn-primary" onclick="loadTickets()">Retry</button>
                </div>
            `;
        }
    }
}

function filterAndDisplayTickets() {
    if (!ticketsList) return;
    
    let filtered = [...allTickets];
    
    // Filter by search
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(ticket => 
            (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(searchLower)) ||
            (ticket.event?.title && ticket.event.title.toLowerCase().includes(searchLower))
        );
    }
    
    displayTickets(filtered);
}

function displayTickets(tickets) {
    if (!ticketsList) return;
    
    if (!tickets || tickets.length === 0) {
        ticketsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h3>No ${currentTab} Tickets</h3>
                <p>You don't have any ${currentTab} tickets at the moment.</p>
                ${currentTab === 'upcoming' ? '<a href="/attendee/events/" class="btn-primary">Browse Events</a>' : ''}
            </div>
        `;
        return;
    }
    
    ticketsList.innerHTML = tickets.map(ticket => `
        <div class="ticket-card" onclick="viewTicketDetail('${ticket.ticket_number}')">
            <div class="ticket-header">
                <div class="event-info">
                    <h3>${escapeHtml(ticket.event?.title || 'Event')}</h3>
                    <div class="event-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(ticket.event?.start_date)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ticket.event?.venue_name || 'TBD')}</span>
                    </div>
                </div>
                <div class="ticket-status ${ticket.status}">
                    <i class="fas ${getStatusIcon(ticket.status)}"></i> ${getStatusText(ticket.status)}
                </div>
            </div>
            <div class="ticket-body">
                <div class="ticket-details">
                    <div class="detail">
                        <span class="label">Ticket Number</span>
                        <span class="value">${escapeHtml(ticket.ticket_number)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Ticket Type</span>
                        <span class="value">${escapeHtml(ticket.ticket_type || 'Standard')}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Quantity</span>
                        <span class="value">${ticket.quantity || 1}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Price</span>
                        <span class="value">${formatCurrency(ticket.price)}</span>
                    </div>
                </div>
            </div>
            <div class="ticket-footer">
                <button class="btn-outline" onclick="event.stopPropagation(); viewQRCode('${ticket.ticket_number}')">
                    <i class="fas fa-qrcode"></i> Show QR Code
                </button>
                <button class="btn-outline" onclick="event.stopPropagation(); downloadTicket('${ticket.ticket_number}')">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                ${ticket.status === 'valid' && currentTab === 'upcoming' ? `
                    <button class="btn-danger" onclick="event.stopPropagation(); requestRefund('${ticket.ticket_number}')">
                        <i class="fas fa-undo-alt"></i> Request Refund
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function viewTicketDetail(ticketNumber) {
    window.location.href = `/attendee/tickets/detail/?ticket=${ticketNumber}`;
}

async function loadTicketDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketNumber = urlParams.get('ticket');
    
    if (!ticketNumber) {
        window.location.href = '/attendee/tickets/';
        return;
    }
    
    const container = document.getElementById('ticketDetailContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading ticket details...</p>
        </div>
    `;
    
    try {
        const ticket = await window.AttendeeAPIEndpoints.tickets.getDetail(ticketNumber);
        displayTicketDetail(ticket);
    } catch (error) {
        console.error('Error loading ticket detail:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to Load Ticket</h3>
                <p>Please try again later.</p>
                <button class="btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

function displayTicketDetail(ticket) {
    const container = document.getElementById('ticketDetailContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="ticket-detail-card">
            <div class="card-header">
                <h3><i class="fas fa-ticket-alt"></i> Ticket Information</h3>
            </div>
            <div class="card-body">
                <div class="detail-row">
                    <span class="detail-label">Ticket Number</span>
                    <span class="detail-value"><code>${escapeHtml(ticket.ticket_number)}</code></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Name</span>
                    <span class="detail-value">${escapeHtml(ticket.event?.title)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Date</span>
                    <span class="detail-value">${formatDateTime(ticket.event?.start_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value">${escapeHtml(ticket.event?.venue_name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ticket Type</span>
                    <span class="detail-value">${escapeHtml(ticket.ticket_type || 'Standard')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quantity</span>
                    <span class="detail-value">${ticket.quantity || 1}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Price</span>
                    <span class="detail-value amount">${formatCurrency(ticket.price)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${getStatusBadge(ticket.status)}</span>
                </div>
                ${ticket.checked_in_at ? `
                <div class="detail-row">
                    <span class="detail-label">Checked In</span>
                    <span class="detail-value">${formatDateTime(ticket.checked_in_at)}</span>
                </div>
                ` : ''}
                
                <div class="ticket-actions">
                    <button class="btn-outline" onclick="viewQRCode('${ticket.ticket_number}')">
                        <i class="fas fa-qrcode"></i> Show QR Code
                    </button>
                    <button class="btn-outline" onclick="downloadTicket('${ticket.ticket_number}')">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                    ${ticket.status === 'valid' ? `
                        <button class="btn-danger" onclick="requestRefund('${ticket.ticket_number}')">
                            <i class="fas fa-undo-alt"></i> Request Refund
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

async function loadQRCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketNumber = urlParams.get('ticket');
    
    if (!ticketNumber) {
        window.location.href = '/attendee/tickets/';
        return;
    }
    
    const qrWrapper = document.getElementById('qrCodeDisplay');
    const ticketInfo = document.getElementById('ticketInfo');
    
    try {
        const qrData = await window.AttendeeAPIEndpoints.tickets.getQRCode(ticketNumber);
        const ticket = await window.AttendeeAPIEndpoints.tickets.getDetail(ticketNumber);
        
        if (qrWrapper) {
            qrWrapper.innerHTML = `<img src="${qrData.qr_code_url}" alt="QR Code">`;
        }
        
        if (ticketInfo) {
            ticketInfo.innerHTML = `
                <div class="info-row">
                    <span class="info-label">Event</span>
                    <span class="info-value">${escapeHtml(ticket.event?.title)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date</span>
                    <span class="info-value">${formatDate(ticket.event?.start_date)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Venue</span>
                    <span class="info-value">${escapeHtml(ticket.event?.venue_name)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ticket Number</span>
                    <span class="info-value"><code>${escapeHtml(ticket.ticket_number)}</code></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Attendee</span>
                    <span class="info-value">${escapeHtml(ticket.attendee_name || 'You')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ticket Type</span>
                    <span class="info-value">${escapeHtml(ticket.ticket_type || 'Standard')}</span>
                </div>
            `;
        }
        
        // Setup download button
        const downloadBtn = document.getElementById('downloadTicketBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => downloadTicket(ticketNumber));
        }
        
    } catch (error) {
        console.error('Error loading QR code:', error);
        if (qrWrapper) {
            qrWrapper.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load QR Code</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }
}

function viewQRCode(ticketNumber) {
    window.open(`/attendee/tickets/qr/?ticket=${ticketNumber}`, '_blank');
}

function downloadTicket(ticketNumber) {
    window.AttendeeAPIEndpoints.tickets.download(ticketNumber);
    showToast('Download started', 'success');
}

async function requestRefund(ticketNumber) {
    const reason = prompt('Please explain why you need a refund:');
    if (!reason) return;
    
    if (window.Loader) window.Loader.show('Submitting refund request...');
    
    try {
        await window.AttendeeAPIEndpoints.tickets.requestRefund(ticketNumber, reason);
        showToast('Refund request submitted successfully', 'success');
        loadTickets();
    } catch (error) {
        console.error('Error requesting refund:', error);
        showToast(error.message || 'Failed to submit refund request', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

// Helper functions
function getStatusIcon(status) {
    const icons = {
        'valid': 'fa-check-circle',
        'checked_in': 'fa-check-double',
        'expired': 'fa-clock',
        'refunded': 'fa-undo-alt'
    };
    return icons[status] || 'fa-question-circle';
}

function getStatusText(status) {
    const texts = {
        'valid': 'Valid',
        'checked_in': 'Checked In',
        'expired': 'Expired',
        'refunded': 'Refunded'
    };
    return texts[status] || status;
}

function getStatusBadge(status) {
    const badges = {
        'valid': '<span class="status-badge status-valid">Valid</span>',
        'checked_in': '<span class="status-badge status-checked-in">Checked In</span>',
        'expired': '<span class="status-badge status-expired">Expired</span>',
        'refunded': '<span class="status-badge status-refunded">Refunded</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global
window.switchTab = switchTab;
window.viewTicketDetail = viewTicketDetail;
window.viewQRCode = viewQRCode;
window.downloadTicket = downloadTicket;
window.requestRefund = requestRefund;