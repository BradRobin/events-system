// Event Detail Module - Ready for Django API Integration
const EventDetailModule = (function() {
    // API endpoints
    const API = {
        event: '/api/attendee/events/',
        cart: '/api/attendee/cart/',
        wishlist: '/api/attendee/wishlist/',
        reviews: '/api/attendee/reviews/'
    };
    
    let eventId = null;
    let eventData = null;
    let quantity = 1;
    
    // Initialize
    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        eventId = urlParams.get('id');
        
        if (!eventId) {
            showError('Event not found');
            return;
        }
        
        await loadEventDetails();
        attachEventListeners();
        setupReviewModal();
    }
    
    // Load event details from API
    async function loadEventDetails() {
        showLoading();
        
        try {
            const response = await fetch(`${API.event}${eventId}/`);
            const data = await response.json();
            
            if (data.success) {
                eventData = data.event;
                renderEventDetails();
                await loadReviews();
            } else {
                showError('Event not found');
            }
        } catch (error) {
            console.error('Error loading event:', error);
            showError('Failed to load event details');
        }
    }
    
    // Render event details
    function renderEventDetails() {
        const container = document.getElementById('eventDetailContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="event-detail-layout">
                <div class="event-main">
                    <img src="${eventData.image || '/static/images/placeholder.jpg'}" alt="${eventData.title}" class="event-image">
                    <div class="event-info">
                        <div class="event-breadcrumb">
                            <a href="/">Home</a> / <a href="/events/">Events</a> / <span>${eventData.title}</span>
                        </div>
                        <h1 class="event-title">${eventData.title}</h1>
                        <div class="event-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(eventData.date)} at ${eventData.time || 'TBA'}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${eventData.location}</span>
                            <span><i class="fas fa-users"></i> ${eventData.attendees?.toLocaleString() || 0} attending</span>
                        </div>
                        <div class="event-description">
                            <h3>About This Event</h3>
                            <p>${eventData.description || 'No description available.'}</p>
                        </div>
                        <div class="event-organizer">
                            <h3>Organized By</h3>
                            <p>${eventData.organizer || 'EventHub'}</p>
                        </div>
                        <div class="event-location">
                            <h3>Location</h3>
                            <p>${eventData.venue || eventData.location}</p>
                            <div class="location-map">
                                <iframe 
                                    src="https://maps.google.com/maps?q=${encodeURIComponent(eventData.location)}&output=embed"
                                    width="100%" 
                                    height="250" 
                                    style="border:0;" 
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                        <div class="reviews-section">
                            <div class="reviews-header">
                                <h3>Reviews</h3>
                                <button class="write-review-btn" id="writeReviewBtn">Write a Review</button>
                            </div>
                            <div class="reviews-list" id="reviewsList">
                                <div class="loading-state">Loading reviews...</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ticket-card">
                    <h3>Get Your Tickets</h3>
                    <div class="ticket-price">KES ${formatPrice(eventData.price)}</div>
                    <div class="ticket-quantity">
                        <label>Number of Tickets</label>
                        <div class="quantity-selector">
                            <button class="qty-btn" id="decreaseQty">-</button>
                            <input type="number" id="ticketQuantity" value="1" min="1" max="10" readonly>
                            <button class="qty-btn" id="increaseQty">+</button>
                        </div>
                    </div>
                    <div class="ticket-total">
                        <span>Total:</span>
                        <span class="total-amount" id="totalAmount">KES ${formatPrice(eventData.price)}</span>
                    </div>
                    <button class="book-now-btn" id="bookNowBtn">Book Now</button>
                    <p style="font-size: 0.7rem; color: #64748b; margin-top: 1rem; text-align: center;">
                        <i class="fas fa-shield-alt"></i> Secure booking
                    </p>
                </div>
            </div>
        `;
        
        updateTotal();
    }
    
    // Load reviews
    async function loadReviews() {
        try {
            const response = await fetch(`${API.reviews}?event_id=${eventId}`);
            const data = await response.json();
            
            renderReviews(data.reviews || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
            const reviewsList = document.getElementById('reviewsList');
            if (reviewsList) {
                reviewsList.innerHTML = '<div class="empty-state">No reviews yet. Be the first to review!</div>';
            }
        }
    }
    
    // Render reviews
    function renderReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<div class="empty-state">No reviews yet. Be the first to review!</div>';
            return;
        }
        
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="reviewer-name">${review.user_name || 'Anonymous'}</span>
                    <div class="review-rating">${renderStars(review.rating)}</div>
                </div>
                <div class="review-title">${review.title}</div>
                <div class="review-content">${review.content}</div>
                <div class="review-date">${formatDate(review.created_at)}</div>
            </div>
        `).join('');
    }
    
    function renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star"></i>`;
        }
        return stars;
    }
    
    // Update total price
    function updateTotal() {
        const total = quantity * (eventData?.price || 0);
        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            totalElement.textContent = `KES ${formatPrice(total)}`;
        }
    }
    
    // Book now
    async function bookNow() {
        const token = localStorage.getItem('attendee_access_token');
        
        if (!token) {
            showToast('Please login to book tickets', 'info');
            setTimeout(() => {
                localStorage.setItem('redirect_after_login', window.location.pathname + window.location.search);
                window.location.href = '/login/';
            }, 1500);
            return;
        }
        
        try {
            // Get existing cart or initialize it
            const savedCart = localStorage.getItem('eventhub_cart');
            let cart = savedCart ? JSON.parse(savedCart) : {
                items: [],
                subtotal: 0,
                platform_fee: 0,
                total: 0,
                discount_amount: 0,
                promo_code: null
            };

            // Check if item is already in cart
            const existingItem = cart.items.find(item => item.id == eventId);
            if (existingItem) {
                showToast('This event is already in your cart!', 'info');
                setTimeout(() => {
                    window.location.href = '/cart/';
                }, 1000);
                return;
            } else {
                cart.items.push({
                    id: eventData.id,
                    title: eventData.title,
                    category: eventData.category_name || eventData.category || 'Event',
                    date: eventData.start_date || eventData.date,
                    location: eventData.location || eventData.venue,
                    price: parseFloat(eventData.price),
                    image: eventData.image || eventData.banner_image,
                    quantity: parseInt(quantity || 1)
                });
            }

            // Recalculate totals
            cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cart.platform_fee = Math.ceil(cart.subtotal * 0.05);
            cart.total = cart.subtotal + cart.platform_fee - (cart.discount_amount || 0);

            // Save back to localStorage
            localStorage.setItem('eventhub_cart', JSON.stringify(cart));

            // Trigger custom event to notify navbar to update badge
            window.dispatchEvent(new Event('cart-updated'));

            showToast('Added to cart! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/cart/';
            }, 1000);
        } catch (error) {
            console.error('Error booking:', error);
            showToast('Failed to add to cart. Please try again.', 'error');
        }
    }
    
    // Setup review modal
    function setupReviewModal() {
        const modal = document.getElementById('reviewModal');
        const writeBtn = document.getElementById('writeReviewBtn');
        const closeBtn = document.querySelector('.modal-close');
        
        if (!modal || !writeBtn) return;
        
        writeBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Rating stars
        const ratingStars = document.querySelectorAll('.rating-select i');
        const ratingInput = document.getElementById('reviewRating');
        
        if (ratingStars.length) {
            ratingStars.forEach(star => {
                star.addEventListener('mouseenter', function() {
                    const rating = parseInt(this.dataset.rating);
                    ratingStars.forEach((s, i) => {
                        if (i < rating) {
                            s.classList.remove('far');
                            s.classList.add('fas');
                        } else {
                            s.classList.remove('fas');
                            s.classList.add('far');
                        }
                    });
                });
                
                star.addEventListener('click', function() {
                    const rating = parseInt(this.dataset.rating);
                    ratingInput.value = rating;
                });
            });
            
            document.querySelector('.rating-select').addEventListener('mouseleave', () => {
                const currentRating = parseInt(ratingInput.value);
                ratingStars.forEach((s, i) => {
                    if (i < currentRating) {
                        s.classList.remove('far');
                        s.classList.add('fas');
                    } else {
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
        }
        
        // Form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const token = localStorage.getItem('attendee_access_token');
                
                if (!token) {
                    showToast('Please login to write a review', 'info');
                    modal.style.display = 'none';
                    setTimeout(() => {
                        window.location.href = '/login/';
                    }, 1000);
                    return;
                }
                
                const rating = document.getElementById('reviewRating').value;
                const title = document.getElementById('reviewTitle').value;
                const content = document.getElementById('reviewText').value;
                
                try {
                    const response = await fetch(API.reviews, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ event_id: eventId, rating, title, content })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showToast('Review submitted!', 'success');
                        modal.style.display = 'none';
                        reviewForm.reset();
                        ratingInput.value = 5;
                        await loadReviews();
                    } else {
                        showToast(data.message || 'Failed to submit review', 'error');
                    }
                } catch (error) {
                    console.error('Error submitting review:', error);
                    showToast('Failed to submit review', 'error');
                }
            });
        }
    }
    
    // Attach event listeners
    function attachEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'decreaseQty') {
                if (quantity > 1) {
                    quantity--;
                    document.getElementById('ticketQuantity').value = quantity;
                    updateTotal();
                }
            }
            
            if (e.target.id === 'increaseQty') {
                if (quantity < 10) {
                    quantity++;
                    document.getElementById('ticketQuantity').value = quantity;
                    updateTotal();
                }
            }
            
            if (e.target.id === 'bookNowBtn') {
                bookNow();
            }
        });
    }
    
    // Helper functions
    function formatDate(dateString) {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    function formatPrice(price) {
        return price ? price.toLocaleString() : '0';
    }
    
    function showLoading() {
        const container = document.getElementById('eventDetailContainer');
        if (container) {
            container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading event details...</p></div>';
        }
    }
    
    function showError(message) {
        const container = document.getElementById('eventDetailContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state"><p>${message}</p><a href="/events/" class="btn-primary">Back to Events</a></div>`;
        }
    }
    
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    return { init };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    EventDetailModule.init();
});
