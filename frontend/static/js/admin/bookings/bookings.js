// Bookings Management JavaScript
let currentPage = 1;
let totalPages = 1;
let currentBookingId = null;
let mrrTrendChart = null;

document.addEventListener('DOMContentLoaded', function() {
    initRevenueMonthFilter();
    loadBookings();
    loadStats();
    loadRevenueMetrics();
    setupEventListeners();
});

function initRevenueMonthFilter() {
    const input = document.getElementById('revenueMonthFilter');
    if (!input) return;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    input.value = `${now.getFullYear()}-${month}`;
    input.max = input.value;
    input.addEventListener('change', loadRevenueMetrics);
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchBookings');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadBookings();
            }, 500);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            loadBookings();
        });
    }
    
    const paymentFilter = document.getElementById('paymentFilter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', () => {
            currentPage = 1;
            loadBookings();
        });
    }
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', () => { currentPage = 1; loadBookings(); });
    if (dateTo) dateTo.addEventListener('change', () => { currentPage = 1; loadBookings(); });
}

async function loadStats() {
    try {
        const data = await apiRequest('/api/admin/bookings/stats/');
        document.getElementById('totalBookings').textContent = data.stats?.total || 0;
        document.getElementById('totalRevenue').textContent = formatCurrency(data.stats?.total_revenue || 0);
        document.getElementById('pendingRefunds').textContent = data.stats?.pending_refunds || 0;
        document.getElementById('confirmedBookings').textContent = data.stats?.confirmed || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRevenueMetrics() {
    const monthInput = document.getElementById('revenueMonthFilter');
    const month = monthInput?.value || '';
    try {
        const params = new URLSearchParams({ month, series_months: '12' });
        const data = await apiRequest(`/api/admin/bookings/revenue-metrics/?${params}`);
        if (!data.metrics) return;

        const m = data.metrics;
        const period = data.period || {};

        const periodLabel = document.getElementById('revenuePeriodLabel');
        if (periodLabel) {
            periodLabel.textContent = `Platform fee revenue for ${period.label || 'selected month'}`;
        }

        setText('monthlyGrossRevenue', formatCurrency(m.gross_revenue || 0));
        setText('mrrValue', formatCurrency(m.mrr || 0));
        setText('arrValue', formatCurrency(m.arr || 0));
        setText('lifetimeRevenue', formatCurrency(m.total_revenue_lifetime || 0));

        const feeLabel = document.getElementById('platformFeeLabel');
        if (feeLabel) {
            feeLabel.textContent = `Platform fee: ${m.platform_fee_rate_pct || 5}% of gross ticket sales`;
        }

        const bookingsLabel = document.getElementById('monthlyBookingsLabel');
        if (bookingsLabel) {
            bookingsLabel.textContent = `${m.booking_count || 0} bookings · ${m.ticket_count || 0} tickets this month`;
        }

        const trendEl = document.getElementById('mrrTrend');
        if (trendEl && data.comparison) {
            const pct = data.comparison.mrr_growth_pct;
            const prev = data.comparison.previous_month_label;
            if (pct > 0) {
                trendEl.className = 'stat-trend up';
                trendEl.textContent = `↑ ${pct}% vs ${prev}`;
            } else if (pct < 0) {
                trendEl.className = 'stat-trend down';
                trendEl.textContent = `↓ ${Math.abs(pct)}% vs ${prev}`;
            } else {
                trendEl.className = 'stat-trend neutral';
                trendEl.textContent = `Flat vs ${prev}`;
            }
        }

        if (data.monthly_series) {
            renderMrrChart(data.monthly_series);
        }
    } catch (error) {
        console.error('Error loading revenue metrics:', error);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderMrrChart(series) {
    const canvas = document.getElementById('mrrTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = series.map(row => {
        const d = new Date(row.year, row.month - 1, 1);
        return d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
    });
    const mrrData = series.map(row => row.mrr || 0);

    if (mrrTrendChart) mrrTrendChart.destroy();

    mrrTrendChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'MRR (platform fees)',
                    data: mrrData,
                    backgroundColor: 'rgba(245, 158, 11, 0.75)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            return `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`;
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return `Kes ${Number(value).toLocaleString('en-KE')}`;
                        },
                    },
                },
            },
        },
    });
}

