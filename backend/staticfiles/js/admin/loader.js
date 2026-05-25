/**
 * Modern Loader - Complete Working Version
 * Simple, reliable, beautiful
 */

// Global loader functions
window.Loader = {
    // Show fullscreen loader
    show: function(message = 'Loading...') {
        // Remove existing loader
        this.hide();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'globalLoader';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: all 0.3s ease;
        `;
        
        // Create loader container
        const container = document.createElement('div');
        container.style.cssText = `
            text-align: center;
            background: transparent;
            padding: 24px;
        `;
        
        // Create rotating ring
        const ring = document.createElement('div');
        ring.style.cssText = `
            width: 60px;
            height: 60px;
            margin: 0 auto 16px;
            border: 3px solid rgba(245, 158, 11, 0.15);
            border-top-color: #f59e0b;
            border-right-color: #f59e0b;
            border-radius: 50%;
            animation: loaderSpin 0.8s linear infinite;
        `;
        
        // Create icon in center
        const icon = document.createElement('i');
        icon.className = 'ri-calendar-event-line';
        icon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            color: #f59e0b;
            animation: loaderPulse 1.2s ease-in-out infinite;
        `;
        
        // Position icon inside ring
        const ringWrapper = document.createElement('div');
        ringWrapper.style.cssText = `
            position: relative;
            width: 60px;
            height: 60px;
            margin: 0 auto;
        `;
        ringWrapper.appendChild(ring);
        ringWrapper.appendChild(icon);
        
        // Create message text
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = `
            color: #f59e0b;
            font-size: 14px;
            font-weight: 500;
            margin-top: 20px;
            letter-spacing: 0.5px;
        `;
        
        // Create dots animation
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.cssText = `
            display: inline-block;
            width: 24px;
            text-align: left;
        `;
        msg.appendChild(dots);
        
        // Animate dots
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            dots.textContent = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount);
        }, 400);
        
        container.appendChild(ringWrapper);
        container.appendChild(msg);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // Store interval for cleanup
        overlay._dotInterval = dotInterval;
        
        // Add animation styles if not present
        if (!document.getElementById('loaderAnimations')) {
            const style = document.createElement('style');
            style.id = 'loaderAnimations';
            style.textContent = `
                @keyframes loaderSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes loaderPulse {
                    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return overlay;
    },
    
    // Hide loader
    hide: function() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            if (loader._dotInterval) clearInterval(loader._dotInterval);
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader && loader.remove) loader.remove();
            }, 200);
        }
    },
    
    // Show inline loader in element
    showInline: function(element, message = 'Loading...') {
        if (!element) return;
        const originalContent = element.innerHTML;
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px;">
                <div style="width: 24px; height: 24px; border: 2px solid rgba(245,158,11,0.2); border-top-color: #f59e0b; border-radius: 50%; animation: loaderSpin 0.6s linear infinite;"></div>
                <span style="color: #64748b;">${message}</span>
            </div>
        `;
        return () => {
            element.innerHTML = originalContent;
        };
    },
    
    // Show button loader
    showButton: function(button, text = 'Loading...') {
        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.style.opacity = '0.8';
        button.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 8px;">
                <span style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: loaderSpin 0.6s linear infinite;"></span>
                <span>${text}</span>
            </span>
        `;
        return () => {
            button.disabled = false;
            button.style.opacity = '1';
            button.innerHTML = originalHTML;
        };
    }
};

// Helper function to load page with loader
async function loadWithLoader(url, options = {}) {
    Loader.show(options.message || 'Loading page...');
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        Loader.hide();
        return data;
    } catch (error) {
        Loader.hide();
        throw error;
    }
}

// Auto-show loader on page navigation
document.addEventListener('DOMContentLoaded', function() {
    // Show loader when clicking any sidebar link
    document.querySelectorAll('.nav-item, .dropdown-item').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('http') && !href.includes('logout')) {
                Loader.show('Loading...');
            }
        });
    });
});

// Export for use
window.Loader = Loader;
window.loadWithLoader = loadWithLoader;

console.log('✅ Loader ready! Use Loader.show() / Loader.hide()');
