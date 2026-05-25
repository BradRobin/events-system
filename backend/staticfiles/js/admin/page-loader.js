/**
 * Page Loader - Dynamic Content Loading
 * Loads pages without full browser refresh
 */

class PageLoader {
    constructor() {
        this.contentContainer = document.querySelector('.admin-content');
        this.currentPage = null;
        this.loadingOverlay = null;
        this.init();
    }
    
    init() {
        this.createLoadingOverlay();
        this.setupNavigation();
        this.handleInitialPage();
    }
    
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'page-loader-overlay';
        overlay.innerHTML = `
            <div class="loader-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }
    
    setupNavigation() {
        // Intercept all sidebar navigation clicks
        document.querySelectorAll('.nav-item, .dropdown-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#' && !href.startsWith('http') && !href.includes('logout')) {
                    e.preventDefault();
                    this.loadPage(href);
                    
                    // Update active state
                    this.setActiveLink(link);
                    
                    // Update browser history
                    history.pushState({ page: href }, '', href);
                }
            });
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.loadPage(event.state.page);
            } else {
                this.loadPage(window.location.pathname);
            }
        });
    }
    
    handleInitialPage() {
        const currentPath = window.location.pathname;
        if (currentPath && !currentPath.includes('/admin-portal/')) {
            this.loadPage('/admin-portal/dashboard/');
        }
    }
    
    setActiveLink(activeLink) {
        // Remove active class from all links
        document.querySelectorAll('.nav-item, .dropdown-item').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        activeLink.classList.add('active');
        
        // Also mark parent dropdown as open
        const parentDropdown = activeLink.closest('.nav-dropdown');
        if (parentDropdown) {
            parentDropdown.classList.add('open');
        }
        
        // Update page title in topbar
        this.updatePageTitle(activeLink);
    }
    
    updatePageTitle(link) {
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const title = link.querySelector('span')?.innerText || link.innerText;
            pageTitle.textContent = title;
        }
    }
    
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
            }, 300);
        }
    }
    
    async loadPage(url) {
        this.showLoading();
        this.currentPage = url;
        
        try {
            // Fetch the page content
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) throw new Error('Page load failed');
            
            const html = await response.text();
            
            // Extract the content from the response
            const content = this.extractContent(html);
            
            // Update the content container with animation
            if (this.contentContainer) {
                this.contentContainer.style.opacity = '0';
                setTimeout(() => {
                    this.contentContainer.innerHTML = content;
                    this.contentContainer.style.opacity = '1';
                    this.executeScripts(html);
                    this.hideLoading();
                }, 200);
            }
            
            // Update browser title
            this.updateDocumentTitle(html);
            
        } catch (error) {
            console.error('Error loading page:', error);
            this.contentContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load page</h3>
                    <p>Please try again</p>
                    <button class="btn-primary" onclick="location.reload()">Refresh</button>
                </div>
            `;
            this.hideLoading();
        }
    }
    
    extractContent(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const content = doc.querySelector('.admin-content');
        return content ? content.innerHTML : '<div class="error-state">Content not found</div>';
    }
    
    updateDocumentTitle(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const title = doc.querySelector('title');
        if (title) {
            document.title = title.textContent;
        }
    }
    
    executeScripts(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const scripts = doc.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
                newScript.async = false;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript);
            document.body.removeChild(newScript);
        });
        
        // Re-initialize any page-specific functions
        if (typeof window.initPage === 'function') {
            window.initPage();
        }
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pageLoader = new PageLoader();
});

// Add loading styles
const loaderStyles = document.createElement('style');
loaderStyles.textContent = `
    .page-loader-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    }
    
    .loader-spinner {
        background: white;
        padding: 2rem;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    
    .spinner {
        width: 50px;
        height: 50px;
        border: 3px solid #e2e8f0;
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .admin-content {
        transition: opacity 0.2s ease;
    }
    
    .error-state {
        text-align: center;
        padding: 3rem;
        color: #64748b;
    }
    
    .error-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #ef4444;
    }
    
    .error-state h3 {
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(loaderStyles);
