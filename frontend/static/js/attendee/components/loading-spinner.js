// ============================================
// PAGE LOADER MODULE - Instant loading, no delays
// ============================================

(function() {
    'use strict';
    
    let loader = null;
    let loaderVisible = false;
    
    var CONFIG = {
        fadeOutDelay: 200,
        minDisplayTime: 0  // No minimum display time for instant loading
    };
    
    let loaderStartTime = null;
    
    function createLoader() {
        if (document.getElementById('pageLoader')) return;
        
        var loaderHTML = '<div id="pageLoader" class="page-loader" style="display:none;"><div class="loader-overlay"></div><div class="loader-container"><div class="circulating-dots"><div class="dot dot-1"></div><div class="dot dot-2"></div><div class="dot dot-3"></div><div class="dot dot-4"></div><div class="dot dot-5"></div><div class="dot dot-6"></div><div class="dot dot-7"></div><div class="dot dot-8"></div><div class="loader-center-logo"><i class="fas fa-calendar-alt"></i></div></div><div class="loader-text"><div class="loading-bold"><span>LOADING</span><div class="dots-container"><span></span><span></span><span></span></div></div></div></div></div>';
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        loader = document.getElementById('pageLoader');
    }
    
    function showLoader() {
        if (!loader) {
            loader = document.getElementById('pageLoader');
            if (!loader) {
                createLoader();
                loader = document.getElementById('pageLoader');
            }
        }
        
        if (loader && !loaderVisible) {
            loader.style.display = 'flex';
            loader.classList.remove('fade-out');
            loader.classList.add('active');
            document.body.style.overflow = 'hidden';
            loaderVisible = true;
            loaderStartTime = Date.now();
        }
    }
    
    function hideLoader() {
        if (loader && loaderVisible) {
            // Check if minimum display time has passed
            if (CONFIG.minDisplayTime > 0 && loaderStartTime) {
                const elapsed = Date.now() - loaderStartTime;
                if (elapsed < CONFIG.minDisplayTime) {
                    const remaining = CONFIG.minDisplayTime - elapsed;
                    setTimeout(function() {
                        performHide();
                    }, remaining);
                    return;
                }
            }
            performHide();
        }
    }
    
    function performHide() {
        if (loader && loaderVisible) {
            loader.classList.add('fade-out');
            document.body.style.overflow = '';
            
            setTimeout(function() {
                if (loader) {
                    loader.style.display = 'none';
                    loader.classList.remove('fade-out', 'active');
                }
                loaderVisible = false;
                loaderStartTime = null;
            }, CONFIG.fadeOutDelay);
        }
    }
    
    function setMinDisplayTime(time) {
        CONFIG.minDisplayTime = time || 0;
        console.log('Loader min display time set to:', CONFIG.minDisplayTime);
    }
    
    function initLoader() {
        createLoader();
        loader = document.getElementById('pageLoader');
        
        // Hide loader immediately when page is fully loaded
        window.addEventListener('load', function() {
            hideLoader();
        });
        
        // Also hide after a very short timeout as fallback (no delay)
        setTimeout(function() {
            if (loaderVisible) {
                hideLoader();
            }
        }, 300);
    }
    
    function setupNavigationDetection() {
        // Handle link clicks - show loader instantly
        document.addEventListener('click', function(e) {
            var link = e.target.closest('a');
            
            if (link && link.href) {
                var isInternalLink = link.href.indexOf(window.location.origin) === 0;
                var isAnchorLink = link.getAttribute('href') && link.getAttribute('href').startsWith('#');
                var isSamePage = link.href === window.location.href;
                var hasNoLoader = link.hasAttribute('data-no-loader');
                var isDownload = link.hasAttribute('download');
                var isMailTo = link.href.startsWith('mailto:');
                var isTel = link.href.startsWith('tel:');
                var isExternal = !isInternalLink;
                
                // Show loader instantly for internal navigation (no delay)
                if (isInternalLink && !isAnchorLink && !isSamePage && !hasNoLoader && 
                    !isDownload && !isMailTo && !isTel && !isExternal) {
                    showLoader();
                }
            }
        });
        
        // Handle form submissions - show loader instantly
        document.addEventListener('submit', function(e) {
            if (e.defaultPrevented) return;
            var form = e.target.closest('form');
            if (form && !form.hasAttribute('data-no-loader')) {
                showLoader();
            }
        });
        
        // Handle beforeunload - show loader instantly
        window.addEventListener('beforeunload', function() {
            showLoader();
        });
        
        // Handle history API navigation
        var originalPushState = history.pushState;
        var originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            showLoader();
            originalPushState.apply(this, arguments);
            // Hide after content loads (no unnecessary delay)
            setTimeout(function() {
                if (loaderVisible) {
                    hideLoader();
                }
            }, 200);
        };
        
        history.replaceState = function() {
            showLoader();
            originalReplaceState.apply(this, arguments);
            setTimeout(function() {
                if (loaderVisible) {
                    hideLoader();
                }
            }, 200);
        };
        
        window.addEventListener('popstate', function() {
            showLoader();
            setTimeout(function() {
                if (loaderVisible) {
                    hideLoader();
                }
            }, 200);
        });
    }
    
    // Expose public API with all methods
    window.PageLoader = {
        show: showLoader,
        hide: hideLoader,
        init: initLoader,
        setMinDisplayTime: setMinDisplayTime
    };
    
    // Initialize immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initLoader();
            setupNavigationDetection();
        });
    } else {
        initLoader();
        setupNavigationDetection();
    }
})();