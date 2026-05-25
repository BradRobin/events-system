// Users Management - Clean & Minimal
let currentPage = 1;
let totalPages = 1;
let currentFilters = { search: '', role: '', status: '' };

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('usersList')) {
        loadUsers();
        setupFilters();
    }
    if (document.getElementById('organizersList')) {
        loadOrganizers();
        setupOrganizerFilters();
    }
});

// ============ USERS ============
function setupFilters() {
    const search = document.getElementById('searchUsers');
    if (search) {
        let timer;
        search.addEventListener('input', function() {
            clearTimeout(timer);
            timer = setTimeout(() => {
                currentFilters.search = this.value;
                currentPage = 1;
                loadUsers();
            }, 500);
        });
    }
    const roleFilter = document.getElementById('userTypeFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function() {
            currentFilters.role = this.value === 'all' ? '' : this.value;
            currentPage = 1;
            loadUsers();
        });
    }
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilters.status = this.value;
            currentPage = 1;
            loadUsers();
        });
    }
}

async function loadUsers() {
    try {
        const params = new URLSearchParams({ page: currentPage, ...currentFilters });
        const data = await apiRequest(`/api/admin/users/?${params}`);
        displayUsers(data.users);
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages, (p) => { currentPage = p; loadUsers(); });
        }
    } catch (error) {
        document.getElementById('usersList').innerHTML = '<tr><td colspan="7">Error loading users</tr>';
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersList');
    if (!users || !users.length) {
        tbody.innerHTML = '<tr><td colspan="7">No users found</tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><input type="checkbox" value="${u.id}" class="user-checkbox"></td>
            <td><strong>${escapeHtml(u.username)}</strong>${u.full_name ? `<br><small>${escapeHtml(u.full_name)}</small>` : ''}</td>
            <td>${u.email}</td>
            <td><span class="role-badge role-${u.role}">${u.role}</span></td>
            <td>${u.is_active ? 'Active' : 'Inactive'}</td>
            <td>${formatDate(u.date_joined)}</td>
            <td class="actions">
                <button class="action-btn edit" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="toggleUserStatus(${u.id}, ${!u.is_active})"><i class="fas ${u.is_active ? 'fa-ban' : 'fa-check'}"></i></button>
            </td>
        </tr>
    `).join('');
}

function openAddUserModal() {
    document.getElementById('modalTitle').innerText = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function saveUser() {
    const userId = document.getElementById('userId').value;
    const data = {
        username: document.getElementById('userUsername').value,
        email: document.getElementById('userEmail').value,
        first_name: document.getElementById('userFirstName').value,
        last_name: document.getElementById('userLastName').value,
        role: document.getElementById('userRole').value
    };
    const password = document.getElementById('userPassword').value;
    if (password) data.password = password;
    
    const url = userId ? `/api/admin/users/${userId}/update/` : '/api/admin/users/create/';
    const method = userId ? 'PUT' : 'POST';
    
    try {
        await apiRequest(url, method, data);
        showToast(userId ? 'User updated' : 'User created');
        closeUserModal();
        loadUsers();
    } catch (error) {
        showToast('Failed to save user', 'error');
    }
}

function editUser(id) {
    window.location.href = `/admin-portal/users/detail/?id=${id}`;
}

async function toggleUserStatus(id, activate) {
    const action = activate ? 'activate' : 'suspend';
    showConfirm(`${action} this user?`, async () => {
        await apiRequest(`/api/admin/users/${id}/${action}/`, 'POST');
        showToast(`User ${action}ed`);
        loadUsers();
    });
}

// ============ USER DETAIL ============
async function loadUserDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    if (!userId) return;
    
    try {
        const data = await apiRequest(`/api/admin/users/${userId}/`);
        if (data.user) {
            const u = data.user;
            document.getElementById('userInitials').innerText = (u.full_name || u.username).charAt(0).toUpperCase();
            document.getElementById('userFullName').innerText = u.full_name || u.username;
            document.getElementById('userEmail').innerText = u.email;
            document.getElementById('userRole').innerHTML = `<span class="role-badge role-${u.role}">${u.role}</span>`;
            document.getElementById('userUsername').innerText = u.username;
            document.getElementById('userStatus').innerHTML = u.is_active ? 'Active' : 'Inactive';
            document.getElementById('userJoined').innerText = formatDate(u.date_joined);
            document.getElementById('userLastLogin').innerText = u.last_login ? formatDateTime(u.last_login) : 'Never';
            document.getElementById('userBookings').innerText = u.stats?.bookings || 0;
            document.getElementById('userSpent').innerText = formatCurrency(u.stats?.spent || 0);
            
            if (u.recent_bookings?.length) {
                document.getElementById('userBookingsList').innerHTML = u.recent_bookings.map(b => `
                    <tr><td>#${b.id}</td><td>${b.event_title}</td><td>${formatDate(b.date)}</td><td>${b.tickets}</td><td>${formatCurrency(b.total)}</td><td>${b.status}</td></tr>
                `).join('');
            }
        }
    } catch (error) {
        showToast('Failed to load user details', 'error');
    }
}

function editUserPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    window.location.href = `/admin-portal/users/edit/?id=${userId}`;
}

async function suspendUserPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    showConfirm('Suspend this user?', async () => {
        await apiRequest(`/api/admin/users/${userId}/suspend/`, 'POST');
        showToast('User suspended');
        loadUserDetail();
    });
}

// ============ ORGANIZERS ============
function setupOrganizerFilters() {
    const search = document.getElementById('searchOrganizers');
    if (search) {
        let timer;
        search.addEventListener('input', function() {
            clearTimeout(timer);
            timer = setTimeout(() => {
                currentFilters.search = this.value;
                currentPage = 1;
                loadOrganizers();
            }, 500);
        });
    }
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilters.status = this.value;
            currentPage = 1;
            loadOrganizers();
        });
    }
}

async function loadOrganizers() {
    try {
        const params = new URLSearchParams({ page: currentPage, ...currentFilters });
        const data = await apiRequest(`/api/admin/organizers/?${params}`);
        displayOrganizers(data.organizers);
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages, (p) => { currentPage = p; loadOrganizers(); });
        }
    } catch (error) {
        document.getElementById('organizersList').innerHTML = '<td><td colspan="7">Error loading organizers</tr>';
    }
}

function displayOrganizers(organizers) {
    const tbody = document.getElementById('organizersList');
    if (!organizers || !organizers.length) {
        tbody.innerHTML = '<tr><td colspan="7">No organizers found</tr>';
        return;
    }
    tbody.innerHTML = organizers.map(o => `
        <tr>
            <td>${o.id}</td>
            <td><strong>${escapeHtml(o.full_name || o.username)}</strong>${o.company ? `<br><small>${escapeHtml(o.company)}</small>` : ''}</td>
            <td>${o.email}</td>
            <td>${o.events_count || 0}</td>
            <td>${formatCurrency(o.total_sales || 0)}</td>
            <td>${o.status === 'active' ? 'Active' : 'Pending'}</td>
            <td class="actions">
                <button class="action-btn view" onclick="viewOrganizer(${o.id})"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="editOrganizer(${o.id})"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

function addOrganizer() {
    document.getElementById('organizerForm').reset();
    document.getElementById('organizerModal').style.display = 'flex';
}

function closeOrganizerModal() {
    document.getElementById('organizerModal').style.display = 'none';
}

async function saveOrganizer() {
    const data = {
        username: document.getElementById('orgUsername').value,
        email: document.getElementById('orgEmail').value,
        first_name: document.getElementById('orgFirstName').value,
        last_name: document.getElementById('orgLastName').value,
        company: document.getElementById('orgCompany').value,
        phone: document.getElementById('orgPhone').value,
        password: document.getElementById('orgPassword').value,
        commission_rate: parseFloat(document.getElementById('orgCommission').value)
    };
    
    try {
        await apiRequest('/api/admin/organizers/create/', 'POST', data);
        showToast('Organizer added');
        closeOrganizerModal();
        loadOrganizers();
    } catch (error) {
        showToast('Failed to add organizer', 'error');
    }
}

function viewOrganizer(id) {
    window.location.href = `/admin-portal/users/detail/?id=${id}`;
}

function editOrganizer(id) {
    window.location.href = `/admin-portal/users/edit/?id=${id}&role=organizer`;
}

function applyFilters() {
    currentPage = 1;
    if (document.getElementById('usersList')) loadUsers();
    if (document.getElementById('organizersList')) loadOrganizers();
}

// ============ UTILITIES ============
function formatDate(d) {
    return d ? new Date(d).toLocaleDateString() : 'N/A';
}

function formatDateTime(d) {
    return d ? new Date(d).toLocaleString() : 'N/A';
}

function formatCurrency(a) {
    return `KSh ${(a || 0).toLocaleString()}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderPagination(current, total, onPageChange) {
    const container = document.getElementById('pagination');
    if (!container) return;
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        }
    }
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
    window.changePage = onPageChange;
}
