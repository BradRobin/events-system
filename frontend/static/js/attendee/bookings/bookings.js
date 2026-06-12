// ============================================
// BOOKINGS MODULE - Real Data from Payment
// ============================================

let allBookings = [];
let currentTab = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let currentSearch = '';

document.addEventListener('DOMContentLoaded', function() {
    loadBookingsFromAPI();
    setupEventListeners();
    setupReviewModalHandlers();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchBookings');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentSearch = e.target.value.toLowerCase();
            currentPage = 1;
            renderBookings();
        });
    }
}

async function loadBookingsFromAPI() {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        allBookings = [];
        renderBookings();
        updateBookingCount();
        return;
    }
    try {
        const headers = { Authorization: `Bearer ${token}` };
        const [upRes, pastRes] = await Promise.all([
            fetch('/api/attendee/tickets/upcoming/', { headers, credentials: 'same-origin' }),
            fetch('/api/attendee/tickets/past/', { headers, credentials: 'same-origin' }),
        ]);
        if (!upRes.ok || !pastRes.ok) {
            throw new Error('Failed to load bookings');
        }
        const up = await upRes.json();
        const past = await pastRes.json();
        const tickets = [...(up.results || []), ...(past.results || [])];
        allBookings = tickets.map(t => ({
            id: t.ticket_number,
            booking_date: t.purchase_date,
            status: 'confirmed',
            total_amount: parseFloat(t.price) * (t.quantity || 1),
            receipt_number: t.ticket_number,
            items: [{
                title: t.event?.title || 'Event',
                category: t.ticket_type || 'Regular',
                date: t.event?.start_date,
                location: t.event?.venue_name || t.event?.location || '',
                price: parseFloat(t.price),
                quantity: t.quantity || 1,
                image: t.event?.banner_image,
                ticket_type: t.ticket_type,
            }],
        }));
        renderBookings();
        updateBookingCount();
    } catch (error) {
        console.error('Error loading bookings:', error);
        allBookings = [];
        renderBookings();
    }
}

function updateBookingCount() {
    const countElement = document.getElementById('bookingCount');
    if (countElement) {
        countElement.textContent = allBookings.length;
    }
}

function getFilteredBookings() {
    let filtered = [...allBookings];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentTab === 'upcoming') {
        filtered = filtered.filter(booking => {
            const eventDates = booking.items.map(item => new Date(item.date));
            return eventDates.some(date => date >= today);
        });
    } else if (currentTab === 'past') {
        filtered = filtered.filter(booking => {
            const eventDates = booking.items.map(item => new Date(item.date));
            return eventDates.every(date => date < today);
        });
    }
    
    if (currentSearch) {
        filtered = filtered.filter(booking => 
            booking.id.toLowerCase().includes(currentSearch) ||
            booking.receipt_number?.toLowerCase().includes(currentSearch) ||
            booking.items.some(item => item.title.toLowerCase().includes(currentSearch))
        );
    }
    
    filtered.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
    return filtered;
}

function renderBookings() {
    const container = document.getElementById('bookingsList');
    if (!container) return;
    
    const filtered = getFilteredBookings();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedBookings = filtered.slice(start, start + itemsPerPage);
    
    if (paginatedBookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No bookings found</h3>
                <p>You haven't made any bookings yet.</p>
                <a href="/events/" class="btn-primary">Browse Events</a>
            </div>
        `;
        const paginationEl = document.getElementById('pagination');
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }
    
    container.innerHTML = paginatedBookings.map(booking => `
        <div class="booking-card" onclick="viewBookingDetail('${booking.id}')">
            <div class="booking-header">
                <div>
                    <span class="booking-id">#${booking.id.substring(0, 8)}...</span>
                    <span class="booking-status status-confirmed">
                        <i class="fas fa-check-circle"></i> ${booking.status || 'Confirmed'}
                    </span>
                </div>
                <div class="booking-date">${formatDate(booking.booking_date)}</div>
            </div>
            <div class="booking-items">
                ${booking.items.slice(0, 2).map(item => `
                    <div class="booking-item">
                        <div class="booking-item-image" style="background-image: url('${item.image || '/static/images/placeholder.jpg'}')"></div>
                        <div class="booking-item-details">
                            <div class="booking-item-title">${escapeHtml(item.title)}</div>
                            <div class="booking-item-meta">
                                <i class="fas fa-calendar"></i> ${formatDate(item.date)} &nbsp;|&nbsp;
                                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location.split(',')[0])} &nbsp;|&nbsp;
                                <i class="fas fa-ticket-alt"></i> ${item.quantity} ticket(s)
                            </div>
                        </div>
                        <div class="booking-item-price">${formatCurrency(item.price * item.quantity)}</div>
                    </div>
                `).join('')}
                ${booking.items.length > 2 ? `<div class="booking-more">+${booking.items.length - 2} more event(s)</div>` : ''}
            </div>
            <div class="booking-footer">
                <div class="booking-total">
                    <span>Total Paid:</span>
                    <strong>${formatCurrency(booking.total_amount)}</strong>
                </div>
                <div class="booking-actions">
                    <button class="view-details-btn" onclick="event.stopPropagation(); viewBookingDetail('${booking.id}')">
                        <i class="fas fa-receipt"></i> Details
                    </button>
                    <button class="view-tickets-btn" onclick="event.stopPropagation(); viewTicketsForBooking('${booking.id}')">
                        <i class="fas fa-ticket-alt"></i> Tickets
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderBookings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });
    
    renderBookings();
}

