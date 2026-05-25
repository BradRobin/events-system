// ============================================
// ORGANIZER EVENT LIST
// Handles: Organizer's events listing, filtering, status management
// ============================================

let orgCurrentPage = 1;
let orgTotalPages = 1;
let orgCurrentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadMyEvents();
    setupOrgFilters();
});

async function loadMyEvents() {
    showLoading();
    
    const filters = {
        page: orgCurrentPage,
        status: orgCurrentFilter,
        search: document.getElementById('searchEvent')?.value || ''
    };
    
    const events = await EventAPI.Organizer.getMyEvents(filters);
    if (events && events.results) {
        displayMyEvents(events.results);
        orgTotalPages = events.total_pages || 1;
        updateOrgPagination();
        updateOrgStats(events);
    }
    
    hideLoading();
}

function displayMyEvents(events) {
    const container = document.getElementById('myEventsTable');
    if (!events.length) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class="fas fa-calendar-plus"></i>
                    <h3>No events yet</h3>
                    <a href="/organizer/events/create/" class="btn-create">Create Your First Event</a>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = events.map(event => `
        <tr>
            <td>${event.id}</td>
            <td class="event-title-cell">
                <div class="event-thumb">
                    ${event.banner_image ? 
                        `<img src="${event.banner_image}" alt="${event.title}">` : 
                        `<div class="thumb-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                </div>
                <strong>${event.title}</strong>
            </td>
            <td>${new Date(event.start_date).toLocaleDateString()}</td>
            <td>${event.tickets_sold || 0}/${event.capacity}</td>
            <td>KES ${event.revenue?.toLocaleString() || 0}</td>
            <td>
                <span class="status-badge ${event.is_published ? 'published' : 'draft'}">
                    ${event.is_published ? 'Published' : 'Draft'}
                </span>
            </td>
            <td class="action-buttons">
                <a href="/organizer/events/${event.id}/edit/" class="btn-icon edit" title="Edit">
                    <i class="fas fa-edit"></i>
                </a>
                <button class="btn-icon duplicate" onclick="duplicateEvent(${event.id})" title="Duplicate">
                    <i class="fas fa-copy"></i>
                </button>
                ${!event.is_published ? 
                    `<button class="btn-icon publish" onclick="publishEvent(${event.id})" title="Publish">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </button>` :
                    `<button class="btn-icon unpublish" onclick="unpublishEvent(${event.id})" title="Unpublish">
                        <i class="fas fa-eye-slash"></i>
                    </button>`
                }
                <button class="btn-icon analytics" onclick="viewAnalytics(${event.id})" title="Analytics">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteEvent(${event.id})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateOrgStats(events) {
    const totalEvents = events.count || 0;
    const totalTickets = events.results?.reduce((sum, e) => sum + (e.tickets_sold || 0), 0) || 0;
    const totalRevenue = events.results?.reduce((sum, e) => sum + (e.revenue || 0), 0) || 0;
    const avgOccupancy = events.results?.reduce((sum, e) => sum + (e.occupancy_rate || 0), 0) / (events.results?.length || 1);
    
    document.getElementById('orgTotalEvents').innerText = totalEvents;
    document.getElementById('orgTotalTickets').innerText = totalTickets;
    document.getElementById('orgTotalRevenue').innerText = `KES ${totalRevenue.toLocaleString()}`;
    document.getElementById('orgAvgOccupancy').innerText = `${Math.round(avgOccupancy)}%`;
}

function setupOrgFilters() {
    const filterSelect = document.getElementById('filterStatus');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            orgCurrentFilter = e.target.value;
            orgCurrentPage = 1;
            loadMyEvents();
        });
    }
    
    const searchInput = document.getElementById('searchEvent');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                orgCurrentPage = 1;
                loadMyEvents();
            }, 500);
        });
    }
}

function updateOrgPagination() {
    const container = document.getElementById('orgPagination');
    if (orgTotalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';
    
    if (orgCurrentPage > 1) {
        html += `<button onclick="orgChangePage(${orgCurrentPage - 1})">Prev</button>`;
    }
    
    for (let i = 1; i <= orgTotalPages; i++) {
        if (i === orgCurrentPage) {
            html += `<button class="active">${i}</button>`;
        } else if (i === 1 || i === orgTotalPages || (i >= orgCurrentPage - 2 && i <= orgCurrentPage + 2)) {
            html += `<button onclick="orgChangePage(${i})">${i}</button>`;
        }
    }
    
    if (orgCurrentPage < orgTotalPages) {
        html += `<button onclick="orgChangePage(${orgCurrentPage + 1})">Next</button>`;
    }
    
    container.innerHTML = html;
}

function orgChangePage(page) {
    orgCurrentPage = page;
    loadMyEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewAnalytics(eventId) {
    window.location.href = `/organizer/events/${eventId}/analytics/`;
}

function showLoading() {
    const container = document.getElementById('myEventsTable');
    if (container) {
        container.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    }
}

function hideLoading() {
    // Hidden by displayMyEvents
}
