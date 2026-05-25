/* ============================================
   ALL USERS MANAGEMENT - COMPLETE
   EventHub Admin - Users Management with Role Filtering
   ============================================ */

let currentPage = 1;
let totalPages = 1;
let currentUserId = null;
let currentRole = 'all';

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
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
    
    const verificationFilter = document.getElementById('verificationFilter');
    if (verificationFilter) verificationFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
}

function filterByRole(role) {
    currentRole = role;
    currentPage = 1;
    
    document.querySelectorAll('.user-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`.user-tab[onclick="filterByRole('${role}')"]`);
    if (activeTab) activeTab.classList.add('active');
    
    loadUsers();
    loadStats();
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/users/stats/');
        if (data.stats) {
            document.getElementById('totalUsers').textContent = data.stats.total || 0;
            document.getElementById('activeUsers').textContent = data.stats.active || 0;
            document.getElementById('newUsers').textContent = data.stats.new_this_month || 0;
            document.getElementById('totalBookings').textContent = data.stats.total_bookings || 0;
            
            document.getElementById('allCount').textContent = data.stats.total || 0;
            document.getElementById('attendeeCount').textContent = data.stats.attendees || 0;
            document.getElementById('organizerCount').textContent = data.stats.organizers || 0;
            document.getElementById('adminCount').textContent = data.stats.admins || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    const search = document.getElementById('searchUsers')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const verification = document.getElementById('verificationFilter')?.value || '';
    const date = document.getElementById('dateFilter')?.value || '';
    
    Loader.show('Loading users...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            role: currentRole,
            status: status,
            verification: verification,
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
            '<td><td colspan="9" class="text-center">Failed to load users</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersList');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No users found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">
                        <span>${(user.full_name || user.username).charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <strong>${escapeHtml(user.full_name || user.username)}</strong>
                        <br>
                        <small class="text-muted">@${escapeHtml(user.username)}</small>
                    </div>
                </div>
             </td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user.status)}</td>
            <td>${user.email_verified ? '<span class="status-badge status-verified">✓ Verified</span>' : '<span class="status-badge status-pending">Pending</span>'}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatRelativeTime(user.last_login) : 'Never'}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewUserDetail(${user.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${user.role !== 'admin' ? `
                    <button class="action-btn edit" onclick="openResetPasswordModal(${user.id})" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    ${user.status === 'active' ? 
                        `<button class="action-btn suspend" onclick="openSuspendModal(${user.id})" title="Suspend User">
                            <i class="fas fa-ban"></i>
                        </button>` : 
                        `<button class="action-btn edit" onclick="activateUser(${user.id})" title="Activate User">
                            <i class="fas fa-user-check"></i>
                        </button>`
                    }
                ` : ''}
             </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${users.length} records`;
}

function viewUserDetail(userId) {
    window.location.href = `/admin-portal/users/detail/?id=${userId}`;
}

function openResetPasswordModal(userId) {
    currentUserId = userId;
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

async function confirmResetPassword() {
    Loader.show('Sending reset link...');
    try {
        await apiRequest(`/api/admin/users/${currentUserId}/reset-password/`, 'POST');
        showToast('Password reset link sent successfully', 'success');
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
    } catch (error) {
        showToast('Failed to suspend user', 'error');
    } finally {
        Loader.hide();
    }
}

async function activateUser(userId) {
    Loader.show('Activating user...');
    try {
        await apiRequest(`/api/admin/users/${userId}/activate/`, 'POST');
        showToast('User activated successfully', 'success');
        loadUsers();
        loadStats();
    } catch (error) {
        showToast('Failed to activate user', 'error');
    } finally {
        Loader.hide();
    }
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
    loadStats();
}

function resetFilters() {
    document.getElementById('searchUsers').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('verificationFilter').value = '';
    document.getElementById('dateFilter').value = '';
    applyFilters();
}

function exportUsers() {
    const params = new URLSearchParams({
        role: currentRole,
        status: document.getElementById('statusFilter')?.value || '',
        search: document.getElementById('searchUsers')?.value || '',
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

function formatRelativeTime(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
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

// Make functions global
window.filterByRole = filterByRole;
window.viewUserDetail = viewUserDetail;
window.openResetPasswordModal = openResetPasswordModal;
window.confirmResetPassword = confirmResetPassword;
window.openSuspendModal = openSuspendModal;
window.confirmSuspend = confirmSuspend;
window.activateUser = activateUser;
window.closeResetModal = closeResetModal;
window.closeSuspendModal = closeSuspendModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportUsers = exportUsers;
window.changePage = changePage;