function viewBookingDetail(bookingId) {
    window.location.href = `/bookings/detail/?id=${bookingId}`;
}

function viewTicketsForBooking(bookingId) {
    // Redirect to tickets page with booking ID as query parameter
    window.location.href = `/tickets/?booking_id=${bookingId}`;
}

function loadBookingDetail() {
    const container = document.getElementById('bookingDetailContent');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    if (!bookingId) {
        container.innerHTML = '<div class="error-state">Booking not found</div>';
        return;
    }
    
    let booking = allBookings.find(b => b.id === bookingId);
    
    if (!booking) {
        const savedBookings = localStorage.getItem('eventhub_bookings');
        if (savedBookings) {
            allBookings = JSON.parse(savedBookings);
            booking = allBookings.find(b => b.id === bookingId);
        }
    }
    
    if (!booking) {
        container.innerHTML = '<div class="error-state">Booking not found</div>';
        return;
    }
    
    renderBookingDetail(booking);
}

function renderBookingDetail(booking) {
    const container = document.getElementById('bookingDetailContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="booking-detail-card">
            <div class="booking-detail-header">
                <h2>Booking #${booking.id}</h2>
                <span class="booking-status status-confirmed">${booking.status || 'Confirmed'}</span>
            </div>
            
            <div class="info-section">
                <h3>Booking Information</h3>
                <div class="info-row">
                    <div class="info-label">Booking Date:</div>
                    <div class="info-value">${new Date(booking.booking_date).toLocaleString()}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Payment Method:</div>
                    <div class="info-value">${booking.payment_method || 'M-Pesa'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Receipt Number:</div>
                    <div class="info-value">${booking.receipt_number || 'N/A'}</div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>Billing Information</h3>
                <div class="info-row">
                    <div class="info-label">Full Name:</div>
                    <div class="info-value">${escapeHtml(booking.billing_info?.name || 'N/A')}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${escapeHtml(booking.billing_info?.email || 'N/A')}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${escapeHtml(booking.billing_info?.phone || 'N/A')}</div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>Tickets</h3>
                ${booking.items.map((item, index) => `
                    <div class="ticket-item" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9;">
                        <div class="ticket-item-header">
                            <div class="ticket-item-title" style="font-weight: 700; font-size: 1rem; color: #1e293b;">${escapeHtml(item.title)}</div>
                            <div class="ticket-item-price" style="font-weight: 700; color: #f59e0b;">${formatCurrency(item.price * item.quantity)}</div>
                        </div>
                        <div class="ticket-details" style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.25rem;">
                            <div><i class="fas fa-calendar" style="color: #f59e0b; margin-right: 6px;"></i> ${formatDate(item.date)}</div>
                            <div><i class="fas fa-map-marker-alt" style="color: #f59e0b; margin-right: 6px;"></i> ${escapeHtml(item.location)}</div>
                            <div><i class="fas fa-ticket-alt" style="color: #f59e0b; margin-right: 6px;"></i> ${item.quantity} ticket(s) at ${formatCurrency(item.price)} each</div>
                        </div>
                        <div class="item-rating-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Rate this Event:</span>
                            <div class="rating-select" data-event-id="${item.id}" style="display: flex; gap: 6px; font-size: 1.25rem; cursor: pointer; color: #cbd5e1;">
                                <i class="fas fa-star" data-rating="1" style="transition: color 0.2s ease;"></i>
                                <i class="fas fa-star" data-rating="2" style="transition: color 0.2s ease;"></i>
                                <i class="fas fa-star" data-rating="3" style="transition: color 0.2s ease;"></i>
                                <i class="fas fa-star" data-rating="4" style="transition: color 0.2s ease;"></i>
                                <i class="fas fa-star" data-rating="5" style="transition: color 0.2s ease;"></i>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="booking-total-section">
                <div class="breakdown">
                    <div>Subtotal: ${formatCurrency(booking.subtotal)}</div>
                    ${booking.discount ? `<div>Discount: -${formatCurrency(booking.discount)}</div>` : ''}
                </div>
                <div class="total-amount">Total Paid: ${formatCurrency(booking.total_amount)}</div>
            </div>
            
            <div class="detail-actions">
                <button class="btn-primary" onclick="viewTicketsForBooking('${booking.id}')">
                    <i class="fas fa-ticket-alt"></i> View Tickets
                </button>
                <button class="btn-back" onclick="window.location.href='/bookings/'">
                    <i class="fas fa-arrow-left"></i> Back to Bookings
                </button>
            </div>
        </div>
    `;
    
    // Initialize stars rating systems
    setTimeout(initBookingRatingSystems, 50);
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `custom-toast`;
    
    let iconClass = 'fa-check-circle';
    let iconColor = '#10b981';
    let borderColor = '#10b981';
    if (type === 'error') {
        iconClass = 'fa-exclamation-circle';
        iconColor = '#ef4444';
        borderColor = '#ef4444';
    } else if (type === 'info') {
        iconClass = 'fa-info-circle';
        iconColor = '#3b82f6';
        borderColor = '#3b82f6';
    }
    
    toast.style.borderLeft = `4px solid ${borderColor}`;
    toast.innerHTML = `<i class="fas ${iconClass}" style="color: ${iconColor};"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initBookingRatingSystems() {
    const ratingContainers = document.querySelectorAll('.rating-select');
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const userName = user.name || 'Guest User';
    
    ratingContainers.forEach(container => {
        const eventId = container.getAttribute('data-event-id');
        const stars = container.querySelectorAll('i');
        
        let userRating = 0;
        try {
            const reviews = JSON.parse(localStorage.getItem(`reviews_${eventId}`) || '[]');
            const userReview = reviews.find(r => r.userName === userName);
            if (userReview) {
                userRating = userReview.rating;
            }
        } catch (e) {
            console.error('Error reading user rating:', e);
        }
        
        const highlightStars = (rating) => {
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.style.color = '#f59e0b';
                } else {
                    s.style.color = '#cbd5e1';
                }
            });
        };
        
        highlightStars(userRating);
        
        stars.forEach(star => {
            star.onmouseenter = function() {
                const hoverRating = parseInt(this.dataset.rating);
                highlightStars(hoverRating);
            };
            
            star.onclick = function(e) {
                e.stopPropagation();
                
                const token = localStorage.getItem('attendee_access_token');
                if (!token) {
                    showToast('Please login to write a review', 'info');
                    setTimeout(() => window.location.href = '/login/', 1500);
                    return;
                }
                
                const rating = parseInt(this.dataset.rating);
                openReviewModal(eventId, rating);
            };
        });
        
        container.onmouseleave = function() {
            highlightStars(userRating);
        };
    });
}

function openReviewModal(eventId, initialRating) {
    const modal = document.getElementById('reviewModal');
    const eventIdInput = document.getElementById('reviewEventId');
    const ratingInput = document.getElementById('reviewRating');
    
    if (!modal) return;
    
    if (eventIdInput) eventIdInput.value = eventId;
    if (ratingInput) ratingInput.value = initialRating;
    
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const userName = user.name || 'Guest User';
    
    let existingTitle = '';
    let existingContent = '';
    
    try {
        const reviews = JSON.parse(localStorage.getItem(`reviews_${eventId}`) || '[]');
        const userReview = reviews.find(r => r.userName === userName);
        if (userReview) {
            existingTitle = userReview.title || '';
            existingContent = userReview.content || '';
        }
    } catch (e) {
        console.error('Error fetching existing review details:', e);
    }
    
    const titleInput = document.getElementById('reviewTitle');
    const contentTextarea = document.getElementById('reviewText');
    if (titleInput) titleInput.value = existingTitle;
    if (contentTextarea) contentTextarea.value = existingContent;
    
    setupModalStars(initialRating);
    
    modal.style.display = 'flex';
}

function setupModalStars(initialRating) {
    const modalStars = document.querySelectorAll('.rating-select-modal i');
    const ratingInput = document.getElementById('reviewRating');
    
    const highlightModalStars = (r) => {
        modalStars.forEach((s, idx) => {
            if (idx < r) {
                s.style.color = '#f59e0b';
            } else {
                s.style.color = '#cbd5e1';
            }
        });
    };
    
    highlightModalStars(initialRating);
    
    modalStars.forEach(star => {
        star.onclick = function() {
            const r = parseInt(this.dataset.rating);
            if (ratingInput) ratingInput.value = r;
            highlightModalStars(r);
        };
        
        star.onmouseenter = function() {
            const r = parseInt(this.dataset.rating);
            highlightModalStars(r);
        };
    });
    
    const modalContainer = document.querySelector('.rating-select-modal');
    if (modalContainer) {
        modalContainer.onmouseleave = function() {
            const r = parseInt(ratingInput?.value || 5);
            highlightModalStars(r);
        };
    }
}

function setupReviewModalHandlers() {
    const closeBtn = document.getElementById('closeReviewModal');
    const modal = document.getElementById('reviewModal');
    if (closeBtn && modal) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.onsubmit = function(e) {
            e.preventDefault();
            submitBookingReview();
        };
    }
}

function submitBookingReview() {
    const eventId = document.getElementById('reviewEventId')?.value;
    const rating = parseInt(document.getElementById('reviewRating')?.value || 0);
    const title = document.getElementById('reviewTitle')?.value.trim();
    const content = document.getElementById('reviewText')?.value.trim();
    
    if (!eventId) {
        showToast('Invalid event ID', 'error');
        return;
    }
    if (!title) {
        showToast('Please enter a review title', 'error');
        return;
    }
    if (!content) {
        showToast('Please enter your review', 'error');
        return;
    }
    if (rating === 0) {
        showToast('Please select a rating', 'error');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    const userName = user.name || 'Guest User';
    const userInitial = userName.charAt(0).toUpperCase();
    
    const newReview = {
        id: Date.now(),
        userName: userName,
        userInitial: userInitial,
        rating: rating,
        title: title,
        content: content,
        created_at: new Date().toISOString()
    };
    
    try {
        let reviews = JSON.parse(localStorage.getItem(`reviews_${eventId}`) || '[]');
        
        reviews = reviews.filter(r => r.userName !== userName);
        reviews.push(newReview);
        
        localStorage.setItem(`reviews_${eventId}`, JSON.stringify(reviews));
        showToast('Thank you for your review!', 'success');
        
        const modal = document.getElementById('reviewModal');
        if (modal) modal.style.display = 'none';
        
        initBookingRatingSystems();
    } catch (e) {
        console.error('Error saving review:', e);
        showToast('Failed to save review. Please try again.', 'error');
    }
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return 'TBA';
    }
}

function formatCurrency(amount) {
    try {
        const val = Number(amount);
        if (isNaN(val)) return 'KES 0';
        return `KES ${val.toLocaleString('en-KE')}`;
    } catch (e) {
        return 'KES 0';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportBookings() {
    const filtered = getFilteredBookings();
    if (filtered.length === 0) {
        alert('No bookings to export');
        return;
    }
    
    let csv = 'Booking ID,Date,Receipt Number,Event,Quantity,Amount\n';
    filtered.forEach(booking => {
        booking.items.forEach(item => {
            csv += `${booking.id},${new Date(booking.booking_date).toLocaleDateString()},${booking.receipt_number},${item.title},${item.quantity},${item.price * item.quantity}\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

window.switchTab = switchTab;
window.goToPage = goToPage;
window.viewBookingDetail = viewBookingDetail;
window.viewTicketsForBooking = viewTicketsForBooking;
window.exportBookings = exportBookings;
window.loadBookingDetail = loadBookingDetail;
