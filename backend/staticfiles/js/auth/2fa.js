// Two-Factor Authentication JavaScript
function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.digit-input');
    for (let i = 0; i < otpInputs.length; i++) {
        const input = otpInputs[i];
        input.value = '';
        input.addEventListener('input', function(e) {
            if (e.target.value.length === 1 && i < 5) {
                otpInputs[i + 1].focus();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                otpInputs[i - 1].focus();
            }
        });
    }
    if (otpInputs[0]) otpInputs[0].focus();
}

function getOTP() {
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += document.getElementById('digit-' + i).value;
    }
    return otp;
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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.verify2FA = async function() {
    const otp = getOTP();
    const errorDiv = document.getElementById('otpError');
    
    if (otp.length !== 6) {
        errorDiv.textContent = 'Please enter all 6 digits';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    errorDiv.classList.add('hidden');
    
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        const response = await fetch('/api/auth/2fa/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ otp: otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('2FA verified successfully!', 'success');
            window.location.href = data.redirect_url || '/dashboard/';
        } else {
            errorDiv.textContent = data.message || 'Invalid verification code';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Verification failed. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';
    }
};

window.resendCode = async function() {
    try {
        const response = await fetch('/api/auth/2fa/resend/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('New code sent!', 'success');
        } else {
            showToast(data.message || 'Failed to resend code', 'error');
        }
    } catch (error) {
        showToast('Failed to resend code', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupOTPInputs();
});
