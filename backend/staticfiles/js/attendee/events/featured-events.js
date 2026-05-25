// ============================================
// ATTENDEE FEATURED EVENTS
// Handles: Featured events slider, autoplay, navigation
// ============================================

let featuredSwiper = null;

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedEvents();
});

// Load featured events
async function loadFeaturedEvents() {
    const events = await EventAPI.Attendee.getFeaturedEvents();
    if (events && events.length) {
        displayFeaturedSlider(events);
    } else {
        displayFallbackContent();
    }
}

// Display featured events in slider
function displayFeaturedSlider(events) {
    const container = document.getElementById('featuredSlider');
    if (!container) return;
    
    container.innerHTML = events.map(event => `
        <div class="swiper-slide">
            <div class="featured-card" onclick="location.href='/event/${event.id}/'">
                <div class="featured-image">
                    ${event.banner_image ? 
                        `<img src="${event.banner_image}" alt="${event.title}">` : 
                        `<div class="placeholder-bg"><i class="fas fa-calendar-alt fa-4x"></i></div>`}
                    <div class="featured-overlay">
                        <div class="featured-category">${event.category_name || 'Featured'}</div>
                        <h3 class="featured-title">${event.title}</h3>
                        <div class="featured-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleDateString()}</span>
                        </div>
                        <div class="featured-footer">
                            <span class="featured-price">KES ${event.price.toLocaleString()}</span>
                            <span class="featured-seats">${event.available_seats} seats left</span>
                        </div>
                        <button class="featured-btn">Book Now →</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Initialize Swiper
    if (typeof Swiper !== 'undefined') {
        featuredSwiper = new Swiper('.featured-swiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            effect: 'slide',
            speed: 800,
            breakpoints: {
                640: { slidesPerView: 1 },
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            }
        });
    }
}

// Fallback content when no featured events
function displayFallbackContent() {
    const container = document.getElementById('featuredSlider');
    if (container) {
        container.innerHTML = `
            <div class="swiper-slide">
                <div class="featured-card fallback">
                    <div class="featured-image">
                        <div class="placeholder-bg">
                            <i class="fas fa-calendar-alt fa-4x"></i>
                            <h3>Coming Soon!</h3>
                            <p>Exciting events are on their way</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Refresh featured events
async function refreshFeaturedEvents() {
    await loadFeaturedEvents();
    if (featuredSwiper) {
        featuredSwiper.update();
    }
}
