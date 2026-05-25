// Support Tickets JavaScript
let currentTicketId = null;
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('searchTickets');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearch = this.value;
                currentPage = 1;
                loadTickets();
            }, 500);
        });
    }
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/tickets/stats/');
        
        if (data.stats) {
            document.getElementById('totalTickets').textContent = data.stats.total || 0;
            document.getElementById('openTickets').textContent = data.stats.open || 0;
            document.getElementById('resolvedTickets').textContent = data.stats.resolved || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadTickets() {
    Loader.show('Loading tickets...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            status: currentFilter,
            search: currentSearch
        });
        const data = await apiRequest(`/api/admin/tickets/?${params}`);
        
        displayTickets(data.tickets);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        const ticketsList = document.getElementById('ticketsList');
        if (ticketsList) {
            ticketsList.innerHTML = '<div class="empty-state">Failed to load tickets</div>';
        }
    } finally {
        Loader.hide();
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('ticketsList');
    
    if (!container) return;
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<div class="empty-state">No tickets found</div>';
        return;
    }
    
    container.innerHTML = tickets.map(ticket => `
        <div class="ticket-item ${currentTicketId === ticket.id ? 'active' : ''}" 
             onclick="selectTicket(${ticket.id})">
            <div class="ticket-info">
                <div class="ticket-code">${escapeHtml(ticket.code)}</div>
                <div class="ticket-title">${escapeHtml(ticket.subject)}</div>
                <div class="ticket-meta">
                    <span class="ticket-badge ${ticket.status}">${ticket.status}</span>
                    <span>${escapeHtml(ticket.customer_name)}</span>
                </div>
            </div>
            <div class="ticket-time">${formatRelativeTime(ticket.created_at)}</div>
        </div>
    `).join('');
}

async function selectTicket(id) {
    currentTicketId = id;
    
    // Update active state in list
    document.querySelectorAll('.ticket-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.querySelector(`.ticket-item[onclick="selectTicket(${id})"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    Loader.show('Loading ticket details...');
    
    try {
        const data = await apiRequest(`/api/admin/tickets/${id}/`);
        displayTicketDetail(data.ticket);
    } catch (error) {
        console.error('Error loading ticket detail:', error);
        showToast('Failed to load ticket details', 'error');
    } finally {
        Loader.hide();
    }
}

function displayTicketDetail(ticket) {
    const container = document.getElementById('ticketDetailView');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="ticket-header">
            <h2>
                <i class="fas fa-ticket-alt"></i> 
                ${escapeHtml(ticket.subject)}
                <span class="ticket-badge ${ticket.status}">${ticket.status}</span>
            </h2>
            <div class="ticket-meta-bar">
                <div class="meta-item"><i class="fas fa-hashtag"></i> ${escapeHtml(ticket.code)}</div>
                <div class="meta-item"><i class="fas fa-user"></i> ${escapeHtml(ticket.customer_name)}</div>
                <div class="meta-item"><i class="fas fa-envelope"></i> ${escapeHtml(ticket.customer_email)}</div>
                <div class="meta-item"><i class="fas fa-calendar"></i> Created: ${formatDate(ticket.created_at)}</div>
                ${ticket.event_title ? `<div class="meta-item"><i class="fas fa-calendar-alt"></i> Event: ${escapeHtml(ticket.event_title)}</div>` : ''}
            </div>
        </div>
        
        <div class="conversation-thread" id="conversationThread">
            ${displayMessages(ticket.messages || [])}
        </div>
        
        <div class="reply-section">
            <h4><i class="fas fa-reply"></i> Reply to Customer</h4>
            <textarea id="replyMessage" class="reply-textarea" placeholder="Type your reply here..."></textarea>
            <div class="reply-actions">
                <select id="replyStatus" class="form-control" style="width: auto;">
                    <option value="open">Keep Open</option>
                    <option value="resolved">Mark as Resolved</option>
                    <option value="closed">Close Ticket</option>
                </select>
                <button class="btn-primary" onclick="sendReply()">
                    <i class="fas fa-paper-plane"></i> Send Reply
                </button>
            </div>
        </div>
    `;
    
    // Scroll to bottom of conversation
    const thread = document.getElementById('conversationThread');
    if (thread) {
        thread.scrollTop = thread.scrollHeight;
    }
}

function displayMessages(messages) {
    if (!messages || messages.length === 0) {
        return '<div class="empty-state">No messages yet</div>';
    }
    
    return messages.map(msg => `
        <div class="message-bubble ${msg.sender_type === 'admin' ? 'admin' : 'customer'}">
            <div class="message-avatar">
                <i class="fas ${msg.sender_type === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${msg.sender_name}</span>
                    <span class="message-time">${formatDateTime(msg.created_at)}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.message)}</div>
            </div>
        </div>
    `).join('');
}

async function sendReply() {
    const message = document.getElementById('replyMessage')?.value;
    const status = document.getElementById('replyStatus')?.value;
    
    if (!message || !message.trim()) {
        showToast('Please enter a reply message', 'error');
        return;
    }
    
    Loader.show('Sending reply...');
    
    try {
        const data = await apiRequest(`/api/admin/tickets/${currentTicketId}/reply/`, 'POST', {
            message: message.trim(),
            status: status
        });
        
        if (data.success) {
            showToast('Reply sent successfully', 'success');
            document.getElementById('replyMessage').value = '';
            await selectTicket(currentTicketId); // Reload ticket details
            await loadTickets(); // Refresh ticket list
            await loadStats(); // Refresh stats
        }
    } catch (error) {
        console.error('Error sending reply:', error);
        showToast('Failed to send reply', 'error');
    } finally {
        Loader.hide();
    }
}

function filterTickets(status) {
    currentFilter = status;
    currentPage = 1;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.filter-btn[onclick="filterTickets('${status}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    loadTickets();
}

function refreshTickets() {
    loadTickets();
    loadStats();
    showToast('Tickets refreshed', 'success');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})">&laquo;</button>`;
    
    // First page
    if (current > 3) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (current > 4) html += `<button disabled>...</button>`;
    }
    
    // Pages around current
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Last page
    if (current < total - 2) {
        if (current < total - 3) html += `<button disabled>...</button>`;
        html += `<button onclick="goToPage(${total})">${total}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="goToPage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadTickets();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Fallback toast
    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Expose functions globally
window.selectTicket = selectTicket;
window.filterTickets = filterTickets;
window.refreshTickets = refreshTickets;
window.sendReply = sendReply;
window.goToPage = goToPage;