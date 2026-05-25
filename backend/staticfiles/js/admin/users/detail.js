// User Detail JavaScript
let userId = null;
let userType = null;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('id');
    userType = urlParams.get('type') || 'user';
    
    if (userId) {
        loadUserDetail();
    }
});

async function loadUserDetail() {
    Loader.show('Loading user details...');
    
    try {
        const data = await apiRequest(`/api/admin/users/${userId}/`);
        const user = data.user;
        
        document.getElementById('userTypeLabel').textContent = user.role === 'organizer' ? 'Organizer Details' : 'User Details';
        
        const content = `
            <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
                <!-- Personal Information -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-user"></i> Personal Information</h3>
                    </div>
                    <div class="card-body" style="padding: 1.5rem;">
                        <div class="info-row"><span>Full Name:</span><strong>${escapeHtml(user.full_name || user.username)}</strong></div>
                        <div class="info-row"><span>Username:</span><span>${escapeHtml(user.username)}</span></div>
                        <div class="info-row"><span>Email:</span><span>${escapeHtml(user.email)}</span></div>
                        <div class="info-row"><span>Phone:</span><span>${user.phone || 'N/A'}</span></div>
                        <div class="info-row"><span>Role:</span><span>${getRoleBadge(user.role)}</span></div>
                        <div class="info-row"><span>Status:</span><span>${getStatusBadge(user.status)}</span></div>
                    </div>
                </div>
                
                <!-- Account Information -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-calendar-alt"></i> Account Information</h3>
                    </div>
                    <div class="card-body" style="padding: 1.5rem;">
                        <div class="info-row"><span>Joined:</span><span>${formatDateTime(user.created_at)}</span></div>
                        <div class="info-row"><span>Last Login:</span><span>${user.last_login ? formatDateTime(user.last_login) : 'Never'}</span></div>
                        <div class="info-row"><span>Email Verified:</span><span>${user.email_verified ? '<span class="status-badge status-verified">Yes</span>' : '<span class="status-badge status-pending">No</span>'}</span></div>
                    </div>
                </div>
                
                ${user.role === 'organizer' ? `
                    <!-- Business Information -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-building"></i> Business Information</h3>
                        </div>
                        <div class="card-body" style="padding: 1.5rem;">
                            <div class="info-row"><span>Business Name:</span><strong>${escapeHtml(user.business_name || 'N/A')}</strong></div>
                            <div class="info-row"><span>Tax ID / PIN:</span><span>${escapeHtml(user.tax_id || 'N/A')}</span></div>
                            <div class="info-row"><span>Business Address:</span><span>${escapeHtml(user.business_address || 'N/A')}</span></div>
                            <div class="info-row"><span>Verification Status:</span><span>${user.is_verified ? '<span class="status-badge status-verified">Verified</span>' : '<span class="status-badge status-pending">Pending</span>'}</span></div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-line"></i> Statistics</h3>
                        </div>
                        <div class="card-body" style="padding: 1.5rem;">
                            <div class="info-row"><span>Total Events:</span><span>${user.total_events || 0}</span></div>
                            <div class="info-row"><span>Total Tickets Sold:</span><span>${user.total_tickets || 0}</span></div>
                            <div class="info-row"><span>Total Revenue:</span><span>${formatCurrency(user.total_revenue || 0)}</span></div>
                            <div class="info-row"><span>Average Rating:</span><span>${user.avg_rating || 0} ★</span></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('userDetailContent').innerHTML = content;
        
        const suspendBtn = document.getElementById('suspendBtn');
        if (suspendBtn && user.role !== 'admin') {
            if (user.status === 'suspended') {
                suspendBtn.innerHTML = '<i class="fas fa-user-check"></i> Reactivate User';
                suspendBtn.className = 'btn-success';
                suspendBtn.onclick = () => reactivateUser();
            } else {
                suspendBtn.innerHTML = '<i class="fas fa-ban"></i> Suspend User';
                suspendBtn.className = 'btn-danger';
                suspendBtn.onclick = () => openSuspendModal();
            }
        } else if (suspendBtn) {
            suspendBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showToast('Failed to load user details', 'error');
    } finally {
        Loader.hide();
    }
}

function openSuspendModal() {
    document.getElementById('suspendModal').style.display = 'flex';
}

async function confirmSuspend() {
    const reason = document.getElementById('suspendReason')?.value;
    
    Loader.show('Suspending user...');
    
    try {
        await apiRequest(`/api/admin/users/${userId}/suspend/`, 'POST', {
            reason: reason || 'Violation of platform terms'
        });
        showToast('User suspended successfully', 'success');
        closeSuspendModal();
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showToast('Failed to suspend user', 'error');
    } finally {
        Loader.hide();
    }
}

async function reactivateUser() {
    Loader.show('Reactivating user...');
    
    try {
        await apiRequest(`/api/admin/users/${userId}/reactivate/`, 'POST');
        showToast('User reactivated successfully', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showToast('Failed to reactivate user', 'error');
    } finally {
        Loader.hide();
    }
}

function closeSuspendModal() {
    document.getElementById('suspendModal').style.display = 'none';
    document.getElementById('suspendReason').value = '';
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

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
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

window.confirmSuspend = confirmSuspend;
window.closeSuspendModal = closeSuspendModal;
