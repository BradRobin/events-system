// Email Verification Page JavaScript
let otpTimer = 60;
let otpInterval;

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

function clearOTPInputs() {
    for (let i = 0; i < 6; i++) {
        const input = document.getElementById('digit-' + i);
        if (input) input.value = '';
    }
    setupOTPInputs();
}

function startTimer() {
    otpTimer = 60;
    const timerSpan = document.getElementById('timer');
    const resendText = document.getElementById('resendText');
    const resendBtn = document.getElementById('resendBtn');
    
    if (otpInterval) clearInterval(otpInterval);
    
    if (resendText) resendText.classList.remove('hidden');
    if (resendBtn) resendBtn.classList.add('hidden');
    
    otpInterval = setInterval(() => {
        otpTimer--;
        if (timerSpan) timerSpan.textContent = otpTimer;
        if (otpTimer <= 0) {
            clearInterval(otpInterval);
            if (resendText) resendText.classList.add('hidden');
            if (resendBtn) resendBtn.classList.remove('hidden');
        }
    }, 1000);
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
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

window.verifyOTP = async function() {
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
        const response = await fetch('/api/auth/verify-email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ otp: otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Email verified successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard/';
            }, 1500);
        } else {
            errorDiv.textContent = data.message || 'Invalid verification code';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Verification failed. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Email';
    }
};

window.resendOTP = async function() {
    try {
        const response = await fetch('/api/auth/send-verify-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            startTimer();
            clearOTPInputs();
            showToast('Verification code resent!', 'success');
        } else {
            showToast(data.message || 'Failed to resend code', 'error');
        }
    } catch (error) {
        showToast('Failed to resend code. Please try again.', 'error');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupOTPInputs();
    startTimer();
});
