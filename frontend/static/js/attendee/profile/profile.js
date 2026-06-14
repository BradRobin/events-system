// ============================================
// ATTENDEE PROFILE - Complete Functionality
// ============================================

let currentUser = null;
let currentEditField = '';

// DOM Elements
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const displayPhone = document.getElementById('displayPhone');
const memberSince = document.getElementById('memberSince');
const profileInitial = document.getElementById('profileInitial');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editPhone = document.getElementById('editPhone');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const token = localStorage.getItem('attendee_access_token');
    const userData = localStorage.getItem('attendee_user');
    
    if (!token) {
        window.location.href = '/login/';
        return;
    }
    
    // First display from localStorage
    if (userData) {
        try {
            const user = JSON.parse(userData);
            displayProfile(user);
        } catch(e) {}
    }
    
    // Then fetch fresh data
    await loadProfile();
    await loadStats();
    setupEventListeners();
    setupAvatarUpload();
    setupTabs();
});

function setupEventListeners() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }
    
    if (newPassword) {
        newPassword.addEventListener('input', checkPasswordStrength);
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', checkPasswordMatch);
    }
    
    // Delete account button
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', confirmDeleteAccount);
    }
    
    // Preference changes
    const emailNotifications = document.getElementById('emailNotifications');
    const pushNotifications = document.getElementById('pushNotifications');
    const newsletterSubscription = document.getElementById('newsletterSubscription');
    const profileVisibility = document.getElementById('profileVisibility');
    
    if (emailNotifications) emailNotifications.addEventListener('change', savePreferences);
    if (pushNotifications) pushNotifications.addEventListener('change', savePreferences);
    if (newsletterSubscription) newsletterSubscription.addEventListener('change', savePreferences);
    if (profileVisibility) profileVisibility.addEventListener('change', savePreferences);
}

