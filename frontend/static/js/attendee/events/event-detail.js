// EVENT DETAIL MODULE - Live Reviews, Organizer Details, Directions
// FIXED: Venue information moved to separate tab, not duplicated in Details tab
// ADDED: Location detection and distance calculation to event venue
// FIXED: Book ticket shows toast without redirect
// FIXED: Wishlist toggles with correct terminology
// FIXED: Only one item per event in cart
// FIXED: Cross-tab synchronization via storage events
console.log('Event detail loaded');

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

// API endpoints (unchanged)
const API = {
    wishlist: '/api/attendee/wishlist/',
    events: '/api/attendee/events/',
    booking: '/api/attendee/bookings/',
};

// Helper: Get auth token
function getAuthToken() {
    return localStorage.getItem('attendee_access_token') || localStorage.getItem('access_token');
}

// Helper: Check if user is authenticated
function isAuthenticated() {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        return Date.now() < exp;
    } catch(e) {
        return !!token;
    }
}

// Helper: Get current user
function getCurrentUser() {
    try {
        const user = localStorage.getItem('attendee_user');
        if (user && user !== 'undefined') {
            return JSON.parse(user);
        }
        const token = getAuthToken();
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { email: payload.email, name: payload.name || payload.email };
        }
    } catch(e) {}
    return null;
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Dispatch events for navbar updates and cross-tab sync
    if (type === 'success') {
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('wishlist-updated'));
        window.dispatchEvent(new Event('storage'));
    }
}

function renderStars(rating) {
    if (rating === 0) return '<i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalf) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Reviews functions
let eventReviewsCache = [];

async function loadEventReviewsFromApi(id) {
    try {
        const response = await fetch(`/api/attendee/events/${id}/reviews/`);
        if (!response.ok) {
            eventReviewsCache = [];
            return;
        }
        const data = await response.json();
        eventReviewsCache = (data.results || []).map((review) => ({
            id: review.id,
            userName: review.user_name || 'Attendee',
            rating: review.rating,
            title: '',
            content: review.comment || '',
            created_at: review.created_at,
        }));
    } catch (error) {
        console.error('Error loading reviews:', error);
        eventReviewsCache = [];
    }
}

function getEventReviews(eventId) {
    return eventReviewsCache;
}

function getAverageRating(eventId) {
    const reviews = getEventReviews(eventId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
}

function renderReviewsList(eventId) {
    const reviews = getEventReviews(eventId);
    if (reviews.length === 0) {
        return '<div class="empty-state">No reviews yet. Be the first to review this event!</div>';
    }
    
    return reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${review.userName.charAt(0)}</div>
                    <div class="reviewer-details">
                        <div class="reviewer-name">${escapeHtml(review.userName)}</div>
                        <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="review-rating">${renderStars(review.rating)}</div>
            </div>
            <div class="review-content">${escapeHtml(review.content)}</div>
        </div>
    `).join('');
}

function updateReviewsUI(eventId) {
    const avgRating = getAverageRating(eventId);
    const reviewsCount = getEventReviews(eventId).length;
    const ratingNumber = document.querySelector('.rating-number');
    const starsLarge = document.querySelector('.stars-large');
    const reviewCount = document.querySelector('.review-count');
    const reviewsList = document.getElementById('reviewsList');
    
    if (ratingNumber) ratingNumber.textContent = avgRating.toFixed(1);
    if (starsLarge) starsLarge.innerHTML = renderStars(avgRating);
    if (reviewCount) reviewCount.textContent = `Based on ${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}`;
    if (reviewsList) reviewsList.innerHTML = renderReviewsList(eventId);
}

// Wishlist functions - FIXED: Correct terminology
async function isInWishlist(eventId) {
    if (window.EventhubWishlistStorage) {
        return EventhubWishlistStorage.isInWishlist(eventId);
    }
    const wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
    return wishlist.some((item) => (item?.id ?? item) == eventId);
}

async function toggleWishlist(eventId, btnElement, eventTitle) {
    const token = getAuthToken();
    if (!token) {
        showToast('🔐 Please login to manage your wishlist', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return false;
    }
    
    const wasActive = btnElement.classList.contains('active');
    
    // Optimistic UI update
    if (wasActive) {
        btnElement.classList.remove('active');
        btnElement.innerHTML = '<i class="fas fa-heart"></i> Add to Wishlist';
    } else {
        btnElement.classList.add('active');
        btnElement.innerHTML = '<i class="fas fa-heart"></i> Remove from Wishlist';
    }
    
    try {
        if (!wasActive) {
            const response = await fetch(API.wishlist, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id: eventId })
            });
            
            if (response.ok) {
                showToast(`❤️ "${eventTitle}" has been saved to your wishlist`, 'success');
                
                let wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
                if (!wishlist.includes(eventId)) wishlist.push(eventId);
                localStorage.setItem('event_wishlist', JSON.stringify(wishlist));
                window.dispatchEvent(new Event('wishlist-updated'));
                window.dispatchEvent(new Event('storage'));
                return true;
            } else {
                // Revert on error
                btnElement.classList.remove('active');
                btnElement.innerHTML = '<i class="fas fa-heart"></i> Add to Wishlist';
                showToast('Unable to save to wishlist. Please try again.', 'error');
                return false;
            }
        } else {
            const response = await fetch(`${API.wishlist}${eventId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                showToast(`🗑️ "${eventTitle}" has been removed from your wishlist`, 'info');
                
                let wishlist = JSON.parse(localStorage.getItem('event_wishlist') || '[]');
                wishlist = wishlist.filter(id => id != eventId);
                localStorage.setItem('event_wishlist', JSON.stringify(wishlist));
                window.dispatchEvent(new Event('wishlist-updated'));
                window.dispatchEvent(new Event('storage'));
                return false;
            } else {
                // Revert on error
                btnElement.classList.add('active');
                btnElement.innerHTML = '<i class="fas fa-heart"></i> Remove from Wishlist';
                showToast('Unable to remove from wishlist. Please try again.', 'error');
                return true;
            }
        }
    } catch (error) {
        console.error('Wishlist error:', error);
        showToast('Network error. Please check your connection.', 'error');
        // Revert UI
        if (wasActive) {
            btnElement.classList.add('active');
            btnElement.innerHTML = '<i class="fas fa-heart"></i> Remove from Wishlist';
        } else {
            btnElement.classList.remove('active');
            btnElement.innerHTML = '<i class="fas fa-heart"></i> Add to Wishlist';
        }
        return !wasActive;
    }
}