async function loadBookings() {
    const search = document.getElementById('searchBookings')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const payment = document.getElementById('paymentFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    Loader.show('Loading bookings...');
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: search,
            status: status,
            payment_method: payment,
            date_from: dateFrom,
            date_to: dateTo
        });
        const data = await apiRequest(`/api/admin/bookings/?${params}`);
        
        displayBookings(data.bookings);
        
        if (data.pagination) {
            totalPages = data.pagination.total_pages;
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookingsList').innerHTML = 
            '<tr><td colspan="10" class="text-center">Failed to load bookings</td></tr>';
    } finally {
        Loader.hide();
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsList');
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No bookings found</td></tr>';
        document.getElementById('recordsCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td><strong>${escapeHtml(booking.id)}</strong></td>
            <td>
                <strong>${escapeHtml(booking.customer_name)}</strong><br>
                <small>${escapeHtml(booking.customer_email)}</small>
            </td>
            <td>${escapeHtml(booking.event_title)}</td>
            <td>${formatDate(booking.event_date)}</td>
            <td>${booking.quantity || 1}</td>
            <td><strong>${formatCurrency(booking.total)}</strong></td>
            <td>${getPaymentMethodBadge(booking.payment_method)}</td>
            <td>${getStatusBadge(booking.status)}</td>
            <td>${formatDate(booking.created_at)}</td>
            <td class="action-buttons">
                <button class="action-btn view" onclick="viewBooking('${booking.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${booking.status === 'confirmed' ? `
                    <button class="action-btn refund" onclick="openRefundModal('${booking.id}')" title="Process Refund">
                        <i class="fas fa-undo-alt"></i>
                    </button>
                ` : ''}
                ${booking.status === 'pending' ? `
                    <button class="action-btn cancel" onclick="openCancelModal('${booking.id}')" title="Cancel Booking">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    document.getElementById('recordsCount').textContent = `Showing ${bookings.length} records`;
}

async function viewBooking(bookingId) {
    try {
        const data = await apiRequest(`/api/admin/bookings/${bookingId}/`);
        const booking = data.booking;
        alert(
            `Booking: ${booking.id}\n` +
            `Customer: ${booking.customer_name}\n` +
            `Event: ${booking.event_title}\n` +
            `Amount: Kes ${booking.total}\n` +
            `Status: ${booking.status}`
        );
    } catch (error) {
        showToast('Failed to load booking details', 'error');
    }
}

function openRefundModal(bookingId) {
    currentBookingId = bookingId;
    // Fetch booking details and show modal
    fetchBookingDetails(bookingId);
}

async function fetchBookingDetails(bookingId) {
    try {
        const data = await apiRequest(`/api/admin/bookings/${bookingId}/`);
        const booking = data.booking;
        
        document.getElementById('refundInfo').innerHTML = `
            <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
            <p><strong>Customer:</strong> ${escapeHtml(booking.customer_name)}</p>
            <p><strong>Event:</strong> ${escapeHtml(booking.event_title)}</p>
            <p><strong>Amount:</strong> ${formatCurrency(booking.total)}</p>
            <p><strong>Payment Method:</strong> ${booking.payment_method || 'N/A'}</p>
        `;
        document.getElementById('refundModal').style.display = 'flex';
    } catch (error) {
        showToast('Failed to load booking details', 'error');
    }
}

async function confirmRefund() {
    const reason = document.getElementById('refundReason')?.value;
    const notes = document.getElementById('adminNotes')?.value;
    
    if (!reason) {
        showToast('Please provide a refund reason', 'error');
        return;
    }
    
    Loader.show('Processing refund...');
    
    try {
        await apiRequest(`/api/admin/bookings/${currentBookingId}/refund/`, 'POST', {
            reason: reason,
            notes: notes
        });
        showToast('Refund processed successfully', 'success');
        closeRefundModal();
        loadBookings();
        loadStats();
    } catch (error) {
        showToast('Failed to process refund', 'error');
    } finally {
        Loader.hide();
    }
}

function openCancelModal(bookingId) {
    currentBookingId = bookingId;
    document.getElementById('cancelModal').style.display = 'flex';
}

async function confirmCancel() {
    const reason = document.getElementById('cancelReason')?.value;
    
    Loader.show('Cancelling booking...');
    
    try {
        await apiRequest(`/api/admin/bookings/${currentBookingId}/cancel/`, 'POST', {
            reason: reason || 'Cancelled by admin'
        });
        showToast('Booking cancelled successfully', 'success');
        closeCancelModal();
        loadBookings();
        loadStats();
    } catch (error) {
        showToast('Failed to cancel booking', 'error');
    } finally {
        Loader.hide();
    }
}

function closeRefundModal() {
    document.getElementById('refundModal').style.display = 'none';
    document.getElementById('refundReason').value = '';
    document.getElementById('adminNotes').value = '';
    currentBookingId = null;
}

function closeCancelModal() {
    document.getElementById('cancelModal').style.display = 'none';
    document.getElementById('cancelReason').value = '';
    currentBookingId = null;
}

function applyFilters() {
    currentPage = 1;
    loadBookings();
}

function resetFilters() {
    document.getElementById('searchBookings').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('paymentFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentPage = 1;
    loadBookings();
}

function exportBookings() {
    const params = new URLSearchParams({
        search: document.getElementById('searchBookings')?.value || '',
        status: document.getElementById('statusFilter')?.value || '',
        payment_method: document.getElementById('paymentFilter')?.value || '',
        date_from: document.getElementById('dateFrom')?.value || '',
        date_to: document.getElementById('dateTo')?.value || ''
    });
    window.open(`/api/admin/bookings/export/?${params}`, '_blank');
    showToast('Export started', 'success');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${current === 1 ? 'disabled' : ''} onclick="changePage(${current - 1})">&laquo;</button>`;
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `<button ${current === total ? 'disabled' : ''} onclick="changePage(${current + 1})">&raquo;</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadBookings();
    }
}

function getStatusBadge(status) {
    const badges = {
        'confirmed': '<span class="status-badge status-confirmed"><i class="fas fa-check-circle"></i> Confirmed</span>',
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
        'cancelled': '<span class="status-badge status-cancelled"><i class="fas fa-times-circle"></i> Cancelled</span>',
        'refunded': '<span class="status-badge status-refunded"><i class="fas fa-undo-alt"></i> Refunded</span>',
        'attended': '<span class="status-badge status-completed"><i class="fas fa-check-double"></i> Attended</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getPaymentMethodBadge(method) {
    const methods = {
        'mpesa': '<span class="payment-method method-mpesa"><i class="fas fa-mobile-alt"></i> M-Pesa</span>',
        'card': '<span class="payment-method method-card"><i class="fas fa-credit-card"></i> Card</span>',
        'bank': '<span class="payment-method method-bank"><i class="fas fa-university"></i> Bank</span>'
    };
    return methods[method] || `<span class="payment-method">${method || 'N/A'}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatCurrency(amount) {
    return `Kes ${Number(amount).toLocaleString('en-KE')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.viewBooking = viewBooking;
window.openRefundModal = openRefundModal;
window.confirmRefund = confirmRefund;
window.closeRefundModal = closeRefundModal;
window.openCancelModal = openCancelModal;
window.confirmCancel = confirmCancel;
window.closeCancelModal = closeCancelModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportBookings = exportBookings;
window.changePage = changePage;