// ============================================
// TICKETS MODULE - Loads from API and localStorage
// Displays one card per event with quantity badge
// ============================================

let allTickets = [];
let currentTab = 'upcoming';
let currentSearch = '';
let currentBookingId = null;
let userReviewsByEvent = {};
let reviewModalState = { eventId: null, reviewId: null, rating: 0 };

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentBookingId = urlParams.get('booking_id');
    applyInitialTabFromUrl(urlParams.get('tab'));

    setupEventListeners();
    setupReviewModal();

    await loadTickets();

    const path = window.location.pathname;
    if (path.includes('/detail/')) {
        await loadTicketDetail();
    } else if (path.includes('/qr/')) {
        await loadQRCode();
    }
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchTickets');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentSearch = e.target.value.toLowerCase();
            renderTickets();
        });
    }

    const ticketsList = document.getElementById('ticketsList');
    if (ticketsList && !ticketsList.dataset.reviewDelegationBound) {
        ticketsList.dataset.reviewDelegationBound = '1';
        ticketsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.past-event-review-btn, .past-event-review-edit');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const eventId = parseInt(btn.dataset.eventId, 10);
            if (!eventId || Number.isNaN(eventId)) {
                showReviewToast('Could not open review for this event.', 'error');
                return;
            }
            const ticket = allTickets.find(t => Number(t.event_id) === eventId);
            const reviewId = btn.dataset.reviewId ? parseInt(btn.dataset.reviewId, 10) : null;
            openReviewModal(eventId, ticket?.title || 'Event', reviewId);
        });
    }
}

function mapApiTicket(t) {
    let eventTitle = '';
    let eventDate = '';
    let eventLocation = '';
    let eventImage = '';
    let ticketQuantity = 1;
    let ticketPrice = 0;
    
    if (t.event) {
        eventTitle = t.event.title || 'Event';
        eventDate = t.event.start_date;
        eventLocation = t.event.venue_name || t.event.location || '';
        eventImage = t.event.banner_image;
        ticketPrice = t.price || 0;
        ticketQuantity = t.quantity || 1;
    } else {
        eventTitle = t.title || 'Event';
        eventDate = t.date;
        eventLocation = t.location || '';
        eventImage = t.image;
        ticketPrice = t.price || 0;
        ticketQuantity = t.quantity || 1;
    }
    
    return {
        id: t.ticket_number || t.id,
        booking_id: t.booking_id || t.ticket_number,
        event_id: t.event?.id || t.event_id,
        end_date: t.event?.end_date || t.end_date,
        title: eventTitle,
        category: t.category || 'Event',
        date: eventDate,
        location: eventLocation,
        price: ticketPrice,
        image: eventImage,
        ticket_code: t.ticket_number,
        ticket_type: t.ticket_type || 'Regular',
        status: t.status || 'active',
        purchased_date: t.purchase_date,
        quantity: ticketQuantity
    };
}

function applyInitialTabFromUrl(tab) {
    if (tab !== 'past' && tab !== 'upcoming') return;
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
}

