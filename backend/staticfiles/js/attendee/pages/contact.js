// Contact page with complete validation and API communication
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formResponse = document.getElementById('formResponse');
    const messageField = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    
    // Character counter for message field
    if (messageField && charCount) {
        messageField.addEventListener('input', function() {
            const count = this.value.length;
            charCount.textContent = count + '/1000 characters';
            
            if (count > 900) {
                charCount.classList.add('text-warning');
            } else {
                charCount.classList.remove('text-warning');
            }
        });
    }
    
    // Validation functions
    const validators = {
        validateName: function(name) {
            if (!name || name.trim().length < 2) {
                return { valid: false, message: 'Name must be at least 2 characters' };
            }
            if (name.trim().length > 100) {
                return { valid: false, message: 'Name must not exceed 100 characters' };
            }
            return { valid: true, message: '' };
        },
        
        validateEmail: function(email) {
            const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
            if (!email) {
                return { valid: false, message: 'Email is required' };
            }
            if (!emailRegex.test(email)) {
                return { valid: false, message: 'Please enter a valid email address' };
            }
            return { valid: true, message: '' };
        },
        
        validatePhone: function(phone) {
            if (!phone) return { valid: true, message: '' }; // Phone is optional
            
            const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
            if (!phoneRegex.test(phone)) {
                return { valid: false, message: 'Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)' };
            }
            return { valid: true, message: '' };
        },
        
        validateSubject: function(subject) {
            if (!subject) {
                return { valid: false, message: 'Please select a subject' };
            }
            return { valid: true, message: '' };
        },
        
        validateMessage: function(message) {
            if (!message || message.trim().length < 10) {
                return { valid: false, message: 'Message must be at least 10 characters' };
            }
            if (message.trim().length > 1000) {
                return { valid: false, message: 'Message must not exceed 1000 characters' };
            }
            return { valid: true, message: '' };
        }
    };
    
    // Show field error
    function showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
        }
    }
    
    // Clear field error
    function clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    }
    
    // Validate single field
    function validateField(field) {
        let result;
        
        switch(field.id) {
            case 'name':
                result = validators.validateName(field.value);
                break;
            case 'email':
                result = validators.validateEmail(field.value);
                break;
            case 'phone':
                result = validators.validatePhone(field.value);
                break;
            case 'subject':
                result = validators.validateSubject(field.value);
                break;
            case 'message':
                result = validators.validateMessage(field.value);
                break;
            default:
                return true;
        }
        
        if (!result.valid) {
            showFieldError(field, result.message);
            return false;
        } else {
            clearFieldError(field);
            return true;
        }
    }
    
    // Real-time validation on blur
    const formFields = ['name', 'email', 'phone', 'subject', 'message'];
    formFields.forEach(function(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            
            field.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    validateField(this);
                }
            });
        }
    });
    
    // Get CSRF token
    function getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === 'csrftoken=') {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // Show message to user
    function showMessage(message, type) {
        formResponse.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
            message +
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
            '</div>';
        
        // Auto scroll to message
        formResponse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto clear after 5 seconds
        setTimeout(function() {
            if (formResponse.innerHTML) {
                formResponse.innerHTML = '';
            }
        }, 5000);
    }
    
    // Form submission handler
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Validate all fields
            let isValid = true;
            const fieldsToValidate = ['name', 'email', 'subject', 'message'];
            
            fieldsToValidate.forEach(function(fieldId) {
                const field = document.getElementById(fieldId);
                if (!validateField(field)) {
                    isValid = false;
                }
            });
            
            // Also validate phone if it has value
            const phoneField = document.getElementById('phone');
            if (phoneField && phoneField.value) {
                if (!validateField(phoneField)) {
                    isValid = false;
                }
            }
            
            if (!isValid) {
                showMessage('Please correct the errors in the form before submitting.', 'danger');
                return;
            }
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value.trim()
            };
            
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Sending...';
            submitBtn.disabled = true;
            
            // Send to backend API
            fetch('/api/contact/submit/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message || 'Thank you for your message! We will get back to you soon.', 'success');
                    contactForm.reset();
                    
                    // Reset character counter
                    if (charCount) {
                        charCount.textContent = '0/1000 characters';
                        charCount.classList.remove('text-warning');
                    }
                    
                    // Clear all validation errors
                    formFields.forEach(function(fieldId) {
                        const field = document.getElementById(fieldId);
                        if (field) {
                            clearFieldError(field);
                        }
                    });
                } else {
                    showMessage(data.message || 'Something went wrong. Please try again.', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                let errorMessage = 'Network error. Please check your connection and try again.';
                if (error.message) {
                    errorMessage = error.message;
                }
                showMessage(errorMessage, 'danger');
            })
            .finally(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    }
});
