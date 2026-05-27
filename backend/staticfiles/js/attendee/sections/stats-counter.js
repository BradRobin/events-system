// Stats Counter Animation - Restarts on every scroll
document.addEventListener('DOMContentLoaded', function() {
    const statsNumbers = document.querySelectorAll('.analytics-number');
    let animationStarted = false;
    
    function resetAndAnimateNumber(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const suffix = element.querySelector('.suffix') ? element.querySelector('.suffix').textContent : '';
        // Reset to 0
        element.innerHTML = '0' + `<span class="suffix">${suffix}</span>`;
        
        let current = 0;
        const increment = target / 50;
        
        // Clear any existing interval
        if (element.interval) {
            clearInterval(element.interval);
        }
        
        element.interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.innerHTML = target.toLocaleString() + `<span class="suffix">${suffix}</span>`;
                clearInterval(element.interval);
                delete element.interval;
            } else {
                element.innerHTML = Math.floor(current).toLocaleString() + `<span class="suffix">${suffix}</span>`;
            }
        }, 30);
    }
    
    // Create a single observer for all stats
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Reset and restart animation for all stats when section becomes visible
                statsNumbers.forEach(stat => {
                    resetAndAnimateNumber(stat);
                });
            }
        });
    }, { threshold: 0.3 });
    
    // Observe the stats section container
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
});
