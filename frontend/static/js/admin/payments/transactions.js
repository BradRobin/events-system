// Admin transactions — ticket purchases + subscription plans

function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

const API = {
    ticketOrders: '/api/admin/payment-orders/',
    subscriptions: '/api/admin/subscription-orders/',
    subscriptionsPending: '/api/admin/subscription-orders/pending/',
    subscriptionScreenshot: (id) => `/api/admin/subscription-orders/${id}/screenshot/`,
    subscriptionApprove: (id) => `/api/admin/subscription-orders/${id}/approve/`,
    subscriptionReject: (id) => `/api/admin/subscription-orders/${id}/reject/`,
    combinedStats: '/api/admin/transactions/combined-stats/',
};

let activeTab = 'tickets';
let currentTransactions = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentFilters = { search: '', status: '' };

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    elements.transactionsList = document.getElementById('transactionsList');
    elements.pagination = document.getElementById('pagination');
    elements.recordsCount = document.getElementById('recordsCount');
    elements.searchTransactions = document.getElementById('searchTransactions');
    elements.statusFilter = document.getElementById('statusFilter');
    elements.applyFiltersBtn = document.getElementById('applyFiltersBtn');
    elements.resetFiltersBtn = document.getElementById('resetFiltersBtn');
    elements.tableTitle = document.getElementById('tableTitle');
    elements.subscriptionPendingCard = document.getElementById('subscriptionPendingCard');
    elements.subscriptionPendingList = document.getElementById('subscriptionPendingList');
    elements.screenshotModal = document.getElementById('screenshotModal');
    elements.screenshotModalImage = document.getElementById('screenshotModalImage');
    elements.closeScreenshotBtn = document.getElementById('closeScreenshotBtn');

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'subscriptions') activeTab = 'subscriptions';

    document.querySelectorAll('.tx-type-tab').forEach((btn) => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    elements.applyFiltersBtn?.addEventListener('click', applyFilters);
    elements.resetFiltersBtn?.addEventListener('click', resetFilters);
    elements.searchTransactions?.addEventListener('input', debounce(applyFilters, 400));
    elements.statusFilter?.addEventListener('change', applyFilters);
    elements.closeScreenshotBtn?.addEventListener('click', () => {
        if (elements.screenshotModal) elements.screenshotModal.style.display = 'none';
    });

    updateTabUI();
    loadCombinedStats();
    loadTransactions();
    if (activeTab === 'subscriptions') loadSubscriptionPending();
});

function switchTab(tab) {
    activeTab = tab;
    currentPage = 1;
    updateTabUI();
    loadTransactions();
    if (tab === 'subscriptions') loadSubscriptionPending();
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
}

