// Organizer Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentOrganizerId = null;
let currentTab = 'verified';

document.addEventListener('DOMContentLoaded', function() {
    loadOrganizers();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchVerified = document.getElementById('searchVerified');
    if (searchVerified) {
        let debounceTimer;
        searchVerified.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadOrganizers();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            loadOrganizers();
        });
    }
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('verifiedTab').classList.remove('active');
    document.getElementById('pendingTab').classList.remove('active');
    document.getElementById('suspendedTab').classList.remove('active');
    
    if (tab === 'verified') {
        document.getElementById('verifiedTab').classList.add('active');
        loadOrganizers();
    } else if (tab === 'pending') {
        document.getElementById('pendingTab').classList.add('active');
        loadPendingOrganizers();
    } else if (tab === 'suspended') {
        document.getElementById('suspendedTab').classList.add('active');
        loadSuspendedOrganizers();
    }
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/organizers/stats/');
        document.getElementById('verifiedCount').textContent = data.stats?.verified || 0;
        document.getElementById('pendingCount').textContent = data.stats?.pending || 0;
        document.getElementById('totalEvents').textContent = data.stats?.total_events || 0;
        document.getElementById('totalTickets').textContent = data.stats?.total_tickets || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadOrganizers() {
    const search = document.getElementById('searchVerified')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    Loader.show('Loading organizers...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            status: status
        });
        const data = await apiRequest(`/api/admin/organizers/verified/?${params}`);
        
        displayOrganizers(data.organizers);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderVerifiedPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading organizers:', error);
    } finally {
        Loader.hide();
    }
}

