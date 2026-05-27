// ============================================
// FAQ PAGE - Interactive Accordion & Search
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Get all FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    const faqQuestions = document.querySelectorAll('.faq-question');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const searchInput = document.getElementById('faqSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    
    let currentCategory = 'all';
    let searchTerm = '';
    
    // Accordion functionality
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Optional: Close other open FAQs (uncomment if you want only one open at a time)
            // if (!isActive) {
            //     faqItems.forEach(item => {
            //         if (item !== faqItem && item.classList.contains('active')) {
            //             item.classList.remove('active');
            //         }
            //     });
            // }
            
            // Toggle current FAQ
            faqItem.classList.toggle('active');
            
            // Rotate icon
            const icon = this.querySelector('i');
            if (faqItem.classList.contains('active')) {
                icon.style.transform = 'rotate(180deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
    
    // Category filtering
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Get selected category
            currentCategory = this.dataset.category;
            
            // Apply filters
            filterFAQs();
        });
    });
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchTerm = this.value.toLowerCase().trim();
            
            // Show/hide clear button
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
            }
            
            filterFAQs();
        });
    }
    
    // Clear search
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
                clearSearchBtn.style.display = 'none';
                filterFAQs();
            }
        });
    }
    
    // Filter FAQs by category and search term
    function filterFAQs() {
        let visibleCount = 0;
        
        faqItems.forEach(item => {
            const itemCategory = item.dataset.category;
            const question = item.querySelector('.faq-question span')?.innerText || '';
            const answer = item.querySelector('.faq-answer')?.innerText || '';
            const text = `${question} ${answer}`.toLowerCase();
            
            const matchesCategory = (currentCategory === 'all' || itemCategory === currentCategory);
            const matchesSearch = !searchTerm || text.includes(searchTerm);
            
            if (matchesCategory && matchesSearch) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Show no results message if needed
        showNoResultsMessage(visibleCount === 0);
    }
    
    // Show/hide no results message
    function showNoResultsMessage(show) {
        const existingMessage = document.querySelector('.no-results');
        const faqGrid = document.querySelector('.faq-grid');
        
        if (show && !existingMessage) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>Try adjusting your search or filter to find what you're looking for.</p>
            `;
            if (faqGrid) faqGrid.appendChild(noResultsDiv);
        } else if (!show && existingMessage) {
            existingMessage.remove();
        }
    }
    
    // Smooth scroll to FAQ when clicking hash links
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.classList.add('active');
            }, 100);
        }
    }
    
    // Track FAQ clicks for analytics
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqText = this.querySelector('span')?.innerText || '';
            console.log('FAQ clicked:', faqText);
            // You can send this to your analytics service
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Focus search with Ctrl+K or Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Close all FAQs with Escape
        if (e.key === 'Escape') {
            faqItems.forEach(item => {
                if (item.classList.contains('active')) {
                    item.classList.remove('active');
                    const icon = item.querySelector('.faq-question i');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            });
        }
    });
    
    // Optional: Save FAQ state to localStorage
    function saveOpenState() {
        const openFaqs = Array.from(faqItems)
            .filter(item => item.classList.contains('active'))
            .map(item => item.querySelector('.faq-question span')?.innerText);
        localStorage.setItem('openFaqs', JSON.stringify(openFaqs));
    }
    
    function restoreOpenState() {
        const savedOpenFaqs = JSON.parse(localStorage.getItem('openFaqs') || '[]');
        faqItems.forEach(item => {
            const questionText = item.querySelector('.faq-question span')?.innerText;
            if (savedOpenFaqs.includes(questionText)) {
                item.classList.add('active');
                const icon = item.querySelector('.faq-question i');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    }
    
    // Optional: Uncomment to save/restore state
    // restoreOpenState();
    // faqQuestions.forEach(q => q.addEventListener('click', saveOpenState));
});

// Helper function to scroll to specific FAQ
function scrollToFAQ(faqId) {
    const element = document.getElementById(faqId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('active');
        const icon = element.querySelector('.faq-question i');
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
}

// Make function global for external use
window.scrollToFAQ = scrollToFAQ;