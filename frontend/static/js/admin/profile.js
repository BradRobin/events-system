// ============================================
// PROFILE JAVASCRIPT - Production Ready
// EventHub Admin Profile Management
// ============================================

// CSRF Token Helper
function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

// API Configuration
const API = {
    getProfile: '/api/admin/profile/',
    updateProfile: '/api/admin/profile/update/',
    changePassword: '/api/admin/profile/change-password/',
    uploadAvatar: '/api/admin/profile/upload-avatar/',
    getStats: '/api/admin/profile/stats/'
};

// DOM Elements
const elements = {
    viewMode: document.getElementById('viewMode'),
    editMode: document.getElementById('editMode'),
    profileForm: document.getElementById('profileForm'),
    passwordForm: document.getElementById('passwordForm'),
    editUsername: document.getElementById('editUsername'),
    editFullName: document.getElementById('editFullName'),
    editEmail: document.getElementById('editEmail'),
    editPhone: document.getElementById('editPhone'),
    viewUsername: document.getElementById('viewUsername'),
    viewFullName: document.getElementById('viewFullName'),
    viewEmail: document.getElementById('viewEmail'),
    viewPhone: document.getElementById('viewPhone'),
    userInitial: document.getElementById('userInitial'),
    userFullName: document.getElementById('userFullName'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    avatarInput: document.getElementById('avatarInput'),
    avatarWrapper: document.querySelector('.profile-avatar-wrapper')
};

// State
let currentUser = null;
let isLoading = false;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserProfile();
    await loadUserStats();
    attachEventListeners();
    initPasswordStrengthMeter();
});

