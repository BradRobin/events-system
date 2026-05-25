// ============================================
// ATTENDEE SUPPORT - Complete Functionality
// ============================================

let currentPage = 1;
let totalPages = 1;
let currentTicketId = null;

// DOM Elements
const ticketsList = document.getElementById('ticketsList');
const paginationDiv = document.getElementById('pagination');
const ticketsCount = document.getElementById('ticketsCount');
const searchInput = document.getElementById('searchTickets');
const statusFilter = document.getElementById('statusFilter');
const faqSearch = document.getElementById('faqSearch');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    loadFAQ();
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            loadTickets();
        }, 500));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            loadTickets();
        });
    }
    
    if (faqSearch) {
        faqSearch.addEventListener('input', debounce(() => {
            filterFAQ();
        }, 300));
    }
}

function switchTab(tab) {
    const ticketsTab = document.getElementById('ticketsTab');
    const faqTab = document.getElementById('faqTab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'tickets') {
        ticketsTab.classList.add('active');
        faqTab.classList.remove('active');
        document.querySelector('.tab-btn[data-tab="tickets"]').classList.add('active');
        loadTickets();
    } else {
        ticketsTab.classList.remove('active');
        faqTab.classList.add('active');
        document.querySelector('.tab-btn[data-tab="faq"]').classList.add('active');
    }
}

async function loadTickets() {
    if (ticketsList) {
        ticketsList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading tickets...</p>
            </div>
        `;
    }
    
    const search = searchInput?.value || '';
    const status = statusFilter?.value || 'all';
    
    try {
        const result = await window.AttendeeAPIEndpoints.support.getTickets(currentPage, 10, status, search);
        const tickets = result.results || result;
        const total = result.count || tickets.length;
        
        totalPages = result.total_pages || Math.ceil(total / 10);
        
        displayTickets(tickets);
        renderPagination(currentPage, totalPages);
        
        if (ticketsCount) {
            ticketsCount.textContent = `Showing ${tickets.length} of ${total} tickets`;
        }
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        if (ticketsList) {
            ticketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to Load Tickets</h3>
                    <p>Please try again later.</p>
                    <button class="btn-primary" onclick="loadTickets()">Retry</button>
                </div>
            `;
        }
    }
}

