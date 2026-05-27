// ============================================
// CONTACT PAGE - Form Submission with Validation
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        // Add input validation listeners
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const subjectInput = document.getElementById('subject');
        const messageInput = document.getElementById('message');
        
        if (nameInput) nameInput.addEventListener('input', () => validateField('name'));
        if (emailInput) emailInput.addEventListener('input', () => validateField('email'));
        if (subjectInput) subjectInput.addEventListener('input', () => validateField('subject'));
        if (messageInput) messageInput.addEventListener('input', () => validateField('message'));
        
        contactForm.addEventListener('submit', handleContactSubmit);
    }
});

// Field validation
function validateField(fieldName) {
    const field = document.getElementById(fieldName);
    if (!field) return true;
    
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    switch(fieldName) {
        case 'name':
            isValid = value.length >= 2;
            errorMessage = 'Name must be at least 2 characters';
            break;
        case 'email':
            isValid = isValidEmail(value);
            errorMessage = 'Please enter a valid email address';
            break;
        case 'subject':
            isValid = value.length >= 3;
            errorMessage = 'Subject must be at least 3 characters';
            break;
        case 'message':
            isValid = value.length >= 10;
            errorMessage = 'Message must be at least 10 characters';
            break;
    }
    
    if (!isValid && value.length > 0) {
        field.classList.add('error');
        showFieldError(fieldName, errorMessage);
    } else {
        field.classList.remove('error');
        hideFieldError(fieldName);
    }
    
    return isValid;
}

function showFieldError(fieldName, message) {
    let errorDiv = document.getElementById(`${fieldName}Error`);
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = `${fieldName}Error`;
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;';
        const field = document.getElementById(fieldName);
        if (field) field.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

function hideFieldError(fieldName) {
    const errorDiv = document.getElementById(`${fieldName}Error`);
    if (errorDiv) errorDiv.remove();
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const subject = document.getElementById('subject')?.value.trim();
    const message = document.getElementById('message')?.value.trim();
    
    // Validate all fields
    const isNameValid = validateField('name');
    const isEmailValid = validateField('email');
    const isSubjectValid = validateField('subject');
    const isMessageValid = validateField('message');
    
    if (!isNameValid || !isEmailValid || !isSubjectValid || !isMessageValid) {
        showToast('Please fill in all fields correctly', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#contactForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // API call to submit contact form
        const response = await fetch('/api/contact/submit/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                name: name,
                email: email,
                subject: subject,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
            document.getElementById('contactForm').reset();
            // Clear any error states
            ['name', 'email', 'subject', 'message'].forEach(field => {
                hideFieldError(field);
                const input = document.getElementById(field);
                if (input) input.classList.remove('error');
            });
        } else {
            throw new Error(data.message || 'Failed to send message');
        }
        
    } catch (error) {
        console.error('Contact form error:', error);
        showToast(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add slideOut animation
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