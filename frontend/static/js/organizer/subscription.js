(function() {
    'use strict';

    let currentOrder = null;
    let plansData = null;

    function getAuthHeaders(json = true) {
        const headers = {};
        const token = localStorage.getItem('organizer_access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (json) headers['Content-Type'] = 'application/json';
        const csrf = document.cookie.match(/csrftoken=([^;]+)/);
        if (csrf) headers['X-CSRFToken'] = csrf[1];
        return headers;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function showToast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        else alert(msg);
    }

    function formatCurrency(amount) {
        return 'KES ' + Number(amount).toLocaleString('en-KE');
    }

    async function loadOcrHealth() {
        try {
            const res = await fetch('/api/health/ocr/');
            const data = await res.json();
            const el = document.getElementById('ocrStatusBanner');
            if (!el) return;
            el.style.display = 'block';
            el.className = 'ocr-status-banner ' + (data.ocr_available ? 'ok' : 'warn');
            el.innerHTML = `<i class="fas fa-${data.ocr_available ? 'check-circle' : 'info-circle'}"></i> ${escapeHtml(data.message)}`;
        } catch (_) { /* optional */ }
    }

    async function loadSubscriptionStatus() {
        const res = await fetch('/api/organizer/subscription/', { headers: getAuthHeaders(false) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load subscription');
        plansData = data;
        renderUsageBanner(data.usage);
        renderPlanCards(data.plans, data.usage);
        return data;
    }

    function renderUsageBanner(usage) {
        const el = document.getElementById('subscriptionUsageBanner');
        if (!el || !usage) return;
        el.style.display = 'block';
        el.innerHTML = `
            <strong>${escapeHtml(usage.plan_name)} plan</strong> —
            ${usage.events_used_this_month} of ${usage.events_limit_per_month} events used this month
            (${usage.events_remaining} remaining).
            ${usage.subscription_expires_at ? ` Renews/expires: ${new Date(usage.subscription_expires_at).toLocaleDateString()}.` : ''}
        `;
    }

    function renderPlanCards(plans, usage) {
        const container = document.getElementById('planCards');
        if (!container) return;
        container.innerHTML = plans.map(plan => {
            const isCurrent = plan.slug === usage.plan;
            const priceLabel = plan.price_kes > 0 ? formatCurrency(plan.price_kes) : 'Free';
            return `
                <div class="plan-card ${isCurrent ? 'is-current' : ''} ${plan.slug === 'premium' ? 'is-featured' : ''}">
                    <h3>${escapeHtml(plan.name)}${isCurrent ? ' <small>(Current)</small>' : ''}</h3>
                    <div class="plan-price">${priceLabel}${plan.price_kes > 0 ? '<span> / month</span>' : ''}</div>
                    <ul class="plan-features">
                        <li><i class="fas fa-check"></i> ${plan.events_per_month} event${plan.events_per_month > 1 ? 's' : ''} per month</li>
                        <li><i class="fas fa-check"></i> ${escapeHtml(plan.description)}</li>
                    </ul>
                    <button type="button" class="plan-upgrade-btn"
                        ${!plan.upgradable || isCurrent ? 'disabled' : ''}
                        onclick="startPlanUpgrade('${plan.slug}')">
                        ${isCurrent ? 'Current plan' : (plan.slug === 'free' ? 'Free tier' : `Upgrade to ${escapeHtml(plan.name)}`)}
                    </button>
                </div>
            `;
        }).join('');
    }

    function showSubStep(step) {
        ['subStep1', 'subStep2', 'subStep3', 'subStepPending', 'subStepFail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const map = { 1: 'subStep1', 2: 'subStep2', 3: 'subStep3', 4: 'subStepPending', 5: 'subStepFail' };
        const target = document.getElementById(map[step]);
        if (target) target.style.display = 'block';
    }

    function renderPaymentOptions(options) {
        const container = document.getElementById('subPaymentOptions');
        if (!container) return;
        container.innerHTML = (options || []).map(opt => `
            <div class="checkout-payment-option">
                <div class="payment-option-details">
                    <strong>${escapeHtml(opt.label)}</strong>
                    <div class="checkout-payment-value">${escapeHtml(opt.value)}</div>
                    <div class="payment-option-instruction">${escapeHtml(opt.instruction || '')}</div>
                </div>
                <button type="button" class="checkout-copy-btn" data-copy="${escapeHtml(opt.value)}">
                    <span class="checkout-copy-btn-inner"><i class="fas fa-copy"></i> Copy</span>
                </button>
            </div>
        `).join('');
        container.querySelectorAll('.checkout-copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
                showToast('Copied!', 'success');
            });
        });
    }

    function openCheckoutModal(order) {
        currentOrder = order;
        const modal = document.getElementById('subscriptionCheckoutModal');
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('subPlanBadge').textContent = order.plan_name || order.plan;
        document.getElementById('subTotalAmount').textContent = formatCurrency(order.amount);
        document.getElementById('subReceiverName').textContent = 'EventHub — 0743042018';
        renderPaymentOptions(order.payment_options);
        showSubStep(1);
        document.getElementById('subScreenshot').value = '';
        document.getElementById('subScreenshotPreview').innerHTML = '';
        document.getElementById('subStreamSteps').innerHTML = '';
    }

    function closeCheckoutModal() {
        const modal = document.getElementById('subscriptionCheckoutModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        currentOrder = null;
    }

    async function createSubscriptionOrder(planSlug) {
        const res = await fetch('/api/organizer/subscription/orders/create/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ plan: planSlug, billing_months: 1 }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Could not start upgrade');
        return data.order;
    }

    async function verifyScreenshot(orderId, file) {
        const formData = new FormData();
        formData.append('screenshot', file);
        const headers = {};
        const token = localStorage.getItem('organizer_access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const csrf = document.cookie.match(/csrftoken=([^;]+)/);
        if (csrf) headers['X-CSRFToken'] = csrf[1];

        const streamEl = document.getElementById('subStreamSteps');
        if (streamEl) {
            streamEl.innerHTML = '<div class="stream-step active"><i class="fas fa-circle-notch fa-spin"></i> Uploading screenshot…</div>';
        }

        const response = await fetch(`/api/organizer/subscription/orders/${orderId}/verify-screenshot/`, {
            method: 'POST',
            headers,
            body: formData,
        });

        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            throw new Error('Verification request failed. Please try again.');
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Verification request failed');
        }

        if (streamEl) {
            streamEl.innerHTML = '<div class="stream-step done"><i class="fas fa-check-circle"></i> Screenshot received</div>';
        }

        if (data.step === 'pending_approval') {
            return data;
        }
        if (data.step === 'failed') {
            throw new Error(data.message || 'Verification failed');
        }
        return data;
    }

    window.startPlanUpgrade = async function(planSlug) {
        try {
            const order = await createSubscriptionOrder(planSlug);
            openCheckoutModal(order);
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadOcrHealth();
        loadSubscriptionStatus().catch(e => showToast(e.message, 'error'));

        document.getElementById('subCheckoutClose')?.addEventListener('click', closeCheckoutModal);
        document.getElementById('subPaidBtn')?.addEventListener('click', () => showSubStep(2));
        document.getElementById('subPendingCloseBtn')?.addEventListener('click', () => {
            closeCheckoutModal();
            loadSubscriptionStatus();
        });
        document.getElementById('subRetryBtn')?.addEventListener('click', () => showSubStep(2));

        document.getElementById('subScreenshot')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = document.getElementById('subScreenshotPreview');
            if (!file || !preview) return;
            const reader = new FileReader();
            reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="Preview">`; };
            reader.readAsDataURL(file);
        });

        document.getElementById('subVerifyBtn')?.addEventListener('click', async () => {
            if (!currentOrder) return;
            const file = document.getElementById('subScreenshot')?.files[0];
            if (!file) { showToast('Upload screenshot first', 'error'); return; }
            showSubStep(3);
            document.getElementById('subStreamSteps').innerHTML = '';
            try {
                const result = await verifyScreenshot(currentOrder.id, file);
                if (result.step === 'pending_approval') {
                    document.getElementById('subPendingMessage').textContent = result.message || 'Your upgrade request has been submitted for approval.';
                    showSubStep(4);
                }
            } catch (e) {
                document.getElementById('subFailMessage').textContent = e.message;
                showSubStep(5);
            }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('upgrade') === '1') {
            loadSubscriptionStatus().then(() => {
                const plan = params.get('plan') || 'plus';
                startPlanUpgrade(plan);
            });
        }
    });
})();
