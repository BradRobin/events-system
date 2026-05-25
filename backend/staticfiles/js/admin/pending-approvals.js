// Pending Approvals JavaScript
let currentPage = 1;
let totalPages = 1;
let selectedEvents = new Set();
let currentRejectId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadPendingEvents();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchEvents');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadPendingEvents();
            }, 500);
        });
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentPage = 1;
            loadPendingEvents();
        });
    }
    
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            currentPage = 1;
            loadPendingEvents();
        });
    }
    
    // Load categories
    loadCategories();
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/events/stats/');
        document.getElementById('pendingCount').textContent = data.stats?.pending || 0;
        document.getElementById('approvedCount').textContent = data.stats?.approved_this_month || 0;
        document.getElementById('rejectedCount').textContent = data.stats?.rejected_this_month || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadCategories() {
    try {
        const data = await apiRequest('/api/admin/categories/');
        const select = document.getElementById('categoryFilter');
        if (select && data.categories) {
            select.innerHTML = '<option value="">All Categories</option>' + 
                data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadPendingEvents() {
    const search = document.getElementById('searchEvents')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const sort = document.getElementById('sortBy')?.value || 'newest';
    
    Loader.show('Loading pending events...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            category: category,
            sort: sort
        });
        const data = await apiRequest(`/api/admin/events/pending/?${params}`);
        
        displayEvents(data.events);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages, (page) => {
                currentPage = page;
                loadPendingEvents();
            });
        }
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('pendingEventsGrid').innerHTML = 
            '<div class="empty-state">Failed to load events</div>';
    } finally {
        Loader.hide();
    }
}

function displayEvents(events) {
    const container = document.getElementById('pendingEventsGrid');
    
    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>All caught up!</h3>
                <p>No events pending approval at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="event-card ${selectedEvents.has(event.id) ? 'selected' : ''}" data-event-id="${event.id}">
            <div class="event-checkbox">
                <input type="checkbox" onchange="toggleSelect(${event.id})" ${selectedEvents.has(event.id) ? 'checked' : ''}>
            </div>
            <div class="event-image" style="background-image: url('${event.banner_image || '/static/images/placeholder.jpg'}')">
                <span class="category-badge">${escapeHtml(event.category_name || 'Uncategorized')}</span>
            </div>
            <div class="event-content">
                <h3 class="event-title">${escapeHtml(event.title)}</h3>
                <div class="event-organizer">
                    <i class="fas fa-user"></i> ${escapeHtml(event.organizer_name)}
                </div>
                <div class="event-details">
                    <span><i class="fas fa-calendar"></i> ${formatDate(event.start_date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.venue_name || 'TBD')}</span>
                </div>
                <div class="event-footer">
                    <span class="event-price">${formatCurrency(event.min_price || 0)}</span>
                    <div class="event-actions">
                        <button class="btn-outline" onclick="viewEvent(${event.id})">
                            <i class="fas fa-eye"></i> Review
                        </button>
                        <button class="btn-approve" onclick="approveEvent(${event.id})">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" onclick="openRejectModal(${event.id})">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    updateBulkActionsBar();
}

function toggleSelect(eventId) {
    if (selectedEvents.has(eventId)) {
        selectedEvents.delete(eventId);
    } else {
        selectedEvents.add(eventId);
    }
    
    const card = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
    
    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const countSpan = document.getElementById('selectedCount');
    
    if (selectedEvents.size > 0) {
        bar.style.display = 'flex';
        countSpan.textContent = selectedEvents.size;
    } else {
        bar.style.display = 'none';
    }
}

function clearSelection() {
    selectedEvents.clear();
    document.querySelectorAll('.event-card').forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = false;
    });
    updateBulkActionsBar();
}

async function approveEvent(id) {
    showConfirm('Approve this event? It will be published and visible to attendees.', async () => {
        try {
            await apiRequest(`/api/admin/events/${id}/approve/`, 'POST');
            showToast('Event approved successfully', 'success');
            loadPendingEvents();
            loadStats();
        } catch (error) {
            showToast('Failed to approve event', 'error');
        }
    });
}

async function bulkApprove() {
    const ids = Array.from(selectedEvents);
    showConfirm(`Approve ${ids.length} events?`, async () => {
        try {
            await apiRequest('/api/admin/events/bulk-approve/', 'POST', { event_ids: ids });
            showToast(`${ids.length} events approved`, 'success');
            clearSelection();
            loadPendingEvents();
            loadStats();
        } catch (error) {
            showToast('Failed to approve events', 'error');
        }
    });
}

function openRejectModal(eventId) {
    currentRejectId = eventId;
    document.getElementById('rejectModal').style.display = 'flex';
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectionSuggestions').value = '';
}

function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
    currentRejectId = null;
}

async function confirmReject() {
    const reason = document.getElementById('rejectionReason')?.value;
    const suggestions = document.getElementById('rejectionSuggestions')?.value;
    
    if (!reason) {
        showToast('Please provide a rejection reason', 'error');
        return;
    }
    
    try {
        await apiRequest(`/api/admin/events/${currentRejectId}/reject/`, 'POST', {
            reason: reason,
            suggestions: suggestions
        });
        showToast('Event rejected. Organizer notified.', 'success');
        closeRejectModal();
        loadPendingEvents();
        loadStats();
    } catch (error) {
        showToast('Failed to reject event', 'error');
    }
}

async function bulkReject() {
    const ids = Array.from(selectedEvents);
    const reason = prompt(`Provide a reason for rejecting ${ids.length} events:`);
    
    if (reason) {
        try {
            await apiRequest('/api/admin/events/bulk-reject/', 'POST', { 
                event_ids: ids, 
                reason: reason 
            });
            showToast(`${ids.length} events rejected`, 'success');
            clearSelection();
            loadPendingEvents();
            loadStats();
        } catch (error) {
            showToast('Failed to reject events', 'error');
        }
    }
}

function viewEvent(id) {
    window.location.href = `/admin-portal/events/detail/?id=${id}`;
}

function refreshPendingEvents() {
    loadPendingEvents();
    loadStats();
    showToast('Refreshed', 'success');
}

function renderPagination(current, total, onPageChange) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
    
    window.changePage = function(page) {
        if (page !== current && page >= 1 && page <= total) {
            onPageChange(page);
        }
    };
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
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