function attachEventListeners() {
    // Profile form submission
    if (elements.profileForm) {
        elements.profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Password form submission
    if (elements.passwordForm) {
        elements.passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Avatar upload
    if (elements.avatarInput) {
        elements.avatarInput.addEventListener('change', handleAvatarUpload);
    }
    
    // Real-time password validation
    if (elements.newPassword) {
        elements.newPassword.addEventListener('input', validatePasswordStrength);
    }
    
    if (elements.confirmPassword) {
        elements.confirmPassword.addEventListener('input', validatePasswordMatch);
    }
}

// ============================================
// PROFILE FUNCTIONS
// ============================================

async function loadUserProfile() {
    showLoading();
    
    try {
        const response = await fetch(API.getProfile, {
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        
        currentUser = await response.json();
        updateProfileUI(currentUser);
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile data', 'error');
    } finally {
        hideLoading();
    }
}

function updateProfileUI(user) {
    // Update view mode
    if (elements.viewUsername) elements.viewUsername.textContent = user.username || '-';
    if (elements.viewFullName) elements.viewFullName.textContent = user.full_name || user.get_full_name || 'Not set';
    if (elements.viewEmail) elements.viewEmail.textContent = user.email || '-';
    if (elements.viewPhone) elements.viewPhone.textContent = user.phone || 'Not set';
    
    // Update edit mode
    if (elements.editUsername) elements.editUsername.value = user.username || '';
    if (elements.editFullName) elements.editFullName.value = user.full_name || user.get_full_name || '';
    if (elements.editEmail) elements.editEmail.value = user.email || '';
    if (elements.editPhone) elements.editPhone.value = user.phone || '';
    
    // Update header
    const displayName = user.full_name || user.get_full_name || user.username;
    if (elements.userFullName) elements.userFullName.textContent = displayName;
    
    // Update avatar initial
    const initial = (displayName ? displayName.charAt(0) : (user.username ? user.username.charAt(0) : 'A')).toUpperCase();
    if (elements.userInitial) elements.userInitial.textContent = initial;
    
    // Update avatar image if exists
    if (user.avatar_url && elements.avatarWrapper) {
        const avatarDiv = document.querySelector('.profile-avatar-large');
        if (avatarDiv) {
            avatarDiv.style.background = `url(${user.avatar_url}) center/cover no-repeat`;
            const span = avatarDiv.querySelector('span');
            if (span) span.style.display = 'none';
        }
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = {
        full_name: elements.editFullName.value.trim(),
        email: elements.editEmail.value.trim(),
        phone: elements.editPhone.value.trim()
    };
    
    // Validation
    if (!formData.email) {
        showToast('Email is required', 'error');
        return;
    }
    
    if (!isValidEmail(formData.email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    const submitBtn = elements.profileForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const response = await fetch(API.updateProfile, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }
        
        const updatedUser = await response.json();
        currentUser = updatedUser;
        updateProfileUI(updatedUser);
        
        showToast('Profile updated successfully', 'success');
        toggleEditMode();
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast(error.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// ============================================
// PASSWORD FUNCTIONS
// ============================================

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = elements.currentPassword.value;
    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmPassword.value;
    
    // Validation
    if (!currentPassword) {
        showToast('Current password is required', 'error');
        return;
    }
    
    if (!newPassword) {
        showToast('New password is required', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const submitBtn = elements.passwordForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const response = await fetch(API.changePassword, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }
        
        showToast('Password changed successfully', 'success');
        elements.passwordForm.reset();
        clearPasswordValidation();
    } catch (error) {
        console.error('Error changing password:', error);
        showToast(error.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Password strength meter
function initPasswordStrengthMeter() {
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength-container';
    strengthContainer.innerHTML = `
        <div class="password-strength"></div>
        <div class="password-strength-text"></div>
    `;
    
    const newPasswordGroup = elements.newPassword?.closest('.form-group');
    if (newPasswordGroup && !document.querySelector('.password-strength-container')) {
        newPasswordGroup.appendChild(strengthContainer);
    }
}

function validatePasswordStrength() {
    const password = elements.newPassword.value;
    const strengthBar = document.querySelector('.password-strength');
    const strengthText = document.querySelector('.password-strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    if (!password) {
        strengthBar.className = 'password-strength';
        strengthText.textContent = '';
        return;
    }
    
    let strength = 0;
    let strengthLevel = '';
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Determine strength level
    if (strength <= 2) {
        strengthLevel = 'weak';
        strengthText.textContent = 'Weak password';
    } else if (strength <= 4) {
        strengthLevel = 'fair';
        strengthText.textContent = 'Fair password';
    } else if (strength <= 6) {
        strengthLevel = 'good';
        strengthText.textContent = 'Good password';
    } else {
        strengthLevel = 'strong';
        strengthText.textContent = 'Strong password';
    }
    
    strengthBar.className = `password-strength-bar ${strengthLevel}`;
}

function validatePasswordMatch() {
    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmPassword.value;
    
    if (!confirmPassword) {
        elements.confirmPassword.classList.remove('is-invalid');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        elements.confirmPassword.classList.add('is-invalid');
        let feedback = elements.confirmPassword.parentElement.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            elements.confirmPassword.parentElement.appendChild(feedback);
        }
        feedback.textContent = 'Passwords do not match';
    } else {
        elements.confirmPassword.classList.remove('is-invalid');
        const feedback = elements.confirmPassword.parentElement.querySelector('.invalid-feedback');
        if (feedback) feedback.remove();
    }
}

function clearPasswordValidation() {
    if (elements.newPassword) elements.newPassword.value = '';
    if (elements.confirmPassword) elements.confirmPassword.value = '';
    elements.confirmPassword?.classList.remove('is-invalid');
    const strengthBar = document.querySelector('.password-strength-bar');
    const strengthText = document.querySelector('.password-strength-text');
    if (strengthBar) strengthBar.className = 'password-strength-bar';
    if (strengthText) strengthText.textContent = '';
}

// ============================================
// AVATAR FUNCTIONS
// ============================================

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPEG, PNG, GIF, WEBP)', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be less than 2MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    showLoading();
    
    try {
        const response = await fetch(API.uploadAvatar, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload avatar');
        }
        
        const data = await response.json();
        
        // Update avatar display
        const avatarDiv = document.querySelector('.profile-avatar-large');
        if (avatarDiv) {
            avatarDiv.style.background = `url(${data.avatar_url}) center/cover no-repeat`;
            const span = avatarDiv.querySelector('span');
            if (span) span.style.display = 'none';
        }
        
        showToast('Avatar updated successfully', 'success');
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
        if (elements.avatarInput) elements.avatarInput.value = '';
    }
}

// ============================================
// STATS FUNCTIONS
// ============================================

async function loadUserStats() {
    try {
        const response = await fetch(API.getStats, {
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        
        document.getElementById('totalEvents').textContent = stats.events_count || 0;
        document.getElementById('totalBookings').textContent = stats.bookings_count || 0;
        document.getElementById('totalSpent').textContent = formatCurrency(stats.total_spent || 0);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function toggleEditMode() {
    if (!elements.viewMode || !elements.editMode) return;
    
    if (elements.viewMode.style.display === 'none') {
        elements.viewMode.style.display = 'block';
        elements.editMode.style.display = 'none';
    } else {
        elements.viewMode.style.display = 'none';
        elements.editMode.style.display = 'block';
    }
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// Loading overlay management
function showLoading() {
    if (isLoading) return;
    isLoading = true;
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    isLoading = false;
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

// Toast notification
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Validation helpers
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return `KSh ${amount.toLocaleString()}`;
}

// Add slideOutRight animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);