function updateTabUI() {
    document.querySelectorAll('.tx-type-tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
    if (elements.tableTitle) {
        elements.tableTitle.innerHTML = activeTab === 'subscriptions'
            ? '<i class="fas fa-layer-group"></i> Subscription plan payments'
            : '<i class="fas fa-ticket-alt"></i> Event ticket purchases';
    }
    if (elements.subscriptionPendingCard) {
        elements.subscriptionPendingCard.style.display = activeTab === 'subscriptions' ? 'block' : 'none';
    }
}

async function loadCombinedStats() {
    try {
        const response = await fetch(API.combinedStats, { headers: { 'X-CSRFToken': getCSRFToken() } });
        if (!response.ok) return;
        const data = await response.json();
        const stats = data.stats || {};
        const tickets = stats.ticket_purchases || {};
        const subs = stats.subscriptions || {};
        setText('ticketCompletedCount', tickets.completed || 0);
        setText('ticketPendingCount', tickets.pending || 0);
        setText('subCompletedCount', subs.completed || 0);
        setText('subPendingCount', subs.pending || 0);
    } catch (e) {
        console.error(e);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadTransactions() {
    if (!elements.transactionsList) return;
    showLoading(elements.transactionsList, 7);

    const endpoint = activeTab === 'subscriptions' ? API.subscriptions : API.ticketOrders;
    const params = new URLSearchParams({
        page: currentPage,
        page_size: itemsPerPage,
        search: currentFilters.search,
        status: currentFilters.status,
    });

    try {
        const response = await fetch(`${endpoint}?${params}`, {
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        currentTransactions = data.transactions || data.orders || [];
        renderTransactions();
        const totalItems = data.pagination?.total_items || currentTransactions.length;
        renderPagination(totalItems);
        if (elements.recordsCount) elements.recordsCount.textContent = `${totalItems} records`;
    } catch (e) {
        console.error(e);
        showError(elements.transactionsList, 'Failed to load transactions');
    }
}

function renderTransactions() {
    if (!currentTransactions.length) {
        elements.transactionsList.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        return;
    }

    if (activeTab === 'subscriptions') {
        elements.transactionsList.innerHTML = currentTransactions.map((order) => `
            <tr>
                <td><code>SUB-${order.id}</code></td>
                <td>${formatDateTime(order.created_at)}</td>
                <td>${escapeHtml(order.organizer_name)}<br><small class="text-muted">${escapeHtml(order.organizer_email || '')}</small></td>
                <td>${escapeHtml(order.plan_name || order.plan)} plan</td>
                <td class="amount">KES ${formatNumber(order.amount)}</td>
                <td>${getStatusBadge(mapSubscriptionStatus(order.status))}</td>
                <td class="action-buttons">
                    ${order.status === 'manual_review' ? `
                        <button class="action-btn view" onclick="viewSubScreenshot(${order.id})" title="Screenshot"><i class="fas fa-image"></i></button>
                        <button class="action-btn" style="color:#16a34a" onclick="approveSubscription(${order.id})" title="Approve"><i class="fas fa-check"></i></button>
                        <button class="action-btn refund" onclick="rejectSubscription(${order.id})" title="Reject"><i class="fas fa-times"></i></button>
                    ` : (order.has_screenshot ? `<button class="action-btn view" onclick="viewSubScreenshot(${order.id})" title="Screenshot"><i class="fas fa-image"></i></button>` : '—')}
                </td>
            </tr>
        `).join('');
        return;
    }

    elements.transactionsList.innerHTML = currentTransactions.map((tx) => `
        <tr>
            <td><code>${escapeHtml(tx.id)}</code></td>
            <td>${formatDateTime(tx.created_at)}</td>
            <td>${escapeHtml(tx.customer_name)}<br><small class="text-muted">${escapeHtml(tx.customer_email || '')}</small></td>
            <td>${escapeHtml(tx.event_title)}<br><small class="text-muted">${escapeHtml(tx.organizer_name || '')}</small></td>
            <td class="amount">KES ${formatNumber(tx.amount)}</td>
            <td>${getStatusBadge(tx.status)}${tx.raw_status === 'manual_review' ? '<br><small>Awaiting organizer</small>' : ''}</td>
            <td>${tx.ticket_number ? `<code>${escapeHtml(tx.ticket_number)}</code>` : '—'}</td>
        </tr>
    `).join('');
}

function mapSubscriptionStatus(status) {
    if (status === 'completed') return 'success';
    if (status === 'manual_review' || status === 'pending_payment' || status === 'verifying') return 'pending';
    if (status === 'rejected' || status === 'failed') return 'failed';
    return status;
}

async function loadSubscriptionPending() {
    if (!elements.subscriptionPendingList) return;
    try {
        const response = await fetch(API.subscriptionsPending, {
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const orders = data.orders || [];
        if (!orders.length) {
            elements.subscriptionPendingList.innerHTML = '<p class="text-muted mb-0">No subscription upgrades awaiting approval.</p>';
            return;
        }
        elements.subscriptionPendingList.innerHTML = orders.map((order) => `
            <div class="pending-approval-item" id="pending-sub-${order.id}">
                <strong>${escapeHtml(order.organizer_name)}</strong> — ${escapeHtml(order.plan_name || order.plan)}
                <br><small>KES ${formatNumber(order.amount)} · ${formatDateTime(order.updated_at || order.created_at)}</small>
                <div class="pending-approval-actions">
                    ${order.has_screenshot ? `<button class="btn-secondary btn-sm" onclick="viewSubScreenshot(${order.id})"><i class="fas fa-image"></i> View screenshot</button>` : ''}
                    <button class="btn-primary btn-sm" onclick="approveSubscription(${order.id})"><i class="fas fa-check"></i> Approve upgrade</button>
                    <button class="btn-outline btn-sm" onclick="rejectSubscription(${order.id})"><i class="fas fa-times"></i> Reject</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        elements.subscriptionPendingList.innerHTML = '<p class="text-muted">Could not load pending approvals.</p>';
    }
}

window.viewSubScreenshot = async function(orderId) {
    try {
        const response = await fetch(API.subscriptionScreenshot(orderId), {
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        const data = await response.json();
        if (!response.ok || !data.screenshot_data) throw new Error(data.message || 'No screenshot');
        if (elements.screenshotModalImage) elements.screenshotModalImage.src = data.screenshot_data;
        if (elements.screenshotModal) elements.screenshotModal.style.display = 'flex';
    } catch (e) {
        alert(e.message || 'Could not load screenshot');
    }
};

window.approveSubscription = async function(orderId) {
    if (!confirm('Approve this subscription upgrade and activate the organizer plan?')) return;
    try {
        const response = await fetch(API.subscriptionApprove(orderId), {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken(), 'Content-Type': 'application/json' },
            body: '{}',
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Approval failed');
        alert(data.message || 'Plan upgraded.');
        loadCombinedStats();
        loadTransactions();
        loadSubscriptionPending();
    } catch (e) {
        alert(e.message || 'Approval failed');
    }
};

window.rejectSubscription = async function(orderId) {
    const reason = prompt('Reason for rejection (optional):', '');
    if (reason === null) return;
    try {
        const response = await fetch(API.subscriptionReject(orderId), {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || 'Payment rejected by admin.' }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Rejection failed');
        alert('Subscription payment rejected.');
        loadCombinedStats();
        loadTransactions();
        loadSubscriptionPending();
    } catch (e) {
        alert(e.message || 'Rejection failed');
    }
};

function renderPagination(totalItems) {
    if (!elements.pagination) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button onclick="changePage(${i})" class="${currentPage === i ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    elements.pagination.innerHTML = html;
}

window.changePage = function(page) {
    if (page < 1) return;
    currentPage = page;
    loadTransactions();
};

function applyFilters() {
    currentFilters = {
        search: elements.searchTransactions?.value || '',
        status: elements.statusFilter?.value || '',
    };
    currentPage = 1;
    loadTransactions();
}

function resetFilters() {
    if (elements.searchTransactions) elements.searchTransactions.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    applyFilters();
}

function getStatusBadge(status) {
    const map = {
        success: '<span class="status-badge success">Success</span>',
        pending: '<span class="status-badge pending">Pending</span>',
        failed: '<span class="status-badge failed">Failed</span>',
        refunded: '<span class="status-badge refunded">Refunded</span>',
    };
    return map[status] || `<span class="status-badge">${escapeHtml(status)}</span>`;
}

function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-KE');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-KE', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function showLoading(container, cols) {
    container.innerHTML = `<tr><td colspan="${cols}" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
}

function showError(container, msg) {
    container.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${escapeHtml(msg)}</td></tr>`;
}
