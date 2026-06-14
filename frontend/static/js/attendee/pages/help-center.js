// ============================================
// HELP CENTER PAGE - Interactive Functionality
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchInput = document.getElementById('helpSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    const helpCards = document.querySelectorAll('.help-card');
    const faqItems = document.querySelectorAll('.faq-item');
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    // ============================================
    // FAQ Accordion Functionality
    // ============================================
    
    function initAccordion() {
        faqQuestions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const icon = this.querySelector('i');
                
                // Close other open FAQs
                faqQuestions.forEach(otherQuestion => {
                    if (otherQuestion !== question) {
                        const otherAnswer = otherQuestion.nextElementSibling;
                        const otherIcon = otherQuestion.querySelector('i');
                        
                        if (otherAnswer && otherAnswer.classList.contains('show')) {
                            otherAnswer.classList.remove('show');
                            otherQuestion.classList.remove('active');
                            if (otherIcon) {
                                otherIcon.style.transform = 'rotate(0deg)';
                                otherIcon.style.color = '#94a3b8';
                            }
                        }
                    }
                });
                
                // Toggle current FAQ
                answer.classList.toggle('show');
                this.classList.toggle('active');
                
                // Rotate icon
                if (icon) {
                    if (answer.classList.contains('show')) {
                        icon.style.transform = 'rotate(180deg)';
                        icon.style.color = '#f59e0b';
                    } else {
                        icon.style.transform = 'rotate(0deg)';
                        icon.style.color = '#94a3b8';
                    }
                }
            });
        });
    }
    
    // ============================================
    // Search Functionality
    // ============================================
    
    function initSearch() {
        if (!searchInput) return;
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                if (clearSearchBtn) clearSearchBtn.style.display = 'none';
                resetAllFilters();
                return;
            }
            
            if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
            
            let hasResults = false;
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question span').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
                
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = 'block';
                    hasResults = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Update category buttons active state
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show no results message if needed
            showNoResultsMessage(!hasResults);
        });
    }
    
    function showNoResultsMessage(show) {
        let noResultsMsg = document.querySelector('.no-results-message');
        
        if (show) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h4>No results found</h4>
                    <p>Try different keywords or browse categories below</p>
                `;
                const faqSection = document.querySelector('.faq-section');
                if (faqSection) faqSection.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }
    
    function resetAllFilters() {
        // Reset category cards active state
        helpCards.forEach(card => {
            card.classList.remove('active');
        });
        
        // Show all FAQ items
        faqItems.forEach(item => {
            item.style.display = 'block';
        });
        
        // Hide no results message
        const noResultsMsg = document.querySelector('.no-results-message');
        if (noResultsMsg) noResultsMsg.style.display = 'none';
    }
    
    // ============================================
    // Category Card Functionality
    // ============================================
    
    function initCategoryCards() {
        helpCards.forEach(card => {
            card.addEventListener('click', function() {
                const category = this.dataset.category;
                
                // Clear search input
                if (searchInput) {
                    searchInput.value = '';
                    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
                }
                
                // Scroll to FAQ section
                const faqSection = document.getElementById('faqSection');
                if (faqSection) {
                    faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                // Filter FAQ items
                let visibleCount = 0;
                
                faqItems.forEach(item => {
                    if (item.dataset.category === category) {
                        item.style.display = 'block';
                        visibleCount++;
                        
                        // Auto-expand the first matching FAQ
                        if (visibleCount === 1) {
                            setTimeout(() => {
                                const question = item.querySelector('.faq-question');
                                const answer = item.querySelector('.faq-answer');
                                const icon = question.querySelector('i');
                                
                                if (question && answer && !answer.classList.contains('show')) {
                                    answer.classList.add('show');
                                    question.classList.add('active');
                                    if (icon) {
                                        icon.style.transform = 'rotate(180deg)';
                                        icon.style.color = '#f59e0b';
                                    }
                                }
                            }, 500);
                        }
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                // Hide no results message
                const noResultsMsg = document.querySelector('.no-results-message');
                if (noResultsMsg) noResultsMsg.style.display = 'none';
            });
        });
    }
    
    // ============================================
    // Clear Search Functionality
    // ============================================
    
    function initClearSearch() {
        if (!clearSearchBtn) return;
        
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                this.style.display = 'none';
                resetAllFilters();
                searchInput.focus();
            }
        });
    }
    
    // ============================================
    // URL Parameter Support
    // ============================================
    
    function initUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        
        if (categoryParam) {
            const targetCard = document.querySelector(`.help-card[data-category="${categoryParam}"]`);
            if (targetCard) {
                setTimeout(() => {
                    targetCard.click();
                }, 300);
            }
        }
    }
    
    // ============================================
    // Initialize All Functions
    // ============================================
    
    initAccordion();
    initSearch();
    initCategoryCards();
    initClearSearch();
    initUrlParams();
});