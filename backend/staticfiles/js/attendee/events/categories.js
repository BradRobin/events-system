// ============================================
// ATTENDEE EVENT CATEGORIES
// Handles: Loading categories, filtering by category, category statistics
// ============================================

let currentCategory = null;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupCategoryFilters();
});

// Load all categories
async function loadCategories() {
    const categories = await EventAPI.Attendee.getCategories();
    if (categories && categories.length) {
        displayCategoryGrid(categories);
        displayCategoryStats(categories);
        populateCategoryFilter(categories);
    }
}

// Display categories in grid
function displayCategoryGrid(categories) {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="filterByCategory('${cat.slug}')">
            <div class="category-icon">
                <i class="fas ${cat.icon || 'fa-calendar-alt'}"></i>
            </div>
            <h3>${cat.name}</h3>
            <p class="category-count">${cat.event_count} events</p>
            <div class="category-hover">
                <span>Explore ${cat.name} →</span>
            </div>
        </div>
    `).join('');
}

// Display category statistics
function displayCategoryStats(categories) {
    const container = document.getElementById('categoryStats');
    if (!container) return;
    
    const maxEvents = Math.max(...categories.map(c => c.event_count));
    
    container.innerHTML = categories.map(cat => `
        <div class="stat-bar">
            <div class="stat-label">${cat.name}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(cat.event_count / maxEvents) * 100}%"></div>
            </div>
            <div class="stat-count">${cat.event_count}</div>
        </div>
    `).join('');
}

// Populate category filter dropdown
function populateCategoryFilter(categories) {
    const filterSelect = document.getElementById('categoryFilter');
    if (!filterSelect) return;
    
    filterSelect.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => `<option value="${cat.slug}">${cat.name} (${cat.event_count})</option>`).join('');
}

// Filter events by category
async function filterByCategory(categorySlug) {
    currentCategory = categorySlug;
    currentPage = 1;
    
    const events = await EventAPI.Attendee.getEventsByCategory(categorySlug, currentPage);
    if (events) {
        displayCategoryEvents(events.results);
        updatePagination(events.total_pages, events.current_page);
        
        // Update active category highlight
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });
        event.target.closest('.category-card')?.classList.add('active');
        
        // Scroll to events section
        document.getElementById('categoryEvents')?.scrollIntoView({ behavior: 'smooth' });
    }
}

// Display events for selected category
function displayCategoryEvents(events) {
    const container = document.getElementById('categoryEvents');
    if (!container) return;
    
    if (!events.length) {
        container.innerHTML = '<div class="no-events"><i class="fas fa-calendar-times"></i><p>No events in this category</p></div>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="event-card" onclick="location.href='/event/${event.id}/'">
            <div class="event-image">
                ${event.banner_image ? 
                    `<img src="${event.banner_image}" alt="${event.title}">` : 
                    `<div class="image-placeholder"><i class="fas fa-calendar-alt"></i></div>`}
                <span class="event-price">KES ${event.price}</span>
            </div>
            <div class="event-info">
                <h3>${event.title}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${event.venue}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(event.start_date).toLocaleDateString()}</p>
                <div class="event-footer">
                    <span class="seats-left">${event.available_seats} seats left</span>
                    <button class="btn-book">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup category filter listeners
function setupCategoryFilters() {
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                window.location.href = `/events/?category=${e.target.value}`;
            } else {
                window.location.href = '/events/';
            }
        });
    }
}

// Load popular categories for homepage
async function loadPopularCategories() {
    const categories = await EventAPI.Attendee.getCategories();
    if (categories && categories.length) {
        const popular = categories.sort((a, b) => b.event_count - a.event_count).slice(0, 6);
        const container = document.getElementById('popularCategories');
        if (container) {
            container.innerHTML = popular.map(cat => `
                <div class="popular-category" onclick="location.href='/events/?category=${cat.slug}'">
                    <i class="fas ${cat.icon || 'fa-tag'}"></i>
                    <span>${cat.name}</span>
                    <small>${cat.event_count}</small>
                </div>
            `).join('');
        }
    }
}

// Get category by slug
function getCategoryName(slug, categories) {
    const category = categories.find(c => c.slug === slug);
    return category ? category.name : slug;
}