function displayOrganizers(organizers) {
    const tbody = document.getElementById('verifiedOrganizersList');
    
    if (!organizers || organizers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No organizers found</td></tr>';
        document.getElementById('verifiedRecordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = organizers.map(org => `
        <tr>
            <td><strong>${escapeHtml(org.business_name)}</strong></td>
            <td>${escapeHtml(org.contact_name)}</td>
            <td>${escapeHtml(org.email)}</td>
            <td>${org.phone || 'N/A'}</td>
            <td>${org.event_count || 0} events</td>
            <td>${org.status === 'active' ? '<span class="status-badge status-active">Active</span>' : '<span class="status-badge status-suspended">Suspended</span>'}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewOrganizerDetail(${org.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${org.status === 'active' ? `
                    <button class="action-btn suspend" onclick="suspendOrganizer(${org.id})" title="Suspend">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : `
                    <button class="action-btn edit" onclick="reactivateOrganizer(${org.id})" title="Reactivate">
                        <i class="fas fa-user-check"></i>
                    </button>
                `}
             </td>
        </tr>
    `).join('');
    
    document.getElementById('verifiedRecordsCount').textContent = `Showing ${organizers.length} records`;
}

async function loadPendingOrganizers() {
    Loader.show('Loading pending applications...');
    
    try {
        const params = new URLSearchParams({ page: currentPage });
        const data = await apiRequest(`/api/admin/organizers/pending/?${params}`);
        
        displayPendingOrganizers(data.organizers);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPendingPagination(currentPage, totalPages);
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
                <button class="btn-success" onclick="verifyOrganizer(${org.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
            </div>
        </div>
    `).join('');
}

async function loadSuspendedOrganizers() {
    Loader.show('Loading suspended organizers...');
    
    try {
        const data = await apiRequest(`/api/admin/organizers/suspended/?page=${currentPage}`);
        
        displaySuspendedOrganizers(data.organizers);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderSuspendedPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading suspended organizers:', error);
    } finally {
        Loader.hide();
    }
}

function displaySuspendedOrganizers(organizers) {
    const tbody = document.getElementById('suspendedOrganizersList');
    
    if (!organizers || organizers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No suspended organizers found</td></td>';
        return;
    }
    
    tbody.innerHTML = organizers.map(org => `
        <tr>
            <td><strong>${escapeHtml(org.business_name)}</strong></td>
            <td>${escapeHtml(org.email)}</td>
            <td>${formatDate(org.suspended_at)}</td>
            <td>${escapeHtml(org.suspension_reason || 'No reason provided')}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewOrganizerDetail(${org.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="reactivateOrganizer(${org.id})" title="Reactivate">
                    <i class="fas fa-user-check"></i>
                </button>
              </td>
        </tr>
    `).join('');
}

async function viewDocuments(organizerId) {
    currentOrganizerId = organizerId;
    
    try {
        const data = await apiRequest(`/api/admin/organizers/${organizerId}/`);
        const org = data.organizer;
        
        document.getElementById('verifyModalBody').innerHTML = `
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
                
                <h4 style="margin-top: 20px;">Verification Notes</h4>
                <textarea id="verificationNotes" rows="3" class="form-control" placeholder="Add internal notes..."></textarea>
            </div>
        `;
        
        document.getElementById('verifyModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load organizer details', 'error');
    }
}

async function verifyOrganizer(organizerId) {
    const notes = document.getElementById('verificationNotes')?.value;
    
    Loader.show('Verifying organizer...');
    
    try {
        await apiRequest(`/api/admin/organizers/${organizerId}/verify/`, 'POST', { notes: notes });
        showToast('Organizer verified successfully', 'success');
        closeVerifyModal();
        loadPendingOrganizers();
        loadStats();
        if (currentTab === 'verified') loadOrganizers();
    } catch (error) {
        showToast('Failed to verify organizer', 'error');
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
        loadPendingOrganizers();
        loadStats();
    } catch (error) {
        showToast('Failed to reject application', 'error');
    } finally {
        Loader.hide();
    }
}

async function suspendOrganizer(organizerId) {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason) return;
    
    Loader.show('Suspending organizer...');
    
    try {
        await apiRequest(`/api/admin/organizers/${organizerId}/suspend/`, 'POST', { reason: reason });
        showToast('Organizer suspended', 'success');
        loadOrganizers();
        loadStats();
    } catch (error) {
        showToast('Failed to suspend organizer', 'error');
    } finally {
        Loader.hide();
    }
}

async function reactivateOrganizer(organizerId) {
    Loader.show('Reactivating organizer...');
    
    try {
        await apiRequest(`/api/admin/organizers/${organizerId}/reactivate/`, 'POST');
        showToast('Organizer reactivated', 'success');
        loadOrganizers();
        loadSuspendedOrganizers();
        loadStats();
    } catch (error) {
        showToast('Failed to reactivate organizer', 'error');
    } finally {
        Loader.hide();
    }
}

function viewOrganizerDetail(organizerId) {
    window.open(`/admin-portal/users/detail/?id=${organizerId}&type=organizer`, '_blank');
}

function closeVerifyModal() {
    document.getElementById('verifyModal').style.display = 'none';
    currentOrganizerId = null;
}

function applyFilters() {
    currentPage = 1;
    loadOrganizers();
}

function resetFilters() {
    document.getElementById('searchVerified').value = '';
    document.getElementById('statusFilter').value = '';
    currentPage = 1;
    loadOrganizers();
}

function renderVerifiedPagination(current, total) {
    const container = document.getElementById('verifiedPagination');
    renderPagination(container, current, total, (page) => { currentPage = page; loadOrganizers(); });
}

function renderPendingPagination(current, total) {
    const container = document.getElementById('pendingPagination');
    renderPagination(container, current, total, (page) => { currentPage = page; loadPendingOrganizers(); });
}

function renderSuspendedPagination(current, total) {
    const container = document.getElementById('suspendedPagination');
    renderPagination(container, current, total, (page) => { currentPage = page; loadSuspendedOrganizers(); });
}

function renderPagination(container, current, total, onPageChange) {
    if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }
    let html = `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current-1})">&laquo;</button>`;
    for (let i = Math.max(1, current-2); i <= Math.min(total, current+2); i++)
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current+1})">&raquo;</button>`;
    container.innerHTML = html;
    
    window.changePage = function(page) {
        if (page !== current && page >= 1 && page <= total) onPageChange(page);
    };
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

window.switchTab = switchTab;
window.viewDocuments = viewDocuments;
window.verifyOrganizer = verifyOrganizer;
window.rejectOrganizer = rejectOrganizer;
window.suspendOrganizer = suspendOrganizer;
window.reactivateOrganizer = reactivateOrganizer;
window.viewOrganizerDetail = viewOrganizerDetail;
window.closeVerifyModal = closeVerifyModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.changePage = changePage;
