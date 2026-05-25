// ============================================
// ATTENDEE EVENT DETAIL
// Handles: Event details display, booking, reviews, sharing
// ============================================

let eventId = window.location.pathname.split('/')[2];
let currentQuantity = 1;
let selectedTicketType = null;

document.addEventListener('DOMContentLoaded', () => {
    loadEventDetails();
    loadSimilarEvents();
    loadReviews();
    checkWishlistStatus();
    checkReminderStatus();
    setupBookingControls();
});

// Load main event details
async function loadEventDetails() {
    showLoading();
    const event = await EventAPI.Attendee.getEventDetail(eventId);
    if (event) {
        displayEventDetails(event);
        updateMetaTags(event);
    }
    hideLoading();
}

// Display event details on page
function displayEventDetails(event) {
    document.title = `${event.title} - EventHub`;
    
    // Event header
    document.getElementById('eventTitle').innerHTML = event.title;
    document.getElementById('eventCategory').innerHTML = `<i class="fas fa-tag"></i> ${event.category_name || 'Event'}`;
    
    // Event banner
    const bannerContainer = document.getElementById('eventBanner');
    bannerContainer.innerHTML = event.banner_image ? 
        `<img src="${event.banner_image}" alt="${event.title}">` : 
        `<div class="banner-placeholder"><i class="fas fa-calendar-alt fa-5x"></i></div>`;
    
    // Event details
    document.getElementById('eventVenue').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.venue}, ${event.address}`;
    document.getElementById('eventDate').innerHTML = `<i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleString()}`;
    document.getElementById('eventDuration').innerHTML = `<i class="fas fa-clock"></i> ${formatDuration(event.start_date, event.end_date)}`;
    document.getElementById('eventOrganizer').innerHTML = `<i class="fas fa-user"></i> Hosted by ${event.organizer_name}`;
    document.getElementById('eventDescription').innerHTML = event.description;
    
    // Ticket info
    document.getElementById('eventPrice').innerHTML = `KES ${event.price.toLocaleString()}`;
    document.getElementById('eventSeats').innerHTML = `${event.available_seats} seats available`;
    document.getElementById('maxQuantity').value = event.available_seats;
    
    // Availability indicator
    const availabilityEl = document.getElementById('availabilityIndicator');
    if (event.available_seats === 0) {
        availabilityEl.innerHTML = '<span class="sold-out">Sold Out</span>';
        document.getElementById('bookButton').disabled = true;
    } else if (event.available_seats < 20) {
        availabilityEl.innerHTML = `<span class="low-stock">Only ${event.available_seats} seats left! 🎟️</span>`;
    } else {
        availabilityEl.innerHTML = `<span class="available">${event.available_seats} seats available</span>`;
    }
    
    // Ticket types
    if (event.ticket_types && event.ticket_types.length) {
        displayTicketTypes(event.ticket_types);
    }
}

// Display ticket type options
function displayTicketTypes(ticketTypes) {
    const container = document.getElementById('ticketTypes');
    if (!container) return;
    
    container.innerHTML = ticketTypes.map(tt => `
        <div class="ticket-type" onclick="selectTicketType(${tt.id}, ${tt.price})">
            <div class="ticket-info">
                <h4>${tt.name}</h4>
                <p>${tt.benefits || 'Standard admission'}</p>
            </div>
            <div class="ticket-price">
                <span>KES ${tt.price.toLocaleString()}</span>
                <small>${tt.quantity_available} available</small>
            </div>
        </div>
    `).join('');
}

function selectTicketType(id, price) {
    selectedTicketType = id;
    document.getElementById('eventPrice').innerHTML = `KES ${price.toLocaleString()}`;
    document.querySelectorAll('.ticket-type').forEach(el => el.classList.remove('selected'));
    event.target.closest('.ticket-type').classList.add('selected');
    updateTotalPrice();
}

// Booking controls
function setupBookingControls() {
    const qtyInput = document.getElementById('quantity');
    if (qtyInput) {
        qtyInput.addEventListener('change', updateTotalPrice);
    }
}

function updateQuantity(change) {
    const input = document.getElementById('quantity');
    let newValue = parseInt(input.value) + change;
    const max = parseInt(input.max);
    if (newValue >= 1 && newValue <= max) {
        input.value = newValue;
        updateTotalPrice();
    }
}

function updateTotalPrice() {
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('eventPrice').innerHTML.replace('KES ', '').replace(',', ''));
    const total = quantity * price;
    document.getElementById('totalPrice').innerHTML = `KES ${total.toLocaleString()}`;
}

// Booking submission
async function bookTickets() {
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (quantity <= 0) {
        alert('Please select at least 1 ticket');
        return;
    }
    
    const bookingData = {
        event_id: eventId,
        quantity: quantity,
        ticket_type_id: selectedTicketType,
        special_requests: document.getElementById('specialRequests')?.value || ''
    };
    
    const result = await EventAPI.Attendee.createBooking(bookingData);
    if (result) {
        window.location.href = `/checkout/${result.booking_id}/`;
    }
}

// Reviews
async function loadReviews() {
    const reviews = await EventAPI.Attendee.getReviews(eventId);
    if (reviews && reviews.length) {
        displayReviews(reviews);
        updateRatingSummary(reviews);
    }
}

function displayReviews(reviews) {
    const container = document.getElementById('reviewsList');
    container.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer">
                    <i class="fas fa-user-circle"></i>
                    <strong>${review.user}</strong>
                </div>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
            </div>
            <p class="review-comment">${review.comment}</p>
        </div>
    `).join('');
}

