// ============================================
// REVIEWS PAGE - Load and Filter Reviews
// ============================================

let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    initLoadMore();
});

async function loadReviews() {
    if (window.Loader) window.Loader.show('Loading reviews...');
    
    try {
        // Try to fetch reviews from API
        const response = await fetch(`/api/attendee/reviews/?page=${currentPage}&limit=6`);
        
        if (response.ok) {
            const data = await response.json();
            displayReviews(data.reviews);
            totalPages = data.total_pages || 1;
            updateLoadMoreButton();
            updateRatingSummary(data.summary);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        // Use static content if API fails
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayReviews(reviews) {
    const reviewsGrid = document.querySelector('.reviews-grid');
    if (!reviewsGrid) return;
    
    if (currentPage === 1) {
        reviewsGrid.innerHTML = '';
    }
    
    if (!reviews || reviews.length === 0) {
        if (currentPage === 1) {
            reviewsGrid.innerHTML = '<div class="empty-state">No reviews yet. Be the first to review!</div>';
        }
        return;
    }
    
    const reviewsHtml = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-avatar">${getInitials(review.reviewer_name)}</div>
                <div class="reviewer-info">
                    <h4>${escapeHtml(review.reviewer_name)}</h4>
                    <div class="stars-display">${renderStars(review.rating)}</div>
                    <span class="review-date">${formatRelativeTime(review.created_at)}</span>
                </div>
            </div>
            <p class="review-text">${escapeHtml(review.comment)}</p>
            <div class="review-event">${escapeHtml(review.event_title)}</div>
        </div>
    `).join('');
    
    reviewsGrid.insertAdjacentHTML('beforeend', reviewsHtml);
}

function updateRatingSummary(summary) {
    if (!summary) return;
    
    const ratingNumber = document.querySelector('.rating-number');
    const ratingCount = document.querySelector('.rating-count');
    const ratingBars = document.querySelectorAll('.rating-bar .fill');
    
    if (ratingNumber) ratingNumber.textContent = summary.average_rating || '4.8';
    if (ratingCount) ratingCount.textContent = `Based on ${summary.total_reviews || 0} reviews`;
    
    // Update rating bars if they exist
    if (ratingBars.length && summary.percentages) {
        ratingBars.forEach((bar, index) => {
            const percent = summary.percentages[5 - index] || 0;
            bar.style.width = `${percent}%`;
        });
    }
}

function initLoadMore() {
    const loadMoreBtn = document.querySelector('.load-more button');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadReviews();
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

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (hasHalfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    return stars;
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}