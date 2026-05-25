// ============================================
// ATTENDEE EVENTS LIST - Complete Functionality
// ============================================

let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let currentFilters = {
    category: '',
    city: '',
    date: 'upcoming',
    search: '',
    sort: 'date',
    price_min: '',
    price_max: ''
};

// DOM Elements
const eventsGrid = document.getElementById('eventsGrid');
const resultsCount = document.getElementById('resultsCount');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchEvents');
const categoryFilter = document.getElementById('categoryFilter');
const cityFilter = document.getElementById('cityFilter');
const dateFilter = document.getElementById('dateFilter');
const sortSelect = document.getElementById('sortBy');
const priceMin = document.getElementById('priceMin');
const priceMax = document.getElementById('priceMax');
const filtersPanel = document.getElementById('filtersPanel');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    loadCategories();
    loadCities();
    setupEventListeners();
    setupInfiniteScroll();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentFilters.search = searchInput.value;
            currentPage = 1;
            loadEvents();
        }, 500));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentFilters.category = categoryFilter.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    if (cityFilter) {
        cityFilter.addEventListener('change', () => {
            currentFilters.city = cityFilter.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            currentFilters.date = dateFilter.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentFilters.sort = sortSelect.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    if (priceMin && priceMax) {
        const applyPrice = debounce(() => {
            currentFilters.price_min = priceMin.value;
            currentFilters.price_max = priceMax.value;
            currentPage = 1;
            loadEvents();
        }, 500);
        priceMin.addEventListener('input', applyPrice);
        priceMax.addEventListener('input', applyPrice);
    }
}

async function loadCategories() {
    try {
        const categories = await window.AttendeeAPIEndpoints.events.getCategories();
        if (categoryFilter && categories && categories.length) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
                categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function loadCities() {
    const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 'Kitale'];
    if (cityFilter) {
        cityFilter.innerHTML = '<option value="">All Cities</option>' + 
            cities.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

async function loadEvents() {
    if (isLoading) return;
    isLoading = true;
    
    if (currentPage === 1) {
        if (window.Loader) window.Loader.show('Loading events...');
    } else {
        showSkeletonLoader();
    }
    
    try {
        const result = await window.AttendeeAPIEndpoints.events.getAll(
            currentPage, 
            12, 
            currentFilters
        );
        
        const events = result.results || result;
        const total = result.count || events.length;
        totalPages = result.total_pages || Math.ceil(total / 12);
        
        if (currentPage === 1) {
            displayEvents(events);
        } else {
            appendEvents(events);
        }
        
        updateLoadMoreButton();
        
        if (resultsCount) {
            const start = (currentPage - 1) * 12 + 1;
            const end = Math.min(start + events.length - 1, total);
            resultsCount.textContent = `Showing ${start}-${end} of ${total} events`;
        }
        
    } catch (error) {
        console.error('Error loading events:', error);
        if (currentPage === 1 && eventsGrid) {
            eventsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Events</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button class="btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    } finally {
        isLoading = false;
        if (window.Loader) window.Loader.hide();
        hideSkeletonLoader();
    }
}

function displayEvents(events) {
    if (!eventsGrid) return;
    
    if (!events || events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No events found</h3>
                <p>Try adjusting your filters or search term.</p>
                <button class="btn-primary" onclick="resetFilters()">Reset Filters</button>
            </div>
        `;
        return;
    }
    
    eventsGrid.innerHTML = events.map(event => createEventCard(event)).join('');
}

function appendEvents(events) {
    if (eventsGrid && events && events.length) {
        eventsGrid.insertAdjacentHTML('beforeend', events.map(event => createEventCard(event)).join(''));
    }
}

function createEventCard(event) {
    const fillRate = event.total_capacity > 0 ? ((event.total_capacity - (event.available_tickets || 0)) / event.total_capacity) * 100 : 0;
    const isLowStock = event.available_tickets > 0 && event.available_tickets <= 20;
    const isSoldOut = event.available_tickets === 0;
    
    return `
        <div class="event-card" onclick="window.location.href='/attendee/events/detail/?id=${event.id}'">
            <div class="event-banner" style="background-image: url('${event.banner_image || '/static/images/placeholder.jpg'}')">
                ${event.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                ${isLowStock ? '<span class="low-stock-badge">Low Stock!</span>' : ''}
                ${isSoldOut ? '<span class="sold-out-badge">Sold Out</span>' : ''}
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
                    <div class="event-availability">
                        ${!isSoldOut ? 
                            `<div class="availability-bar">
                                <div class="availability-fill" style="width: ${fillRate}%"></div>
                            </div>
                            <span>${event.available_tickets} left</span>` : 
                            '<span class="sold-out">Sold Out</span>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showSkeletonLoader() {
    if (eventsGrid && currentPage > 1) {
        const skeletonCards = Array(4).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-banner"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                    <div class="skeleton-line price"></div>
                </div>
            </div>
        `).join('');
        eventsGrid.insertAdjacentHTML('beforeend', skeletonCards);
    }
}

function hideSkeletonLoader() {
    const skeletons = document.querySelectorAll('.skeleton-card');
    skeletons.forEach(skeleton => skeleton.remove());
}

function updateLoadMoreButton() {
    if (loadMoreBtn) {
        if (currentPage < totalPages) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

function loadMore() {
    if (!isLoading && currentPage < totalPages) {
        currentPage++;
        loadEvents();
    }
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (isLoading) return;
        
        const scrollPosition = window.innerHeight + window.scrollY;
        const bottom = document.documentElement.scrollHeight - 500;
        
        if (scrollPosition >= bottom && currentPage < totalPages) {
            loadMore();
        }
    });
}

function resetFilters() {
    currentFilters = {
        category: '',
        city: '',
        date: 'upcoming',
        search: '',
        sort: 'date',
        price_min: '',
        price_max: ''
    };
    currentPage = 1;
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (cityFilter) cityFilter.value = '';
    if (dateFilter) dateFilter.value = 'upcoming';
    if (sortSelect) sortSelect.value = 'date';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    
    loadEvents();
}

function toggleFilters() {
    if (filtersPanel) {
        filtersPanel.classList.toggle('open');
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE');
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

// Make functions global
window.loadMore = loadMore;
window.resetFilters = resetFilters;
window.toggleFilters = toggleFilters;