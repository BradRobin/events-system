/**
 * Modern Loader - Premium Design Matching System Theme
 * Complete working version with configurable loading speed
 */

// Configuration
const LOADER_CONFIG = {
    // Set to true to add artificial delay (for development/demo)
    ENABLE_ARTIFICIAL_DELAY: true,
    
    // Minimum time to show loader (in milliseconds)
    MINIMUM_DISPLAY_TIME: 1500,
    
    // Additional random delay (0 to this value in ms)
    RANDOM_DELAY_MAX: 500,
    
    // Animation speed multipliers (1 = normal, 2 = slower, 0.5 = faster)
    ANIMATION_SPEED: 1.5,  // Make animations slower
    
    // Progress bar speed
    PROGRESS_SPEED: 3000,   // Longer progress animation
};

// Global loader functions
window.Loader = {
    // Track start time for minimum display
    startTime: null,
    
    // Show fullscreen loader
    show: function(message = 'Loading...') {
        // Record start time
        this.startTime = Date.now();
        
        // Remove existing loader
        this.hide();
        
        // Create overlay with system theme colors
        const overlay = document.createElement('div');
        overlay.id = 'globalLoader';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.94);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: all 0.3s ease;
        `;
        
        // Create loader container with slower animation
        const container = document.createElement('div');
        container.style.cssText = `
            text-align: center;
            background: transparent;
            padding: 32px;
            animation: loaderFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        // Main spinner ring - outer
        const outerRing = document.createElement('div');
        outerRing.style.cssText = `
            width: 80px;
            height: 80px;
            margin: 0 auto;
            position: relative;
        `;
        
        // Outer rotating ring (subtle) - slower animation
        const ring1 = document.createElement('div');
        ring1.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 3px solid rgba(245, 158, 11, 0.1);
            border-radius: 50%;
        `;
        
        // Main animated ring - slower rotation
        const ring2 = document.createElement('div');
        ring2.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 3px solid transparent;
            border-top-color: #f59e0b;
            border-right-color: #f59e0b;
            border-bottom-color: rgba(245, 158, 11, 0.3);
            border-radius: 50%;
            animation: loaderSpin ${1.2 * LOADER_CONFIG.ANIMATION_SPEED}s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        `;
        
        // Secondary reverse ring - slower
        const ring3 = document.createElement('div');
        ring3.style.cssText = `
            position: absolute;
            top: 12px;
            left: 12px;
            width: calc(100% - 24px);
            height: calc(100% - 24px);
            border: 2px solid transparent;
            border-left-color: #fbbf24;
            border-bottom-color: #ec6408;
            border-radius: 50%;
            animation: loaderSpinReverse ${1.8 * LOADER_CONFIG.ANIMATION_SPEED}s linear infinite;
        `;
        
        // Inner pulse dot - slower pulse
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 12px;
            height: 12px;
            background: linear-gradient(135deg, #f59e0b, #ec6408);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: loaderPulse ${1.5 * LOADER_CONFIG.ANIMATION_SPEED}s ease-in-out infinite;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
        `;
        
        outerRing.appendChild(ring1);
        outerRing.appendChild(ring2);
        outerRing.appendChild(ring3);
        outerRing.appendChild(dot);
        
        // Event icon in center
        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        const icon = document.createElement('i');
        icon.className = 'ri-calendar-event-line';
        icon.style.cssText = `
            font-size: 28px;
            color: #f59e0b;
            opacity: 0.8;
            animation: loaderIconPulse ${1.8 * LOADER_CONFIG.ANIMATION_SPEED}s ease-in-out infinite;
        `;
        iconWrapper.appendChild(icon);
        outerRing.appendChild(iconWrapper);
        
        // Message text with gradient
        const msg = document.createElement('div');
        msg.style.cssText = `
            margin-top: 32px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        
        const msgText = document.createElement('span');
        msgText.textContent = message;
        msgText.style.cssText = `
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
        `;
        
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.cssText = `
            display: inline-block;
            width: 28px;
            text-align: left;
            color: #f59e0b;
            font-weight: 600;
        `;
        
        msg.appendChild(msgText);
        msg.appendChild(dots);
        
        // Progress bar - slower animation
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            margin-top: 24px;
            width: 250px;
            margin-left: auto;
            margin-right: auto;
        `;
        
        const progressTrack = document.createElement('div');
        progressTrack.style.cssText = `
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 9999px;
            overflow: hidden;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
            background-size: 200% 100%;
            border-radius: 9999px;
            animation: loaderProgress ${LOADER_CONFIG.PROGRESS_SPEED / 1000}s ease-in-out infinite;
        `;
        
        progressTrack.appendChild(progressFill);
        progressContainer.appendChild(progressTrack);
        
        // Progress percentage text
        const progressText = document.createElement('div');
        progressText.style.cssText = `
            margin-top: 8px;
            color: rgba(255, 255, 255, 0.4);
            font-size: 11px;
            font-family: monospace;
            letter-spacing: 0.5px;
        `;
        progressText.textContent = '0%';
        progressContainer.appendChild(progressText);
        
        // Animate progress percentage
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 95) {
                progress += Math.random() * 8;
                progress = Math.min(progress, 95);
                const fill = progressFill;
                if (fill) fill.style.width = progress + '%';
                progressText.textContent = Math.floor(progress) + '%';
            }
        }, LOADER_CONFIG.PROGRESS_SPEED / 20);
        
        // Tips section (rotating tips)
        const tips = [
            '✨ Loading your dashboard...',
            '📊 Crunching numbers...',
            '🎨 Preparing insights...',
            '⚡ Almost there...',
            '🔮 Just a moment...',
            '💫 Processing request...',
            '🌟 Fetching latest data...',
            '🚀 Optimizing experience...'
        ];
        
        let tipIndex = 0;
        const tipText = document.createElement('div');
        tipText.textContent = tips[0];
        tipText.style.cssText = `
            margin-top: 24px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            font-family: 'Inter', sans-serif;
            transition: opacity 0.3s ease;
        `;
        
        container.appendChild(outerRing);
        container.appendChild(msg);
        container.appendChild(progressContainer);
        container.appendChild(tipText);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // Animate dots - slower
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            dots.textContent = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount);
        }, 600); // Slower dot animation
        
        // Rotate tips - slower
        const tipInterval = setInterval(() => {
            tipIndex = (tipIndex + 1) % tips.length;
            tipText.style.opacity = '0';
            setTimeout(() => {
                tipText.textContent = tips[tipIndex];
                tipText.style.opacity = '1';
            }, 200);
        }, 3500); // Longer between tips
        
        // Store intervals for cleanup
        overlay._dotInterval = dotInterval;
        overlay._tipInterval = tipInterval;
        overlay._progressInterval = progressInterval;
        overlay._progressFill = progressFill;
        overlay._progressText = progressText;
        
        // Add animation styles if not present
        this.addStyles();
        
        return overlay;
    },
    
    // Hide loader with smooth animation and minimum display time
    hide: async function() {
        const loader = document.getElementById('globalLoader');
        if (!loader) return;
        
        // Calculate elapsed time
        const elapsed = Date.now() - (this.startTime || Date.now());
        
        // If artificial delay is enabled and minimum time not met, wait
        if (LOADER_CONFIG.ENABLE_ARTIFICIAL_DELAY && elapsed < LOADER_CONFIG.MINIMUM_DISPLAY_TIME) {
            const remaining = LOADER_CONFIG.MINIMUM_DISPLAY_TIME - elapsed;
            
            // Complete the progress bar to 100%
            if (loader._progressFill) {
                loader._progressFill.style.width = '100%';
                if (loader._progressText) loader._progressText.textContent = '100%';
            }
            
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
        
        // Add random delay if enabled
        if (LOADER_CONFIG.ENABLE_ARTIFICIAL_DELAY && LOADER_CONFIG.RANDOM_DELAY_MAX > 0) {
            const randomDelay = Math.random() * LOADER_CONFIG.RANDOM_DELAY_MAX;
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
        
        // Clean up intervals
        if (loader._dotInterval) clearInterval(loader._dotInterval);
        if (loader._tipInterval) clearInterval(loader._tipInterval);
        if (loader._progressInterval) clearInterval(loader._progressInterval);
        
        // Fade out and remove
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            if (loader && loader.remove) loader.remove();
        }, 300);
    },
    
    // Add CSS animations with configurable speeds
    addStyles: function() {
        if (document.getElementById('loaderAnimations')) return;
        
        const animationSpeed = LOADER_CONFIG.ANIMATION_SPEED;
        
        const style = document.createElement('style');
        style.id = 'loaderAnimations';
        style.textContent = `
            @keyframes loaderFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes loaderSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes loaderSpinReverse {
                0% { transform: rotate(360deg); }
                100% { transform: rotate(0deg); }
            }
            
            @keyframes loaderPulse {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 0.7;
                }
            }
            
            @keyframes loaderIconPulse {
                0%, 100% { 
                    transform: scale(1);
                    opacity: 0.8;
                }
                50% { 
                    transform: scale(1.1);
                    opacity: 1;
                }
            }
            
            @keyframes loaderProgress {
                0% {
                    width: 0%;
                    background-position: 0% 50%;
                }
                50% {
                    width: 70%;
                    background-position: 100% 50%;
                }
                100% {
                    width: 100%;
                    background-position: 200% 50%;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    // Show inline loader in element
    showInline: function(element, message = 'Loading...') {
        if (!element) return null;
        
        const originalContent = element.innerHTML;
        const loaderId = 'inlineLoader_' + Date.now();
        
        const loaderHtml = `
            <div id="${loaderId}" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px 20px;">
                <div style="width: 32px; height: 32px; border: 3px solid rgba(245,158,11,0.2); border-top-color: #f59e0b; border-radius: 50%; animation: loaderSpin ${0.8 * LOADER_CONFIG.ANIMATION_SPEED}s linear infinite;"></div>
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <span style="color: #f59e0b; font-weight: 500; font-size: 14px;">${message}</span>
                    <span style="color: #64748b; font-size: 12px; margin-top: 4px;">Please wait...</span>
                </div>
            </div>
        `;
        
        element.innerHTML = loaderHtml;
        
        return {
            restore: function() {
                const inlineLoader = document.getElementById(loaderId);
                if (inlineLoader) {
                    element.innerHTML = originalContent;
                }
            }
        };
    },
    
    // Show button loader
    showButton: function(button, text = 'Processing...') {
        if (!button) return null;
        
        const originalHTML = button.innerHTML;
        const originalDisabled = button.disabled;
        const originalWidth = button.style.width;
        
        button.style.width = button.offsetWidth + 'px';
        button.disabled = true;
        button.style.opacity = '0.8';
        button.style.cursor = 'wait';
        
        button.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 8px;">
                <span style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: loaderSpin ${0.6 * LOADER_CONFIG.ANIMATION_SPEED}s linear infinite;"></span>
                <span>${text}</span>
            </span>
        `;
        
        return {
            restore: function() {
                button.disabled = originalDisabled;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.style.width = originalWidth;
                button.innerHTML = originalHTML;
            }
        };
    },
    
    // Show toast loader
    showToast: function(message = 'Loading...', duration = 4000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border-left: 4px solid #f59e0b;
            padding: 12px 20px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
            z-index: 100000;
            animation: loaderFadeIn 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="width: 20px; height: 20px; border: 2px solid rgba(245,158,11,0.3); border-top-color: #f59e0b; border-radius: 50%; animation: loaderSpin ${0.6 * LOADER_CONFIG.ANIMATION_SPEED}s linear infinite;"></div>
            <span style="color: white; font-size: 14px; font-weight: 500;">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, duration);
        
        return toast;
    },
    
    // Update configuration dynamically
    setConfig: function(config) {
        Object.assign(LOADER_CONFIG, config);
    }
};

// Helper function to load page with loader (with artificial delay)
async function loadWithLoader(url, options = {}) {
    const loader = Loader.show(options.message || 'Loading page...');
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        await Loader.hide(); // This will respect the minimum display time
        return data;
    } catch (error) {
        await Loader.hide();
        throw error;
    }
}

// Helper function to wrap async function with loader
function withLoader(asyncFn, options = {}) {
    return async function(...args) {
        const message = options.message || 'Processing...';
        Loader.show(message);
        try {
            const result = await asyncFn(...args);
            await Loader.hide();
            return result;
        } catch (error) {
            await Loader.hide();
            throw error;
        }
    };
}

// Auto-show loader when clicking sidebar links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-item, .dropdown-item, .sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            const target = this.getAttribute('target');
            
            if (href && 
                href !== '#' && 
                href !== '' &&
                !href.startsWith('http') && 
                !href.includes('logout') &&
                target !== '_blank' &&
                !href.includes('javascript:')) {
                
                if (e.ctrlKey || e.metaKey || e.shiftKey) return;
                
                // Small delay to ensure the click registers
                setTimeout(() => {
                    Loader.show('Loading page...');
                }, 50);
            }
        });
    });
    
    // Handle form submissions
    const forms = document.querySelectorAll('form:not(.no-loader)');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            Loader.show('Processing...');
        });
    });
});

// Export for use
window.Loader = Loader;
window.loadWithLoader = loadWithLoader;
window.withLoader = withLoader;
window.LOADER_CONFIG = LOADER_CONFIG;

console.log('✅ Modern Loader ready with configurable speed!');