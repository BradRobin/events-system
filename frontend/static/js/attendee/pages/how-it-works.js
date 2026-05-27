// ============================================
// HOW IT WORKS PAGE - Interactive Elements
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Video Modal Functionality
    const videoBtn = document.getElementById('watchVideoBtn');
    const videoModal = document.getElementById('videoModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const videoIframe = document.getElementById('demoVideo');
    
    // YouTube video ID (replace with your actual demo video)
    const demoVideoId = 'dQw4w9WgXcQ'; // Replace with your actual video ID
    
    function openVideoModal() {
        if (videoModal) {
            videoModal.classList.add('show');
            // Set video source when modal opens
            if (videoIframe) {
                videoIframe.src = `https://www.youtube.com/embed/${demoVideoId}?autoplay=1`;
            }
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeVideoModal() {
        if (videoModal) {
            videoModal.classList.remove('show');
            // Stop video when modal closes
            if (videoIframe) {
                videoIframe.src = `https://www.youtube.com/embed/${demoVideoId}`;
            }
            // Restore body scroll
            document.body.style.overflow = '';
        }
    }
    
    // Event listeners for video modal
    if (videoBtn) {
        videoBtn.addEventListener('click', openVideoModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeVideoModal);
    }
    
    // Close modal when clicking outside
    if (videoModal) {
        videoModal.addEventListener('click', function(e) {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && videoModal && videoModal.classList.contains('show')) {
            closeVideoModal();
        }
    });
    
    // Add animation to step cards on scroll
    const stepCards = document.querySelectorAll('.step-card');
    
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
    
    // Set initial styles and observe
    stepCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Animate benefit cards
    const benefitCards = document.querySelectorAll('.benefit-card');
    
    benefitCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.5s ease ${index * 0.05}s, transform 0.5s ease ${index * 0.05}s`;
        observer.observe(card);
    });
    
    // Add click tracking for CTA buttons
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-outline');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const buttonText = this.innerText.trim();
            console.log(`CTA Clicked: ${buttonText}`);
            // You can add analytics tracking here
        });
    });
    
    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Feature item hover effect
    const featureItems = document.querySelectorAll('.feature-item');
    
    featureItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
});

// Add to window for any external needs
window.openVideoModal = function() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.add('show');
        const iframe = document.getElementById('demoVideo');
        if (iframe) {
            iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
        }
        document.body.style.overflow = 'hidden';
    }
};

window.closeVideoModal = function() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.remove('show');
        const iframe = document.getElementById('demoVideo');
        if (iframe) {
            iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        }
        document.body.style.overflow = '';
    }
};