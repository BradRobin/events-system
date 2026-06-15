// ============================================
// SETTINGS PAGE JS - EventHub Style
// ============================================

// DOM Elements
let currentSection = 'profile';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    loadUserProfile();
    loadNotificationSettings();
    loadPrivacySettings();
    setupNavigation();
    setupForms();
    setupPasswordStrength();
}

async function loadUserProfile() {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    try {
        if (window.AttendeeAPIEndpoints?.profile?.getProfile) {
            const profile = await window.AttendeeAPIEndpoints.profile.getProfile();
            const user = profile?.user || profile;
            if (user) {
                if (fullNameInput) fullNameInput.value = user.full_name || user.name || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput) phoneInput.value = user.phone || '';
                return;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    if (fullNameInput) fullNameInput.value = user.full_name || user.name || user.first_name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
}

// Load Notification Settings
function loadNotificationSettings() {
    const settings = JSON.parse(localStorage.getItem('notification_settings') || '{}');
    const emailNotifications = document.getElementById('emailNotifications');
    const pushNotifications = document.getElementById('pushNotifications');
    const eventReminders = document.getElementById('eventReminders');
    const promoEmails = document.getElementById('promoEmails');
    
    if (emailNotifications) emailNotifications.checked = settings.email_notifications !== false;
    if (pushNotifications) pushNotifications.checked = settings.push_notifications !== false;
    if (eventReminders) eventReminders.checked = settings.event_reminders !== false;
    if (promoEmails) promoEmails.checked = settings.promo_emails || false;
}

// Load Privacy Settings
function loadPrivacySettings() {
    const settings = JSON.parse(localStorage.getItem('privacy_settings') || '{}');
    const publicProfile = document.getElementById('publicProfile');
    const showBookings = document.getElementById('showBookings');
    
    if (publicProfile) publicProfile.checked = settings.public_profile || false;
    if (showBookings) showBookings.checked = settings.show_bookings || false;
}

// Setup Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            currentSection = section;
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const sections = document.querySelectorAll('.settings-section');
            sections.forEach(sectionEl => {
                sectionEl.classList.remove('active');
                if (sectionEl.id === `${section}Section`) {
                    sectionEl.classList.add('active');
                }
            });
        });
    });
}

// Setup Forms
function setupForms() {
    const profileForm = document.getElementById('profileForm');
    const securityForm = document.getElementById('securityForm');
    const notificationsForm = document.getElementById('notificationsForm');
    const privacyForm = document.getElementById('privacyForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    if (securityForm) {
        securityForm.addEventListener('submit', handleSecurityUpdate);
    }
    
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', handleNotificationsUpdate);
    }
    
    if (privacyForm) {
        privacyForm.addEventListener('submit', handlePrivacyUpdate);
    }
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    
    if (!fullName || !email) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        if (window.AttendeeAPIEndpoints?.profile?.update) {
            await window.AttendeeAPIEndpoints.profile.update({
                name: fullName,
                full_name: fullName,
                email,
                phone,
            });
        } else if (window.AccountProfile) {
            AccountProfile.save({
                name: fullName,
                full_name: fullName,
                email,
                phone,
            });
        }

        if (window.AccountProfile) {
            await AccountProfile.syncFromAPI();
        }

        showMessage('Profile updated successfully!', 'success');
        updateNavbarUserInfo();
    } catch (error) {
        console.error('Profile update failed:', error);
        showMessage(error.message || 'Failed to update profile', 'error');
    }
}

// Handle Security Update
async function handleSecurityUpdate(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        if (window.AttendeeAPIEndpoints?.auth?.changePassword) {
            await window.AttendeeAPIEndpoints.auth.changePassword(currentPassword, newPassword);
        } else {
            throw new Error('Password service unavailable');
        }
        showMessage('Password updated successfully!', 'success');
        document.getElementById('securityForm').reset();
    } catch (error) {
        console.error('Password update failed:', error);
        showMessage(error.message || 'Failed to update password', 'error');
    }
}

// Handle Notifications Update
function handleNotificationsUpdate(e) {
    e.preventDefault();
    
    const settings = {
        email_notifications: document.getElementById('emailNotifications').checked,
        push_notifications: document.getElementById('pushNotifications').checked,
        event_reminders: document.getElementById('eventReminders').checked,
        promo_emails: document.getElementById('promoEmails').checked
    };
    
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    showMessage('Notification preferences saved!', 'success');
}

// Handle Privacy Update
function handlePrivacyUpdate(e) {
    e.preventDefault();
    
    const settings = {
        public_profile: document.getElementById('publicProfile').checked,
        show_bookings: document.getElementById('showBookings').checked
    };
    
    localStorage.setItem('privacy_settings', JSON.stringify(settings));
    showMessage('Privacy settings saved!', 'success');
}

// Setup Password Strength Checker
function setupPasswordStrength() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (newPassword) {
        newPassword.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            checkPasswordMatch();
        });
    }
}

// Check Password Strength
function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-bar .fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    let strengthLevel = 'weak';
    let strengthMessage = 'Weak password';
    
    if (strength >= 4) {
        strengthLevel = 'strong';
        strengthMessage = 'Strong password!';
    } else if (strength >= 3) {
        strengthLevel = 'good';
        strengthMessage = 'Good password';
    } else if (strength >= 2) {
        strengthLevel = 'fair';
        strengthMessage = 'Fair password';
    }
    
    strengthBar.className = `fill ${strengthLevel}`;
    strengthText.textContent = strengthMessage;
    strengthText.style.color = strengthLevel === 'strong' ? '#10b981' : strengthLevel === 'good' ? '#3b82f6' : strengthLevel === 'fair' ? '#f59e0b' : '#ef4444';
}

// Check Password Match
function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const matchIndicator = document.querySelector('.password-match');
    
    if (!newPassword || !confirmPassword || !matchIndicator) return;
    
    if (confirmPassword.value.length === 0) {
        matchIndicator.textContent = '';
        return;
    }
    
    if (newPassword.value === confirmPassword.value) {
        matchIndicator.textContent = '✓ Passwords match';
        matchIndicator.className = 'password-match success';
    } else {
        matchIndicator.textContent = '✗ Passwords do not match';
        matchIndicator.className = 'password-match error';
    }
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion');
    if (confirmation !== 'DELETE') {
        showMessage('Account deletion cancelled', 'error');
        return;
    }

    try {
        if (window.AttendeeAPIEndpoints?.profile?.deleteAccount) {
            await window.AttendeeAPIEndpoints.profile.deleteAccount();
        } else {
            throw new Error('Account deletion service unavailable');
        }

        localStorage.removeItem('attendee_access_token');
        localStorage.removeItem('attendee_refresh_token');
        localStorage.removeItem('attendee_user');
        localStorage.removeItem('eventhub_cart');
        localStorage.removeItem('event_wishlist');
        localStorage.removeItem('eventhub_bookings');
        localStorage.removeItem('eventhub_tickets');
        localStorage.removeItem('notification_settings');
        localStorage.removeItem('privacy_settings');

        showMessage('Account deleted successfully', 'success');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 1500);
    } catch (error) {
        console.error('Account deletion failed:', error);
        showMessage(error.message || 'Failed to delete account', 'error');
    }
}

// Update Navbar User Info
function updateNavbarUserInfo() {
    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
    if (window.AccountProfile) {
        AccountProfile.applyToNavbar(user);
    }
}

// Show Message
function showMessage(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;
    
    alertDiv.className = `alert-message ${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 4000);
}

// Helper Functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Make functions global
window.deleteAccount = deleteAccount;