function updateRatingSummary(reviews) {
    const total = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    
    document.getElementById('averageRating').innerHTML = avg.toFixed(1);
    document.getElementById('totalReviews').innerHTML = `${total} reviews`;
    
    // Rating distribution
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => distribution[5 - r.rating]++);
    
    for (let i = 5; i >= 1; i--) {
        const percent = (distribution[5 - i] / total) * 100;
        const bar = document.getElementById(`ratingBar${i}`);
        if (bar) bar.style.width = `${percent}%`;
    }
}

// Submit review
async function submitReview() {
    const rating = parseInt(document.getElementById('ratingSelect').value);
    const comment = document.getElementById('reviewComment').value;
    
    if (!comment) {
        alert('Please write your review');
        return;
    }
    
    const result = await EventAPI.Attendee.addReview(eventId, rating, comment);
    if (result) {
        alert('Review submitted successfully!');
        location.reload();
    }
}

// Wishlist
async function addToWishlist() {
    const result = await EventAPI.Attendee.addToWishlist(eventId);
    if (result) {
        document.getElementById('wishlistBtn').innerHTML = '<i class="fas fa-heart"></i> Saved';
        document.getElementById('wishlistBtn').disabled = true;
        alert('Added to wishlist!');
    }
}

async function checkWishlistStatus() {
    const wishlist = await EventAPI.Attendee.getWishlist();
    if (wishlist && wishlist.some(item => item.event_id == eventId)) {
        document.getElementById('wishlistBtn').innerHTML = '<i class="fas fa-heart"></i> Saved';
    }
}

// Reminders
async function setReminder() {
    const result = await EventAPI.Attendee.setReminder(eventId, '1_day');
    if (result) {
        document.getElementById('reminderBtn').innerHTML = '<i class="fas fa-bell"></i> Reminder Set';
        alert('Reminder set! You will be notified before the event.');
    }
}

async function checkReminderStatus() {
    const reminders = await EventAPI.Attendee.getReminders();
    if (reminders && reminders.some(r => r.event_id == eventId)) {
        document.getElementById('reminderBtn').innerHTML = '<i class="fas fa-bell"></i> Reminder Set';
    }
}

// Share event
function shareEvent(platform) {
    const url = window.location.href;
    const text = `Check out this event: ${document.title}`;
    
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
        email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
}

// Similar events
async function loadSimilarEvents() {
    const events = await EventAPI.Attendee.getSimilarEvents(eventId);
    if (events && events.length) {
        const container = document.getElementById('similarEvents');
        container.innerHTML = events.map(event => `
            <div class="similar-event" onclick="location.href='/event/${event.id}/'">
                <div class="similar-image">
                    ${event.banner_image ? 
                        `<img src="${event.banner_image}" alt="${event.title}">` : 
                        `<div class="placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                </div>
                <div class="similar-info">
                    <h4>${event.title}</h4>
                    <p>${event.venue}</p>
                    <span>KES ${event.price.toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }
}

// Helper functions
function formatDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffHours = Math.round((endDate - startDate) / (1000 * 60 * 60));
    return `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()} (${diffHours} hours)`;
}

function updateMetaTags(event) {
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', event.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', event.description?.substring(0, 200));
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', event.banner_image);
}

function showLoading() {
    const container = document.getElementById('eventContent');
    if (container) container.style.opacity = '0.5';
}

function hideLoading() {
    const container = document.getElementById('eventContent');
    if (container) container.style.opacity = '1';
}
