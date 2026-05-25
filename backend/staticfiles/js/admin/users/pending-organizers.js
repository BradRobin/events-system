// Pending Organizers Approval JavaScript
let currentPage = 1;
let totalPages = 1;
let currentOrganizerId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadPendingOrganizers();
    loadStats();
});

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/organizers/pending/stats/');
        document.getElementById('pendingCount').textContent = data.stats?.pending || 0;
        document.getElementById('approvedCount').textContent = data.stats?.approved_this_month || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadPendingOrganizers() {
    Loader.show('Loading pending applications...');
    
    try {
        const params = new URLSearchParams({ page: currentPage });
        const data = await apiRequest(`/api/admin/organizers/pending/?${params}`);
        
        displayPendingOrganizers(data.organizers);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading pending organizers:', error);
        document.getElementById('pendingOrganizersList').innerHTML = 
            '<div class="empty-state">Failed to load applications</div>';
    } finally {
        Loader.hide();
    }
}

function displayPendingOrganizers(organizers) {
    const container = document.getElementById('pendingOrganizersList');
    
    if (!organizers || organizers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No Pending Applications</h3>
                <p>All organizer applications have been processed.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = organizers.map(org => `
        <div class="organizer-card">
            <div class="organizer-header">
                <div class="organizer-avatar">
                    <i class="fas fa-building"></i>
                </div>
                <div class="organizer-name">
                    <h3>${escapeHtml(org.business_name)}</h3>
                    <p>Submitted: ${formatDate(org.submitted_at)}</p>
                </div>
            </div>
            <div class="organizer-body">
                <div class="info-row"><span>Contact Person:</span><span>${escapeHtml(org.contact_name)}</span></div>
                <div class="info-row"><span>Email:</span><span>${escapeHtml(org.email)}</span></div>
                <div class="info-row"><span>Phone:</span><span>${escapeHtml(org.phone)}</span></div>
                <div class="info-row"><span>Tax ID:</span><span>${escapeHtml(org.tax_id || 'N/A')}</span></div>
            </div>
            <div class="organizer-footer">
                <button class="btn-outline" onclick="viewDocuments(${org.id})">
                    <i class="fas fa-file-pdf"></i> View Documents
                </button>
                <button class="btn-danger" onclick="rejectOrganizer(${org.id})">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn-success" onclick="approveOrganizer(${org.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
            </div>
        </div>
    `).join('');
}

async function viewDocuments(organizerId) {
    currentOrganizerId = organizerId;
    
    try {
        const data = await apiRequest(`/api/admin/organizers/${organizerId}/`);
        const org = data.organizer;
        
        document.getElementById('reviewModalBody').innerHTML = `
            <div class="organizer-details">
                <h4>Business Information</h4>
                <div class="info-row"><span>Business Name:</span><strong>${escapeHtml(org.business_name)}</strong></div>
                <div class="info-row"><span>Contact Person:</span><span>${escapeHtml(org.contact_name)}</span></div>
                <div class="info-row"><span>Email:</span><span>${escapeHtml(org.email)}</span></div>
                <div class="info-row"><span>Phone:</span><span>${escapeHtml(org.phone)}</span></div>
                <div class="info-row"><span>Tax ID:</span><span>${escapeHtml(org.tax_id || 'N/A')}</span></div>
                
                <h4 style="margin-top: 20px;">Business Documents</h4>
                <div class="document-preview">
                    <a href="${org.document_url}" target="_blank" class="btn-outline">
                        <i class="fas fa-file-pdf"></i> View Business License
                    </a>
                </div>
            </div>
        `;
        
        document.getElementById('reviewModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load organizer details', 'error');
    }
}

async function approveOrganizer(organizerId) {
    Loader.show('Approving organizer...');
    
    try {
        await apiRequest(`/api/admin/organizers/${organizerId}/approve/`, 'POST');
        showToast('Organizer approved successfully', 'success');
        closeReviewModal();
        loadPendingOrganizers();
        loadStats();
    } catch (error) {
        showToast('Failed to approve organizer', 'error');
    } finally {
        Loader.hide();
    }
}

async function rejectOrganizer(organizerId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    Loader.show('Rejecting application...');
    
    try {
        await apiRequest(`/api/admin/organizers/${organizerId}/reject/`, 'POST', { reason: reason });
        showToast('Application rejected', 'success');
        closeReviewModal();
        loadPendingOrganizers();
        loadStats();
    } catch (error) {
        showToast('Failed to reject application', 'error');
    } finally {
        Loader.hide();
    }
}

function refreshPending() {
    loadPendingOrganizers();
    loadStats();
    showToast('Refreshed', 'success');
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentOrganizerId = null;
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadPendingOrganizers();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
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

window.viewDocuments = viewDocuments;
window.approveOrganizer = approveOrganizer;
window.rejectOrganizer = rejectOrganizer;
window.refreshPending = refreshPending;
window.closeReviewModal = closeReviewModal;
window.changePage = changePage;
