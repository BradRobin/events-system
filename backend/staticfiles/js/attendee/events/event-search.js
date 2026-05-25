// ============================================
// ATTENDEE EVENT SEARCH
// Handles: Advanced search, filters, search suggestions
// ============================================

let searchDebounceTimer;
let currentSearchPage = 1;
let searchResults = [];

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        document.getElementById('searchQuery').value = query;
        performSearch();
    }
    
    setupSearchListeners();
    loadPopularSearches();
});

// Perform search
async function performSearch() {
    const query = document.getElementById('searchQuery').value;
    if (!query.trim()) {
        displayEmptyState();
        return;
    }
    
    showLoading();
    
    const filters = {
        category: document.getElementById('searchCategory')?.value || '',
        min_price: document.getElementById('searchMinPrice')?.value || '',
        max_price: document.getElementById('searchMaxPrice')?.value || '',
        location: document.getElementById('searchLocation')?.value || '',
        date: document.getElementById('searchDate')?.value || '',
        sort: document.getElementById('searchSort')?.value || 'relevance'
    };
    
    const results = await EventAPI.Attendee.searchEvents(query, filters);
    if (results) {
        searchResults = results;
        displaySearchResults(results);
        updateUrl(query, filters);
        saveSearchHistory(query);
    }
    
    hideLoading();
}

// Display search results
function displaySearchResults(events) {
    const container = document.getElementById('searchResults');
    const countElement = document.getElementById('resultsCount');
    
    if (!events.length) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search fa-4x"></i>
                <h3>No results found</h3>
                <p>Try different keywords or check your spelling</p>
                <button onclick="clearSearch()" class="btn-clear">Clear Search</button>
            </div>
        `;
        countElement.innerHTML = '0 results found';
        return;
    }
    
    countElement.innerHTML = `${events.length} results found`;
    
    container.innerHTML = events.map(event => `
        <div class="search-result-card" onclick="location.href='/event/${event.id}/'">
            <div class="result-image">
                ${event.banner_image ? 
                    `<img src="${event.banner_image}" alt="${event.title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                ${event.is_featured ? '<span class="featured-tag">Featured</span>' : ''}
            </div>
            <div class="result-info">
                <div class="result-header">
                    <h3>${highlightText(event.title, getSearchQuery())}</h3>
                    <span class="result-price">KES ${event.price.toLocaleString()}</span>
                </div>
                <div class="result-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleDateString()}</span>
                    <span><i class="fas fa-tag"></i> ${event.category_name || 'Event'}</span>
                </div>
                <p class="result-description">${highlightText(event.description?.substring(0, 200) || '', getSearchQuery())}...</p>
                <div class="result-footer">
                    <span class="seats-available"><i class="fas fa-users"></i> ${event.available_seats} seats left</span>
                    <button class="btn-view">View Details →</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup search listeners
function setupSearchListeners() {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(performSearch, 500);
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    const filterIds = ['searchCategory', 'searchMinPrice', 'searchMaxPrice', 'searchLocation', 'searchDate', 'searchSort'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', performSearch);
    });
}

// Highlight matching text
function highlightText(text, query) {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Get current search query
function getSearchQuery() {
    return document.getElementById('searchQuery').value;
}

// Update URL with search params
function updateUrl(query, filters) {
    const params = new URLSearchParams({ q: query, ...filters });
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
}

// Save search to history
function saveSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    history = [query, ...history.filter(h => h !== query)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    displaySearchHistory();
}

// Display search history
function displaySearchHistory() {
    const container = document.getElementById('searchHistory');
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    if (!history.length) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = history.map(query => `
        <div class="history-item" onclick="searchHistoryItem('${query}')">
            <i class="fas fa-history"></i>
            <span>${query}</span>
            <button onclick="removeHistoryItem('${query}')">&times;</button>
        </div>
    `).join('');
}

function searchHistoryItem(query) {
    document.getElementById('searchQuery').value = query;
    performSearch();
}

function removeHistoryItem(query) {
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    history = history.filter(h => h !== query);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    displaySearchHistory();
}

// Load popular searches
async function loadPopularSearches() {
    // Get trending searches from backend
    const container = document.getElementById('popularSearches');
    if (container) {
        const popular = ['Music Festival', 'Tech Conference', 'Sports Event', 'Food Festival', 'Art Exhibition'];
        container.innerHTML = popular.map(term => `
            <span class="popular-term" onclick="searchHistoryItem('${term}')">${term}</span>
        `).join('');
    }
}

// Clear search
function clearSearch() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('searchCategory').value = '';
    document.getElementById('searchMinPrice').value = '';
    document.getElementById('searchMaxPrice').value = '';
    document.getElementById('searchLocation').value = '';
    document.getElementById('searchDate').value = '';
    document.getElementById('searchSort').value = 'relevance';
    performSearch();
}

// Display empty state
function displayEmptyState() {
    const container = document.getElementById('searchResults');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search fa-4x"></i>
            <h3>Search for events</h3>
            <p>Find concerts, conferences, workshops and more</p>
            <div class="trending-searches">
                <h4>Trending searches</h4>
                <div id="popularSearches"></div>
            </div>
            <div class="recent-searches" id="searchHistory"></div>
        </div>
    `;
    loadPopularSearches();
    displaySearchHistory();
}

function showLoading() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    }
}

function hideLoading() {
    // Handled by displaySearchResults
}