function displayTickets(tickets) {
    if (!ticketsList) return;
    
    if (!tickets || tickets.length === 0) {
        ticketsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Support Tickets</h3>
                <p>You haven't created any support tickets yet.</p>
                <button class="btn-primary" onclick="showCreateTicketModal()">
                    Create Ticket
                </button>
            </div>
        `;
        return;
    }
    
    ticketsList.innerHTML = tickets.map(ticket => `
        <div class="ticket-card" onclick="viewTicketDetail(${ticket.id})">
            <div class="ticket-header">
                <div class="ticket-info">
                    <span class="ticket-id"><code>#${escapeHtml(ticket.reference)}</code></span>
                    <span class="ticket-subject">${escapeHtml(ticket.subject)}</span>
                </div>
                <div class="ticket-status ${ticket.status}">
                    ${getStatusIcon(ticket.status)} ${ticket.status}
                </div>
            </div>
            <div class="ticket-body">
                <div class="ticket-category">
                    <i class="fas fa-tag"></i> ${escapeHtml(ticket.category)}
                </div>
                <div class="ticket-date">
                    <i class="fas fa-clock"></i> Created ${formatRelativeTime(ticket.created_at)}
                </div>
                <div class="ticket-preview">
                    ${escapeHtml(ticket.last_message || ticket.message).substring(0, 150)}...
                </div>
            </div>
            <div class="ticket-footer">
                <span><i class="fas fa-comment"></i> ${ticket.reply_count || 0} replies</span>
                <span>Last updated ${formatRelativeTime(ticket.updated_at)}</span>
            </div>
        </div>
    `).join('');
}

function showCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'flex';
}

function closeCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'none';
    document.getElementById('createTicketForm').reset();
}

async function createTicket() {
    const subject = document.getElementById('ticketSubject')?.value.trim();
    const category = document.getElementById('ticketCategory')?.value;
    const message = document.getElementById('ticketMessage')?.value.trim();
    
    if (!subject) {
        showToast('Please enter a subject', 'error');
        return;
    }
    
    if (!message) {
        showToast('Please describe your issue', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Creating ticket...');
    
    try {
        await window.AttendeeAPIEndpoints.support.createTicket(subject, category, message);
        showToast('Ticket created successfully', 'success');
        closeCreateTicketModal();
        loadTickets();
    } catch (error) {
        console.error('Error creating ticket:', error);
        showToast(error.message || 'Failed to create ticket', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function viewTicketDetail(ticketId) {
    currentTicketId = ticketId;
    
    if (window.Loader) window.Loader.show('Loading ticket details...');
    
    try {
        const ticket = await window.AttendeeAPIEndpoints.support.getTicketDetail(ticketId);
        displayTicketDetail(ticket);
    } catch (error) {
        console.error('Error loading ticket detail:', error);
        showToast('Failed to load ticket details', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayTicketDetail(ticket) {
    const modalBody = document.getElementById('ticketDetailBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="ticket-detail">
            <div class="detail-header">
                <h4>${escapeHtml(ticket.subject)}</h4>
                <span class="ticket-status ${ticket.status}">${ticket.status}</span>
            </div>
            <div class="detail-meta">
                <span><i class="fas fa-tag"></i> ${escapeHtml(ticket.category)}</span>
                <span><i class="fas fa-calendar"></i> Created: ${formatDateTime(ticket.created_at)}</span>
                <span><i class="fas fa-clock"></i> Last updated: ${formatRelativeTime(ticket.updated_at)}</span>
            </div>
            
            <div class="conversation-thread">
                <div class="message-item customer">
                    <div class="message-header">
                        <strong>${escapeHtml(ticket.customer_name)}</strong>
                        <span>${formatDateTime(ticket.created_at)}</span>
                    </div>
                    <div class="message-body">${escapeHtml(ticket.message)}</div>
                </div>
                
                ${(ticket.replies || []).map(reply => `
                    <div class="message-item ${reply.sender_type}">
                        <div class="message-header">
                            <strong>${escapeHtml(reply.sender_name)} ${reply.sender_type === 'admin' ? '(Support Team)' : ''}</strong>
                            <span>${formatDateTime(reply.created_at)}</span>
                        </div>
                        <div class="message-body">${escapeHtml(reply.message)}</div>
                    </div>
                `).join('')}
            </div>
            
            ${ticket.status !== 'closed' ? `
                <div class="reply-section">
                    <h4>Reply to this ticket</h4>
                    <textarea id="replyMessage" class="form-control" rows="4" placeholder="Type your reply here..."></textarea>
                    <div class="reply-actions">
                        <button class="btn-secondary" onclick="closeTicketDetailModal()">Cancel</button>
                        <button class="btn-primary" onclick="sendReply(${ticket.id})">Send Reply</button>
                        <button class="btn-outline" onclick="resolveTicket(${ticket.id})">Mark as Resolved</button>
                    </div>
                </div>
            ` : `
                <div class="closed-notice">
                    <i class="fas fa-lock"></i> This ticket is closed. Please create a new ticket for further assistance.
                </div>
            `}
        </div>
    `;
    
    document.getElementById('ticketDetailModal').style.display = 'flex';
}

async function sendReply(ticketId) {
    const message = document.getElementById('replyMessage')?.value.trim();
    
    if (!message) {
        showToast('Please enter a reply message', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Sending reply...');
    
    try {
        await window.AttendeeAPIEndpoints.support.replyToTicket(ticketId, message);
        showToast('Reply sent successfully', 'success');
        closeTicketDetailModal();
        loadTickets();
    } catch (error) {
        console.error('Error sending reply:', error);
        showToast(error.message || 'Failed to send reply', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

async function resolveTicket(ticketId) {
    if (window.Loader) window.Loader.show('Updating ticket...');
    
    try {
        await window.AttendeeAPIEndpoints.support.closeTicket(ticketId);
        showToast('Ticket marked as resolved', 'success');
        closeTicketDetailModal();
        loadTickets();
    } catch (error) {
        console.error('Error resolving ticket:', error);
        showToast('Failed to update ticket', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function closeTicketDetailModal() {
    document.getElementById('ticketDetailModal').style.display = 'none';
    currentTicketId = null;
}

async function loadFAQ() {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;
    
    faqList.innerHTML = '<div class="loading-state">Loading FAQs...</div>';
    
    try {
        const faqs = await window.AttendeeAPIEndpoints.support.getFAQ();
        displayFAQ(faqs);
    } catch (error) {
        console.error('Error loading FAQ:', error);
        faqList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to Load FAQs</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

function displayFAQ(faqs) {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;
    
    if (!faqs || faqs.length === 0) {
        faqList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <h3>No FAQs Found</h3>
                <p>Check back later for updated information.</p>
            </div>
        `;
        return;
    }
    
    faqList.innerHTML = faqs.map(faq => `
        <div class="faq-item" data-question="${escapeHtml(faq.question).toLowerCase()}" data-answer="${escapeHtml(faq.answer).toLowerCase()}">
            <div class="faq-question" onclick="toggleFAQ(this)">
                <span>${escapeHtml(faq.question)}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                <p>${escapeHtml(faq.answer)}</p>
            </div>
        </div>
    `).join('');
}

function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    faqItem.classList.toggle('open');
}

function filterFAQ() {
    const searchTerm = faqSearch?.value.toLowerCase() || '';
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.dataset.question || '';
        const answer = item.dataset.answer || '';
        
        if (question.includes(searchTerm) || answer.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function renderPagination(current, total) {
    if (!paginationDiv || total <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo; Prev</button>`;
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">Next &raquo;</button>`;
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadTickets();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function getStatusIcon(status) {
    const icons = {
        'open': '<i class="fas fa-circle"></i>',
        'in-progress': '<i class="fas fa-spinner fa-spin"></i>',
        'resolved': '<i class="fas fa-check-circle"></i>',
        'closed': '<i class="fas fa-lock"></i>'
    };
    return icons[status] || '<i class="fas fa-circle"></i>';
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global
window.switchTab = switchTab;
window.showCreateTicketModal = showCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;
window.createTicket = createTicket;
window.viewTicketDetail = viewTicketDetail;
window.sendReply = sendReply;
window.resolveTicket = resolveTicket;
window.closeTicketDetailModal = closeTicketDetailModal;
window.toggleFAQ = toggleFAQ;
window.changePage = changePage;