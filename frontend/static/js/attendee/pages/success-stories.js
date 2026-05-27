// ============================================
// SUCCESS STORIES PAGE - Interactive Elements
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const shareStoryBtn = document.getElementById('shareStoryBtn');
    const leaveReviewBtn = document.getElementById('leaveReviewBtn');
    const storyModal = document.getElementById('storyModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const storyForm = document.getElementById('storyForm');
    
    // Rating stars
    const ratingStars = document.querySelectorAll('.rating-input i');
    const ratingInput = document.getElementById('storyRating');
    
    // Open modal
    function openModal() {
        if (storyModal) {
            storyModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Close modal
    function closeModal() {
        if (storyModal) {
            storyModal.classList.remove('show');
            document.body.style.overflow = '';
            if (storyForm) storyForm.reset();
            resetRating();
        }
    }
    
    // Reset rating stars
    function resetRating() {
        ratingStars.forEach(star => {
            star.classList.remove('active');
            star.classList.add('far');
            star.classList.remove('fas');
        });
        if (ratingInput) ratingInput.value = '0';
    }
    
    // Handle rating selection
    if (ratingStars.length) {
        ratingStars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                if (ratingInput) ratingInput.value = rating;
                
                ratingStars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.add('active');
                        s.classList.remove('far');
                        s.classList.add('fas');
                    } else {
                        s.classList.remove('active');
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
            
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.dataset.rating);
                ratingStars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.add('fas');
                        s.classList.remove('far');
                    }
                });
            });
            
            star.addEventListener('mouseleave', function() {
                const currentRating = parseInt(ratingInput?.value || 0);
                ratingStars.forEach((s, index) => {
                    if (index < currentRating) {
                        s.classList.add('fas');
                        s.classList.remove('far');
                    } else {
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
        });
    }
    
    // Event listeners for modal
    if (shareStoryBtn) shareStoryBtn.addEventListener('click', openModal);
    if (leaveReviewBtn) leaveReviewBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal on outside click
    if (storyModal) {
        storyModal.addEventListener('click', function(e) {
            if (e.target === storyModal) closeModal();
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && storyModal?.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Form submission
    if (storyForm) {
        storyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('storyName')?.value.trim();
            const email = document.getElementById('storyEmail')?.value.trim();
            const eventName = document.getElementById('storyEvent')?.value.trim();
            const rating = document.getElementById('storyRating')?.value;
            const message = document.getElementById('storyMessage')?.value.trim();
            
            // Validation
            if (!name) {
                showToast('Please enter your name', 'error');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            if (!rating || rating === '0') {
                showToast('Please select a rating', 'error');
                return;
            }
            
            if (!message || message.length < 10) {
                showToast('Please enter your story (minimum 10 characters)', 'error');
                return;
            }
            
            // Disable submit button
            const submitBtn = storyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            try {
                // Simulate API call (replace with actual endpoint)
                await simulateSubmit({ name, email, eventName, rating, message });
                
                showToast('Thank you for sharing your story!', 'success');
                closeModal();
                
            } catch (error) {
                console.error('Submission error:', error);
                showToast(error.message || 'Failed to submit. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    // Simulate API submission
    function simulateSubmit(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Story submitted:', data);
                resolve({ success: true });
            }, 1500);
        });
    }
    
    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast && toast.parentNode) toast.remove();
        }, 5000);
    }
    
    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add scroll animations
    const cards = document.querySelectorAll('.testimonial-card, .featured-story');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// Make functions global for debugging
window.closeStoryModal = function() {
    const modal = document.getElementById('storyModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
};