async function loadProfile() {
    try {
        // Try to get from API first
        if (window.AttendeeAPIEndpoints && window.AttendeeAPIEndpoints.profile) {
            const profileResponse = await window.AttendeeAPIEndpoints.profile.getProfile();
            const profile = profileResponse.user || profileResponse;
            currentUser = profile;
            displayProfile(profile);
            // Sync through AccountProfile for consistent format
            if (window.AccountProfile) {
                AccountProfile.save(profile);
            } else {
                localStorage.setItem('attendee_user', JSON.stringify(profile));
            }
        } else {
            // Fallback to localStorage
            const userData = localStorage.getItem('attendee_user');
            if (userData) {
                currentUser = JSON.parse(userData);
                displayProfile(currentUser);
            } else {
                // Try to get from API directly
                const token = localStorage.getItem('attendee_access_token');
                if (token) {
                    const response = await fetch('/api/attendee/profile/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const profileResponse = await response.json();
                        const profile = profileResponse.user || profileResponse;
                        currentUser = profile;
                        displayProfile(profile);
                        if (window.AccountProfile) {
                            AccountProfile.save(profile);
                        } else {
                            localStorage.setItem('attendee_user', JSON.stringify(profile));
                        }
                    } else {
                        throw new Error('Failed to fetch profile');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Show error but don't redirect - user is still logged in
        showToast('Could not load profile data. Please refresh.', 'error');
    }
}

function displayProfile(profile) {
    console.log('Displaying profile:', profile);
    
    const name = profile.full_name || profile.name || 'User';
    const email = profile.email || '';
    const phone = profile.phone || '-';
    const memberSinceDate = profile.created_at || profile.date_joined || new Date().toISOString();
    const initial = name.charAt(0).toUpperCase();
    
    // Update header
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (profileInitial) profileInitial.textContent = initial;
    
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarUrl = profile.avatar_url;
    if (profileAvatar) {
        if (avatarUrl) {
            const cacheBust = avatarUrl.includes('?') ? '&' : '?';
            profileAvatar.style.backgroundImage = `url(${avatarUrl}${cacheBust}t=${Date.now()})`;
            profileAvatar.classList.add('has-image');
        } else {
            profileAvatar.style.backgroundImage = 'none';
            profileAvatar.classList.remove('has-image');
        }
    }
    
    // Update info fields
    if (displayName) displayName.textContent = name;
    if (displayEmail) displayEmail.textContent = email;
    if (displayPhone) displayPhone.textContent = phone;
    if (memberSince) memberSince.textContent = formatDate(memberSinceDate);
    
    // Update edit form fields
    if (editName) editName.value = name;
    if (editEmail) editEmail.value = email;
    if (editPhone) editPhone.value = phone === '-' ? '' : phone;
}

async function loadStats() {
    try {
        if (window.AttendeeAPIEndpoints && window.AttendeeAPIEndpoints.profile) {
            const stats = await window.AttendeeAPIEndpoints.profile.getStats();
            
            const totalTickets = document.getElementById('totalTickets');
            const totalSpent = document.getElementById('totalSpent');
            const totalEvents = document.getElementById('totalEvents');
            const totalReviews = document.getElementById('totalReviews');
            
            if (totalTickets) totalTickets.textContent = formatNumber(stats.total_tickets || 0);
            if (totalSpent) totalSpent.textContent = formatCurrency(stats.total_spent || 0);
            if (totalEvents) totalEvents.textContent = formatNumber(stats.total_events || 0);
            if (totalReviews) totalReviews.textContent = formatNumber(stats.total_reviews || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default stats
        const totalTickets = document.getElementById('totalTickets');
        if (totalTickets) totalTickets.textContent = '0';
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const activePane = document.getElementById(`${tabId}-tab`);
            if (activePane) activePane.classList.add('active');
        });
    });
}

function editField(field) {
    const fieldNames = {
        name: 'Full Name',
        email: 'Email Address',
        phone: 'Phone Number'
    };
    
    currentEditField = field;
    
    const editFieldName = document.getElementById('editFieldName');
    const editLabel = document.getElementById('editLabel');
    const editValue = document.getElementById('editValue');
    
    if (editFieldName) editFieldName.textContent = fieldNames[field];
    if (editLabel) editLabel.textContent = fieldNames[field];
    
    let currentValue = '';
    if (field === 'name') currentValue = displayName?.textContent || '';
    if (field === 'email') currentValue = displayEmail?.textContent || '';
    if (field === 'phone') currentValue = displayPhone?.textContent === '-' ? '' : displayPhone?.textContent || '';
    
    if (editValue) {
        editValue.value = currentValue;
        editValue.type = field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text';
    }
    
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
}

async function saveEdit() {
    const editValueEl = document.getElementById('editValue');
    const newValue = editValueEl?.value.trim();
    const field = currentEditField;
    const fieldLabels = { name: 'Name', email: 'Email', phone: 'Phone' };

    if (!field) {
        showToast('No field selected', 'error');
        return;
    }
    if (!newValue) {
        showToast(`${fieldLabels[field] || 'Field'} cannot be empty`, 'error');
        return;
    }

    const updateData = {};
    if (field === 'name') updateData.name = newValue;
    if (field === 'email') updateData.email = newValue;
    if (field === 'phone') updateData.phone = newValue;

    try {
        let response;
        if (window.AttendeeAPIEndpoints?.profile) {
            response = await window.AttendeeAPIEndpoints.profile.update(updateData);
        } else {
            const token = localStorage.getItem('attendee_access_token');
            const res = await fetch('/api/attendee/profile/update/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.error || 'Failed to update');
            }
            response = await res.json();
        }

        const updatedUser = response?.user || response;
        if (updatedUser && (updatedUser.email || updatedUser.full_name || updatedUser.phone)) {
            if (window.AccountProfile) {
                AccountProfile.save(updatedUser);
            } else {
                localStorage.setItem('attendee_user', JSON.stringify(updatedUser));
            }
        }

        showToast(`${fieldLabels[field] || 'Profile'} updated successfully`, 'success');
        await loadProfile();
        closeModal();
    } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'Failed to update', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
    currentEditField = '';
}

async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPasswordValue = newPassword?.value;
    const confirmPasswordValue = confirmPassword?.value;
    
    if (!currentPassword) {
        showToast('Current password is required', 'error');
        return;
    }
    
    if (newPasswordValue.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPasswordValue !== confirmPasswordValue) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    try {
        if (window.AttendeeAPIEndpoints?.auth) {
            await window.AttendeeAPIEndpoints.auth.changePassword(currentPassword, newPasswordValue);
        } else {
            const token = localStorage.getItem('attendee_access_token');
            const res = await fetch('/api/attendee/auth/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPasswordValue
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const pwErrors = err.errors?.new_password;
                throw new Error(
                    (Array.isArray(pwErrors) ? pwErrors.join(' ') : null)
                    || err.message || err.error || 'Failed to change password'
                );
            }
        }
        showToast('Password changed. Please log in again.', 'success');
        document.getElementById('passwordForm')?.reset();
        clearPasswordValidation();
        setTimeout(() => {
            localStorage.removeItem('attendee_access_token');
            localStorage.removeItem('attendee_refresh_token');
            localStorage.removeItem('attendee_user');
            window.location.href = '/login/';
        }, 2000);
    } catch (error) {
        console.error('Password change error:', error);
        showToast(error.message || 'Failed to change password', 'error');
    }
}

function checkPasswordStrength() {
    const password = newPassword?.value || '';
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthBar || !strengthText) return;
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthText.textContent = '';
        return;
    }
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    let level = '';
    let percent = 0;
    let text = '';
    
    if (strength <= 2) {
        level = 'weak';
        percent = 25;
        text = 'Weak password';
    } else if (strength <= 4) {
        level = 'fair';
        percent = 50;
        text = 'Fair password';
    } else if (strength <= 5) {
        level = 'good';
        percent = 75;
        text = 'Good password';
    } else {
        level = 'strong';
        percent = 100;
        text = 'Strong password';
    }
    
    strengthBar.style.width = `${percent}%`;
    strengthBar.className = `fill ${level}`;
    strengthText.textContent = text;
}

