(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    window.showOrganizerUpgradeModal = function(message) {
        const existing = document.querySelector('.upgrade-modal-backdrop');
        if (existing) existing.remove();
        const backdrop = document.createElement('div');
        backdrop.className = 'upgrade-modal-backdrop';
        backdrop.innerHTML = `
            <div class="upgrade-modal">
                <h3><i class="fas fa-lock"></i> Upgrade required</h3>
                <p>${escapeHtml(message || 'Your free plan allows 1 event per month. Upgrade to Plus or Premium to create more events.')}</p>
                <div class="upgrade-modal-actions">
                    <button type="button" class="secondary" onclick="this.closest('.upgrade-modal-backdrop').remove()">Not now</button>
                    <button type="button" class="primary" onclick="window.location.href='/organizer/billing/?upgrade=1'">View plans</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
    };
})();
