// ============================================
// ATTENDEE EVENT DETAIL - Complete Functionality
// ============================================

let eventId = null;
let eventData = null;
let selectedTickets = {};
let currentRating = 0;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    eventId = urlParams.get('id');
    
    if (eventId) {
        loadEventDetail();
    } else {
        window.location.href = '/attendee/events/';
    }
    
    setupRatingInput();
});

function setupRatingInput() {
    const stars = document.querySelectorAll('#ratingInput i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.rating);
            document.getElementById('reviewRating').value = currentRating;
            stars.forEach(s => {
                const rating = parseInt(s.dataset.rating);
                if (rating <= currentRating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            stars.forEach(s => {
                const starRating = parseInt(s.dataset.rating);
                if (starRating <= rating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseleave', function() {
            stars.forEach(s => {
                const starRating = parseInt(s.dataset.rating);
                if (starRating <= currentRating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
    });
}

async function loadEventDetail() {
    if (window.Loader) window.Loader.show('Loading event details...');
    
    try {
        eventData = await window.AttendeeAPIEndpoints.events.getDetail(eventId);
        displayEventDetails(eventData);
        
        await Promise.all([
            checkWishlistStatus(),
            loadReviews(),
            loadSimilarEvents()
        ]);
        
    } catch (error) {
        console.error('Error loading event:', error);
        const container = document.getElementById('eventDetailContent');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Event</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button class="btn-primary" onclick="location.reload()">Retry</button>
                    <a href="/attendee/events/" class="btn-outline">Browse Events</a>
                </div>
            `;
        }
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayEventDetails(event) {
    const container = document.getElementById('eventDetailContent');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Banner -->
        <div class="event-banner-large" style="background-image: url('${event.banner_image || '/static/images/placeholder.jpg'}')">
            <div class="event-banner-overlay">
                <h1>${escapeHtml(event.title)}</h1>
                <div class="event-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDateTime(event.start_date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.venue_name)}</span>
                </div>
            </div>
        </div>
        
        <div class="event-content-grid">
            <!-- Main Content -->
            <div class="event-main">
                <div class="event-section">
                    <h3><i class="fas fa-info-circle"></i> About This Event</h3>
                    <div class="event-description">${event.description || 'No description available.'}</div>
                </div>
                
                <div class="event-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Venue Information</h3>
                    <div class="event-info-grid">
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-building"></i></div>
                            <div class="info-content">
                                <h4>Venue</h4>
                                <p>${escapeHtml(event.venue_name)}</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-map-pin"></i></div>
                            <div class="info-content">
                                <h4>Address</h4>
                                <p>${escapeHtml(event.venue_address || 'Address not specified')}</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-city"></i></div>
                            <div class="info-content">
                                <h4>City</h4>
                                <p>${escapeHtml(event.city)}, ${escapeHtml(event.country)}</p>
                            </div>
                        </div>
                        ${event.is_online ? `
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-globe"></i></div>
                            <div class="info-content">
                                <h4>Online Event</h4>
                                <p>Join from anywhere</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="event-section">
                    <h3><i class="fas fa-calendar-alt"></i> Event Schedule</h3>
                    <div class="event-info-grid">
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-play-circle"></i></div>
                            <div class="info-content">
                                <h4>Start Date</h4>
                                <p>${formatDateTime(event.start_date)}</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-icon"><i class="fas fa-stop-circle"></i></div>
                            <div class="info-content">
                                <h4>End Date</h4>
                                <p>${formatDateTime(event.end_date)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="event-section">
                    <h3><i class="fas fa-building"></i> About the Organizer</h3>
                    <div class="organizer-info">
                        <div class="organizer-avatar">
                            ${event.organizer?.name?.charAt(0) || 'O'}
                        </div>
                        <div class="organizer-details">
                            <h4>${escapeHtml(event.organizer?.name || 'Organizer')}</h4>
                            <div class="rating">
                                <i class="fas fa-star"></i>
                                <span>${event.organizer?.rating || 0} (${event.organizer?.total_reviews || 0} reviews)</span>
                            </div>
                            <p>${event.organizer?.total_events || 0} events hosted</p>
                        </div>
                    </div>
                </div>
                
                <div class="event-section" id="reviewsSection">
                    <h3><i class="fas fa-star"></i> Reviews & Ratings</h3>
                    <div id="reviewsContent"></div>
                </div>
            </div>
            
            <!-- Sidebar -->
            <div class="event-sidebar">
                <div class="ticket-selector-card">
                    <div class="card-header">
                        <h3><i class="fas fa-ticket-alt"></i> Get Tickets</h3>
                    </div>
                    <div class="ticket-list" id="ticketTypesList">
                        ${renderTicketTypes(event.ticket_types)}
                    </div>
                    <div id="cartSummary" class="cart-summary">
                        <div class="summary-row">
                            <span>Total Items:</span>
                            <span id="totalItems">0</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total Amount:</span>
                            <span id="totalAmount">KSh 0</span>
                        </div>
                        <button class="btn-primary checkout-btn" onclick="addToCart()">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
                
                <div class="event-actions">
                    <button class="btn-outline" id="saveEventBtn" onclick="toggleSaveEvent()">
                        <i class="${event.is_saved ? 'fas' : 'far'} fa-heart"></i> ${event.is_saved ? 'Saved' : 'Save'}
                    </button>
                    <button class="btn-outline" id="reminderBtn" onclick="toggleReminder()">
                        <i class="${event.has_reminder ? 'fas' : 'far'} fa-bell"></i> ${event.has_reminder ? 'Reminder Set' : 'Set Reminder'}
                    </button>
                    <button class="btn-outline" onclick="shareEvent()">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn-outline" onclick="reportEvent()">
                        <i class="fas fa-flag"></i> Report
                    </button>
                </div>
            </div>
        </div>
        
        <div class="event-section">
            <h3><i class="fas fa-eye"></i> Similar Events You Might Like</h3>
            <div id="similarEventsList" class="similar-events-grid">
                <div class="loading-state">Loading similar events...</div>
            </div>
        </div>
    `;
    
    // Attach quantity event listeners after rendering
    attachQuantityListeners();
}

function renderTicketTypes(ticketTypes) {
    if (!ticketTypes || ticketTypes.length === 0) {
        return '<div class="no-tickets">No tickets available for this event.</div>';
    }
    
    return ticketTypes.map(ticket => `
        <div class="ticket-type">
            <div class="ticket-info">
                <h4>${escapeHtml(ticket.name)}</h4>
                <div class="ticket-price">${formatCurrency(ticket.price)}</div>
                ${ticket.original_price > ticket.price ? 
                    `<div class="ticket-original-price">Was ${formatCurrency(ticket.original_price)}</div>` : ''}
                <div class="ticket-description">${escapeHtml(ticket.description || '')}</div>
                <div class="ticket-availability">
                    <span class="${ticket.remaining > 0 ? 'available' : 'sold-out'}">
                        ${ticket.remaining > 0 ? `${ticket.remaining} tickets available` : 'Sold Out'}
                    </span>
                </div>
            </div>
            <div class="ticket-quantity">
                <button class="quantity-minus" data-id="${ticket.id}" ${ticket.remaining === 0 ? 'disabled' : ''}>-</button>
                <input type="number" id="qty_${ticket.id}" value="0" min="0" max="${ticket.remaining || 0}" class="quantity-input" readonly>
                <button class="quantity-plus" data-id="${ticket.id}" ${ticket.remaining === 0 ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `).join('');
}

function attachQuantityListeners() {
    document.querySelectorAll('.quantity-minus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.id, -1));
    });
    
    document.querySelectorAll('.quantity-plus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.id, 1));
    });
}

function updateQuantity(ticketId, delta) {
    const input = document.getElementById(`qty_${ticketId}`);
    const ticket = eventData.ticket_types?.find(t => t.id == ticketId);
    
    if (!ticket) return;
    
    let newValue = (parseInt(input.value) || 0) + delta;
    newValue = Math.max(0, Math.min(newValue, ticket.remaining || 0));
    
    input.value = newValue;
    selectedTickets[ticketId] = newValue;
    updateCartSummary();
}

function updateCartSummary() {
    let totalItems = 0;
    let totalAmount = 0;
    
    for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
        if (quantity > 0) {
            const ticket = eventData.ticket_types?.find(t => t.id == ticketId);
            if (ticket) {
                totalItems += quantity;
                totalAmount += ticket.price * quantity;
            }
        }
    }
    
    const summary = document.getElementById('cartSummary');
    const totalItemsSpan = document.getElementById('totalItems');
    const totalAmountSpan = document.getElementById('totalAmount');
    
    if (totalItems > 0) {
        if (summary) summary.style.display = 'block';
        if (totalItemsSpan) totalItemsSpan.textContent = totalItems;
        if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(totalAmount);
    } else {
        if (summary) summary.style.display = 'none';
    }
}

async function addToCart() {
    const items = [];
    for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
        if (quantity > 0) {
            items.push({
                ticket_type_id: parseInt(ticketId),
                quantity: quantity
            });
        }
    }
    
    if (items.length === 0) {
        showToast('Please select at least one ticket', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Adding to cart...');
    
    try {
        for (const item of items) {
            await window.AttendeeAPIEndpoints.cart.addItem(eventId, item.ticket_type_id, item.quantity);
        }
        
        showToast('Tickets added to cart!', 'success');
        
        if (confirm('Tickets added to cart. Go to checkout?')) {
            window.location.href = '/attendee/cart/';
        } else {
            // Reset selection
            selectedTickets = {};
            for (const ticket of eventData.ticket_types || []) {
                const input = document.getElementById(`qty_${ticket.id}`);
                if (input) input.value = 0;
            }
            updateCartSummary();
        }
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast(error.message || 'Failed to add to cart', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function toggleSaveEvent() {
    try {
        if (eventData.is_saved) {
            await window.AttendeeAPIEndpoints.events.unsave(eventId);
            eventData.is_saved = false;
            showToast('Removed from wishlist', 'success');
        } else {
            await window.AttendeeAPIEndpoints.events.save(eventId);
            eventData.is_saved = true;
            showToast('Added to wishlist', 'success');
        }
        
        const saveBtn = document.getElementById('saveEventBtn');
        if (saveBtn) {
            saveBtn.innerHTML = eventData.is_saved ? 
                '<i class="fas fa-heart"></i> Saved' : 
                '<i class="far fa-heart"></i> Save';
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        showToast('Failed to update wishlist', 'error');
    }
}

async function toggleReminder() {
    try {
        if (eventData.has_reminder) {
            eventData.has_reminder = false;
            showToast('Reminder removed', 'success');
        } else {
            await window.AttendeeAPIEndpoints.events.setReminder(eventId);
            eventData.has_reminder = true;
            showToast('Reminder set! We\'ll notify you before the event.', 'success');
        }
        
        const reminderBtn = document.getElementById('reminderBtn');
        if (reminderBtn) {
            reminderBtn.innerHTML = eventData.has_reminder ? 
                '<i class="fas fa-bell"></i> Reminder Set' : 
                '<i class="far fa-bell"></i> Set Reminder';
        }
    } catch (error) {
        console.error('Error toggling reminder:', error);
        showToast('Failed to set reminder', 'error');
    }
}

async function loadReviews() {
    try {
        const result = await window.AttendeeAPIEndpoints.events.getReviews(eventId);
        displayReviews(result.results, result.average_rating, result.total_count);
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function displayReviews(reviews, averageRating, totalCount) {
    const container = document.getElementById('reviewsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="reviews-header">
            <div class="rating-summary">
                <div class="average-rating">
                    <div class="rating-value">${averageRating || 0}</div>
                    <div class="rating-stars">${renderStars(averageRating || 0)}</div>
                    <div class="rating-count">${totalCount || 0} reviews</div>
                </div>
            </div>
            ${eventData.has_attended ? `
            <button class="btn-primary" onclick="openReviewModal()">
                <i class="fas fa-star"></i> Write a Review
            </button>
            ` : ''}
        </div>
        <div class="reviews-list" id="reviewsList">
            ${reviews && reviews.length > 0 ? 
                reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="reviewer">
                                <div class="reviewer-avatar">${escapeHtml(review.reviewer_name?.charAt(0) || 'U')}</div>
                                <div class="reviewer-info">
                                    <strong>${escapeHtml(review.reviewer_name)}</strong>
                                    <div class="review-stars">${renderStars(review.rating)}</div>
                                </div>
                            </div>
                            <div class="review-date">${formatRelativeTime(review.created_at)}</div>
                        </div>
                        <div class="review-title">${escapeHtml(review.title)}</div>
                        <div class="review-content">${escapeHtml(review.comment)}</div>
                        ${review.organizer_response ? `
                        <div class="organizer-response">
                            <strong>Organizer response:</strong>
                            <p>${escapeHtml(review.organizer_response)}</p>
                        </div>
                        ` : ''}
                        <div class="review-helpful">
                            <button onclick="markHelpful(${review.id})">
                                <i class="far fa-thumbs-up"></i> Helpful (${review.helpful_count || 0})
                            </button>
                        </div>
                    </div>
                `).join('') :
                '<div class="empty-state">No reviews yet. Be the first to review!</div>'
            }
        </div>
    `;
}

async function loadSimilarEvents() {
    const container = document.getElementById('similarEventsList');
    if (!container) return;
    
    try {
        const result = await window.AttendeeAPIEndpoints.events.getAll(1, 4, {
            category: eventData.category_id,
            exclude: eventId
        });
        
        const events = result.results || result;
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="empty-state">No similar events found</div>';
            return;
        }
        
        container.innerHTML = events.map(event => `
            <div class="similar-event-card" onclick="window.location.href='/attendee/events/detail/?id=${event.id}'">
                <div class="similar-event-image" style="background-image: url('${event.banner_image || '/static/images/placeholder.jpg'}')"></div>
                <div class="similar-event-info">
                    <h4>${escapeHtml(event.title)}</h4>
                    <div class="similar-event-date">${formatDate(event.start_date)}</div>
                    <div class="similar-event-price">${formatCurrency(event.min_price)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading similar events:', error);
        container.innerHTML = '<div class="empty-state">Unable to load similar events</div>';
    }
}

async function checkWishlistStatus() {
    try {
        const wishlist = await window.AttendeeAPIEndpoints.wishlist.getList();
        const isSaved = wishlist.some(item => item.event?.id == eventId);
        eventData.is_saved = isSaved;
    } catch (error) {
        console.error('Error checking wishlist:', error);
    }
}

function openReviewModal() {
    document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('reviewForm').reset();
    currentRating = 0;
    document.getElementById('reviewRating').value = 0;
    document.querySelectorAll('#ratingInput i').forEach(star => {
        star.className = 'far fa-star';
    });
}

async function submitReview() {
    const rating = parseInt(document.getElementById('reviewRating').value);
    const title = document.getElementById('reviewTitle').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (rating === 0) {
        showToast('Please select a rating', 'error');
        return;
    }
    
    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }
    
    if (!comment) {
        showToast('Please enter your review', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Submitting review...');
    
    try {
        await window.AttendeeAPIEndpoints.reviews.create(eventId, {
            rating: rating,
            title: title,
            comment: comment
        });
        
        showToast('Review submitted! Thank you for your feedback.', 'success');
        closeReviewModal();
        loadReviews();
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast(error.message || 'Failed to submit review', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function markHelpful(reviewId) {
    try {
        await window.AttendeeAPIEndpoints.reviews.markHelpful(reviewId);
        loadReviews();
    } catch (error) {
        console.error('Error marking helpful:', error);
    }
}

function shareEvent() {
    if (navigator.share) {
        navigator.share({
            title: eventData.title,
            text: `Check out this event on EventHub!`,
            url: window.location.href
        });
    } else {
        copyToClipboard(window.location.href);
    }
}

function reportEvent() {
    const reason = prompt('Please describe the issue with this event:');
    if (reason) {
        window.AttendeeAPIEndpoints.events.report(eventId, reason);
        showToast('Report submitted. Thank you for helping keep our platform safe.', 'success');
    }
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    return stars;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? 's' : ''} ago`;
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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global
window.addToCart = addToCart;
window.toggleSaveEvent = toggleSaveEvent;
window.toggleReminder = toggleReminder;
window.shareEvent = shareEvent;
window.reportEvent = reportEvent;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.submitReview = submitReview;
window.markHelpful = markHelpful;