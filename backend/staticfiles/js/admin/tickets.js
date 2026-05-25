let currentPage = 1;
let totalPages = 1;
let currentFilters = { search: '', status: '' };

document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    setupFilters();
});

function setupFilters() {
    const searchInput = document.getElementById('searchTickets');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', function() {
            clearTimeout(timer);
            timer = setTimeout(() => {
                currentFilters.search = this.value;
                currentPage = 1;
                loadTickets();
            }, 500);
        });
    }
    document.getElementById('ticketStatus')?.addEventListener('change', function() {
        currentFilters.status = this.value;
        currentPage = 1;
        loadTickets();
    });
}

async function loadTickets() {
    try {
        const params = new URLSearchParams({ page: currentPage, ...currentFilters });
        const data = await apiRequest(`/api/admin/tickets/?${params}`);
        displayTickets(data.tickets);
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages, (p) => {
                currentPage = p;
                loadTickets();
            });
        }
    } catch (error) {
        document.getElementById('ticketsGrid').innerHTML = '<div class="empty-state">Failed to load tickets</div>';
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('ticketsGrid');
    if (!tickets || !tickets.length) {
        container.innerHTML = '<div class="empty-state">No tickets found</div>';
        return;
    }
    container.innerHTML = tickets.map(t => `
        <div class="ticket-card">
            <div class="ticket-code">${t.code}</div>
            <div><strong>${t.event_title}</strong></div>
            <div>${t.customer_name}</div>
            <div class="ticket-status ${t.status}">${t.status}</div>
        </div>
    `).join('');
}

function applyFilters() {
    currentPage = 1;
    loadTickets();
}

function renderPagination(current, total, onPageChange) {
    const container = document.getElementById('pagination');
    if (!container) return;
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === current - 3 || i === current + 3) {
            html += `<button disabled>...</button>`;
        }
    }
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
    window.changePage = onPageChange;
}
