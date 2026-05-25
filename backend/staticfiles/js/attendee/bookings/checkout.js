// ============================================
// CHECKOUT FUNCTIONALITY
// Handles: Payment processing, form validation
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupPaymentMethodToggle();
    setupFormValidation();
    setupMpesaSTKPush();
});

function setupPaymentMethodToggle() {
    const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('mpesaDetails').style.display = this.value === 'mpesa' ? 'block' : 'none';
            document.getElementById('cardDetails').style.display = this.value === 'card' ? 'block' : 'none';
        });
    });
}

function setupFormValidation() {
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) return;
            
            const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
            
            if (paymentMethod === 'mpesa') {
                await processMpesaPayment();
            } else {
                await processCardPayment();
            }
        });
    }
}

function validateForm() {
    const name = document.querySelector('input[name="full_name"]').value.trim();
    const email = document.querySelector('input[name="email"]').value.trim();
    const phone = document.querySelector('input[name="phone"]').value.trim();
    
    if (!name) {
        showToast('Please enter your full name', 'error');
        return false;
    }
    
    if (!email || !validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
    }
    
    if (!phone) {
        showToast('Please enter your phone number', 'error');
        return false;
    }
    
    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10,12}$/;
    return re.test(phone.replace(/[^0-9]/g, ''));
}

async function processMpesaPayment() {
    const phone = document.querySelector('input[name="mpesa_number"]').value;
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    
    if (!phoneNumber || phoneNumber.length < 10) {
        showToast('Please enter a valid M-Pesa phone number', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/payments/mpesa/stkpush/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                phone_number: phoneNumber,
                amount: getTotalAmount()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('STK Push sent! Check your phone', 'success');
            startMpesaStatusCheck(data.checkout_request_id);
        } else {
            showToast(data.message || 'Payment initiation failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function startMpesaStatusCheck(checkoutRequestId) {
    let attempts = 0;
    const maxAttempts = 30;
    
    const interval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestId}/`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(interval);
                showToast('Payment successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 2000);
            } else if (data.status === 'failed' || attempts >= maxAttempts) {
                clearInterval(interval);
                showToast(data.message || 'Payment failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 2000);
}

async function processCardPayment() {
    showLoading();
    
    // Simulate card payment - integrate with Stripe/PayPal here
    setTimeout(() => {
        hideLoading();
        showToast('Payment processing...', 'info');
        
        // Redirect to success after mock payment
        setTimeout(() => {
            window.location.href = '/payment/success/';
        }, 2000);
    }, 1500);
}

function getTotalAmount() {
    const totalSpan = document.querySelector('.total-amount');
    if (totalSpan) {
        const total = parseFloat(totalSpan.textContent.replace('$', ''));
        return total;
    }
    return 0;
}

function setupMpesaSTKPush() {
    // Listen for M-Pesa callback from mobile
    if (window.Mpesa) {
        window.Mpesa.onPaymentComplete = function(response) {
            if (response.success) {
                window.location.href = response.redirect_url;
            } else {
                showToast(response.message || 'Payment failed', 'error');
            }
        };
    }
}
