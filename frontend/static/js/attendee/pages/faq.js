// ============================================
// FAQ PAGE - Accordion and Category Filter
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize FAQ accordion
    initFaqAccordion();
    
    // Initialize category filtering
    initCategoryFilter();
    
    // Load dynamic FAQ data if needed
    loadFAQs();
});

function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            faqItem.classList.toggle('active');
        });
    });
}

function initCategoryFilter() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Update active state
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter FAQ items
            filterFaqByCategory(category);
        });
    });
}

function filterFaqByCategory(category) {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        if (category === 'general') {
            item.style.display = 'block';
        } else {
            // In a real implementation, you would have data-category on each FAQ item
            // For now, show all
            item.style.display = 'block';
        }
    });
}

async function loadFAQs() {
    try {
        // Try to fetch FAQs from API if endpoint exists
        const faqs = await window.AttendeeAPIEndpoints.support.getFAQ();
        
        if (faqs && faqs.length > 0) {
            displayFAQs(faqs);
        }
    } catch (error) {
        console.error('Error loading FAQs:', error);
        // Use static content if API fails
    }
}

function displayFAQs(faqs) {
    const faqGrid = document.querySelector('.faq-grid');
    if (!faqGrid) return;
    
    faqGrid.innerHTML = faqs.map(faq => `
        <div class="faq-item" data-category="${faq.category || 'general'}">
            <div class="faq-question">
                ${escapeHtml(faq.question)}
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                ${escapeHtml(faq.answer)}
            </div>
        </div>
    `).join('');
    
    // Reinitialize accordion for new items
    initFaqAccordion();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}