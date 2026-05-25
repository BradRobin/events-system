// ============================================
// HELP CENTER PAGE - Search and Interactions
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initSearch();
    loadHelpArticles();
});

function initSearch() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = searchForm?.querySelector('input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput?.value.trim();
            if (query) {
                searchHelpArticles(query);
            }
        });
    }
}

async function loadHelpArticles() {
    try {
        // Fetch popular help articles from API
        const response = await fetch('/api/attendee/help/popular/');
        if (response.ok) {
            const articles = await response.json();
            displayPopularTopics(articles);
        }
    } catch (error) {
        console.error('Error loading help articles:', error);
    }
}

function displayPopularTopics(articles) {
    const topicsGrid = document.querySelector('.topics-grid');
    if (!topicsGrid || !articles.length) return;
    
    topicsGrid.innerHTML = articles.slice(0, 6).map(article => `
        <a href="/attendee/help/${article.slug}/" class="topic-tag">
            ${escapeHtml(article.title)}
        </a>
    `).join('');
}

async function searchHelpArticles(query) {
    if (window.Loader) window.Loader.show('Searching...');
    
    try {
        const response = await fetch(`/api/attendee/help/search/?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const results = await response.json();
            displaySearchResults(results);
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Please try again.', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displaySearchResults(results) {
    // Redirect to search results page or show modal
    if (results.length > 0) {
        window.location.href = `/attendee/help/search/?q=${encodeURIComponent(query)}`;
    } else {
        showToast('No results found. Try different keywords.', 'info');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}