// frontend/static/js/organizer/reviews.js
let reviewPage = 1;
let currentReviewId = null;

function getHighlightedReviewId() {
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get('review');
    return reviewId ? String(reviewId) : '';
}

function highlightReviewRow(reviewId) {
    if (!reviewId) return;
    const row = document.querySelector(`#reviewsTableBody tr[data-review-id="${reviewId}"]`);
    if (!row) return;
    row.classList.add('review-row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadReviews() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;

    try {
        const eventFilter = document.getElementById('eventFilter');
        const eventId = eventFilter ? eventFilter.value : '';
        const data = eventId
            ? await OrganizerAPI.reviews.getEventReviews(eventId, reviewPage, 20)
            : await OrganizerAPI.reviews.getAll(reviewPage, 20);

        const results = data.results || [];
        if (!results.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No reviews yet</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(function (r) {
            const comment = r.comment || '-';
            const response = r.response
                ? escapeHtml(r.response)
                : '<span class="text-muted">Not responded</span>';
            const actionCell = !r.response
                ? `<button type="button" class="btn btn-sm btn-outline-primary respond-btn" data-id="${r.id}" data-review="${escapeHtml(comment)}">Respond</button>`
                : '-';

            return (
                '<tr data-review-id="' + r.id + '">' +
                    '<td>' + escapeHtml(r.event_title) + '</td>' +
                    '<td>' + escapeHtml(r.attendee_name) + '</td>' +
                    '<td><span class="star-display">' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + '</span> ' + r.rating + '</td>' +
                    '<td>' + escapeHtml(comment) + '</td>' +
                    '<td>' + response + '</td>' +
                    '<td>' + actionCell + '</td>' +
                '</tr>'
            );
        }).join('');

        if (typeof renderPagination === 'function') {
            renderPagination(data, reviewPage, function (p) {
                reviewPage = p;
                loadReviews();
            }, 'reviewsPagination');
        }

        attachRespondEvents();
        highlightReviewRow(getHighlightedReviewId());
    } catch (e) {
        console.error('[Reviews] Failed to load reviews:', e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Could not load reviews. Please refresh the page.</td></tr>';
    }
}

async function updateStats() {
    try {
        const stats = await OrganizerAPI.reviews.getStats();
        const avgEl = document.getElementById('avgRatingDisplay');
        const starsEl = document.getElementById('starDisplay');
        const totalEl = document.getElementById('totalReviewsDisplay');
        const rateEl = document.getElementById('responseRateDisplay');

        if (avgEl) avgEl.innerText = stats.avg_rating?.toFixed(1) || '0';
        if (starsEl) {
            const avg = Math.floor(stats.avg_rating || 0);
            starsEl.innerHTML = '<span class="star-display">' + '★'.repeat(avg) + '☆'.repeat(5 - avg) + '</span>';
        }
        if (totalEl) totalEl.innerText = stats.total_reviews || 0;
        if (rateEl) rateEl.innerText = stats.response_rate || 0;
    } catch (e) {
        console.error('[Reviews] Failed to load stats:', e);
    }
}

function attachRespondEvents() {
    document.querySelectorAll('.respond-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentReviewId = btn.dataset.id;
            const preview = document.getElementById('reviewPreview');
            if (preview) {
                preview.innerHTML = '<div class="alert alert-secondary">' + escapeHtml(btn.dataset.review || '') + '</div>';
            }
            const responseText = document.getElementById('responseText');
            if (responseText) responseText.value = '';
            new bootstrap.Modal(document.getElementById('respondModal')).show();
        });
    });
}

async function submitResponse() {
    const response = document.getElementById('responseText').value.trim();
    if (!response) {
        alert('Please enter a response');
        return;
    }
    try {
        await OrganizerAPI.reviews.respond(currentReviewId, response);
        if (window.showToast) window.showToast('Response sent', 'success');
        bootstrap.Modal.getInstance(document.getElementById('respondModal')).hide();
        loadReviews();
        updateStats();
    } catch (e) {
        if (window.showToast) window.showToast(e.message, 'error');
    }
}

async function loadEventsForFilter() {
    try {
        const events = await OrganizerAPI.events.getAll(1, 100);
        const filter = document.getElementById('eventFilter');
        if (!filter) return;
        const results = events.results || [];
        filter.innerHTML = '<option value="">All Events</option>' + results.map(function (e) {
            return '<option value="' + e.id + '">' + escapeHtml(e.title) + '</option>';
        }).join('');

        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event');
        if (eventId && filter.querySelector('option[value="' + eventId + '"]')) {
            filter.value = eventId;
            reviewPage = 1;
            await loadReviews();
        }
    } catch (e) {
        console.error('[Reviews] Failed to load event filter:', e);
    }
}

document.getElementById('eventFilter')?.addEventListener('change', function () {
    reviewPage = 1;
    loadReviews();
    updateStats();
});
document.getElementById('exportBtn')?.addEventListener('click', function () {
    window.open(ORGANIZER_API_CONFIG.API_BASE + ORGANIZER_API_CONFIG.ENDPOINTS.REVIEWS.export, '_blank');
});
document.getElementById('submitResponseBtn')?.addEventListener('click', submitResponse);

document.addEventListener('DOMContentLoaded', function () {
    loadReviews();
    loadEventsForFilter();
    updateStats();
});