// ========== LOCATION & DISTANCE FUNCTIONS ==========
let venueCoordinates = null;

// Geocode address to coordinates
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Get user's current location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => {
                let errorMessage = 'Unable to get your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// Format distance for display
function formatDistance(distanceKm) {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} meters`;
    } else if (distanceKm < 10) {
        return `${distanceKm.toFixed(1)} km`;
    } else {
        return `${Math.round(distanceKm)} km`;
    }
}

// Estimate travel time based on distance
function estimateTravelTime(distanceKm, mode = 'driving') {
    let avgSpeed;
    switch(mode) {
        case 'walking':
            avgSpeed = 5; // km/h
            break;
        case 'transit':
            avgSpeed = 30; // km/h
            break;
        default:
            avgSpeed = 40; // km/h (driving in city)
    }
    const hours = distanceKm / avgSpeed;
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
    }
}

// Show location map with distance calculation
async function showLocationMap(location, venueName) {
    // Create or get modal container
    let mapModal = document.getElementById('locationMapModal');
    if (!mapModal) {
        mapModal = document.createElement('div');
        mapModal.id = 'locationMapModal';
        mapModal.className = 'location-map-modal';
        mapModal.innerHTML = `
            <div class="location-map-card">
                <div class="map-card-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Event Location</h3>
                    <button class="map-card-close">&times;</button>
                </div>
                <div class="map-card-body">
                    <div class="location-info">
                        <p><strong><i class="fas fa-building"></i> Venue:</strong> <span id="mapVenueName"></span></p>
                        <p><strong><i class="fas fa-location-dot"></i> Address:</strong> <span id="mapAddress"></span></p>
                    </div>
                    
                    <!-- Distance Info Section -->
                    <div id="distanceInfo" class="distance-info" style="display: none;">
                        <div class="distance-card">
                            <div class="distance-icon">
                                <i class="fas fa-location-arrow"></i>
                            </div>
                            <div class="distance-details">
                                <div class="distance-label">Distance from your location</div>
                                <div class="distance-value" id="distanceValue">--</div>
                                <div class="travel-time" id="travelTime">--</div>
                            </div>
                            <button id="refreshLocationBtn" class="refresh-location-btn" title="Refresh my location">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div id="mapContainer" class="map-container">
                        <div class="loading-map">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading map...</p>
                        </div>
                    </div>
                    
                    <div class="map-actions">
                        <button id="detectLocationBtn" class="detect-location-btn">
                            <i class="fas fa-location-dot"></i> Detect My Location
                        </button>
                        <button id="copyAddressBtn" class="map-copy-btn">
                            <i class="fas fa-copy"></i> Copy Address
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(mapModal);
        
        // Close button functionality
        const closeBtn = mapModal.querySelector('.map-card-close');
        closeBtn.onclick = () => {
            mapModal.classList.remove('show');
        };
        
        // Click outside to close
        mapModal.onclick = (e) => {
            if (e.target === mapModal) {
                mapModal.classList.remove('show');
            }
        };
        
        // Copy address button
        const copyBtn = mapModal.querySelector('#copyAddressBtn');
        copyBtn.onclick = () => {
            const address = document.getElementById('mapAddress').innerText;
            navigator.clipboard.writeText(address);
            showToast('📍 Venue address copied to clipboard', 'success');
        };
        
        // Detect location button
        const detectBtn = mapModal.querySelector('#detectLocationBtn');
        detectBtn.onclick = async () => {
            await detectAndShowDistance();
        };
        
        // Refresh location button
        const refreshBtn = mapModal.querySelector('#refreshLocationBtn');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                await detectAndShowDistance();
            };
        }
    }
    
    // Update modal content with location info
    const venueNameSpan = document.getElementById('mapVenueName');
    const addressSpan = document.getElementById('mapAddress');
    const mapContainer = document.getElementById('mapContainer');
    
    if (venueNameSpan) venueNameSpan.textContent = venueName || 'Event Venue';
    if (addressSpan) addressSpan.textContent = location;
    
    // Store venue address for distance calculation
    window.currentVenueAddress = location;
    window.currentVenueName = venueName;
    
    // Show modal
    mapModal.classList.add('show');
    
    // Load map
    await loadMap(location, venueName);
    
    // Auto-detect location and show distance
    await detectAndShowDistance();
}

