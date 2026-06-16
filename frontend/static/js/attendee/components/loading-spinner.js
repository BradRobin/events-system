// ============================================
// PAGE LOADER MODULE - Instant loading, no delays
// ============================================

(function() {
    'use strict';

    if (window.__EventhubPageLoaderInit) {
        return;
    }
    window.__EventhubPageLoaderInit = true;
    
    let loader = null;
    let loaderVisible = false;
    let maxHideTimer = null;
    let hideFallbackTimer = null;
    
    var CONFIG = {
        fadeOutDelay: 200,
        minDisplayTime: 0,
        maxDisplayTime: 12000,
        navigationHideDelay: 300
    };
    
    let loaderStartTime = null;
    
    function getLoaderElement() {
        if (!loader) {
            loader = document.getElementById('pageLoader');
        }
        return loader;
    }
    
    function createLoader() {
        if (document.getElementById('pageLoader')) return;
        
        var loaderHTML = '<div id="pageLoader" class="page-loader" style="display:none;"><div class="loader-overlay"></div><div class="loader-container"><div class="circulating-dots"><div class="dot dot-1"></div><div class="dot dot-2"></div><div class="dot dot-3"></div><div class="dot dot-4"></div><div class="dot dot-5"></div><div class="dot dot-6"></div><div class="dot dot-7"></div><div class="dot dot-8"></div><div class="loader-center-logo"><i class="fas fa-calendar-alt"></i></div></div><div class="loader-text"><div class="loading-bold"><span>LOADING</span><div class="dots-container"><span></span><span></span><span></span></div></div></div></div></div>';
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        loader = document.getElementById('pageLoader');
    }
    
    function clearLoaderTimers() {
        if (maxHideTimer) {
            clearTimeout(maxHideTimer);
            maxHideTimer = null;
        }
        if (hideFallbackTimer) {
            clearTimeout(hideFallbackTimer);
            hideFallbackTimer = null;
        }
    }
    
    function forceHideLoader() {
        clearLoaderTimers();
        var el = getLoaderElement();
        if (el) {
            el.style.display = 'none';
            el.classList.remove('fade-out', 'active');
        }
        document.body.style.overflow = '';
        loaderVisible = false;
        loaderStartTime = null;
    }
    
    function showLoader() {
        var el = getLoaderElement();
        if (!el) {
            createLoader();
            el = getLoaderElement();
        }
        
        if (el && !loaderVisible) {
            el.style.display = 'flex';
            el.classList.remove('fade-out');
            el.classList.add('active');
            document.body.style.overflow = 'hidden';
            loaderVisible = true;
            loaderStartTime = Date.now();
            
            clearLoaderTimers();
            maxHideTimer = setTimeout(function() {
                forceHideLoader();
            }, CONFIG.maxDisplayTime);
        }
    }
    
    function hideLoader() {
        if (!loaderVisible) {
            forceHideLoader();
            return;
        }
        
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
    
    function performHide() {
        var el = getLoaderElement();
        if (!el || !loaderVisible) {
            forceHideLoader();
            return;
        }
        
        el.classList.add('fade-out');
        document.body.style.overflow = '';
        
        clearLoaderTimers();
        setTimeout(function() {
            forceHideLoader();
        }, CONFIG.fadeOutDelay);
    }
    
    function scheduleHideAfterNavigation() {
        clearLoaderTimers();
        hideFallbackTimer = setTimeout(function() {
            hideLoader();
        }, CONFIG.navigationHideDelay);
    }
    
    function setMinDisplayTime(time) {
        CONFIG.minDisplayTime = time || 0;
    }
    
    function initLoader() {
        createLoader();
        loader = document.getElementById('pageLoader');
        
        window.addEventListener('load', function() {
            hideLoader();
        });
        
        // bfcache: browser back/forward restores the page without firing load
        window.addEventListener('pageshow', function(event) {
            forceHideLoader();
            if (event.persisted) {
                document.body.style.overflow = '';
            }
        });
        
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                scheduleHideAfterNavigation();
            }
        });
        
        setTimeout(function() {
            if (loaderVisible) {
                hideLoader();
            }
        }, 300);
    }
    
    function setupNavigationDetection() {
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
                
                if (isInternalLink && !isAnchorLink && !isSamePage && !hasNoLoader && 
                    !isDownload && !isMailTo && !isTel && !isExternal) {
                    showLoader();
                }
            }
        });
        
        document.addEventListener('submit', function(e) {
            if (e.defaultPrevented) return;
            var form = e.target.closest('form');
            if (form && !form.hasAttribute('data-no-loader')) {
                showLoader();
            }
        });
        
        // Do not show loader on beforeunload — it pollutes bfcache and sticks on browser back.
        
        var originalPushState = history.pushState;
        var originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            showLoader();
            originalPushState.apply(this, arguments);
            scheduleHideAfterNavigation();
        };
        
        history.replaceState = function() {
            showLoader();
            originalReplaceState.apply(this, arguments);
            scheduleHideAfterNavigation();
        };
        
        window.addEventListener('popstate', function() {
            showLoader();
            scheduleHideAfterNavigation();
        });
    }
    
    window.PageLoader = {
        show: showLoader,
        hide: hideLoader,
        forceHide: forceHideLoader,
        init: initLoader,
        setMinDisplayTime: setMinDisplayTime
    };
    
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
