// Notifications JavaScript
let currentPage = 1;
let totalPages = 1;
let currentTemplateId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    loadTemplates();
});

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('broadcastTab').classList.remove('active');
    document.getElementById('templatesTab').classList.remove('active');
    document.getElementById('historyTab').classList.remove('active');
    
    if (tab === 'broadcast') {
        document.getElementById('broadcastTab').classList.add('active');
    } else if (tab === 'templates') {
        document.getElementById('templatesTab').classList.add('active');
        loadTemplates();
    } else if (tab === 'history') {
        document.getElementById('historyTab').classList.add('active');
        loadNotifications();
    }
}

async function sendBroadcast() {
    const title = document.getElementById('broadcastTitle').value;
    const message = document.getElementById('broadcastMessage').value;
    const audience = document.querySelector('input[name="audience"]:checked').value;
    const method = document.querySelector('input[name="sendMethod"]:checked').value;
    
    if (!title || !message) {
        showToast('Please fill in title and message', 'error');
        return;
    }
    
    Loader.show('Sending broadcast...');
    
    try {
        await apiRequest('/api/admin/notifications/broadcast/', 'POST', {
            title: title,
            message: message,
            audience: audience,
            method: method
        });
        
        showToast('Broadcast sent successfully', 'success');
        document.getElementById('broadcastTitle').value = '';
        document.getElementById('broadcastMessage').value = '';
    } catch (error) {
        console.error('Error sending broadcast:', error);
        showToast('Failed to send broadcast', 'error');
    } finally {
        Loader.hide();
    }
}

async function loadNotifications() {
    try {
        const data = await apiRequest(`/api/admin/notifications/?page=${currentPage}`);
        
        displayNotifications(data.notifications);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationsList').innerHTML = 
            '<div class="empty-state">Failed to load notifications</div>';
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications found</p></div>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}">
            <div class="notification-content">
                <div class="notification-title">
                    ${escapeHtml(n.title)}
                    <span class="notification-badge ${n.type}">${n.type}</span>
                </div>
                <div class="notification-message">${escapeHtml(n.message)}</div>
                <div class="notification-time">${formatRelativeTime(n.created_at)}</div>
            </div>
            <div class="notification-actions">
                ${!n.is_read ? `<button class="action-btn" onclick="markAsRead(${n.id})" title="Mark as Read"><i class="fas fa-check"></i></button>` : ''}
                <button class="action-btn" onclick="deleteNotification(${n.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${notifications.length} notifications`;
}

async function loadTemplates() {
    try {
        const data = await apiRequest('/api/admin/notifications/templates/');
        const container = document.getElementById('templatesList');
        
        if (!data.templates || data.templates.length === 0) {
            container.innerHTML = '<div class="empty-state">No templates found</div>';
            return;
        }
        
        container.innerHTML = data.templates.map(t => `
            <div class="template-item">
                <div class="template-info">
                    <h4>${escapeHtml(t.name)}</h4>
                    <p>${escapeHtml(t.subject)}</p>
                </div>
                <div class="template-actions">
                    <button class="action-btn" onclick="editTemplate(${t.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="deleteTemplate(${t.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

function addTemplate() {
    currentTemplateId = null;
    document.getElementById('templateModalTitle').textContent = 'Add Template';
    document.getElementById('templateName').value = '';
    document.getElementById('templateSubject').value = '';
    document.getElementById('templateBody').value = '';
    document.getElementById('templateModal').style.display = 'flex';
}

function editTemplate(id) {
    currentTemplateId = id;
    loadTemplateData(id);
    document.getElementById('templateModalTitle').textContent = 'Edit Template';
    document.getElementById('templateModal').style.display = 'flex';
}

async function loadTemplateData(id) {
    try {
        const data = await apiRequest(`/api/admin/notifications/templates/${id}/`);
        if (data.template) {
            document.getElementById('templateName').value = data.template.name;
            document.getElementById('templateSubject').value = data.template.subject;
            document.getElementById('templateBody').value = data.template.body;
        }
    } catch (error) {
        console.error('Error loading template:', error);
    }
}

async function saveTemplate() {
    const name = document.getElementById('templateName').value;
    const subject = document.getElementById('templateSubject').value;
    const body = document.getElementById('templateBody').value;
    
    if (!name || !subject || !body) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    Loader.show('Saving template...');
    
    try {
        const url = currentTemplateId 
            ? `/api/admin/notifications/templates/${currentTemplateId}/`
            : '/api/admin/notifications/templates/';
        const method = currentTemplateId ? 'PUT' : 'POST';
        
        await apiRequest(url, method, { name, subject, body });
        showToast('Template saved successfully', 'success');
        closeTemplateModal();
        loadTemplates();
    } catch (error) {
        console.error('Error saving template:', error);
        showToast('Failed to save template', 'error');
    } finally {
        Loader.hide();
    }
}

async function deleteTemplate(id) {
    showConfirm('Delete this template?', async () => {
        try {
            await apiRequest(`/api/admin/notifications/templates/${id}/`, 'DELETE');
            showToast('Template deleted', 'success');
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            showToast('Failed to delete template', 'error');
        }
    });
}

async function markAsRead(id) {
    try {
        await apiRequest(`/api/admin/notifications/${id}/read/`, 'POST');
        loadNotifications();
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

async function deleteNotification(id) {
    showConfirm('Delete this notification?', async () => {
        try {
            await apiRequest(`/api/admin/notifications/${id}/`, 'DELETE');
            showToast('Notification deleted', 'success');
            loadNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
            showToast('Failed to delete notification', 'error');
        }
    });
}

function closeTemplateModal() {
    document.getElementById('templateModal').style.display = 'none';
    currentTemplateId = null;
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadNotifications();
    }
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.switchTab = switchTab;
window.sendBroadcast = sendBroadcast;
window.addTemplate = addTemplate;
window.editTemplate = editTemplate;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
window.closeTemplateModal = closeTemplateModal;
window.changePage = changePage;
