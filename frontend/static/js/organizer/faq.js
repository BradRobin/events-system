// Organizer FAQ — search, category filter, accordion
document.addEventListener('DOMContentLoaded', function () {
    const faqItems = document.querySelectorAll('.organizer-faq-grid .faq-item');
    const faqQuestions = document.querySelectorAll('.organizer-faq-grid .faq-question');
    const categoryBtns = document.querySelectorAll('.organizer-faq-categories .category-btn');
    const searchInput = document.getElementById('organizerFaqSearch');
    const clearSearchBtn = document.getElementById('organizerClearSearch');
    const faqGrid = document.querySelector('.organizer-faq-grid');

    let currentCategory = 'all';
    let searchTerm = '';

    faqQuestions.forEach(function (question) {
        question.addEventListener('click', function () {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            faqItem.classList.toggle('active');
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    });

    categoryBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            categoryBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            currentCategory = this.dataset.category;
            filterFAQs();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            searchTerm = this.value.toLowerCase().trim();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
            }
            filterFAQs();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
                clearSearchBtn.style.display = 'none';
                filterFAQs();
            }
        });
    }

    function filterFAQs() {
        let visibleCount = 0;
        faqItems.forEach(function (item) {
            const itemCategory = item.dataset.category;
            const question = item.querySelector('.faq-question span')?.innerText || '';
            const answer = item.querySelector('.faq-answer')?.innerText || '';
            const text = (question + ' ' + answer).toLowerCase();
            const matchesCategory = currentCategory === 'all' || itemCategory === currentCategory;
            const matchesSearch = !searchTerm || text.includes(searchTerm);
            if (matchesCategory && matchesSearch) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });
        showNoResultsMessage(visibleCount === 0);
    }

    function showNoResultsMessage(show) {
        const existing = faqGrid?.querySelector('.no-results');
        if (show && !existing && faqGrid) {
            const div = document.createElement('div');
            div.className = 'no-results';
            div.innerHTML = '<i class="fas fa-search"></i><h3>No results found</h3><p>Try a different search term or category filter.</p>';
            faqGrid.appendChild(div);
        } else if (!show && existing) {
            existing.remove();
        }
    }

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput?.focus();
        }
        if (e.key === 'Escape') {
            faqItems.forEach(function (item) {
                item.classList.remove('active');
                const icon = item.querySelector('.faq-question i');
                if (icon) icon.style.transform = 'rotate(0deg)';
            });
        }
    });
});
