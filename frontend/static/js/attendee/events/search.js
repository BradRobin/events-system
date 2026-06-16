// ============================================
// ATTENDEE SEARCH - Live API Integration
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentQuery = '';
let lastSearchResults = [];
let currentFilters = {
    category: '',
    city: '',
    sort: 'relevance'
};

// API endpoints
const API = {
    search: '/api/attendee/events/search/',
    categories: '/api/attendee/categories/',
};

// DOM Elements
const searchResultsGrid = document.getElementById('searchResultsGrid');
const resultsCount = document.getElementById('resultsCount');
const searchQueryInfo = document.getElementById('searchQueryInfo');
const categoryFilter = document.getElementById('categoryFilter');
const cityFilter = document.getElementById('cityFilter');
const sortSelect = document.getElementById('sortBy');

function renderStreamLoader(isSearch = false) {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="stream-loader">
            <div class="stream-loader-spinner"></div>
            <h3 class="stream-loader-title">${isSearch ? "Searching Event Registry" : "Scanning Event Registry"}</h3>
            <div class="stream-loader-steps">
                <div class="loader-step active" id="step-connect">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <span>Connecting to database...</span>
                </div>
                <div class="loader-step pending" id="step-categories">
                    <i class="far fa-circle"></i>
                    <span>Loading filter categories...</span>
                </div>
                <div class="loader-step pending" id="step-events">
                    <i class="far fa-circle"></i>
                    <span>Retrieving matches...</span>
                </div>
                <div class="loader-step pending" id="step-render">
                    <i class="far fa-circle"></i>
                    <span>Rendering displays...</span>
                </div>
            </div>
        </div>
    `;
}

function updateStep(stepId, status) {
    const el = document.getElementById(stepId);
    if (!el) return;
    
    const icon = el.querySelector('i');
    
    if (status === 'completed') {
        el.className = 'loader-step completed';
        if (icon) {
            icon.className = 'fas fa-check-circle';
        }
    } else if (status === 'active') {
        el.className = 'loader-step active';
        if (icon) {
            icon.className = 'fas fa-circle-notch fa-spin';
        }
    } else if (status === 'pending') {
        el.className = 'loader-step pending';
        if (icon) {
            icon.className = 'far fa-circle';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuery = urlParams.get('q') || '';
    
    if (searchQueryInfo) {
        searchQueryInfo.innerHTML = `Showing results for "<strong>${escapeHtml(currentQuery)}</strong>"`;
    }
    
    setupEventListeners();
    await runSearchSequence();
});

async function runSearchSequence() {
    renderStreamLoader(true);
    updateStep('step-connect', 'active');
    
    // Start both fetches concurrently
    const categoriesPromise = loadCategories();
    const searchPromise = loadSearchResults(true);
    
    updateStep('step-connect', 'completed');
    updateStep('step-categories', 'active');
    updateStep('step-events', 'active');
    
    await categoriesPromise;
    updateStep('step-categories', 'completed');
    
    await searchPromise;
}

function setupEventListeners() {
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentFilters.category = categoryFilter.value;
            currentPage = 1;
            loadSearchResults();
        });
    }
    
    if (cityFilter) {
        cityFilter.addEventListener('change', () => {
            currentFilters.city = cityFilter.value;
            currentPage = 1;
            loadSearchResults();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentFilters.sort = sortSelect.value;
            currentPage = 1;
            loadSearchResults();
        });
    }
}

async function loadCategories() {
    try {
        const response = await fetch(API.categories);
        const data = await response.json();
        
        if (data.success && data.categories) {
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
                    data.categories.map(c => `<option value="${c.slug || c.id}">${escapeHtml(c.name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
        }
    }
}

