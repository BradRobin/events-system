// ============================================
// ATTENDEE PROFILE JAVASCRIPT
// Handles: Profile view, data display
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadProfileStats();
    initAvatarUpload();
});

async function loadProfileStats() {
    try {
        const response = await fetch('/api/user/profile/stats/');
        const data = await response.json();
        
        if (data) {
            document.getElementById('totalTickets').innerText = data.total_tickets || 0;
            document.getElementById('totalEvents').innerText = data.total_events || 0;
            document.getElementById('totalSpent').innerText = `$${data.total_spent || 0}`;
            document.getElementById('memberSince').innerText = data.member_since || 'N/A';
        }
    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}

function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('avatar', file);
                
                try {
                    const response = await fetch('/api/user/profile/avatar/', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken')
                        }
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        location.reload();
                    } else {
                        showToast(data.message || 'Upload failed', 'error');
                    }
                } catch (error) {
                    showToast('Error uploading avatar', 'error');
                }
            }
        });
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
