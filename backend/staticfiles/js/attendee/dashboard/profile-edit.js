// ============================================
// ATTENDEE PROFILE EDIT JAVASCRIPT
// Handles: Profile editing, password change
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupProfileForm();
    setupPasswordForm();
    validateForm();
});

function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            
            try {
                const response = await fetch('/api/user/profile/update/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Profile updated successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = '/profile/';
                    }, 1500);
                } else {
                    showToast(data.message || 'Update failed', 'error');
                }
            } catch (error) {
                showToast('Network error', 'error');
            }
        });
    }
}

function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match', 'error');
                return;
            }
            
            if (newPassword.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/user/change-password/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Password changed successfully!', 'success');
                    form.reset();
                } else {
                    showToast(data.message || 'Password change failed', 'error');
                }
            } catch (error) {
                showToast('Network error', 'error');
            }
        });
    }
}

function validateForm() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (newPassword && confirmPassword) {
        newPassword.addEventListener('input', checkPasswordStrength);
        confirmPassword.addEventListener('input', () => {
            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.classList.add('is-invalid');
                document.getElementById('passwordMatchError').style.display = 'block';
            } else {
                confirmPassword.classList.remove('is-invalid');
                document.getElementById('passwordMatchError').style.display = 'none';
            }
        });
    }
}

function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.getElementById('passwordStrength');
    
    if (!strengthBar) return;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    const percentage = (strength / 4) * 100;
    strengthBar.style.width = `${percentage}%`;
    
    if (percentage < 25) {
        strengthBar.className = 'bg-danger';
    } else if (percentage < 50) {
        strengthBar.className = 'bg-warning';
    } else if (percentage < 75) {
        strengthBar.className = 'bg-info';
    } else {
        strengthBar.className = 'bg-success';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
