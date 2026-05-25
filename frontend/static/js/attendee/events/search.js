// ============================================
// ATTENDEE SEARCH - Complete Functionality
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentQuery = '';
let currentFilters = {
    category: '',
    city: '',
    sort: 'relevance'
};

// DOM Elements
const searchResultsGrid = document.getElementById('searchResultsGrid');
const resultsCount = document.getElementById('resultsCount');
const searchQueryInfo = document.getElementById('searchQueryInfo');
const categoryFilter = document.getElementById('categoryFilter');
const cityFilter = document.getElementById('cityFilter');
const sortSelect = document.getElementById('sortBy');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuery = urlParams.get('q') || '';
    
    if (searchQueryInfo) {
        searchQueryInfo.textContent = `Showing results for "${escapeHtml(currentQuery)}"`;
    }
    
    loadCategories();
    loadSearchResults();
    setupEventListeners();
});

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
        const categories = await window.AttendeeAPIEndpoints.events.getCategories();
        if (categoryFilter && categories && categories.length) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
                categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadSearchResults() {
    if (window.Loader) window.Loader.show('Searching...');
    
    try {
        const result = await window.AttendeeAPIEndpoints.events.search(currentQuery, {
            page: currentPage,
            category: currentFilters.category,
            city: currentFilters.city,
            sort: currentFilters.sort
        });
        
        const events = result.results || result;
        const total = result.count || events.length;
        totalPages = result.total_pages || Math.ceil(total / 12);
        
        displayResults(events);
        renderPagination(currentPage, totalPages);
        
        if (resultsCount) {
            resultsCount.textContent = `Found ${total} event${total !== 1 ? 's' : ''}`;
        }
        
    } catch (error) {
        console.error('Error searching:', error);
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Search Failed</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button class="btn-primary" onclick="loadSearchResults()">Retry</button>
                </div>
            `;
        }
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayResults(events) {
    if (!searchResultsGrid) return;
    
    if (!events || events.length === 0) {
        searchResultsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>We couldn't find any events matching "${escapeHtml(currentQuery)}".</p>
                <p>Try adjusting your search terms or browse all events.</p>
                <a href="/attendee/events/" class="btn-primary">Browse All Events</a>
            </div>
        `;
        return;
    }
    
    searchResultsGrid.innerHTML = events.map(event => `
        <div class="event-card" onclick="window.location.href='/attendee/events/detail/?id=${event.id}'">
            <div class="event-banner" style="background-image: url('${event.banner_image || '/static/images/placeholder.jpg'}')">
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
                    <div class="event-availability">
                        ${event.available_tickets > 0 ? 
                            `<span>${event.available_tickets} left</span>` : 
                            '<span class="sold-out">Sold Out</span>'}
                    </div>
                </div>
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
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
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

// Make functions global
window.changePage = changePage;