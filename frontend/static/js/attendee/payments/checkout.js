/**
 * M-Pesa Checkout — per-organizer payment settings, multi-event queue support.
 */

(function() {
    'use strict';

    let currentOrder = null;
    let statusPollInterval = null;
    let checkoutQueue = [];
    let checkoutQueueIndex = 0;
    let checkoutQueueBilling = null;

    function getAuthHeaders(json = true) {
        const headers = {};
        const token = localStorage.getItem('attendee_access_token');
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
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    function getModal() { return document.getElementById('checkoutModal'); }

    function showStep(step) {
        const steps = ['checkoutStep1', 'checkoutStep2', 'checkoutStep3', 'checkoutStep4Pending', 'checkoutStep4Success', 'checkoutStep4Fail'];
        steps.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const map = { 1: 'checkoutStep1', 2: 'checkoutStep2', 3: 'checkoutStep3', 4: 'checkoutStep4Pending', 5: 'checkoutStep4Fail', 6: 'checkoutStep4Success' };
        const target = document.getElementById(map[step]);
        if (target) target.style.display = 'block';
    }

    function queueHasMore() {
        return checkoutQueue.length > 0 && checkoutQueueIndex < checkoutQueue.length - 1;
    }

    function updateQueueProgressUI(order) {
        const el = document.getElementById('checkoutQueueProgress');
        if (!el) return;
        if (checkoutQueue.length <= 1) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        const current = checkoutQueueIndex + 1;
        const item = checkoutQueue[checkoutQueueIndex];
        el.innerHTML = `
            <span class="checkout-queue-pill">Payment ${current} of ${checkoutQueue.length}</span>
            <strong>${escapeHtml(item?.title || order?.event_title || 'Event')}</strong>
        `;
    }

    function updatePendingActions() {
        const btn = document.getElementById('checkoutPendingCloseBtn');
        if (!btn) return;
        btn.textContent = queueHasMore() ? 'Next payment' : 'Back to cart';
    }

    function updateSuccessActions() {
        const btn = document.getElementById('checkoutSuccessCloseBtn');
        if (!btn) return;
        btn.textContent = queueHasMore() ? 'Next payment' : 'View my tickets';
    }

    function renderPaymentOptions(order) {
        const container = document.getElementById('checkoutPaymentOptions');
        if (!container) return;
        const options = order.payment_options || [];
        if (options.length === 0) {
            container.innerHTML = '<p class="no-payment-options">No payment options available. Contact organizer.</p>';
            return;
        }

        container.innerHTML = options.map(opt => {
            const icons = { paybill: 'fa-building', till: 'fa-store', pochi: 'fa-wallet', sendmoney: 'fa-phone-alt', mpesa: 'fa-mobile-alt' };
            return `
                <div class="checkout-payment-option" data-type="${opt.type}">
                    <div class="payment-option-icon"><i class="fas ${icons[opt.type] || 'fa-credit-card'}"></i></div>
                    <div class="payment-option-details">
                        <strong>${escapeHtml(opt.label)}</strong>
                        <div class="checkout-payment-value">${escapeHtml(opt.value)}</div>
                        ${opt.instruction ? `<div class="payment-option-instruction">${escapeHtml(opt.instruction)}</div>` : ''}
                    </div>
                    <button type="button" class="checkout-copy-btn" data-copy="${escapeHtml(opt.value)}">
                        <span class="checkout-copy-btn-inner"><i class="fas fa-copy"></i> Copy</span>
                    </button>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.checkout-copy-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const value = btn.getAttribute('data-copy');
                if (!value || btn.classList.contains('is-copied')) return;
                await navigator.clipboard.writeText(value);
                btn.classList.add('is-copied');
                btn.innerHTML = '<span class="checkout-copy-btn-inner"><i class="fas fa-check"></i> Copied!</span>';
                setTimeout(() => {
                    btn.classList.remove('is-copied');
                    btn.innerHTML = '<span class="checkout-copy-btn-inner"><i class="fas fa-copy"></i> Copy</span>';
                }, 2000);
                showToast('Copied!', 'success');
            });
        });
    }

    function renderStreamStep(message, isComplete = false) {
        const el = document.getElementById('checkoutStreamSteps');
        if (!el) return;
        const item = document.createElement('div');
        item.className = 'stream-step active';
        item.innerHTML = `<i class="fas ${isComplete ? 'fa-check-circle' : 'fa-circle-notch fa-spin'}"></i> ${escapeHtml(message)}`;
        el.appendChild(item);
        const prev = el.querySelectorAll('.stream-step.active');
        if (prev.length > 1) {
            prev[prev.length - 2].classList.remove('active');
            prev[prev.length - 2].classList.add('done');
        }
    }

    async function createOrder(eventId, ticketType, quantity, mpesaName) {
        const maxQuantity = Math.min(quantity, 8);
        if (quantity > 8) {
            showToast('Maximum 8 tickets per booking. Reducing to 8.', 'warning');
        }

        const payload = { event_id: eventId, ticket_type: ticketType, quantity: maxQuantity };
        if (mpesaName) payload.mpesa_name = mpesaName;

        const response = await fetch('/api/attendee/payment-orders/create/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Checkout failed');
        return data.order;
    }

    function getCheckoutMpesaName() {
        const step2 = document.getElementById('checkoutStep2MpesaName')?.value.trim();
        if (step2) return step2;
        const manual = document.getElementById('checkoutMpesaName')?.value.trim();
        if (manual) return manual;
        const pending = document.getElementById('checkoutPendingMpesaName')?.value.trim();
        if (pending) return pending;
        return (checkoutQueueBilling?.mpesa_name || '').trim();
    }

    function prefillCheckoutMpesaName() {
        const name = (checkoutQueueBilling?.mpesa_name || '').trim();
        if (!name) return;
        ['checkoutStep2MpesaName', 'checkoutMpesaName', 'checkoutPendingMpesaName'].forEach((id) => {
            const el = document.getElementById(id);
            if (el && !el.value.trim()) el.value = name;
        });
    }

    async function submitMpesaName(orderId, mpesaName) {
        const response = await fetch(`/api/attendee/payment-orders/${orderId}/submit-mpesa-name/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ mpesa_name: mpesaName }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not submit M-Pesa name');
        }
        return data;
    }

    async function checkOrderStatus(orderId) {
        const response = await fetch(`/api/attendee/payment-orders/${orderId}/status/`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to check status');
        return data.order;
    }

    async function verifyScreenshot(orderId, file, mpesaName) {
        const formData = new FormData();
        formData.append('screenshot', file);
        if (mpesaName) formData.append('mpesa_name', mpesaName);
        const token = localStorage.getItem('attendee_access_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const csrf = document.cookie.match(/csrftoken=([^;]+)/);
        if (csrf) headers['X-CSRFToken'] = csrf[1];

        const response = await fetch(`/api/attendee/payment-orders/${orderId}/verify-screenshot/`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) throw new Error('Verification request failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let lastResult = { step: 'pending' };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();
            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith('data:')) continue;
                const payload = JSON.parse(line.slice(5));
                if (payload.message) renderStreamStep(payload.message, payload.step === 'completed');
                if (payload.step === 'completed') {
                    return { step: 'completed', ticket: payload.ticket };
                }
                if (payload.step === 'pending_approval') {
                    lastResult = {
                        step: 'pending_approval',
                        order_id: payload.order_id,
                        event_id: payload.event_id,
                        message: payload.message,
                    };
                }
                if (payload.step === 'failed') {
                    throw new Error(payload.message);
                }
            }
        }
        return lastResult;
    }

    function removeEventFromCart(eventId) {
        if (!window.cartData || !eventId) return;
        window.cartData.items = window.cartData.items.filter(item => String(item.id) !== String(eventId));
        if (window.cartData.items.length === 0) {
            if (window.EventhubCartStorage) {
                window.EventhubCartStorage.saveEventhubCart({ items: [], subtotal: 0, total: 0 });
            } else {
                localStorage.removeItem('eventhub_cart');
            }
        } else {
            window.cartData.subtotal = window.cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            window.cartData.total = window.cartData.subtotal - (window.cartData.discount_amount || 0);
            if (window.EventhubCartStorage) {
                window.EventhubCartStorage.saveEventhubCart(window.cartData);
            } else {
                localStorage.setItem('eventhub_cart', JSON.stringify(window.cartData));
            }
        }
        if (typeof window.displayCart === 'function') {
            window.displayCart();
        }
        window.dispatchEvent(new CustomEvent('cart-updated'));
    }

    function saveTicketToLocalStorage(order, ticketData) {
        try {
            let bookings = JSON.parse(localStorage.getItem('eventhub_bookings') || '[]');
            const billingInfo = checkoutQueueBilling || JSON.parse(sessionStorage.getItem('checkout_billing_info') || '{}');
            const item = checkoutQueue[checkoutQueueIndex] || { id: order.event_id, title: order.event_title };
            const receiptNumber = order.receipt_number || order.mpesa_receipt || ('MPESA' + Date.now().toString().slice(-8));
            const bookingId = order.booking_id || ('BK' + order.id);
            const ticketCode = ticketData?.ticket_number || order.ticket_number || `TKT${order.id}`;

            const booking = {
                id: bookingId,
                booking_date: new Date().toISOString(),
                status: 'confirmed',
                payment_method: 'M-Pesa',
                receipt_number: receiptNumber,
                total_amount: order.total_amount,
                subtotal: order.total_amount,
                discount: 0,
                organizer: order.organizer_name || sessionStorage.getItem('selected_organizer'),
                billing_info: billingInfo,
                items: [{
                    id: item.id || order.event_id,
                    title: item.title || order.event_title,
                    category: item.category || 'Event',
                    date: item.date,
                    location: item.location,
                    price: order.unit_price,
                    quantity: order.quantity,
                    image: item.image,
                    ticket_code: ticketCode,
                    ticket_codes: [ticketCode],
                    ticket_type: order.ticket_type || item.ticket_type || 'regular',
                    organizer: order.organizer_name,
                }],
                payment_status: 'completed',
                payment_date: new Date().toISOString(),
            };

            bookings = bookings.filter(b => b.id !== bookingId);
            bookings.unshift(booking);
            localStorage.setItem('eventhub_bookings', JSON.stringify(bookings));
            return booking;
        } catch (error) {
            console.error('Error saving ticket:', error);
            return null;
        }
    }

    function showPendingStep(order, message) {
        const msgEl = document.getElementById('checkoutPendingMessage');
        const hintEl = document.getElementById('checkoutPendingHint');
        if (msgEl) {
            msgEl.textContent = message || 'Your payment proof has been sent to the organizer for approval.';
        }
        if (hintEl) {
            hintEl.textContent = queueHasMore()
                ? 'Once you continue, you will pay the next event using that organizer\'s M-Pesa details.'
                : 'You will be notified when your ticket is issued. You can check status under My Tickets.';
        }
        updatePendingActions();
        showStep(4);
    }

    function advanceQueueAfterPayment(order, { completed = false } = {}) {
        removeEventFromCart(order.event_id);

        if (queueHasMore()) {
            checkoutQueueIndex += 1;
            closeCheckoutModal(false);
            setTimeout(() => processNextInQueue(), 400);
            return;
        }

        checkoutQueue = [];
        checkoutQueueIndex = 0;
        checkoutQueueBilling = null;
        sessionStorage.removeItem('selected_organizer');
        sessionStorage.removeItem('selected_items');
        sessionStorage.removeItem('selected_total');

        if (completed) {
            updateSuccessActions();
        } else {
            closeCheckoutModal();
            if (typeof window.backToCart === 'function') {
                window.backToCart();
            }
            showToast('All payments submitted for organizer approval.', 'success');
            window.dispatchEvent(new CustomEvent('checkout-queue-complete'));
        }
    }

    function handlePaymentComplete(order) {
        const booking = saveTicketToLocalStorage(order, null);
        if (booking) {
            showToast('Payment successful! Your ticket has been issued.', 'success');
        }
        window.dispatchEvent(new CustomEvent('checkout-completed', {
            detail: { order_id: order.id, event_id: order.event_id, booking },
        }));
        advanceQueueAfterPayment(order, { completed: true });
    }

    function handlePaymentSubmitted(order, message) {
        window.dispatchEvent(new CustomEvent('checkout-submitted', {
            detail: { order_id: order.id, event_id: order.event_id },
        }));
        if (queueHasMore()) {
            showToast('Payment submitted. Continuing to next event…', 'success');
            advanceQueueAfterPayment(order, { completed: false });
        } else {
            showPendingStep(order, message);
        }
    }

    function startStatusPolling(orderId, onComplete, onFail) {
        if (statusPollInterval) clearInterval(statusPollInterval);
        let attempts = 0;
        const maxAttempts = 60;

        statusPollInterval = setInterval(async () => {
            attempts++;
            try {
                const order = await checkOrderStatus(orderId);
                if (order.payment_status === 'approved' || order.status === 'completed') {
                    clearInterval(statusPollInterval);
                    statusPollInterval = null;
                    const ticket = order.tickets?.[0] || null;
                    saveTicketToLocalStorage(order, ticket);
                    onComplete(order);
                } else if (order.payment_status === 'rejected' || order.status === 'failed') {
                    clearInterval(statusPollInterval);
                    statusPollInterval = null;
                    onFail(order);
                }
                if (attempts >= maxAttempts) {
                    clearInterval(statusPollInterval);
                    statusPollInterval = null;
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 5000);
    }

    function openCheckoutModal(order) {
        currentOrder = order;
        const modal = getModal();
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const receiver = order.organizer_name || order.mpesa_display_name || 'Event Organizer';
        document.getElementById('checkoutReceiverName').textContent = receiver;
        document.getElementById('checkoutTotalAmount').textContent = `KES ${Number(order.total_amount).toLocaleString()}`;

        const eventTitleEl = document.getElementById('checkoutEventTitle');
        if (eventTitleEl) {
            eventTitleEl.textContent = order.event_title || checkoutQueue[checkoutQueueIndex]?.title || '';
        }

        const tierEl = document.getElementById('checkoutTierBadge');
        if (tierEl) {
            tierEl.textContent = order.ticket_type || 'Regular';
            tierEl.className = `checkout-tier-badge ticket-tier-${(order.ticket_type || 'regular').toLowerCase()}`;
        }

        const hintEl = document.getElementById('checkoutManualHint');
        if (hintEl) {
            hintEl.innerHTML = `Send <strong>KES ${Number(order.total_amount).toLocaleString()}</strong> to <strong>${escapeHtml(receiver)}</strong> using the details below, then tap <strong>I have paid</strong>.`;
        }

        updateQueueProgressUI(order);
        renderPaymentOptions(order);
        prefillCheckoutMpesaName();
        showStep(1);

        document.getElementById('checkoutStreamSteps').innerHTML = '';
        const fileInput = document.getElementById('checkoutScreenshot');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('checkoutScreenshotPreview');
        if (preview) preview.innerHTML = '';
    }

    function closeCheckoutModal(clearQueue = true) {
        if (statusPollInterval) clearInterval(statusPollInterval);
        statusPollInterval = null;
        const modal = getModal();
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        currentOrder = null;
        if (clearQueue) {
            checkoutQueue = [];
            checkoutQueueIndex = 0;
            checkoutQueueBilling = null;
        }
    }

    async function processNextInQueue() {
        if (!checkoutQueue.length || checkoutQueueIndex >= checkoutQueue.length) {
            showToast('All payments processed.', 'success');
            window.dispatchEvent(new CustomEvent('checkout-queue-complete'));
            return;
        }

        const item = checkoutQueue[checkoutQueueIndex];
        sessionStorage.setItem('selected_items', JSON.stringify([item]));
        sessionStorage.setItem('selected_organizer', item.organizer || item.organizer_name || '');

        try {
            const order = await createOrder(
                item.id,
                item.ticket_type || item.tier || 'regular',
                item.quantity || 1,
                checkoutQueueBilling?.mpesa_name || '',
            );
            openCheckoutModal(order);
        } catch (e) {
            showToast(e.message, 'error');
            closeCheckoutModal();
        }
    }

    async function startOrganizerCheckout(items, billingInfo) {
        const token = localStorage.getItem('attendee_access_token');
        if (!token) {
            showToast('Please login to book tickets', 'info');
            setTimeout(() => window.location.href = '/login/', 1500);
            return;
        }
        if (!items || !items.length) {
            showToast('No events selected for checkout', 'error');
            return;
        }

        checkoutQueue = items.slice();
        checkoutQueueIndex = 0;
        checkoutQueueBilling = billingInfo || {};
        sessionStorage.setItem('checkout_billing_info', JSON.stringify(checkoutQueueBilling));
        await processNextInQueue();
    }

    async function startCheckout(eventId, ticketType, quantity) {
        const token = localStorage.getItem('attendee_access_token');
        if (!token) {
            showToast('Please login to book tickets', 'info');
            setTimeout(() => window.location.href = '/login/', 1500);
            return;
        }
        try {
            checkoutQueue = [];
            checkoutQueueIndex = 0;
            const order = await createOrder(eventId, ticketType, quantity, getCheckoutMpesaName());
            openCheckoutModal(order);
        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('checkoutClose');
        if (closeBtn) closeBtn.addEventListener('click', () => closeCheckoutModal());

        const paidBtn = document.getElementById('checkoutPaidBtn');
        if (paidBtn) paidBtn.addEventListener('click', () => showStep(2));

        const fileInput = document.getElementById('checkoutScreenshot');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const preview = document.getElementById('checkoutScreenshotPreview');
                if (!preview) return;
                if (!file) { preview.innerHTML = ''; return; }
                const reader = new FileReader();
                reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="Preview">`; };
                reader.readAsDataURL(file);
            });
        }

        const verifyBtn = document.getElementById('checkoutVerifyBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', async () => {
                if (!currentOrder) return;
                const file = document.getElementById('checkoutScreenshot')?.files[0];
                const mpesaName = getCheckoutMpesaName();
                if (!mpesaName || mpesaName.length < 2) {
                    showToast('Enter your M-Pesa name as shown on the transaction', 'error');
                    return;
                }
                if (!file) { showToast('Upload screenshot first', 'error'); return; }
                showStep(3);
                document.getElementById('checkoutStreamSteps').innerHTML = '';
                verifyBtn.disabled = true;
                try {
                    const result = await verifyScreenshot(currentOrder.id, file, mpesaName);
                    if (result.step === 'completed') {
                        showStep(6);
                        updateSuccessActions();
                        handlePaymentComplete(currentOrder);
                    } else if (result.step === 'pending_approval') {
                        handlePaymentSubmitted(currentOrder, result.message);
                    } else {
                        startStatusPolling(
                            currentOrder.id,
                            (order) => {
                                showStep(6);
                                updateSuccessActions();
                                handlePaymentComplete(order);
                            },
                            () => showStep(5),
                        );
                        showPendingStep(currentOrder);
                    }
                } catch (e) {
                    document.getElementById('checkoutFailMessage').textContent = e.message;
                    showStep(5);
                } finally {
                    verifyBtn.disabled = false;
                }
            });
        }

        const retryBtn = document.getElementById('checkoutRetryBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            document.getElementById('checkoutScreenshot').value = '';
            document.getElementById('checkoutScreenshotPreview').innerHTML = '';
            showStep(2);
        });

        const manualBtn = document.getElementById('checkoutManualBtn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => {
                const box = document.getElementById('checkoutManualNameBox');
                if (box) box.style.display = 'block';
                prefillCheckoutMpesaName();
            });
        }

        const submitNameBtn = document.getElementById('checkoutSubmitNameBtn');
        if (submitNameBtn) {
            submitNameBtn.addEventListener('click', async () => {
                if (!currentOrder) return;
                const mpesaName = document.getElementById('checkoutMpesaName')?.value.trim();
                if (!mpesaName || mpesaName.length < 2) {
                    showToast('Enter your M-Pesa name as shown on the transaction', 'error');
                    return;
                }
                submitNameBtn.disabled = true;
                try {
                    await submitMpesaName(currentOrder.id, mpesaName);
                    handlePaymentSubmitted(currentOrder, 'Your M-Pesa name has been sent to the organizer for approval.');
                } catch (e) {
                    showToast(e.message || 'Could not submit M-Pesa name', 'error');
                } finally {
                    submitNameBtn.disabled = false;
                }
            });
        }

        const pendingNameBtn = document.getElementById('checkoutPendingNameBtn');
        if (pendingNameBtn) {
            pendingNameBtn.addEventListener('click', async () => {
                if (!currentOrder) return;
                const mpesaName = document.getElementById('checkoutPendingMpesaName')?.value.trim();
                if (!mpesaName || mpesaName.length < 2) {
                    showToast('Enter your M-Pesa name', 'error');
                    return;
                }
                pendingNameBtn.disabled = true;
                try {
                    await submitMpesaName(currentOrder.id, mpesaName);
                    showToast('M-Pesa name saved for organizer review', 'success');
                } catch (e) {
                    showToast(e.message || 'Could not save M-Pesa name', 'error');
                } finally {
                    pendingNameBtn.disabled = false;
                }
            });
        }

        const successClose = document.getElementById('checkoutSuccessCloseBtn');
        if (successClose) {
            successClose.addEventListener('click', () => {
                if (queueHasMore() && currentOrder) {
                    advanceQueueAfterPayment(currentOrder, { completed: true });
                } else {
                    closeCheckoutModal();
                    window.location.href = '/tickets/';
                }
            });
        }

        const pendingClose = document.getElementById('checkoutPendingCloseBtn');
        if (pendingClose) {
            pendingClose.addEventListener('click', () => {
                if (currentOrder) {
                    advanceQueueAfterPayment(currentOrder, { completed: false });
                } else {
                    closeCheckoutModal();
                }
            });
        }
    });

    window.CheckoutFlow = {
        startCheckout,
        startOrganizerCheckout,
        closeCheckoutModal,
        createOrder,
    };
})();