function checkPasswordMatch() {
    const newPasswordValue = newPassword?.value || '';
    const confirmPasswordValue = confirmPassword?.value || '';
    const matchMessage = document.getElementById('passwordMatchMessage');
    
    if (!matchMessage) return;
    
    if (!confirmPasswordValue) {
        matchMessage.textContent = '';
        return;
    }
    
    if (newPasswordValue === confirmPasswordValue) {
        matchMessage.textContent = '✓ Passwords match';
        matchMessage.style.color = '#10b981';
    } else {
        matchMessage.textContent = '✗ Passwords do not match';
        matchMessage.style.color = '#ef4444';
    }
}

function clearPasswordValidation() {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const matchMessage = document.getElementById('passwordMatchMessage');
    
    if (strengthBar) strengthBar.style.width = '0%';
    if (strengthText) strengthText.textContent = '';
    if (matchMessage) matchMessage.textContent = '';
}

async function savePreferences() {
    const preferences = {
        email_notifications: document.getElementById('emailNotifications')?.checked || false,
        push_notifications: document.getElementById('pushNotifications')?.checked || false,
        newsletter_subscription: document.getElementById('newsletterSubscription')?.checked || false,
        profile_visibility: document.getElementById('profileVisibility')?.value || 'public'
    };
    
    try {
        const token = localStorage.getItem('attendee_access_token');
        await fetch('/api/attendee/profile/preferences/', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(preferences)
        });
        showToast('Preferences saved', 'success');
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        deleteAccount();
    }
}

async function deleteAccount() {
    try {
        if (window.AttendeeAPIEndpoints?.profile?.deleteAccount) {
            await window.AttendeeAPIEndpoints.profile.deleteAccount();
        } else {
            const token = localStorage.getItem('attendee_access_token');
            const res = await fetch('/api/attendee/profile/delete-account/', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.error || 'Failed to delete account');
            }
        }
        localStorage.clear();
        showToast('Account deleted', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (error) {
        console.error('Delete account error:', error);
        showToast(error.message || 'Failed to delete account', 'error');
    }
}

function setupAvatarUpload() {
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarWrapper = document.getElementById('avatarWrapper');
    
    if (avatarInput) {
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => avatarInput.click());
        }
        if (avatarWrapper) {
            avatarWrapper.addEventListener('click', () => avatarInput.click());
        }
        avatarInput.addEventListener('change', uploadAvatar);
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    const input = e.target;
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Please select a valid image (JPEG, PNG, WEBP)', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be less than 2MB', 'error');
        return;
    }

    try {
        let response;
        if (window.AttendeeAPIEndpoints?.profile?.uploadAvatar) {
            response = await window.AttendeeAPIEndpoints.profile.uploadAvatar(file);
        } else {
            const formData = new FormData();
            formData.append('avatar', file);
            const token = localStorage.getItem('attendee_access_token');
            const res = await fetch('/api/attendee/profile/upload-avatar/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.error || 'Failed to upload avatar');
            }
            response = await res.json();
        }

        const updatedUser = response?.user;
        if (updatedUser && window.AccountProfile) {
            AccountProfile.save(updatedUser);
        }

        showToast('Avatar updated successfully', 'success');
        await loadProfile();
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast(error.message || 'Failed to upload avatar', 'error');
    } finally {
        input.value = '';
    }
}

function togglePassword(fieldId) {
    const input = document.getElementById(fieldId);
    const icon = input?.parentElement?.querySelector('.toggle-password i');
    
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        }
    }
}

// Helper functions
function formatNumber(num) {
    return Number(num).toLocaleString('en-KE');
}

function formatCurrency(amount) {
    return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.editField = editField;
window.saveEdit = saveEdit;
window.closeModal = closeModal;
window.togglePassword = togglePassword;
window.confirmDeleteAccount = confirmDeleteAccount;