async function loadUserReviews() {
    userReviewsByEvent = {};
    const token = localStorage.getItem('attendee_access_token');
    if (!token) return;

    try {
        const res = await fetch('/api/attendee/reviews/', {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json();
        (data.results || []).forEach(review => {
            userReviewsByEvent[review.event_id] = review;
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function renderStarsHtml(rating, interactive = false) {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
        const filled = i <= rating;
        const icon = filled ? 'fas' : 'far';
        if (interactive) {
            stars.push(`<button type="button" class="event-review-star is-active" data-rating="${i}" aria-label="${i} star${i > 1 ? 's' : ''}"><i class="${icon} fa-star"></i></button>`);
        } else {
            stars.push(`<span class="event-review-star-display" aria-hidden="true"><i class="${icon} fa-star"></i></span>`);
        }
    }
    return stars.join('');
}

function renderPastEventReviewPanel(ticket) {
    const review = userReviewsByEvent[ticket.event_id];
    if (review) {
        const commentHtml = review.comment
            ? `<p class="past-event-review-comment">${escapeHtml(review.comment)}</p>`
            : '';
        return `
            <div class="past-event-review past-event-review--submitted">
                <div class="past-event-review-header">
                    <span class="past-event-review-label"><i class="fas fa-star"></i> Your review</span>
                    <button type="button" class="past-event-review-edit" data-event-id="${ticket.event_id}" data-review-id="${review.id}">
                        Edit
                    </button>
                </div>
                <div class="past-event-review-stars">${renderStarsHtml(review.rating)}</div>
                ${commentHtml}
            </div>
        `;
    }

    return `
        <div class="past-event-review">
            <p class="past-event-review-prompt">How was this event?</p>
            <button type="button" class="past-event-review-btn" data-event-id="${ticket.event_id}">
                <i class="fas fa-star"></i> Rate &amp; review
            </button>
        </div>
    `;
}

function tierBadgeClass(tier) {
    if (tier === 'VIP') return 'ticket-tier-vip';
    if (tier === 'VVIP') return 'ticket-tier-vvip';
    return 'ticket-tier-regular';
}

function statusLabel(status) {
    const map = {
        valid: 'Active',
        checked_in: 'Used',
        cancelled: 'Cancelled',
        active: 'Active',
        used: 'Used',
        past: 'Past'
    };
    return map[status] || 'Active';
}

function statusClass(status) {
    if (status === 'checked_in' || status === 'used' || status === 'past') return 'status-used';
    if (status === 'cancelled' || status === 'expired') return 'status-cancelled';
    return 'status-active';
}

function buildQrUrl(ticketCode) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(ticketCode)}&bgcolor=ffffff&color=1a1a2e&margin=8`;
}

function getTicketImageUrl(image) {
    if (!image) return '/static/images/placeholder.jpg';
    return String(image).replace(/'/g, '%27');
}

function renderFlipTicketCard(ticket, index) {
    const imageUrl = getTicketImageUrl(ticket.image);
    const qrUrl = buildQrUrl(ticket.ticket_code);
    const amountPaid = Number(ticket.price) * (ticket.quantity || 1);
    const venue = escapeHtml((ticket.location || 'Venue TBA').split(',')[0]);
    const status = statusLabel(ticket.status);
    const statusCls = statusClass(ticket.status);
    const quantity = ticket.quantity || 1;
    const quantityBadge = quantity > 1 ? `<span class="ticket-quantity-badge">x${quantity}</span>` : '';
    const animationDelay = Math.min(index * 0.06, 0.4);

    return `
        <div class="flip-ticket-wrapper" style="animation-delay: ${animationDelay}s">
            <button type="button" class="flip-ticket" aria-label="Flip ticket for ${escapeHtml(ticket.title)}" data-ticket-code="${escapeHtml(ticket.ticket_code)}">
                <div class="flip-ticket-inner">
                    <div class="flip-ticket-face flip-ticket-front">
                        <div class="flip-ticket-zone-top">
                            <div class="flip-ticket-media" style="background-image: url('${imageUrl}')"></div>
                            <span class="flip-ticket-status ${statusCls}">${status}</span>
                            ${quantityBadge}
                        </div>
                        <div class="flip-ticket-zone-bottom">
                            <h3 class="flip-ticket-event-title">${escapeHtml(ticket.title)}</h3>
                            <div class="flip-ticket-meta-grid">
                                <div class="flip-ticket-meta-item">
                                    <i class="fas fa-ticket-alt"></i>
                                    <span class="checkout-tier-badge ${tierBadgeClass(ticket.ticket_type)}">${escapeHtml(ticket.ticket_type || 'Regular')}</span>
                                </div>
                                <div class="flip-ticket-meta-item">
                                    <i class="fas fa-clock"></i>
                                    <span>${formatTime(ticket.date)}</span>
                                </div>
                                <div class="flip-ticket-meta-item span-2">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${venue}</span>
                                </div>
                                <div class="flip-ticket-meta-item span-2">
                                    <i class="fas fa-calendar"></i>
                                    <span>${formatDate(ticket.date)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flip-ticket-face flip-ticket-back">
                        <div class="flip-ticket-zone-top flip-ticket-qr-zone">
                            <div class="flip-ticket-qr-frame">
                                <img src="${qrUrl}" alt="QR code for ticket ${escapeHtml(ticket.ticket_code)}" loading="lazy">
                            </div>
                            <p class="flip-ticket-qr-hint">Scan at venue entrance</p>
                        </div>
                        <div class="flip-ticket-zone-bottom">
                            <div class="flip-ticket-back-row">
                                <span class="flip-ticket-back-label">Ticket code</span>
                                <span class="flip-ticket-back-value mono">${escapeHtml(ticket.ticket_code)}</span>
                            </div>
                            <div class="flip-ticket-back-row">
                                <span class="flip-ticket-back-label">Purchased</span>
                                <span class="flip-ticket-back-value">${formatDateTime(ticket.purchased_date)}</span>
                            </div>
                            <div class="flip-ticket-back-row">
                                <span class="flip-ticket-back-label">Amount paid</span>
                                <span class="flip-ticket-back-value price">${formatCurrency(amountPaid)}</span>
                            </div>
                            ${quantity > 1 ? `
                            <div class="flip-ticket-back-row">
                                <span class="flip-ticket-back-label">Tickets</span>
                                <span class="flip-ticket-back-value">${quantity} tickets</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </button>
            <span class="flip-ticket-flip-hint"><i class="fas fa-sync-alt"></i> Tap to flip</span>
        </div>
    `;
}

function setupFlipTickets() {
    document.querySelectorAll('.flip-ticket').forEach(card => {
        if (card.dataset.flipBound) return;
        card.dataset.flipBound = '1';
        card.addEventListener('click', () => {
            card.classList.toggle('is-flipped');
            const hint = card.parentElement?.querySelector('.flip-ticket-flip-hint');
            if (hint) {
                hint.innerHTML = card.classList.contains('is-flipped')
                    ? '<i class="fas fa-sync-alt"></i> Tap to view event'
                    : '<i class="fas fa-sync-alt"></i> Tap to flip';
            }
        });
    });
}

async function loadTickets() {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        allTickets = [];
        renderTickets();
        return;
    }
    try {
        const headers = { Authorization: `Bearer ${token}` };
        await loadUserReviews();
        const [upRes, pastRes] = await Promise.all([
            fetch('/api/attendee/tickets/upcoming/', { headers, credentials: 'same-origin' }),
            fetch('/api/attendee/tickets/past/', { headers, credentials: 'same-origin' }),
        ]);
        const up = await upRes.json();
        const past = await pastRes.json();
        
        let allMapped = [...(up.results || []), ...(past.results || [])].map(mapApiTicket);
        
        const groupedTickets = {};
        for (const ticket of allMapped) {
            if (groupedTickets[ticket.event_id]) {
                groupedTickets[ticket.event_id].quantity += ticket.quantity;
                groupedTickets[ticket.event_id].ticket_code = ticket.ticket_code;
            } else {
                groupedTickets[ticket.event_id] = { ...ticket };
            }
        }
        
        allTickets = Object.values(groupedTickets);
        
        if (currentBookingId) {
            allTickets = allTickets.filter(t => t.booking_id === currentBookingId);
        }
        renderTickets();
        updateHeaderInfo();
    } catch (error) {
        console.error('Error loading tickets:', error);
        const container = document.getElementById('ticketsList');
        if (container) {
            container.innerHTML = '<div class="error-state">Failed to load tickets. Please log in and try again.</div>';
        }
    }
}

function updateHeaderInfo() {
    const headerSubtitle = document.querySelector('.page-header .text-muted');
    if (currentBookingId && headerSubtitle) {
        headerSubtitle.textContent = `Showing tickets for booking: ${currentBookingId.substring(0, 8)}...`;
    }
}

function getFilteredTickets() {
    let filtered = [...allTickets];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentTab === 'upcoming') {
        filtered = filtered.filter(ticket => {
            const eventEnd = ticket.end_date || ticket.date;
            return new Date(eventEnd) >= today;
        });
    } else if (currentTab === 'past') {
        filtered = filtered.filter(ticket => {
            const eventEnd = ticket.end_date || ticket.date;
            return new Date(eventEnd) < today;
        });
    }
    
    if (currentSearch) {
        filtered = filtered.filter(ticket => 
            ticket.title.toLowerCase().includes(currentSearch) ||
            ticket.ticket_code.toLowerCase().includes(currentSearch)
        );
    }
    
    if (currentTab === 'upcoming') {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    return filtered;
}

function renderTickets() {
    const container = document.getElementById('ticketsList');
    if (!container) return;
    
    const filtered = getFilteredTickets();
    
    if (filtered.length === 0) {
        let emptyMessage = currentTab === 'upcoming' ? 'You have no upcoming events.' : 'You have no past events.';
        if (currentBookingId) {
            emptyMessage = 'No tickets found for this booking.';
        }
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h3>No tickets found</h3>
                <p>${emptyMessage}</p>
                <a href="/events/" class="browse-btn">Browse Events</a>
            </div>
        `;
        return;
    }
    
    const reviewEventsShown = new Set();
    container.innerHTML = filtered.map((ticket, index) => {
        const card = renderFlipTicketCard(ticket, index);
        const showReview = currentTab === 'past'
            && ticket.event_id
            && !reviewEventsShown.has(ticket.event_id);
        if (showReview) {
            reviewEventsShown.add(ticket.event_id);
            return `<div class="ticket-with-review">${card}${renderPastEventReviewPanel(ticket)}</div>`;
        }
        return card;
    }).join('');
    setupFlipTickets();
}

function setupReviewModal() {
    const modal = document.getElementById('eventReviewModal');
    if (!modal || modal.dataset.reviewModalBound) return;
    modal.dataset.reviewModalBound = '1';

    modal.querySelectorAll('[data-close-review-modal]').forEach(el => {
        el.addEventListener('click', closeReviewModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            closeReviewModal();
        }
    });

    const starsContainer = document.getElementById('eventReviewStars');
    if (starsContainer) {
        starsContainer.querySelectorAll('.event-review-star').forEach(star => {
            star.addEventListener('click', () => {
                setReviewModalRating(parseInt(star.dataset.rating, 10));
            });
            star.addEventListener('mouseenter', () => {
                highlightReviewStars(parseInt(star.dataset.rating, 10));
            });
        });
        starsContainer.addEventListener('mouseleave', () => {
            highlightReviewStars(reviewModalState.rating);
        });
    }

    const submitBtn = document.getElementById('eventReviewSubmitBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitEventReview);
}

function openReviewModal(eventId, eventTitle, reviewId = null) {
    const modal = document.getElementById('eventReviewModal');
    if (!modal) {
        showReviewToast('Review form is unavailable. Please refresh the page.', 'error');
        return;
    }

    const existing = userReviewsByEvent[eventId];
    reviewModalState = {
        eventId,
        reviewId: reviewId || existing?.id || null,
        rating: existing?.rating || 0,
    };

    const titleEl = document.getElementById('eventReviewModalTitle');
    const eventEl = document.getElementById('eventReviewModalEventName');
    const commentEl = document.getElementById('eventReviewComment');
    const submitBtn = document.getElementById('eventReviewSubmitBtn');

    if (titleEl) titleEl.textContent = reviewModalState.reviewId ? 'Update your review' : 'Rate this event';
    if (eventEl) eventEl.textContent = eventTitle;
    if (commentEl) commentEl.value = existing?.comment || '';
    if (submitBtn) {
        submitBtn.textContent = reviewModalState.reviewId ? 'Save changes' : 'Submit review';
        submitBtn.disabled = reviewModalState.rating < 1;
    }

    setReviewModalRating(reviewModalState.rating);
    modal.hidden = false;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('review-modal-open');
    commentEl?.focus();
}

function closeReviewModal() {
    const modal = document.getElementById('eventReviewModal');
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('review-modal-open');
    reviewModalState = { eventId: null, reviewId: null, rating: 0 };
}

function ratingLabel(rating) {
    const labels = ['Select a rating', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
    return labels[rating] || labels[0];
}

function highlightReviewStars(rating) {
    const starsContainer = document.getElementById('eventReviewStars');
    if (!starsContainer) return;
    
    starsContainer.querySelectorAll('.event-review-star').forEach(star => {
        const value = parseInt(star.dataset.rating, 10);
        const icon = star.querySelector('i');
        const active = value <= rating;
        star.classList.toggle('is-selected', active);
        if (icon) icon.className = `${active ? 'fas' : 'far'} fa-star`;
    });
}

function setReviewModalRating(rating) {
    reviewModalState.rating = rating;
    highlightReviewStars(rating);
    const label = document.getElementById('eventReviewRatingLabel');
    const submitBtn = document.getElementById('eventReviewSubmitBtn');
    if (label) label.textContent = ratingLabel(rating);
    if (submitBtn) submitBtn.disabled = rating < 1;
}

async function submitEventReview() {
    const { eventId, reviewId, rating } = reviewModalState;
    if (!eventId || rating < 1) return;

    const comment = (document.getElementById('eventReviewComment')?.value || '').trim();
    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showReviewToast('Please log in to submit a review.', 'error');
        return;
    }

    const submitBtn = document.getElementById('eventReviewSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
    }

    try {
        const url = reviewId
            ? `/api/attendee/reviews/update/${reviewId}/`
            : `/api/attendee/reviews/create/${eventId}/`;
        const res = await fetch(url, {
            method: reviewId ? 'PUT' : 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ rating, comment }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Failed to save review.');
        }

        const review = data.review;
        userReviewsByEvent[review.event_id] = review;
        closeReviewModal();
        renderTickets();
        showReviewToast(reviewId ? 'Review updated!' : 'Thank you for your review!', 'success');
    } catch (error) {
        console.error('Error saving review:', error);
        showReviewToast(error.message || 'Could not save your review. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = reviewModalState.rating < 1;
            submitBtn.textContent = reviewModalState.reviewId ? 'Save changes' : 'Submit review';
        }
    }
}

function showReviewToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `event-review-toast event-review-toast--${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function viewTicketDetail(ticketId) {
    window.location.href = `/tickets/detail/?id=${encodeURIComponent(ticketId)}`;
}

function viewQRCode(ticketCode) {
    window.location.href = `/tickets/qr/?code=${encodeURIComponent(ticketCode)}`;
}

async function fetchTicketFromApi(ticketNumber) {
    const token = localStorage.getItem('attendee_access_token');
    if (!token) return null;
    try {
        const res = await fetch(`/api/attendee/tickets/${encodeURIComponent(ticketNumber)}/`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'same-origin',
        });
        if (!res.ok) return null;
        const t = await res.json();
        if (!t.ticket_number) return null;
        return mapApiTicket(t);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        return null;
    }
}

async function loadTicketDetail() {
    const container = document.getElementById('ticketDetailContent');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id') || urlParams.get('ticket');
    
    if (!ticketId) {
        container.innerHTML = '<div class="error-state">Ticket ID not provided</div>';
        return;
    }
    
    let ticket = allTickets.find(t => t.id === ticketId || t.ticket_code === ticketId);

    if (!ticket) {
        ticket = await fetchTicketFromApi(ticketId);
    }
    
    if (!ticket) {
        const savedBookings = localStorage.getItem('eventhub_bookings');
        if (savedBookings) {
            const bookings = JSON.parse(savedBookings);
            for (const booking of bookings) {
                for (const item of booking.items) {
                    if (item.ticket_codes) {
                        for (let idx = 0; idx < item.ticket_codes.length; idx++) {
                            const tempId = `${booking.id}_${item.id}_${idx}`;
                            if (tempId === ticketId) {
                                ticket = {
                                    id: tempId,
                                    booking_id: booking.id,
                                    title: item.title,
                                    category: item.category,
                                    date: item.date,
                                    location: item.location,
                                    price: item.price,
                                    image: item.image,
                                    ticket_code: item.ticket_codes[idx],
                                    status: 'active',
                                    purchased_date: booking.booking_date,
                                    receipt_number: booking.receipt_number,
                                    quantity: 1
                                };
                                break;
                            }
                        }
                    } else {
                        for (let i = 0; i < item.quantity; i++) {
                            const tempId = `${booking.id}_${item.id}_${i}`;
                            if (tempId === ticketId) {
                                ticket = {
                                    id: tempId,
                                    booking_id: booking.id,
                                    title: item.title,
                                    category: item.category,
                                    date: item.date,
                                    location: item.location,
                                    price: item.price,
                                    image: item.image,
                                    ticket_code: item.ticket_code || `TKT${Math.floor(Math.random() * 1000000)}`,
                                    status: 'active',
                                    purchased_date: booking.booking_date,
                                    receipt_number: booking.receipt_number,
                                    quantity: 1
                                };
                                break;
                            }
                        }
                    }
                    if (ticket) break;
                }
                if (ticket) break;
            }
        }
    }
    
    if (!ticket) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ticket not found</p>
                <button onclick="window.location.href='/tickets/'" class="btn-back">Back to Tickets</button>
            </div>
        `;
        return;
    }
    
    renderTicketDetail(ticket);
}

function renderTicketDetail(ticket) {
    const container = document.getElementById('ticketDetailContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="ticket-detail-card">
            <div class="card-header">
                <h3><i class="fas fa-ticket-alt"></i> ${escapeHtml(ticket.title)}</h3>
            </div>
            <div class="card-body">
                <div class="detail-row">
                    <div class="detail-label">Event Date:</div>
                    <div class="detail-value">${formatDate(ticket.date)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Venue:</div>
                    <div class="detail-value">${escapeHtml(ticket.location)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Ticket Price:</div>
                    <div class="detail-value">${formatCurrency(ticket.price)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Ticket Code:</div>
                    <div class="detail-value"><strong>${ticket.ticket_code}</strong></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Purchased On:</div>
                    <div class="detail-value">${formatDate(ticket.purchased_date)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Booking ID:</div>
                    <div class="detail-value">${ticket.booking_id || 'N/A'}</div>
                </div>
                ${ticket.quantity > 1 ? `
                <div class="detail-row">
                    <div class="detail-label">Quantity:</div>
                    <div class="detail-value">${ticket.quantity} tickets</div>
                </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <button class="btn-qr" onclick="viewQRCode('${ticket.ticket_code}')">
                    <i class="fas fa-qrcode"></i> View QR Code
                </button>
                <button class="btn-back" onclick="window.location.href='/tickets/">
                    <i class="fas fa-arrow-left"></i> Back to Tickets
                </button>
            </div>
        </div>
    `;
}

async function loadQRCode() {
    const container = document.getElementById('qrCodeDisplay');
    const ticketInfoDiv = document.getElementById('ticketInfo');
    
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const ticketCode = urlParams.get('code');
    
    if (!ticketCode) {
        container.innerHTML = '<div class="error-state">No ticket code provided</div>';
        return;
    }
    
    let ticket = allTickets.find(t => t.ticket_code === ticketCode);

    if (!ticket) {
        ticket = await fetchTicketFromApi(ticketCode);
    }
    
    if (!ticket) {
        const savedBookings = localStorage.getItem('eventhub_bookings');
        if (savedBookings) {
            const bookings = JSON.parse(savedBookings);
            for (const booking of bookings) {
                for (const item of booking.items) {
                    if (item.ticket_codes && item.ticket_codes.includes(ticketCode)) {
                        ticket = {
                            id: `${booking.id}_${item.id}_${item.ticket_codes.indexOf(ticketCode)}`,
                            booking_id: booking.id,
                            title: item.title,
                            category: item.category,
                            date: item.date,
                            location: item.location,
                            price: item.price,
                            image: item.image,
                            ticket_code: ticketCode,
                            status: 'active',
                            purchased_date: booking.booking_date,
                            receipt_number: booking.receipt_number
                        };
                        break;
                    } else if (item.ticket_code === ticketCode) {
                        ticket = {
                            id: `${booking.id}_${item.id}_0`,
                            booking_id: booking.id,
                            title: item.title,
                            category: item.category,
                            date: item.date,
                            location: item.location,
                            price: item.price,
                            image: item.image,
                            ticket_code: ticketCode,
                            status: 'active',
                            purchased_date: booking.booking_date,
                            receipt_number: booking.receipt_number
                        };
                        break;
                    }
                }
                if (ticket) break;
            }
        }
    }
    
    if (!ticket) {
        container.innerHTML = '<div class="error-state">Ticket not found</div>';
        if (ticketInfoDiv) ticketInfoDiv.innerHTML = '';
        return;
    }
    
    const qrData = `${ticket.ticket_code}|${ticket.title}|${ticket.date}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    container.innerHTML = `
        <div class="qr-code">
            <img src="${qrUrl}" alt="QR Code">
            <p class="qr-note">Scan this code at the venue entrance</p>
        </div>
    `;
    
    if (ticketInfoDiv) {
        ticketInfoDiv.innerHTML = `
            <div class="info-row">
                <span class="info-label">Event:</span>
                <span class="info-value">${escapeHtml(ticket.title)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${formatDate(ticket.date)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Venue:</span>
                <span class="info-value">${escapeHtml(ticket.location)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Ticket Code:</span>
                <span class="info-value"><strong>${ticket.ticket_code}</strong></span>
            </div>
            ${ticket.quantity > 1 ? `
            <div class="info-row">
                <span class="info-label">Quantity:</span>
                <span class="info-value">${ticket.quantity} tickets</span>
            </div>
            ` : ''}
        `;
    }
    
    const exportBtn = document.getElementById('downloadTicketBtn');
    if (exportBtn) {
        exportBtn.onclick = () => exportTicketAsPDF(ticket);
    }
}

function exportTicketAsPDF(ticket) {
    const qrData = `${ticket.ticket_code}|${ticket.title}|${ticket.date}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket - ${ticket.title}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; margin: 0; }
                .ticket-card { max-width: 450px; width: 100%; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
                .ticket-header { background: linear-gradient(135deg, #f59e0b, #ec6408); color: white; padding: 20px; text-align: center; }
                .ticket-header h1 { font-size: 22px; margin-bottom: 5px; margin: 0; }
                .ticket-header p { font-size: 12px; opacity: 0.9; margin: 5px 0 0; }
                .ticket-body { padding: 20px; }
                .info-row { display: flex; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
                .info-label { width: 100px; font-weight: 600; color: #475569; font-size: 13px; }
                .info-value { flex: 1; color: #1e293b; font-size: 13px; }
                .qr-section { text-align: center; margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 12px; }
                .qr-section img { width: 150px; height: 150px; }
                .qr-section p { font-size: 11px; color: #64748b; margin-top: 8px; }
                .ticket-footer { background: #f8fafc; padding: 12px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                @media print { body { background: white; padding: 0; } .ticket-card { box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="ticket-card">
                <div class="ticket-header">
                    <h1>${escapeHtml(ticket.title)}</h1>
                    <p>Event Ticket</p>
                </div>
                <div class="ticket-body">
                    <div class="info-row">
                        <div class="info-label">Event Date:</div>
                        <div class="info-value">${formatDate(ticket.date)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Venue:</div>
                        <div class="info-value">${escapeHtml(ticket.location)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Ticket Price:</div>
                        <div class="info-value">${formatCurrency(ticket.price)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Ticket Code:</div>
                        <div class="info-value"><strong>${ticket.ticket_code}</strong></div>
                    </div>
                    <div class="qr-section">
                        <img src="${qrUrl}" alt="QR Code">
                        <p>Scan this QR code at the venue entrance</p>
                    </div>
                </div>
                <div class="ticket-footer">
                    <p>Present this ticket at the venue entrance</p>
                    <p>Booking ID: ${ticket.booking_id}</p>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });

    const url = new URL(window.location.href);
    if (tab === 'past') {
        url.searchParams.set('tab', 'past');
    } else {
        url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url);

    renderTickets();
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

function formatTime(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        return 'TBA';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'TBA';
        return date.toLocaleString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
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

window.switchTab = switchTab;
window.viewTicketDetail = viewTicketDetail;
window.viewQRCode = viewQRCode;
window.loadTicketDetail = loadTicketDetail;
window.loadQRCode = loadQRCode;