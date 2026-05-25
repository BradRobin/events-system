// ============================================
// HOMEPAGE JAVASCRIPT - Complete Functionality
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadFeaturedEvents();
    initCarousels();
    initNewsletter();
});

// Load categories dynamically
async function loadCategories() {
    const categoryCarousel = document.getElementById('categoryCarousel');
    if (!categoryCarousel) return;
    
    try {
        let categories = [];
        
        // Try to fetch from API
        if (window.AttendeeAPIEndpoints && window.AttendeeAPIEndpoints.events) {
            categories = await window.AttendeeAPIEndpoints.events.getCategories();
        } else {
            // Fallback static categories
            categories = [
                { id: 1, name: 'Music', icon: 'fas fa-music' },
                { id: 2, name: 'Sports', icon: 'fas fa-futbol' },
                { id: 3, name: 'Tech', icon: 'fas fa-microphone' },
                { id: 4, name: 'Arts', icon: 'fas fa-palette' },
                { id: 5, name: 'Business', icon: 'fas fa-briefcase' },
                { id: 6, name: 'Food', icon: 'fas fa-utensils' },
                { id: 7, name: 'Wellness', icon: 'fas fa-heart' },
                { id: 8, name: 'Education', icon: 'fas fa-graduation-cap' }
            ];
        }
        
        if (categories && categories.length) {
            categoryCarousel.innerHTML = categories.map(cat => `
                <div class="category-card" onclick="window.location.href='/attendee/events/?category=${cat.id}'">
                    <div class="category-icon">
                        <i class="${cat.icon || 'fas fa-calendar'}"></i>
                    </div>
                    <div class="category-name">${escapeHtml(cat.name)}</div>
                </div>
            `).join('');
        } else {
            categoryCarousel.innerHTML = '<div class="empty-state">No categories available</div>';
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
        categoryCarousel.innerHTML = '<div class="empty-state">Failed to load categories</div>';
    }
}

// Load featured events
async function loadFeaturedEvents() {
    const featuredGrid = document.getElementById('featuredEventsGrid');
    if (!featuredGrid) return;
    
    try {
        let events = [];
        
        // Try to fetch from API
        if (window.AttendeeAPIEndpoints && window.AttendeeAPIEndpoints.events) {
            const result = await window.AttendeeAPIEndpoints.events.getFeatured();
            events = result.results || result;
        } else {
            // Fallback static events
            events = [
                {
                    id: 1,
                    title: 'Nairobi Tech Conference 2024',
                    category_name: 'Technology',
                    start_date: '2024-12-15',
                    city: 'Nairobi',
                    min_price: 1500,
                    banner_image: null,
                    is_featured: true
                },
                {
                    id: 2,
                    title: 'Nairobi Music Festival',
                    category_name: 'Music',
                    start_date: '2025-01-20',
                    city: 'Nairobi',
                    min_price: 2500,
                    banner_image: null,
                    is_featured: true
                },
                {
                    id: 3,
                    title: 'Nairobi Street Food Festival',
                    category_name: 'Food',
                    start_date: '2025-02-10',
                    city: 'Nairobi',
                    min_price: 1000,
                    banner_image: null,
                    is_featured: true
                }
            ];
        }
        
        if (events && events.length) {
            featuredGrid.innerHTML = events.map(event => `
                <div class="event-card" onclick="window.location.href='/attendee/events/detail/?id=${event.id}'">
                    <div class="event-banner" style="background-image: url('${event.banner_image || '/static/images/placeholder-event.jpg'}')">
                        ${event.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                        <span class="event-category">${escapeHtml(event.category_name || 'Event')}</span>
                    </div>
                    <div class="event-content">
                        <h3 class="event-title">${escapeHtml(event.title)}</h3>
                        <div class="event-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(event.start_date)}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.city)}</span>
                        </div>
                        <div class="event-footer">
                            <div class="event-price">${formatCurrency(event.min_price)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            featuredGrid.innerHTML = '<div class="empty-state">No featured events available</div>';
        }
        
    } catch (error) {
        console.error('Error loading featured events:', error);
        featuredGrid.innerHTML = '<div class="empty-state">Failed to load featured events</div>';
    }
}

// Initialize carousels
function initCarousels() {
    // Categories carousel
    const catPrevBtn = document.getElementById('catPrevBtn');
    const catNextBtn = document.getElementById('catNextBtn');
    const categoryCarousel = document.getElementById('categoryCarousel');
    
    if (catPrevBtn && catNextBtn && categoryCarousel) {
        catPrevBtn.addEventListener('click', () => {
            categoryCarousel.scrollBy({ left: -350, behavior: 'smooth' });
        });
        
        catNextBtn.addEventListener('click', () => {
            categoryCarousel.scrollBy({ left: 350, behavior: 'smooth' });
        });
    }
    
    // Testimonials carousel
    const testimonialCarousel = document.getElementById('testimonialCarousel');
    const dotsContainer = document.getElementById('testimonialDots');
    
    if (testimonialCarousel && dotsContainer) {
        const items = document.querySelectorAll('.testimonial-item');
        const dots = [];
        
        items.forEach((item, index) => {
            const dot = document.createElement('div');
            dot.classList.add('testimonial-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                testimonialCarousel.scrollTo({ left: item.offsetLeft, behavior: 'smooth' });
                dots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            });
            dotsContainer.appendChild(dot);
            dots.push(dot);
        });
        
        testimonialCarousel.addEventListener('scroll', () => {
            const scrollPosition = testimonialCarousel.scrollLeft;
            let activeIndex = 0;
            items.forEach((item, index) => {
                if (Math.abs(item.offsetLeft - scrollPosition) < 200) {
                    activeIndex = index;
                }
            });
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
            });
        });
    }
}

// Initialize newsletter subscription
function initNewsletter() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (!email || !isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            // API call for newsletter subscription
            const response = await fetch('/api/attendee/newsletter/subscribe/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ email: email })
            });
            
            if (response.ok) {
                showToast('Successfully subscribed to newsletter!', 'success');
                this.reset();
            } else {
                throw new Error('Subscription failed');
            }
        } catch (error) {
            console.error('Newsletter error:', error);
            showToast('Subscription failed. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Make functions global for inline handlers
window.loadCategories = loadCategories;
window.loadFeaturedEvents = loadFeaturedEvents;