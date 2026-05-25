// ============================================
// SUCCESS STORIES PAGE - Load Stories
// ============================================

let currentPage = 1;
let totalPages = 1;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    loadStories();
    initLoadMore();
});

async function loadStories() {
    if (isLoading) return;
    isLoading = true;
    
    if (currentPage === 1 && window.Loader) {
        window.Loader.show('Loading stories...');
    }
    
    try {
        const response = await fetch(`/api/attendee/success-stories/?page=${currentPage}&limit=4`);
        
        if (response.ok) {
            const data = await response.json();
            displayStories(data.stories);
            totalPages = data.total_pages || 1;
            updateLoadMoreButton();
        }
    } catch (error) {
        console.error('Error loading stories:', error);
    } finally {
        isLoading = false;
        if (window.Loader) window.Loader.hide();
    }
}

function displayStories(stories) {
    const storiesGrid = document.querySelector('.stories-grid');
    if (!storiesGrid) return;
    
    if (currentPage === 1) {
        storiesGrid.innerHTML = '';
    }
    
    if (!stories || stories.length === 0) {
        if (currentPage === 1) {
            storiesGrid.innerHTML = '<div class="empty-state">No stories available yet.</div>';
        }
        return;
    }
    
    const storiesHtml = stories.map(story => `
        <div class="story-card">
            <div class="story-image" style="background-image: url('${story.image || '/static/images/placeholder-story.jpg'}')">
                <span class="story-category">${escapeHtml(story.category)}</span>
            </div>
            <div class="story-content">
                <h3>${escapeHtml(story.title)}</h3>
                <div class="story-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(story.author)}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(story.published_at)}</span>
                </div>
                <p class="story-excerpt">${escapeHtml(story.excerpt)}</p>
                <a href="/attendee/stories/${story.slug}/" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    `).join('');
    
    storiesGrid.insertAdjacentHTML('beforeend', storiesHtml);
}

function initLoadMore() {
    const loadMoreBtn = document.querySelector('.load-more button');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (currentPage < totalPages && !isLoading) {
                currentPage++;
                loadStories();
            }
        });
    }
}

function updateLoadMoreButton() {
    const loadMoreContainer = document.querySelector('.load-more');
    if (loadMoreContainer) {
        if (currentPage >= totalPages) {
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}