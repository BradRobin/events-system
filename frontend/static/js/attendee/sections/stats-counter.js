// ============================================
// STATS COUNTER - Animated Number Counter
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initStatsCounter();
});

function initStatsCounter() {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateNumbers();
                observer.disconnect();
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(statsSection);
}

function animateNumbers() {
    const numbers = document.querySelectorAll('.analytics-number');
    
    numbers.forEach(num => {
        const target = parseInt(num.getAttribute('data-target'));
        if (isNaN(target)) return;
        
        let current = 0;
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        
        const updateNumber = () => {
            current += increment;
            if (current < target) {
                num.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateNumber);
            } else {
                num.textContent = target.toLocaleString();
            }
        };
        
        updateNumber();
    });
}