// Load OpenStreetMap
async function loadMap(address, venueName) {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    try {
        // Geocode the address
        const coords = await geocodeAddress(address);
        if (coords) {
            venueCoordinates = coords;
            
            // Clear container
            mapContainer.innerHTML = '';
            
            // Create map container for Leaflet
            const mapDiv = document.createElement('div');
            mapDiv.id = 'leafletMap';
            mapDiv.style.width = '100%';
            mapDiv.style.height = '100%';
            mapContainer.appendChild(mapDiv);
            
            // Check if Leaflet is available, if not load it
            if (typeof L === 'undefined') {
                // Load Leaflet CSS
                const leafletCSS = document.createElement('link');
                leafletCSS.rel = 'stylesheet';
                leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(leafletCSS);
                
                // Load Leaflet JS
                const leafletJS = document.createElement('script');
                leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                leafletJS.onload = () => {
                    initLeafletMap(coords, venueName);
                };
                document.head.appendChild(leafletJS);
            } else {
                initLeafletMap(coords, venueName);
            }
        } else {
            mapContainer.innerHTML = `
                <div class="static-map-fallback">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>Unable to load map</p>
                    <small>Address: ${escapeHtml(address)}</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Map loading error:', error);
        mapContainer.innerHTML = `
            <div class="static-map-fallback">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading map</p>
                <small>Please try again later</small>
            </div>
        `;
    }
}

// Initialize Leaflet map
function initLeafletMap(coords, venueName) {
    const mapDiv = document.getElementById('leafletMap');
    if (!mapDiv) return;
    
    const map = L.map('leafletMap').setView([coords.lat, coords.lon], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);
    
    // Add marker for venue
    const venueMarker = L.marker([coords.lat, coords.lon]).addTo(map);
    venueMarker.bindPopup(`<b>${escapeHtml(venueName || 'Event Venue')}</b>`).openPopup();
    
    // Store map for later use
    window.currentLeafletMap = map;
    window.venueMarker = venueMarker;
}

// Detect user location and calculate distance
async function detectAndShowDistance() {
    const distanceInfoDiv = document.getElementById('distanceInfo');
    const distanceValueSpan = document.getElementById('distanceValue');
    const travelTimeSpan = document.getElementById('travelTime');
    const detectBtn = document.getElementById('detectLocationBtn');
    
    if (!distanceInfoDiv) return;
    
    // Show loading state
    distanceInfoDiv.style.display = 'block';
    distanceValueSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    travelTimeSpan.innerHTML = '';
    
    if (detectBtn) {
        detectBtn.disabled = true;
        detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    }
    
    try {
        // Get user's location
        const userLocation = await getUserLocation();
        
        // Get venue coordinates if not already cached
        if (!venueCoordinates) {
            venueCoordinates = await geocodeAddress(window.currentVenueAddress);
        }
        
        if (venueCoordinates && userLocation) {
            // Calculate distance
            const distanceKm = calculateDistance(
                userLocation.lat, userLocation.lon,
                venueCoordinates.lat, venueCoordinates.lon
            );
            
            const formattedDistance = formatDistance(distanceKm);
            const travelTime = estimateTravelTime(distanceKm, 'driving');
            
            distanceValueSpan.innerHTML = formattedDistance;
            travelTimeSpan.innerHTML = `<i class="fas fa-car"></i> Approximately ${travelTime} by car`;
            
            // Add a marker for user location on the map if map exists
            if (window.currentLeafletMap && userLocation) {
                // Remove existing user marker if any
                if (window.userMarker) {
                    window.currentLeafletMap.removeLayer(window.userMarker);
                }
                
                // Add user location marker
                window.userMarker = L.marker([userLocation.lat, userLocation.lon], {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<i class="fas fa-user-circle" style="font-size: 20px; color: #3b82f6; text-shadow: 0 0 3px white;"></i>',
                        iconSize: [20, 20],
                        popupAnchor: [0, -10]
                    })
                }).addTo(window.currentLeafletMap);
                window.userMarker.bindPopup('Your Location').openPopup();
                
                // Fit bounds to show both markers
                const bounds = L.latLngBounds([
                    [userLocation.lat, userLocation.lon],
                    [venueCoordinates.lat, venueCoordinates.lon]
                ]);
                window.currentLeafletMap.fitBounds(bounds, { padding: [50, 50] });
            }
            
            // Add a class to show success
            distanceInfoDiv.classList.add('has-distance');
        } else {
            distanceValueSpan.innerHTML = 'Unable to calculate distance';
            travelTimeSpan.innerHTML = 'Please verify the venue address';
        }
    } catch (error) {
        console.error('Distance detection error:', error);
        distanceValueSpan.innerHTML = error.message || 'Location detection failed';
        travelTimeSpan.innerHTML = 'Please enable location access or enter address manually';
        distanceInfoDiv.classList.add('error');
    } finally {
        if (detectBtn) {
            detectBtn.disabled = false;
            detectBtn.innerHTML = '<i class="fas fa-location-dot"></i> Detect My Location';
        }
    }
}

// Review Modal functions
function setupReviewModal(eventId) {
    const modal = document.getElementById('reviewModal');
    const writeBtn = document.getElementById('writeReviewBtn');
    const closeBtn = document.querySelector('.modal-close');
    
    if (!writeBtn) return;
    
    writeBtn.onclick = () => {
        if (!isAuthenticated()) {
            showToast('🔐 Please login to write a review', 'info');
            setTimeout(() => window.location.href = '/login/', 1500);
            return;
        }
        if (modal) modal.style.display = 'flex';
        resetRatingStars();
    };
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal) modal.style.display = 'none';
            resetReviewForm();
        };
    }
    
    if (modal) {
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                resetReviewForm();
            }
        };
    }
    
    setupRatingStars();
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.onsubmit = (e) => {
            e.preventDefault();
            submitReview(eventId);
        };
    }
}

function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-select i');
    const ratingInput = document.getElementById('reviewRating');
    if (!stars.length) return;
    
    stars.forEach(star => {
        star.onclick = function() {
            const rating = parseInt(this.dataset.rating);
            if (ratingInput) ratingInput.value = rating;
            stars.forEach((s, i) => {
                s.style.color = i < rating ? '#f59e0b' : '#cbd5e1';
            });
        };
        
        star.onmouseenter = function() {
            const rating = parseInt(this.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < rating ? '#f59e0b' : '#cbd5e1';
            });
        };
    });

    const container = document.querySelector('.rating-select');
    if (container) {
        container.onmouseleave = function() {
            const currentRating = parseInt(ratingInput?.value || 5);
            stars.forEach((s, i) => {
                s.style.color = i < currentRating ? '#f59e0b' : '#cbd5e1';
            });
        };
    }
}

function resetRatingStars() {
    const stars = document.querySelectorAll('.rating-select i');
    const ratingInput = document.getElementById('reviewRating');
    if (ratingInput) ratingInput.value = 5;
    stars.forEach((s, i) => {
        s.style.color = i < 5 ? '#f59e0b' : '#cbd5e1';
    });
}

function resetReviewForm() {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) reviewForm.reset();
    resetRatingStars();
}

async function submitReview(eventId) {
    const rating = parseInt(document.getElementById('reviewRating')?.value || 0, 10);
    const content = document.getElementById('reviewText')?.value.trim();

    if (rating < 1 || rating > 5) {
        showToast('Please select a rating between 1 and 5', 'error');
        return;
    }
    if (!content) {
        showToast('Please write your review before submitting', 'error');
        return;
    }

    const token = localStorage.getItem('attendee_access_token');
    if (!token) {
        showToast('Please login to write a review', 'info');
        return;
    }

    try {
        const response = await fetch(`/api/attendee/reviews/create/${eventId}/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ rating, comment: content }),
        });
        let data = {};
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error('Could not submit review. Please try again.');
        }
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not submit review');
        }

        await loadEventReviewsFromApi(eventId);
        updateReviewsUI(eventId);

        const modal = document.getElementById('reviewModal');
        if (modal) modal.style.display = 'none';
        resetReviewForm();
        showToast('Thank you for your review!', 'success');
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast(error.message || 'Could not submit review', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Book ticket function - FIXED: Only one item per event, no duplicate add
function bookTicket(event, quantity = 1, tier = 'Regular') {
    if (!isAuthenticated()) {
        showToast('🔐 Please login to continue with ticket booking', 'info');
        setTimeout(() => window.location.href = '/login/', 1500);
        return false;
    }
    
    if (event.available_tickets <= 0) {
        showToast('🎫 Sorry, tickets for this event are sold out!', 'error');
        return false;
    }
    
    let price = event.price;
    if (tier === 'VIP' && event.vip_price) price = event.vip_price;
    if (tier === 'VVIP' && event.vvip_price) price = event.vvip_price;
    
    // Get existing cart
    let cart = JSON.parse(localStorage.getItem('eventhub_cart') || '{"items":[]}');
    const existingIndex = cart.items.findIndex(i => i.id === event.id);
    
    if (existingIndex !== -1) {
        // Item already exists in cart - cannot add duplicate
        showToast(`⚠️ "${event.title}" is already in your cart. Proceed to checkout to complete your booking.`, 'info');
        return false;
    } else {
        const storage = window.EventhubCartStorage;
        const newItem = storage?.buildCartItemFromEvent
            ? storage.buildCartItemFromEvent(event, { tier, ticket_type: tier, quantity, price })
            : {
                id: event.id,
                title: event.title,
                tier: tier,
                ticket_type: tier,
                price: price,
                quantity: quantity,
                image: event.image,
                date: event.date,
                location: event.location,
                category: event.category || event.category_name,
                organizer_id: event.organizer_id,
                organizer_name: event.organizer_name || event.organizer,
                organizer: event.organizer_name || event.organizer || 'Event Organizer',
            };
        cart.items.push(newItem);
        
        // Format price display for toast
        const formattedPrice = `KES ${price.toLocaleString()}`;
        showToast(`✅ "${event.title}" (${tier} tier) has been added to your cart. Total: ${formattedPrice}`, 'success');
    }
    
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.total = cart.subtotal;
    
    localStorage.setItem('eventhub_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
    
    return true;
}

// Render Event Details
async function renderEventDetails(event) {
    const container = document.getElementById('eventDetailContainer');
    if (!container) return;
    
    const avgRating = getAverageRating(event.id);
    const reviewsCount = getEventReviews(event.id).length;
    const inWishlist = await isInWishlist(event.id);
    
    // Ensure event has required fields
    event.features = event.features || ['General Admission', 'Standard Entry', 'Free Wi-Fi', 'Parking Available'];
    event.original_price = event.original_price || Math.round(event.price * 1.2);
    event.parking_available = event.parking_available !== false;
    event.wheelchair_accessible = event.wheelchair_accessible !== false;
    event.refund_policy = event.refund_policy || 'No refunds. Contact organizer for transfers.';
    event.organizer = event.organizer || event.organizer_name || 'EventHub Organizer';
    event.available_tickets = event.available_tickets || event.available_seats || 100;
    
    // Build amenities array for Venue tab
    const amenities = [];
    if (event.parking_available) amenities.push({ icon: 'fa-parking', name: 'Free Parking' });
    if (event.wheelchair_accessible) amenities.push({ icon: 'fa-wheelchair', name: 'Wheelchair Accessible' });
    amenities.push({ icon: 'fa-wifi', name: 'Free Wi-Fi' });
    amenities.push({ icon: 'fa-restroom', name: 'Restrooms Available' });
    
    container.innerHTML = `
        <div class="event-content-wrapper">
            <div class="event-main">
                <div class="event-breadcrumb">
                    <a href="/">Home</a> / 
                    <a href="/events/">Events</a> / 
                    <span class="current">${escapeHtml(event.title)}</span>
                </div>
                
                <div class="event-image-container">
                    <img src="${event.image || '/static/images/placeholder.jpg'}" alt="${escapeHtml(event.title)}" class="event-main-image" onerror="this.src='/static/images/placeholder.jpg'">
                    ${event.is_featured ? '<div class="event-featured-badge">Featured Event</div>' : ''}
                </div>
                
                <div class="event-title-section">
                    <h1>${escapeHtml(event.title)}</h1>
                    <div class="event-rating">
                        <div class="stars">${renderStars(avgRating)}</div>
                        <span class="rating-count">(${reviewsCount} reviews)</span>
                    </div>
                </div>
                
                <div class="event-meta">
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${formatDate(event.date)} at ${event.time || 'TBA'}</div>
                    <div class="meta-item"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location)}</div>
                    <div class="meta-item"><i class="fas fa-ticket-alt"></i> ${event.available_tickets} tickets left</div>
                </div>
                
                <!-- Tabs -->
                <div class="event-tabs">
                    <button class="tab-btn active" data-tab="details">Details</button>
                    <button class="tab-btn" data-tab="venue">Venue</button>
                    <button class="tab-btn" data-tab="organizer">Organizer</button>
                    <button class="tab-btn" data-tab="reviews">Reviews</button>
                </div>
                
                <!-- DETAILS TAB -->
                <div id="detailsTab" class="tab-content active">
                    <div class="event-description">
                        <h3><i class="fas fa-info-circle"></i> About This Event</h3>
                        <p>${escapeHtml(event.description || 'No description available.')}</p>
                    </div>
                    
                    <div class="event-features">
                        <h3><i class="fas fa-star"></i> Event Features</h3>
                        <ul>
                            ${event.features.map(f => `<li><i class="fas fa-check-circle"></i> ${escapeHtml(f)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <!-- VENUE TAB -->
                <div id="venueTab" class="tab-content">
                    <div class="event-venue-details">
                        <div class="venue-header">
                            <div class="venue-icon">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <h3>Venue Information</h3>
                        </div>
                        
                        <div class="venue-name">
                            <i class="fas fa-building"></i> ${escapeHtml(event.venue || event.location.split(',')[0] || 'Venue')}
                        </div>
                        
                        <div class="venue-address">
                            <i class="fas fa-location-dot"></i>
                            <span>${escapeHtml(event.location)}</span>
                        </div>
                        
                        <div class="venue-amenities">
                            ${amenities.map(a => `
                                <div class="amenity-item">
                                    <i class="fas ${a.icon}"></i>
                                    <span>${a.name}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <button class="venue-map-link" id="venueDirectionsBtn">
                            <i class="fas fa-directions"></i> Get Directions
                        </button>
                    </div>
                    
                    ${event.is_virtual ? `
                    <div class="virtual-event">
                        <div class="virtual-event-info">
                            <i class="fas fa-video"></i>
                            <p>This is a virtual event</p>
                            <a href="${event.virtual_link}" target="_blank" class="virtual-event-link">Join Online →</a>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- ORGANIZER TAB -->
                <div id="organizerTab" class="tab-content">
                    <div class="organizer-info">
                        <div class="organizer-header">
                            <div class="organizer-avatar">
                                ${event.organizer.charAt(0).toUpperCase()}
                            </div>
                            <h3>About the Organizer</h3>
                        </div>
                        
                        <div class="organizer-contact">
                            <p><i class="fas fa-building"></i> <strong>${escapeHtml(event.organizer)}</strong></p>
                            ${event.organizer_email ? `<p><i class="fas fa-envelope"></i> <a href="mailto:${escapeHtml(event.organizer_email)}">${escapeHtml(event.organizer_email)}</a></p>` : ''}
                            ${event.organizer_phone ? `<p><i class="fas fa-phone"></i> <a href="tel:${escapeHtml(event.organizer_phone)}">${escapeHtml(event.organizer_phone)}</a></p>` : ''}
                        </div>
                        
                        <div class="refund-policy">
                            <p><i class="fas fa-ticket-alt"></i> <strong>Refund Policy:</strong> ${escapeHtml(event.refund_policy)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- REVIEWS TAB -->
                <div id="reviewsTab" class="tab-content">
                    <div class="reviews-summary">
                        <div class="average-rating">
                            <div class="rating-number">${avgRating.toFixed(1)}</div>
                            <div class="stars-large">${renderStars(avgRating)}</div>
                            <div class="total-reviews">Based on ${reviewsCount} reviews</div>
                        </div>
                        <button id="writeReviewBtn" class="write-review-btn">
                            <i class="fas fa-pen"></i> Write a Review
                        </button>
                    </div>
                    <div id="reviewsList" class="reviews-list">
                        ${renderReviewsList(event.id)}
                    </div>
                </div>
            </div>
            
            <!-- SIDEBAR - TICKET CARD -->
            <div class="event-sidebar">
                <div class="ticket-card">
                    <h3><i class="fas fa-ticket-alt"></i> Get Your Tickets</h3>
                    
                    ${(event.vip_price || event.vvip_price) ? `
                    <div class="ticket-tier-selector">
                        <label><i class="fas fa-layer-group"></i> Select Ticket Tier</label>
                        <select id="ticketTier" class="form-select">
                            <option value="Regular" data-price="${event.price}">🎟️ Regular - KES ${event.price.toLocaleString()}</option>
                            ${event.vip_price ? `<option value="VIP" data-price="${event.vip_price}">✨ VIP - KES ${event.vip_price.toLocaleString()}</option>` : ''}
                            ${event.vvip_price ? `<option value="VVIP" data-price="${event.vvip_price}">👑 VVIP - KES ${event.vvip_price.toLocaleString()}</option>` : ''}
                        </select>
                    </div>
                    ` : ''}

                    <div class="ticket-price-info">
                        <span class="current-price" id="displayPrice">KES ${event.price.toLocaleString()}</span>
                        ${event.original_price ? `<span class="original-price">KES ${event.original_price.toLocaleString()}</span>` : ''}
                        <div class="price-label">per ticket</div>
                    </div>
                    
                    <div class="ticket-availability">
                        <i class="fas ${event.available_tickets > 50 ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> 
                        ${event.available_tickets} tickets available
                    </div>
                    
                    <div class="ticket-quantity">
                        <label><i class="fas fa-sort-amount-up"></i> Quantity</label>
                        <div class="quantity-selector">
                            <button class="qty-btn" id="decreaseQty">−</button>
                            <input type="number" id="ticketQuantity" value="1" min="1" max="${event.available_tickets}">
                            <button class="qty-btn" id="increaseQty">+</button>
                        </div>
                    </div>
                    
                    <div class="ticket-total">
                        <span>Total Amount:</span>
                        <span class="total-amount" id="totalAmount">KES ${event.price.toLocaleString()}</span>
                    </div>
                    
                    <button id="bookNowBtn" class="book-now-btn">
                        <i class="fas fa-bolt"></i> Book Ticket Now
                    </button>
                    
                    <button id="wishlistBtn" class="wishlist-sidebar-btn ${inWishlist ? 'active' : ''}">
                        <i class="fas fa-heart"></i> ${inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                    
                    <div class="ticket-info">
                        <p><i class="fas fa-shield-alt"></i> Secure booking guaranteed</p>
                        <p><i class="fas fa-envelope"></i> E-tickets sent to your email</p>
                        <p><i class="fas fa-mobile-alt"></i> Mobile tickets available</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Setup tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = {
        details: document.getElementById('detailsTab'),
        venue: document.getElementById('venueTab'),
        organizer: document.getElementById('organizerTab'),
        reviews: document.getElementById('reviewsTab')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            Object.values(tabContents).forEach(content => {
                if (content) content.classList.remove('active');
            });
            tab.classList.add('active');
            if (tabContents[tabId]) tabContents[tabId].classList.add('active');
        });
    });
    
    // Venue directions button - Opens map modal with distance calculation
    const venueDirectionsBtn = document.getElementById('venueDirectionsBtn');
    if (venueDirectionsBtn) {
        venueDirectionsBtn.onclick = () => {
            showLocationMap(event.location, event.venue || event.location);
        };
    }
    
    // Setup quantity selector
    let quantity = 1;
    const qtyInput = document.getElementById('ticketQuantity');
    const totalSpan = document.getElementById('totalAmount');
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');
    const bookBtn = document.getElementById('bookNowBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');
    
    function getSelectedPrice() {
        const tierSelect = document.getElementById('ticketTier');
        if (tierSelect && tierSelect.selectedIndex >= 0) {
            const selectedOpt = tierSelect.options[tierSelect.selectedIndex];
            return parseFloat(selectedOpt.dataset.price) || event.price;
        }
        return event.price;
    }
    
    function getSelectedTier() {
        const tierSelect = document.getElementById('ticketTier');
        return tierSelect ? tierSelect.value : 'Regular';
    }
    
    function updateTotal() {
        const currentPrice = getSelectedPrice();
        const total = quantity * currentPrice;
        totalSpan.textContent = `KES ${total.toLocaleString()}`;
        const displayPriceEl = document.getElementById('displayPrice');
        if (displayPriceEl) {
            displayPriceEl.textContent = `KES ${currentPrice.toLocaleString()}`;
        }
    }
    
    const tierSelect = document.getElementById('ticketTier');
    if (tierSelect) {
        tierSelect.onchange = updateTotal;
    }
    
    if (decreaseBtn) {
        decreaseBtn.onclick = () => {
            if (quantity > 1) {
                quantity--;
                qtyInput.value = quantity;
                updateTotal();
            }
        };
    }
    
    if (increaseBtn) {
        increaseBtn.onclick = () => {
            if (quantity < event.available_tickets) {
                quantity++;
                qtyInput.value = quantity;
                updateTotal();
            }
        };
    }
    
    if (qtyInput) {
        qtyInput.onchange = () => {
            quantity = parseInt(qtyInput.value) || 1;
            if (quantity < 1) quantity = 1;
            if (quantity > event.available_tickets) quantity = event.available_tickets;
            qtyInput.value = quantity;
            updateTotal();
        };
    }
    
    if (bookBtn) {
        bookBtn.onclick = () => {
            bookTicket(event, quantity, getSelectedTier());
        };
    }
    
    if (wishlistBtn) {
        wishlistBtn.onclick = async () => {
            await toggleWishlist(event.id, wishlistBtn, event.title);
        };
    }
    
    setupReviewModal(event.id);
}

async function loadEventDetails() {
    const container = document.getElementById('eventDetailContainer');
    if (!container) return;
    
    if (!eventId) {
        container.innerHTML = '<div class="error-state">Event not found</div>';
        return;
    }
    
    try {
        const response = await fetch(`/api/attendee/events/${eventId}/`);
        const data = await response.json();
        
        if (data.success && data.event) {
            await loadEventReviewsFromApi(eventId);
            await renderEventDetails(data.event);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Event Not Found</h2>
                    <p>The event you're looking for doesn't exist or has been removed.</p>
                    <a href="/events/" class="btn-primary">Browse Events</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching event details:', error);
        container.innerHTML = '<div class="error-state">Error loading event details. Please try again.</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadEventDetails);