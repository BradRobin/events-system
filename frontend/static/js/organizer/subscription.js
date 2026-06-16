(function() {
    'use strict';

    let currentOrder = null;
    let plansData = null;

    const PLAN_ICONS = {
        free: 'fa-seedling',
        plus: 'fa-rocket',
        premium: 'fa-crown',
    };

    const AWAITING_APPROVAL_STATUSES = new Set(['manual_review', 'verifying']);

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

    function isAwaitingApproval(pendingOrder) {
        return pendingOrder && AWAITING_APPROVAL_STATUSES.has(pendingOrder.status);
    }

    function getPlanButtonState(plan, usage, pendingOrder) {
        const isCurrent = plan.slug === usage.plan;

        if (isCurrent) {
            return { label: 'Current plan', disabled: true, variant: 'current', action: null };
        }

        if (plan.slug === 'free') {
            return { label: 'Free tier', disabled: true, variant: 'free', action: null };
        }

        if (!plan.upgradable) {
            return { label: 'Not available', disabled: true, variant: 'disabled', action: null };
        }

        if (pendingOrder && pendingOrder.plan === plan.slug) {
            if (pendingOrder.status === 'pending_payment') {
                return {
                    label: 'Continue upgrade',
                    disabled: false,
                    variant: 'continue',
                    action: 'resume',
                };
            }
            if (isAwaitingApproval(pendingOrder)) {
                return {
                    label: 'Waiting for Approval',
                    disabled: true,
                    variant: 'waiting',
                    action: null,
                };
            }
        }

        if (pendingOrder) {
            return {
                label: `Upgrade to ${plan.name}`,
                disabled: true,
                variant: 'disabled',
                action: null,
            };
        }

        return {
            label: `Upgrade to ${plan.name}`,
            disabled: false,
            variant: 'upgrade',
            action: 'upgrade',
        };
    }

    function renderPlanButton(plan, buttonState) {
        const icon = buttonState.variant === 'waiting'
            ? '<i class="fas fa-clock"></i> '
            : (buttonState.variant === 'continue' ? '<i class="fas fa-arrow-right"></i> ' : '');
        const onclick = (!buttonState.disabled && buttonState.action)
            ? `onclick="handlePlanCardAction('${plan.slug}', '${buttonState.action}')"`
            : '';
        return (
            `<button type="button" class="plan-upgrade-btn plan-upgrade-btn--${buttonState.variant}" ` +
            `${buttonState.disabled ? 'disabled' : ''} ${onclick}>` +
            `${icon}${escapeHtml(buttonState.label)}` +
            `</button>`
        );
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
        const res = await fetch('/api/organizer/subscription/', {
            headers: getAuthHeaders(false),
            credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load subscription');
        plansData = data;
        renderUsageBanner(data.usage, data.pending_order);
        renderPendingBanner(data.pending_order);
        renderPlanCards(data.plans, data.usage, data.pending_order);
        return data;
    }

    function renderUsageBanner(usage, pendingOrder) {
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

    function renderPendingBanner(pendingOrder) {
        let el = document.getElementById('subscriptionPendingBanner');
        if (!el) {
            const anchor = document.getElementById('subscriptionUsageBanner')
                || document.getElementById('ocrStatusBanner')
                || document.getElementById('planCards');
            if (!anchor || !anchor.parentNode) return;
            el = document.createElement('div');
            el.id = 'subscriptionPendingBanner';
            el.className = 'subscription-pending-banner';
            el.style.display = 'none';
            anchor.parentNode.insertBefore(el, anchor.nextSibling);
        }

        if (!isAwaitingApproval(pendingOrder)) {
            el.style.display = 'none';
            el.innerHTML = '';
            return;
        }

        const planName = pendingOrder.plan_name || pendingOrder.plan;
        el.style.display = 'block';
        el.innerHTML = (
            `<i class="fas fa-hourglass-half"></i>` +
            `<strong>${escapeHtml(planName)} upgrade pending.</strong> ` +
            `EventHub is reviewing your M-Pesa payment. Your plan will activate once approved.`
        );
    }

    function renderPlanCards(plans, usage, pendingOrder) {
        const container = document.getElementById('planCards');
        if (!container) return;

        container.innerHTML = plans.map(function (plan) {
            const isCurrent = plan.slug === usage.plan;
            const isPendingPlan = pendingOrder && pendingOrder.plan === plan.slug && isAwaitingApproval(pendingOrder);
            const priceLabel = plan.price_kes > 0 ? formatCurrency(plan.price_kes) : 'Free';
            const buttonState = getPlanButtonState(plan, usage, pendingOrder);
            const icon = PLAN_ICONS[plan.slug] || 'fa-layer-group';
            const ribbon = plan.slug === 'plus'
                ? '<span class="plan-card__ribbon">Popular</span>'
                : (plan.slug === 'premium' ? '<span class="plan-card__ribbon plan-card__ribbon--premium">Best value</span>' : '');

            return (
                `<div class="plan-card plan-card--${plan.slug}` +
                `${isCurrent ? ' is-current' : ''}` +
                `${plan.slug === 'premium' ? ' is-featured' : ''}` +
                `${isPendingPlan ? ' is-pending' : ''}">` +
                ribbon +
                `<div class="plan-card__header">` +
                    `<div class="plan-card__icon"><i class="fas ${icon}"></i></div>` +
                    `<h3>${escapeHtml(plan.name)}${isCurrent ? ' <small>Current</small>' : ''}</h3>` +
                    `<p class="plan-card__tagline">${escapeHtml(plan.description)}</p>` +
                `</div>` +
                `<div class="plan-price">${priceLabel}${plan.price_kes > 0 ? '<span>per month</span>' : '<span>forever</span>'}</div>` +
                `<ul class="plan-features">` +
                    `<li><i class="fas fa-check"></i><span><strong>${plan.events_per_month}</strong> event${plan.events_per_month > 1 ? 's' : ''} per month</span></li>` +
                    `<li><i class="fas fa-check"></i><span>Search rank tier <strong>${plan.search_rank}</strong></span></li>` +
                    `<li><i class="fas fa-check"></i><span>${escapeHtml(plan.description)}</span></li>` +
                `</ul>` +
                renderPlanButton(plan, buttonState) +
                `</div>`
            );
        }).join('');
    }

    function showSubStep(step) {
        ['subStep1', 'subStep2', 'subStep3', 'subStepPending', 'subStepFail'].forEach(function (id) {
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
        container.innerHTML = (options || []).map(function (opt) {
            return `
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
            `;
        }).join('');
        container.querySelectorAll('.checkout-copy-btn').forEach(function (btn) {
            btn.addEventListener('click', async function () {
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
            credentials: 'same-origin',
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
            credentials: 'same-origin',
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

    window.handlePlanCardAction = async function(planSlug, action) {
        try {
            if (action === 'resume' && plansData?.pending_order) {
                openCheckoutModal(plansData.pending_order);
                return;
            }
            const order = await createSubscriptionOrder(planSlug);
            openCheckoutModal(order);
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.startPlanUpgrade = function(planSlug) {
        handlePlanCardAction(planSlug, 'upgrade');
    };

    document.addEventListener('DOMContentLoaded', function () {
        loadOcrHealth();
        loadSubscriptionStatus().catch(function (e) { showToast(e.message, 'error'); });

        document.getElementById('subCheckoutClose')?.addEventListener('click', closeCheckoutModal);
        document.getElementById('subPaidBtn')?.addEventListener('click', function () { showSubStep(2); });
        document.getElementById('subPendingCloseBtn')?.addEventListener('click', function () {
            closeCheckoutModal();
            loadSubscriptionStatus();
        });
        document.getElementById('subRetryBtn')?.addEventListener('click', function () { showSubStep(2); });

        document.getElementById('subScreenshot')?.addEventListener('change', function (e) {
            const file = e.target.files[0];
            const preview = document.getElementById('subScreenshotPreview');
            if (!file || !preview) return;
            const reader = new FileReader();
            reader.onload = function () { preview.innerHTML = `<img src="${reader.result}" alt="Preview">`; };
            reader.readAsDataURL(file);
        });

        document.getElementById('subVerifyBtn')?.addEventListener('click', async function () {
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
                    await loadSubscriptionStatus();
                }
            } catch (e) {
                document.getElementById('subFailMessage').textContent = e.message;
                showSubStep(5);
            }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('upgrade') === '1') {
            loadSubscriptionStatus().then(function () {
                const plan = params.get('plan') || 'plus';
                startPlanUpgrade(plan);
            });
        }

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible' && document.getElementById('planCards')) {
                loadSubscriptionStatus().catch(function () {});
            }
        });
    });
})();
