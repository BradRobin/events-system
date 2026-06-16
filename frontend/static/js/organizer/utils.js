// Shared helpers for organizer portal pages (loaded from base.html)
(function (global) {
    'use strict';

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return '&quot;';
        });
    }

    function renderPagination(data, currentPage, callback, containerId) {
        const container = document.getElementById(containerId || 'pagination');
        if (!container || !data || !data.total_pages || data.total_pages <= 1) return;
        let html = '';
        if (data.previous) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Prev</a></li>`;
        }
        for (let i = 1; i <= Math.min(data.total_pages, 5); i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        if (data.next) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
        }
        container.innerHTML = html;
        container.querySelectorAll('.page-link').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const page = parseInt(link.dataset.page, 10);
                if (page && page !== currentPage && page >= 1 && page <= data.total_pages) {
                    callback(page);
                }
            });
        });
    }

    function showToast(message, type) {
        type = type || 'info';
        if ((type === 'error' || type === 'danger') && global.UserFriendlyErrors) {
            message = global.UserFriendlyErrors.sanitizeUserMessage(message, {
                fallback: 'Something went wrong. Please try again.',
            });
        }
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        const bgClass = type === 'success' ? 'success' : (type === 'error' ? 'danger' : 'primary');
        toast.className = 'toast align-items-center text-white bg-' + bgClass + ' border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + escapeHtml(message) + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', function () { toast.remove(); });
    }

    function displayGreeting() {
        const greetingTextEl = document.getElementById('greetingText');
        if (!greetingTextEl) return;
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if (hour >= 3 && hour < 12) greeting = 'Good Morning';
        else if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
        greetingTextEl.textContent = greeting;
    }

    /** Extract ticket number from QR text (plain code or pipe-delimited payload). */
    function parseTicketNumberFromScan(raw) {
        if (!raw) return '';
        let value = String(raw).trim();
        if (!value) return '';

        try {
            value = decodeURIComponent(value);
        } catch (_) { /* keep original */ }

        if (value.includes('|')) {
            value = value.split('|')[0].trim();
        }

        const ticketMatch = value.match(/TICK-[A-Z0-9]+/i);
        if (ticketMatch) return ticketMatch[0].toUpperCase();

        return value.split(/\s+/)[0].trim();
    }

    global.escapeHtml = escapeHtml;
    global.renderPagination = renderPagination;
    global.showToast = showToast;
    global.displayGreeting = displayGreeting;
    global.parseTicketNumberFromScan = parseTicketNumberFromScan;
})(window);
