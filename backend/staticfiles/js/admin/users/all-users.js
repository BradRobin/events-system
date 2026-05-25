// All Users Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadUsers();
            }, 500);
        });
    }
    
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) roleFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/users/stats/');
        document.getElementById('totalUsers').textContent = data.stats?.total || 0;
        document.getElementById('activeUsers').textContent = data.stats?.active || 0;
        document.getElementById('newUsers').textContent = data.stats?.new_this_month || 0;
        document.getElementById('organizerCount').textContent = data.stats?.organizers || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    const search = document.getElementById('searchUsers')?.value || '';
    const role = document.getElementById('roleFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const date = document.getElementById('dateFilter')?.value || '';
    
    Loader.show('Loading users...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            role: role,
            status: status,
            date: date
        });
        const data = await apiRequest(`/api/admin/users/?${params}`);
        
        displayUsers(data.users);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = 
            '<tr><td colspan="8" class="text-center">Failed to load users</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersList');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 32px; height: 32px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 0.8rem;">${(user.full_name || user.username).charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <strong>${escapeHtml(user.full_name || user.username)}</strong>
                    </div>
                </div>
             </td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user.status)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewUserDetail(${user.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${user.role !== 'admin' ? `
                    <button class="action-btn edit" onclick="openResetPasswordModal(${user.id})" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="action-btn suspend" onclick="openSuspendModal(${user.id})" title="Suspend User">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : ''}
             </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${users.length} records`;
}

async function viewUserDetail(userId) {
    currentUserId = userId;
    
    try {
        const data = await apiRequest(`/api/admin/users/${userId}/`);
        const user = data.user;
        
        document.getElementById('userModalBody').innerHTML = `
            <div class="info-row"><span>User ID:</span><span>#${user.id}</span></div>
            <div class="info-row"><span>Full Name:</span><span><strong>${escapeHtml(user.full_name || user.username)}</strong></span></div>
            <div class="info-row"><span>Email:</span><span>${escapeHtml(user.email)}</span></div>
            <div class="info-row"><span>Phone:</span><span>${user.phone || 'N/A'}</span></div>
            <div class="info-row"><span>Role:</span><span>${getRoleBadge(user.role)}</span></div>
            <div class="info-row"><span>Status:</span><span>${getStatusBadge(user.status)}</span></div>
            <div class="info-row"><span>Joined:</span><span>${formatDateTime(user.created_at)}</span></div>
            <div class="info-row"><span>Last Login:</span><span>${user.last_login ? formatDateTime(user.last_login) : 'Never'}</span></div>
            ${user.role === 'organizer' ? `
                <div class="info-row"><span>Business Name:</span><span>${escapeHtml(user.business_name || 'N/A')}</span></div>
                <div class="info-row"><span>Verification Status:</span><span>${user.is_verified ? '<span class="status-badge status-verified">Verified</span>' : '<span class="status-badge status-pending">Pending</span>'}</span></div>
            ` : ''}
        `;
        
        const resetBtn = document.getElementById('resetPasswordBtn');
        const suspendBtn = document.getElementById('suspendUserBtn');
        
        if (user.role === 'admin') {
            if (resetBtn) resetBtn.style.display = 'none';
            if (suspendBtn) suspendBtn.style.display = 'none';
        } else {
            if (resetBtn) resetBtn.style.display = 'inline-flex';
            if (suspendBtn) suspendBtn.style.display = 'inline-flex';
            
            if (user.status === 'suspended') {
                if (suspendBtn) {
                    suspendBtn.innerHTML = '<i class="fas fa-user-check"></i> Reactivate User';
                    suspendBtn.className = 'btn-success';
                    suspendBtn.onclick = () => reactivateUser(userId);
                }
            } else {
                if (suspendBtn) {
                    suspendBtn.innerHTML = '<i class="fas fa-ban"></i> Suspend User';
                    suspendBtn.className = 'btn-danger';
                    suspendBtn.onclick = () => openSuspendModal(userId);
                }
            }
        }
        
        document.getElementById('userModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load user details', 'error');
    }
}

function openResetPasswordModal(userId) {
    currentUserId = userId;
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

async function confirmResetPassword() {
    Loader.show('Sending reset link...');
    
    try {
        await apiRequest(`/api/admin/users/${currentUserId}/reset-password/`, 'POST');
        showToast('Password reset link sent to user\'s email', 'success');
        closeResetModal();
    } catch (error) {
        showToast('Failed to send reset link', 'error');
    } finally {
        Loader.hide();
    }
}

function openSuspendModal(userId) {
    currentUserId = userId;
    document.getElementById('suspendModal').style.display = 'flex';
}

async function confirmSuspend() {
    const reason = document.getElementById('suspendReason')?.value;
    
    Loader.show('Suspending user...');
    
    try {
        await apiRequest(`/api/admin/users/${currentUserId}/suspend/`, 'POST', {
            reason: reason || 'Violation of platform terms'
        });
        showToast('User suspended successfully', 'success');
        closeSuspendModal();
        loadUsers();
        loadStats();
        closeUserModal();
    } catch (error) {
        showToast('Failed to suspend user', 'error');
    } finally {
        Loader.hide();
    }
}

async function reactivateUser(userId) {
    Loader.show('Reactivating user...');
    
    try {
        await apiRequest(`/api/admin/users/${userId}/reactivate/`, 'POST');
        showToast('User reactivated successfully', 'success');
        loadUsers();
        loadStats();
        closeUserModal();
    } catch (error) {
        showToast('Failed to reactivate user', 'error');
    } finally {
        Loader.hide();
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    currentUserId = null;
}

function closeResetModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
    currentUserId = null;
}

function closeSuspendModal() {
    document.getElementById('suspendModal').style.display = 'none';
    document.getElementById('suspendReason').value = '';
    currentUserId = null;
}

function applyFilters() {
    currentPage = 1;
    loadUsers();
}

function resetFilters() {
    document.getElementById('searchUsers').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFilter').value = '';
    currentPage = 1;
    loadUsers();
}

function exportUsers() {
    const params = new URLSearchParams({
        search: document.getElementById('searchUsers')?.value || '',
        role: document.getElementById('roleFilter')?.value || '',
        status: document.getElementById('statusFilter')?.value || '',
        date: document.getElementById('dateFilter')?.value || ''
    });
    window.open(`/api/admin/users/export/?${params}`, '_blank');
    showToast('Export started', 'success');
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
        loadUsers();
    }
}

function getRoleBadge(role) {
    const badges = {
        'admin': '<span class="role-badge role-admin"><i class="fas fa-shield-alt"></i> Admin</span>',
        'organizer': '<span class="role-badge role-organizer"><i class="fas fa-building"></i> Organizer</span>',
        'attendee': '<span class="role-badge role-attendee"><i class="fas fa-user"></i> Attendee</span>'
    };
    return badges[role] || `<span class="role-badge">${role}</span>`;
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="status-badge status-active"><i class="fas fa-circle"></i> Active</span>',
        'inactive': '<span class="status-badge status-inactive"><i class="fas fa-circle"></i> Inactive</span>',
        'suspended': '<span class="status-badge status-suspended"><i class="fas fa-ban"></i> Suspended</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
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

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.viewUserDetail = viewUserDetail;
window.openResetPasswordModal = openResetPasswordModal;
window.confirmResetPassword = confirmResetPassword;
window.openSuspendModal = openSuspendModal;
window.confirmSuspend = confirmSuspend;
window.closeUserModal = closeUserModal;
window.closeResetModal = closeResetModal;
window.closeSuspendModal = closeSuspendModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportUsers = exportUsers;
window.changePage = changePage;
