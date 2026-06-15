/**
 * M-Pesa Checkout - Works with both MOCK and REAL API
 * Handles: Order creation, screenshot upload, verification polling, ticket saving
 * Each event appears ONCE with quantity badge, max 8 tickets
 */

(function() {
    'use strict';

    let currentOrder = null;
    let statusPollInterval = null;
    let isMockMode = window.ATTENDEE_API_CONFIG?.USE_MOCK === true;

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

    async function createOrder(eventId, ticketType, quantity) {
        // Enforce max 8 tickets per booking
        const maxQuantity = Math.min(quantity, 8);
        if (quantity > 8) {
            showToast('Maximum 8 tickets per booking. Reducing to 8.', 'warning');
        }
        
        const response = await fetch('/api/attendee/payment-orders/create/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ event_id: eventId, ticket_type: ticketType, quantity: maxQuantity }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Checkout failed');
        return data.order;
    }

    async function checkOrderStatus(orderId) {
        const response = await fetch(`/api/attendee/payment-orders/${orderId}/status/`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to check status');
        return data.order;
    }

    async function verifyScreenshot(orderId, file) {
        const formData = new FormData();
        formData.append('screenshot', file);
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
                if (payload.step === 'failed') {
                    throw new Error(payload.message);
                }
            }
        }
        return { step: 'pending' };
    }

    // Save ticket to localStorage - ONE card per event with quantity
    function saveTicketToLocalStorage(order, ticketData) {
        try {
            let bookings = JSON.parse(localStorage.getItem('eventhub_bookings') || '[]');
            let selectedItems = JSON.parse(sessionStorage.getItem('selected_items') || '[]');
            let billingInfo = JSON.parse(sessionStorage.getItem('checkout_billing_info') || '{}');
            let selectedOrganizer = sessionStorage.getItem('selected_organizer') || order.organizer_name;
            
            if (selectedItems.length === 0) {
                const cartData = JSON.parse(localStorage.getItem('eventhub_cart') || '{}');
                selectedItems = cartData.items || [];
            }
            
            // Group items by event ID to combine quantities
            const groupedItems = {};
            for (const item of selectedItems) {
                if (groupedItems[item.id]) {
                    groupedItems[item.id].quantity += item.quantity;
                    // Ensure max 8
                    if (groupedItems[item.id].quantity > 8) groupedItems[item.id].quantity = 8;
                } else {
                    groupedItems[item.id] = { ...item, quantity: Math.min(item.quantity, 8) };
                }
            }
            
            const finalItems = Object.values(groupedItems);
            let subtotal = finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let total = order.total_amount || subtotal;
            const receiptNumber = order.receipt_number || ('MPESA' + Date.now().toString().slice(-8));
            const bookingId = order.booking_id || ('BK' + Date.now());
            
            const formattedItems = finalItems.map(item => {
                // Generate single ticket code for the booking
                const ticketCode = `TKT${Date.now()}${Math.floor(Math.random() * 10000)}`;
                return {
                    id: item.id,
                    title: item.title,
                    category: item.category || 'Event',
                    date: item.date,
                    location: item.location,
                    price: item.price,
                    quantity: Math.min(item.quantity, 8), // Max 8 per booking
                    image: item.image,
                    ticket_code: ticketCode,
                    ticket_codes: [ticketCode],
                    ticket_type: item.ticket_type || 'regular',
                    organizer: item.organizer || selectedOrganizer
                };
            });
            
            const booking = {
                id: bookingId,
                booking_date: new Date().toISOString(),
                status: 'confirmed',
                payment_method: 'M-Pesa',
                receipt_number: receiptNumber,
                total_amount: total,
                subtotal: subtotal,
                discount: 0,
                organizer: selectedOrganizer,
                billing_info: billingInfo,
                items: formattedItems,
                payment_status: 'completed',
                payment_date: new Date().toISOString()
            };
            
            // Remove any existing booking with same ID to avoid duplicates
            bookings = bookings.filter(b => b.id !== bookingId);
            bookings.unshift(booking);
            localStorage.setItem('eventhub_bookings', JSON.stringify(bookings));
            
            console.log('Ticket saved to localStorage:', booking);
            return booking;
        } catch (error) {
            console.error('Error saving ticket:', error);
            return null;
        }
    }

    function handlePaymentComplete(order) {
        console.log('Payment completed, saving tickets...');
        const booking = saveTicketToLocalStorage(order, null);
        
        if (booking) {
            showToast('Payment successful! Your tickets have been issued.', 'success');
        }
        
        sessionStorage.removeItem('selected_organizer');
        sessionStorage.removeItem('selected_items');
        sessionStorage.removeItem('selected_total');
        sessionStorage.removeItem('checkout_billing_info');
        
        const selectedItems = JSON.parse(sessionStorage.getItem('selected_items') || '[]');
        if (selectedItems.length > 0 && window.cartData) {
            const purchasedIds = selectedItems.map(item => item.id);
            window.cartData.items = window.cartData.items.filter(item => !purchasedIds.includes(item.id));
            
            if (window.cartData.items.length === 0) {
                localStorage.removeItem('eventhub_cart');
                localStorage.removeItem('eventhub_cart_mock');
            } else {
                window.cartData.subtotal = window.cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                window.cartData.total = window.cartData.subtotal - (window.cartData.discount_amount || 0);
                localStorage.setItem('eventhub_cart', JSON.stringify(window.cartData));
                localStorage.setItem('eventhub_cart_mock', JSON.stringify(window.cartData));
            }
            
            if (typeof window.displayCart === 'function') {
                window.displayCart();
            }
        }
        
        window.dispatchEvent(new CustomEvent('cart-updated'));
        window.dispatchEvent(new CustomEvent('storage'));
        window.dispatchEvent(new CustomEvent('checkout-completed', { 
            detail: { order_id: order.id, event_id: order.event_id, booking: booking } 
        }));
    }

    function startStatusPolling(orderId, onComplete, onFail) {
        if (statusPollInterval) clearInterval(statusPollInterval);
        let attempts = 0;
        const maxAttempts = 60;
        
        statusPollInterval = setInterval(async () => {
            attempts++;
            try {
                const order = await checkOrderStatus(orderId);
                console.log('[Checkout] Status check:', order.payment_status, order.status);
                
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
                    onFail({ message: 'Verification timeout. Please contact organizer.' });
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

        document.getElementById('checkoutReceiverName').textContent = order.organizer_name || 'Event Organizer';
        document.getElementById('checkoutTotalAmount').textContent = `KES ${Number(order.total_amount).toLocaleString()}`;
        const tierEl = document.getElementById('checkoutTierBadge');
        if (tierEl) {
            tierEl.textContent = order.ticket_type || 'Regular';
            tierEl.className = `checkout-tier-badge ticket-tier-${(order.ticket_type || 'regular').toLowerCase()}`;
        }

        renderPaymentOptions(order);
        showStep(1);
        
        document.getElementById('checkoutStreamSteps').innerHTML = '';
        const fileInput = document.getElementById('checkoutScreenshot');
        if (fileInput) fileInput.value = '';
        document.getElementById('checkoutScreenshotPreview').innerHTML = '';
    }

    function closeCheckoutModal() {
        if (statusPollInterval) clearInterval(statusPollInterval);
        const modal = getModal();
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        currentOrder = null;
    }

    async function startCheckout(eventId, ticketType, quantity) {
        const token = localStorage.getItem('attendee_access_token');
        if (!token) {
            showToast('Please login to book tickets', 'info');
            setTimeout(() => window.location.href = '/login/', 1500);
            return;
        }
        try {
            const selectedItems = JSON.parse(sessionStorage.getItem('selected_items') || '[]');
            const billingInfo = JSON.parse(sessionStorage.getItem('checkout_billing_info') || '{}');
            localStorage.setItem('temp_checkout_items', JSON.stringify(selectedItems));
            localStorage.setItem('temp_checkout_billing', JSON.stringify(billingInfo));
            
            const order = await createOrder(eventId, ticketType, quantity);
            openCheckoutModal(order);
        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('checkoutClose');
        if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);

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
                if (!file) { showToast('Upload screenshot first', 'error'); return; }
                showStep(3);
                document.getElementById('checkoutStreamSteps').innerHTML = '';
                verifyBtn.disabled = true;
                try {
                    const result = await verifyScreenshot(currentOrder.id, file);
                    if (result.step === 'completed') {
                        showStep(6);
                        handlePaymentComplete(currentOrder);
                        window.dispatchEvent(new CustomEvent('checkout-completed', { 
                            detail: { order_id: currentOrder.id, event_id: currentOrder.event_id } 
                        }));
                    } else {
                        startStatusPolling(currentOrder.id, 
                            (order) => {
                                showStep(6);
                                handlePaymentComplete(order);
                                window.dispatchEvent(new CustomEvent('checkout-completed', { 
                                    detail: { order_id: order.id, event_id: order.event_id } 
                                }));
                            },
                            (order) => {
                                showStep(5);
                            }
                        );
                        showStep(4);
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

        const successClose = document.getElementById('checkoutSuccessCloseBtn');
        if (successClose) successClose.addEventListener('click', () => {
            closeCheckoutModal();
            window.location.href = '/tickets/';
        });

        const pendingClose = document.getElementById('checkoutPendingCloseBtn');
        if (pendingClose) pendingClose.addEventListener('click', closeCheckoutModal);
        
        const cancelBtn = document.getElementById('checkoutCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeCheckoutModal);
    });

    window.CheckoutFlow = { startCheckout, closeCheckoutModal, createOrder };
})();