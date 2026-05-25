// ============================================
// ATTENDEE EVENT LIST
// Handles: Event listing, filters, search, pagination, grid/list toggle
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentView = 'grid';
let currentFilters = {
    search: '',
    category: '',
    min_price: '',
    max_price: '',
    sort: 'date',
    location: '',
    date: ''
};

let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    setupEventListeners();
    loadCategories();
    loadEvents();
});

// Initialize page
function initializePage() {
    // Load filters from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentFilters.search = urlParams.get('search') || '';
    currentFilters.category = urlParams.get('category') || '';
    currentFilters.sort = urlParams.get('sort') || 'date';
    
    // Set input values
    document.getElementById('searchInput').value = currentFilters.search;
    document.getElementById('sortBy').value = currentFilters.sort;
    
    // Restore view preference
    const savedView = localStorage.getItem('eventListView');
    if (savedView) toggleView(savedView);
}

// Load events with current filters
async function loadEvents() {
    showLoading();
    
    const params = {
        page: currentPage,
        ...currentFilters
    };
    
    const data = await EventAPI.Attendee.getEvents(params);
    if (data) {
        displayEvents(data.results || []);
        totalPages = data.total_pages || 1;
        updatePagination();
        updateResultsCount(data.count || 0);
    }
    
    hideLoading();
}

// Display events in grid or list view
function displayEvents(events) {
    const gridContainer = document.getElementById('eventsGrid');
    const listContainer = document.getElementById('eventsList');
    
    if (!events.length) {
        const emptyMessage = `
            <div class="no-results">
                <i class="fas fa-calendar-times fa-4x"></i>
                <h3>No events found</h3>
                <p>Try adjusting your filters or check back later</p>
                <button onclick="resetFilters()" class="btn-reset">Reset Filters</button>
            </div>
        `;
        gridContainer.innerHTML = emptyMessage;
        listContainer.innerHTML = emptyMessage;
        return;
    }
    
    // Grid View
    gridContainer.innerHTML = events.map(event => `
        <div class="event-card" data-event-id="${event.id}" onclick="window.location.href='/event/${event.id}/'">
            <div class="event-image">
                ${event.banner_image ? 
                    `<img src="${event.banner_image}" alt="${event.title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                <span class="event-price">KES ${event.price.toLocaleString()}</span>
                ${event.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
            <div class="event-info">
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleDateString()}</span>
                </div>
                <p class="event-description">${event.description?.substring(0, 100) || ''}...</p>
                <div class="event-footer">
                    <div class="seats-info">
                        <i class="fas fa-users"></i>
                        <span class="${event.available_seats < 10 ? 'low-stock' : ''}">${event.available_seats} seats left</span>
                    </div>
                    <button class="btn-book">Book Now →</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // List View
    listContainer.innerHTML = events.map(event => `
        <div class="event-list-item" onclick="window.location.href='/event/${event.id}/'">
            <div class="list-item-image">
                ${event.banner_image ? 
                    `<img src="${event.banner_image}" alt="${event.title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
            </div>
            <div class="list-item-info">
                <h3>${event.title}</h3>
                <div class="list-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleDateString()}</span>
                    <span><i class="fas fa-tag"></i> KES ${event.price.toLocaleString()}</span>
                </div>
                <p>${event.description?.substring(0, 150) || ''}...</p>
                <div class="list-footer">
                    <span class="seats">${event.available_seats} seats available</span>
                    <span class="category-badge">${event.category_name || 'Event'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Load categories for filter dropdown
async function loadCategories() {
    const categories = await EventAPI.Attendee.getCategories();
    if (categories && categories.length) {
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">All Categories</option>' + 
            categories.map(cat => `<option value="${cat.slug}" ${currentFilters.category === cat.slug ? 'selected' : ''}>${cat.name} (${cat.event_count})</option>`).join('');
    }
}

// Apply filters
function applyFilters() {
    currentFilters = {
        search: document.getElementById('searchInput').value,
        category: document.getElementById('categoryFilter').value,
        min_price: document.getElementById('minPrice').value,
        max_price: document.getElementById('maxPrice').value,
        sort: document.getElementById('sortBy').value,
        location: document.getElementById('locationFilter')?.value || '',
        date: document.getElementById('dateFilter')?.value || ''
    };
    currentPage = 1;
    loadEvents();
    
    // Update URL
    const params = new URLSearchParams(currentFilters);
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
}

// Reset all filters
function resetFilters() {
    currentFilters = {
        search: '',
        category: '',
        min_price: '',
        max_price: '',
        sort: 'date',
        location: '',
        date: ''
    };
    currentPage = 1;
    
    // Clear input fields
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortBy').value = 'date';
    document.getElementById('locationFilter') && (document.getElementById('locationFilter').value = '');
    document.getElementById('dateFilter') && (document.getElementById('dateFilter').value = '');
    
    loadEvents();
}

// Toggle between grid and list view
function toggleView(view) {
    currentView = view;
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const btns = document.querySelectorAll('.view-btn');
    
    btns.forEach(btn => btn.classList.remove('active'));
    if (view === 'grid') {
        gridView.style.display = 'grid';
        listView.style.display = 'none';
        document.querySelector('.view-btn.grid').classList.add('active');
    } else {
        gridView.style.display = 'none';
        listView.style.display = 'block';
        document.querySelector('.view-btn.list').classList.add('active');
    }
    
    localStorage.setItem('eventListView', view);
}

// Update pagination controls
function updatePagination() {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';
    
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i> Prev</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    
    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})">Next <i class="fas fa-chevron-right"></i></button>`;
    }
    
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateResultsCount(count) {
    const element = document.getElementById('resultsCount');
    if (element) {
        element.innerHTML = `<i class="fas fa-calendar-alt"></i> ${count} events found`;
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 500);
        });
    }
    
    const filterInputs = ['categoryFilter', 'minPrice', 'maxPrice', 'sortBy', 'locationFilter', 'dateFilter'];
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });
}

function showLoading() {
    const container = document.getElementById('eventsGrid');
    if (container) {
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading events...</div>';
    }
}

function hideLoading() {
    // Loading hidden by displayEvents
}
