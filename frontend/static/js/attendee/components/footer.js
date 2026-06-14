/**
 * Footer interactions: newsletter signup only
 * REMOVED: language selector, 3rd party payment logos
 */
(function () {
    'use strict';

    function getCookie(name) {
        if (!document.cookie) return null;
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    function initNewsletterForm() {
        const form = document.getElementById('footerNewsletterForm');
        if (!form) return;

        const emailInput = document.getElementById('footerNewsletterEmail');
        const messageEl = document.getElementById('footerNewsletterMessage');
        const submitBtn = form.querySelector('.footer-btn-subscribe');
        let isSubmitting = false;

        function showMessage(text, type) {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = 'footer-form-message ' + (type || '');
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isSubmitting) return;

            const email = emailInput.value.trim();

            if (!email) {
                showMessage('Please enter your email address.', 'error');
                emailInput.focus();
                return;
            }

            if (!validateEmail(email)) {
                showMessage('Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }

            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing…';
            submitBtn.disabled = true;
            isSubmitting = true;

            try {
                const response = await fetch('/newsletter/subscribe/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken') || ''
                    },
                    body: JSON.stringify({ email: email })
                });

                const data = await response.json();

                if (data.success) {
                    showMessage('Thank you for subscribing!', 'success');
                    form.reset();
                } else {
                    showMessage(data.message || 'Subscription failed. Please try again.', 'error');
                }
            } catch (err) {
                showMessage('Network error. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                isSubmitting = false;
            }
        });

        emailInput.addEventListener('input', function () {
            if (messageEl && messageEl.classList.contains('error')) {
                showMessage('', '');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initNewsletterForm();
    });
})();