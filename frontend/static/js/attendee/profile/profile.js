// ============================================
// ATTENDEE PROFILE - Complete Functionality
// ============================================

let currentUser = null;

// DOM Elements
const viewName = document.getElementById('viewName');
const viewEmail = document.getElementById('viewEmail');
const viewPhone = document.getElementById('viewPhone');
const viewMemberSince = document.getElementById('viewMemberSince');
const viewLastLogin = document.getElementById('viewLastLogin');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editPhone = document.getElementById('editPhone');
const avatarInitial = document.getElementById('avatarInitial');
const profileAvatar = document.getElementById('profileAvatar');
const avatarInput = document.getElementById('avatarInput');
const totalTickets = document.getElementById('totalTickets');
const totalSpent = document.getElementById('totalSpent');
const totalEvents = document.getElementById('totalEvents');
const totalReviews = document.getElementById('totalReviews');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');
const passwordMatch = document.getElementById('passwordMatch');

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    await loadProfile();
    await loadStats();
    setupEventListeners();
    setupAvatarUpload();
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
}

async function loadProfile() {
    if (window.Loader) window.Loader.show('Loading profile...');
    
    try {
        const profile = await window.AttendeeAPIEndpoints.profile.getProfile();
        currentUser = profile;
        displayProfile(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function displayProfile(profile) {
    if (viewName) viewName.textContent = profile.full_name || profile.name || 'Not set';
    if (viewEmail) viewEmail.textContent = profile.email || 'Not set';
    if (viewPhone) viewPhone.textContent = profile.phone || 'Not set';
    if (viewMemberSince) viewMemberSince.textContent = formatDate(profile.created_at);
    if (viewLastLogin) viewLastLogin.textContent = formatRelativeTime(profile.last_login);
    
    if (editName) editName.value = profile.full_name || profile.name || '';
    if (editEmail) editEmail.value = profile.email || '';
    if (editPhone) editPhone.value = profile.phone || '';
    
    const initial = (profile.full_name || profile.name || 'U').charAt(0).toUpperCase();
    if (avatarInitial) avatarInitial.textContent = initial;
    
    if (profile.avatar_url && profileAvatar) {
        profileAvatar.style.backgroundImage = `url('${profile.avatar_url}')`;
        profileAvatar.style.backgroundSize = 'cover';
        profileAvatar.style.backgroundPosition = 'center';
        profileAvatar.classList.add('has-image');
    }
}

async function loadStats() {
    try {
        const stats = await window.AttendeeAPIEndpoints.profile.getStats();
        
        if (totalTickets) totalTickets.textContent = formatNumber(stats.total_tickets || 0);
        if (totalSpent) totalSpent.textContent = formatCurrency(stats.total_spent || 0);
        if (totalEvents) totalEvents.textContent = formatNumber(stats.total_events || 0);
        if (totalReviews) totalReviews.textContent = formatNumber(stats.total_reviews || 0);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function toggleEditMode() {
    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');
    
    if (viewMode && editMode) {
        if (viewMode.style.display === 'none') {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            document.getElementById('editModeBtn').textContent = 'Edit Profile';
        } else {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            document.getElementById('editModeBtn').textContent = 'Cancel';
        }
    }
}

async function updateProfile(e) {
    e.preventDefault();
    
    const formData = {
        full_name: editName?.value.trim(),
        email: editEmail?.value.trim(),
        phone: editPhone?.value.trim()
    };
    
    if (!formData.full_name) {
        showToast('Name is required', 'error');
        return;
    }
    
    if (!formData.email || !isValidEmail(formData.email)) {
        showToast('Valid email is required', 'error');
        return;
    }
    
    if (window.Loader) window.Loader.show('Updating profile...');
    
    try {
        await window.AttendeeAPIEndpoints.profile.update(formData);
        showToast('Profile updated successfully', 'success');
        await loadProfile();
        toggleEditMode();
    } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function togglePasswordForm() {
    const passwordSection = document.getElementById('passwordSection');
    if (passwordSection) {
        if (passwordSection.style.display === 'none') {
            passwordSection.style.display = 'block';
        } else {
            passwordSection.style.display = 'none';
            document.getElementById('passwordForm')?.reset();
            clearPasswordValidation();
        }
    }
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
    
    if (window.Loader) window.Loader.show('Changing password...');
    
    try {
        await window.AttendeeAPIEndpoints.auth.changePassword(currentPassword, newPasswordValue);
        showToast('Password changed successfully', 'success');
        togglePasswordForm();
    } catch (error) {
        console.error('Password change error:', error);
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
    }
}

function checkPasswordStrength() {
    const password = newPassword?.value || '';
    
    if (!strengthFill || !strengthText) return;
    
    if (!password) {
        strengthFill.className = 'fill';
        strengthFill.style.width = '0%';
        strengthText.textContent = '';
        return;
    }
    
    let strength = 0;
    let level = '';
    let percent = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) {
        level = 'weak';
        percent = 25;
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#ef4444';
    } else if (strength <= 4) {
        level = 'fair';
        percent = 50;
        strengthText.textContent = 'Fair password';
        strengthText.style.color = '#f59e0b';
    } else if (strength <= 6) {
        level = 'good';
        percent = 75;
        strengthText.textContent = 'Good password';
        strengthText.style.color = '#3b82f6';
    } else {
        level = 'strong';
        percent = 100;
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
    }
    
    strengthFill.className = `fill ${level}`;
    strengthFill.style.width = `${percent}%`;
}

function checkPasswordMatch() {
    const newPasswordValue = newPassword?.value || '';
    const confirmPasswordValue = confirmPassword?.value || '';
    
    if (!passwordMatch) return;
    
    if (!confirmPasswordValue) {
        passwordMatch.textContent = '';
        passwordMatch.className = 'password-match';
        return;
    }
    
    if (newPasswordValue === confirmPasswordValue) {
        passwordMatch.textContent = '✓ Passwords match';
        passwordMatch.className = 'password-match match-success';
    } else {
        passwordMatch.textContent = '✗ Passwords do not match';
        passwordMatch.className = 'password-match match-error';
    }
}

function clearPasswordValidation() {
    if (strengthFill) {
        strengthFill.className = 'fill';
        strengthFill.style.width = '0%';
    }
    if (strengthText) strengthText.textContent = '';
    if (passwordMatch) {
        passwordMatch.textContent = '';
        passwordMatch.className = 'password-match';
    }
}

function setupAvatarUpload() {
    const avatarWrapper = document.querySelector('.avatar-wrapper');
    
    if (avatarWrapper && avatarInput) {
        avatarWrapper.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', uploadAvatar);
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
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
    
    if (window.Loader) window.Loader.show('Uploading avatar...');
    
    try {
        await window.AttendeeAPIEndpoints.profile.uploadAvatar(file);
        showToast('Avatar updated successfully', 'success');
        await loadProfile();
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast('Failed to upload avatar', 'error');
    } finally {
        if (window.Loader) window.Loader.hide();
        if (avatarInput) avatarInput.value = '';
    }
}

async function deleteAccount() {
    const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmed) return;
    
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;
    
    if (window.Loader) window.Loader.show('Deleting account...');
    
    try {
        await window.AttendeeAPIEndpoints.profile.deleteAccount(password);
        showToast('Account deleted. Redirecting...', 'success');
        
        setTimeout(() => {
            window.AttendeeAPIEndpoints.logout();
        }, 2000);
    } catch (error) {
        console.error('Account deletion error:', error);
        showToast(error.message || 'Failed to delete account', 'error');
        if (window.Loader) window.Loader.hide();
    }
}

// Helper functions
function formatNumber(num) {
    return Number(num).toLocaleString('en-KE');
}

function formatCurrency(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
window.toggleEditMode = toggleEditMode;
window.togglePasswordForm = togglePasswordForm;
window.deleteAccount = deleteAccount;