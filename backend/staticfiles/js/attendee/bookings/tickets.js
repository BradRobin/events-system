// ============================================
// TICKETS FUNCTIONALITY
// Handles: Ticket listing, detail view, actions
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initTicketActions();
    setupTicketFilters();
});

function initTicketActions() {
    // Download buttons
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const ticketId = this.dataset.ticketId;
            downloadTicket(ticketId);
        });
    });
    
    // Cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const bookingId = this.dataset.bookingId;
            cancelBooking(bookingId);
        });
    });
    
    // Share buttons
    document.querySelectorAll('.btn-share').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const ticketId = this.dataset.ticketId;
            shareTicket(ticketId);
        });
    });
    
    // Add to wallet buttons
    document.querySelectorAll('.btn-wallet').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const ticketId = this.dataset.ticketId;
            addToWallet(ticketId);
        });
    });
}

function setupTicketFilters() {
    const filterSelect = document.getElementById('ticketFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const filter = this.value;
            const tickets = document.querySelectorAll('.ticket-card');
            
            tickets.forEach(ticket => {
                const eventDate = new Date(ticket.dataset.eventDate);
                const now = new Date();
                
                switch(filter) {
                    case 'upcoming':
                        ticket.style.display = eventDate > now ? 'block' : 'none';
                        break;
                    case 'past':
                        ticket.style.display = eventDate < now ? 'block' : 'none';
                        break;
                    default:
                        ticket.style.display = 'block';
                }
            });
        });
    }
}

function filterTickets(status) {
    const tickets = document.querySelectorAll('.ticket-card');
    tickets.forEach(ticket => {
        if (status === 'all' || ticket.dataset.status === status) {
            ticket.style.display = 'block';
        } else {
            ticket.style.display = 'none';
        }
    });
    
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === status) {
            btn.classList.add('active');
        }
    });
}

function searchTickets() {
    const searchTerm = document.getElementById('searchTickets').value.toLowerCase();
    const tickets = document.querySelectorAll('.ticket-card');
    
    tickets.forEach(ticket => {
        const title = ticket.querySelector('.event-title')?.textContent.toLowerCase() || '';
        const venue = ticket.querySelector('.event-venue')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || venue.includes(searchTerm)) {
            ticket.style.display = 'block';
        } else {
            ticket.style.display = 'none';
        }
    });
}

function toggleTicketDetails(ticketId) {
    const details = document.getElementById(`ticket-details-${ticketId}`);
    if (details) {
        details.classList.toggle('hidden');
    }
}

function getEventCountdown(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const diff = event - now;
    
    if (diff <= 0) return 'Event has started';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
}

// Update countdown timers
function updateCountdowns() {
    document.querySelectorAll('.countdown').forEach(el => {
        const eventDate = el.dataset.eventDate;
        if (eventDate) {
            el.textContent = getEventCountdown(eventDate);
        }
    });
}

setInterval(updateCountdowns, 60000);
updateCountdowns();
