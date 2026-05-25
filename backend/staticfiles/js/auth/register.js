// Registration Page JavaScript
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function checkPasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (password.length === 0) {
        strengthDiv.classList.add('hidden');
        return false;
    }
    
    strengthDiv.classList.remove('hidden');
    
    if (password.length < 6) {
        strengthDiv.innerHTML = '<span class="strength-weak">⚠️ Weak password - min 6 characters</span>';
        return false;
    } else if (password.length < 10) {
        strengthDiv.innerHTML = '<span class="strength-medium">✓ Medium strength</span>';
        return true;
    } else {
        strengthDiv.innerHTML = '<span class="strength-strong">✓ Strong password!</span>';
        return true;
    }
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

document.addEventListener('DOMContentLoaded', () => {
    const password1 = document.getElementById('password1');
    const password2 = document.getElementById('password2');
    const organizerRadio = document.getElementById('organizerRadio');
    const organizerFields = document.getElementById('organizerFields');
    const registerForm = document.getElementById('registerForm');
    
    if (password1) {
        password1.addEventListener('input', function() {
            checkPasswordStrength(this.value);
            
            const pwd2 = password2.value;
            const matchError = document.getElementById('passwordMatchError');
            if (pwd2) {
                if (this.value !== pwd2) {
                    matchError.textContent = 'Passwords do not match';
                    matchError.classList.remove('hidden');
                } else {
                    matchError.classList.add('hidden');
                }
            }
        });
    }
    
    if (password2) {
        password2.addEventListener('input', function() {
            const pwd1 = password1.value;
            const matchError = document.getElementById('passwordMatchError');
            if (pwd1 !== this.value) {
                matchError.textContent = 'Passwords do not match';
                matchError.classList.remove('hidden');
            } else {
                matchError.classList.add('hidden');
            }
        });
    }
    
    if (organizerRadio && organizerFields) {
        organizerRadio.addEventListener('change', function() {
            if (this.checked) {
                organizerFields.classList.add('show');
            } else {
                organizerFields.classList.remove('show');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            const name = document.getElementById('fullName').value.trim();
            const nameError = document.getElementById('nameError');
            if (!name) {
                nameError.textContent = 'Full name is required';
                nameError.classList.remove('hidden');
                isValid = false;
            } else if (name.length < 2) {
                nameError.textContent = 'Name must be at least 2 characters';
                nameError.classList.remove('hidden');
                isValid = false;
            } else {
                nameError.classList.add('hidden');
            }
            
            const email = document.getElementById('email').value.trim();
            const emailError = document.getElementById('emailError');
            if (!email) {
                emailError.textContent = 'Email address is required';
                emailError.classList.remove('hidden');
                isValid = false;
            } else if (!validateEmail(email)) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.classList.remove('hidden');
                isValid = false;
            } else {
                emailError.classList.add('hidden');
            }
            
            const pwd1 = password1.value;
            const pwd2 = password2.value;
            const matchError = document.getElementById('passwordMatchError');
            
            if (!pwd1 || pwd1.length < 6) {
                isValid = false;
            }
            
            if (pwd1 !== pwd2) {
                matchError.textContent = 'Passwords do not match';
                matchError.classList.remove('hidden');
                isValid = false;
            }
            
            const roleRadios = document.querySelectorAll('input[name="role"]');
            let selectedRole = 'attendee';
            for (let i = 0; i < roleRadios.length; i++) {
                if (roleRadios[i].checked) {
                    selectedRole = roleRadios[i].value;
                    break;
                }
            }
            
            if (selectedRole === 'organizer') {
                const orgName = document.getElementById('orgName').value.trim();
                if (!orgName) {
                    let orgError = document.getElementById('orgNameError');
                    if (!orgError) {
                        const errDiv = document.createElement('div');
                        errDiv.id = 'orgNameError';
                        errDiv.className = 'error-message hidden';
                        document.getElementById('organizerFields').appendChild(errDiv);
                    }
                    const orgErrorDiv = document.getElementById('orgNameError');
                    orgErrorDiv.textContent = 'Organization name is required for organizers';
                    orgErrorDiv.classList.remove('hidden');
                    isValid = false;
                }
            }
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    }
});