async function loadSearchResults(isInitialLoad = false) {
    if (!isInitialLoad) {
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="stream-loader">
                    <div class="stream-loader-spinner"></div>
                    <h3 class="stream-loader-title">Searching registry...</h3>
                </div>
            `;
        }
    }

    try {
        const params = new URLSearchParams({
            q: currentQuery,
            page: currentPage,
            limit: 12
        });
        
        if (currentFilters.category) {
            params.append('category', currentFilters.category);
        }
        
        if (currentFilters.city) {
            params.append('city', currentFilters.city);
        }
        
        if (currentFilters.sort && currentFilters.sort !== 'relevance') {
            params.append('sort', currentFilters.sort);
        }
        
        const response = await fetch(`${API.search}?${params}`);
        const data = await response.json();
        
        if (isInitialLoad) {
            updateStep('step-events', 'completed');
            updateStep('step-render', 'active');
            await new Promise(resolve => setTimeout(resolve, 50)); // smooth visual transition
        }
        
        if (data.success) {
            const events = data.events || [];
            const total = data.total_count || 0;
            totalPages = data.total_pages || Math.ceil(total / 12);
            
            displayResults(events);
            renderPagination(currentPage, totalPages);
            
            if (resultsCount) {
                resultsCount.textContent = `Found ${total} event${total !== 1 ? 's' : ''}`;
            }
        } else {
            throw new Error(data.message || 'Search failed');
        }
        
    } catch (error) {
        console.error('Error searching:', error);
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Search Failed</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button class="btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
}

function displayResults(events) {
    if (!searchResultsGrid) return;

    lastSearchResults = events || [];
    
    if (!events || events.length === 0) {
        searchResultsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>We couldn't find any events matching "${escapeHtml(currentQuery)}".</p>
                <p>Try adjusting your search terms or browse all events.</p>
                <a href="/events/" class="btn-primary">Browse All Events</a>
            </div>
        `;
        return;
    }
    
    searchResultsGrid.innerHTML = events.map(event => `
        <div class="premium-card" onclick="window.location.href='/events/detail/?id=${event.id}'" style="cursor: pointer;">
            <div class="card-image-container">
                <img src="${event.image || '/static/images/placeholder.jpg'}" alt="${event.title}" class="card-bg-image" onerror="this.src='/static/images/placeholder.jpg'">
                <div class="card-gradient-overlay"></div>
                ${event.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                <span class="event-category">${escapeHtml(event.category_name || event.category || 'Event')}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${escapeHtml(event.title)}</h3>
                <div class="card-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(event.date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location ? event.location.split(',')[0] : 'TBD')}</span>
                </div>
                <div class="card-price">KES ${(event.price || 0).toLocaleString()}</div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn view-details-btn" onclick="event.stopPropagation(); window.location.href='/events/detail/?id=${event.id}'">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="card-action-btn add-to-cart-btn" data-event-id="${event.id}" onclick="event.stopPropagation(); addToCart(${event.id})">
                    <i class="fas fa-cart-plus"></i> Book Now
                </button>
            </div>
        </div>
    `).join('');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-wrapper">';
    html += `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button class="page-btn" ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    html += '</div>';
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadSearchResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function formatDate(dateString) {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 20px;
        border-radius: 12px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function addToCart(eventId) {
    const event = lastSearchResults.find((e) => e.id == eventId);
    if (!event) {
        showToast('Event not found. Please refresh and try again.', 'error');
        return;
    }

    const token = localStorage.getItem('attendee_access_token');
    
    if (!token) {
        showToast('Please login to book tickets', 'info');
        setTimeout(() => {
            localStorage.setItem('redirect_after_login', window.location.pathname + window.location.search);
            window.location.href = '/login/';
        }, 1500);
        return;
    }
    
    const storage = window.EventhubCartStorage;
    const cart = storage ? storage.loadEventhubCart() : { items: [], subtotal: 0, platform_fee: 0, total: 0 };

    const existingItem = cart.items.find(i => i.id == eventId);
    if (existingItem) {
        showToast(`${event.title} is already in your cart!`, 'info');
        return;
    }

    const item = storage?.buildCartItemFromEvent
        ? storage.buildCartItemFromEvent(event, { quantity: 1 })
        : storage
        ? storage.slimCartItem({
            id: event.id,
            title: event.title,
            price: event.price || 0,
            quantity: 1,
            image: event.image || event.banner_image || '',
            location: event.location || event.venue || 'Event Venue',
            date: event.date || event.start_date || new Date().toISOString(),
            ticket_type: 'regular',
            organizer_id: event.organizer_id,
            organizer_name: event.organizer_name,
            organizer: event.organizer_name || 'Event Organizer',
        })
        : {
            id: event.id,
            title: event.title,
            price: event.price || 0,
            quantity: 1,
            location: event.location || event.venue || 'Event Venue',
            date: event.date || event.start_date || new Date().toISOString(),
            ticket_type: 'regular',
            organizer_id: event.organizer_id,
            organizer_name: event.organizer_name,
            organizer: event.organizer_name || 'Event Organizer',
        };

    cart.items.push(item);
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    cart.platform_fee = 0;
    cart.total = cart.subtotal;

    try {
        if (storage) {
            storage.saveEventhubCart(cart);
        } else {
            localStorage.setItem('eventhub_cart', JSON.stringify(cart));
        }
        window.dispatchEvent(new Event('cart-updated'));
        showToast(`${event.title} added to cart!`, 'success');
    } catch (error) {
        console.error('Failed to save cart:', error);
        showToast('Could not save cart. Please clear site data or book from the event page.', 'error');
    }
}

window.changePage = changePage;
window.addToCart = addToCart;
