// Forgot Password Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value.trim();
            const emailError = document.getElementById('emailError');
            const sendBtn = document.getElementById('sendResetBtn');
            
            if (!email) {
                emailError.textContent = 'Please enter your email address';
                emailError.classList.remove('hidden');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.classList.remove('hidden');
                return;
            }
            
            emailError.classList.add('hidden');
            
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('/api/auth/forgot-password/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ email: email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Reset link sent! Check your email.', 'success');
                    setTimeout(() => {
                        window.location.href = '/login/';
                    }, 3000);
                } else {
                    emailError.textContent = data.message || 'Email not found';
                    emailError.classList.remove('hidden');
                }
            } catch (error) {
                emailError.textContent = 'Network error. Please try again.';
                emailError.classList.remove('hidden');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Reset Link';
            }
        });
    }
});

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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
