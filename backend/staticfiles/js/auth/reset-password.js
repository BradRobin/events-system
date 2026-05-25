// Reset Password Page JavaScript
let currentStep = 1;
let resetEmail = '';
let verifiedOTP = '';
let otpTimer = 60;
let otpInterval;

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function goBack() {
    if (currentStep === 1) {
        window.location.href = '/login/';
    } else if (currentStep === 2) {
        showStep(1);
        clearOTPInputs();
        if (otpInterval) clearInterval(otpInterval);
    } else if (currentStep === 3) {
        showStep(2);
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        const strengthDiv = document.getElementById('passwordStrength');
        if (strengthDiv) strengthDiv.classList.add('hidden');
    }
}

function showStep(step) {
    currentStep = step;
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    
    if (step1) step1.style.display = step === 1 ? 'block' : 'none';
    if (step2) step2.style.display = step === 2 ? 'block' : 'none';
    if (step3) step3.style.display = step === 3 ? 'block' : 'none';
    
    if (step === 2) {
        clearOTPInputs();
        setupOTPInputs();
    }
}

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
}

function startOTPTimer() {
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

function togglePassword(fieldId, iconId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(iconId);
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

// Email Form Submit
document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('emailForm');
    const newPassword = document.getElementById('newPassword');
    const passwordForm = document.getElementById('passwordForm');
    
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            resetEmail = document.getElementById('resetEmail').value.trim();
            const emailError = document.getElementById('emailError');
            
            if (!resetEmail) {
                emailError.textContent = 'Please enter your email address';
                emailError.classList.remove('hidden');
                return;
            }
            
            if (!validateEmail(resetEmail)) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.classList.remove('hidden');
                return;
            }
            
            emailError.classList.add('hidden');
            
            const sendBtn = document.getElementById('sendCodeBtn');
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('/api/auth/send-reset-otp/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ email: resetEmail })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const verifyDisplay = document.getElementById('verifyEmailDisplay');
                    if (verifyDisplay) verifyDisplay.textContent = resetEmail;
                    showStep(2);
                    startOTPTimer();
                    showToast('Verification code sent!', 'success');
                } else {
                    emailError.textContent = data.message || 'Failed to send code';
                    emailError.classList.remove('hidden');
                }
            } catch (error) {
                emailError.textContent = 'Network error. Please try again.';
                emailError.classList.remove('hidden');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Code';
            }
        });
    }
    
    // Password Strength
    if (newPassword) {
        newPassword.addEventListener('input', function() {
            const password = this.value;
            const strengthDiv = document.getElementById('passwordStrength');
            
            if (password.length === 0) {
                strengthDiv.classList.add('hidden');
                return;
            }
            
            strengthDiv.classList.remove('hidden');
            
            if (password.length < 6) {
                strengthDiv.innerHTML = '<span class="strength-weak">⚠️ Weak password - min 6 characters</span>';
            } else if (password.length < 10) {
                strengthDiv.innerHTML = '<span class="strength-medium">✓ Medium strength</span>';
            } else {
                strengthDiv.innerHTML = '<span class="strength-strong">✓ Strong password!</span>';
            }
        });
    }
    
    // Password Form Submit
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorDiv = document.getElementById('passwordError');
            
            if (newPassword.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                errorDiv.classList.remove('hidden');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('hidden');
                return;
            }
            
            errorDiv.classList.add('hidden');
            
            const resetBtn = document.getElementById('resetBtn');
            resetBtn.disabled = true;
            resetBtn.textContent = 'Resetting...';
            
            try {
                const response = await fetch('/api/auth/reset-password/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ 
                        email: resetEmail, 
                        otp: verifiedOTP, 
                        new_password: newPassword 
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Password reset successful! Redirecting to login...', 'success');
                    setTimeout(() => {
                        window.location.href = '/login/';
                    }, 2000);
                } else {
                    errorDiv.textContent = data.message || 'Failed to reset password';
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                errorDiv.textContent = 'Password reset failed. Please try again.';
                errorDiv.classList.remove('hidden');
            } finally {
                resetBtn.disabled = false;
                resetBtn.textContent = 'Reset Password';
            }
        });
    }
});

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
        const response = await fetch('/api/auth/verify-reset-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ email: resetEmail, otp: otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            verifiedOTP = otp;
            showStep(3);
            showToast('OTP verified successfully!', 'success');
            if (otpInterval) clearInterval(otpInterval);
        } else {
            errorDiv.textContent = data.message || 'Invalid verification code';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Verification failed. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Code';
    }
};

window.resendOTP = async function() {
    try {
        const response = await fetch('/api/auth/send-reset-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ email: resetEmail })
        });
        
        const data = await response.json();
        
        if (data.success) {
            startOTPTimer();
            showToast('Verification code resent!', 'success');
            clearOTPInputs();
            setupOTPInputs();
        } else {
            showToast(data.message || 'Failed to resend code', 'error');
        }
    } catch (error) {
        showToast('Failed to resend code', 'error');
    }
};
