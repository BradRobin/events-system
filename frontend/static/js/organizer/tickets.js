// frontend/static/js/organizer/tickets.js
let ticketPage = 1, stream = null, scanInterval = null;

function isCheckedIn(status) {
    return status === 'checked_in' || status === 'used';
}

async function loadTicketStats() {
    try {
        const eventId = document.getElementById('eventFilter')?.value || null;
        const stats = await OrganizerAPI.tickets.getStats(eventId || null);
        document.getElementById('totalTickets').innerText = stats.total_tickets || 0;
        document.getElementById('checkedInTickets').innerText = stats.checked_in || 0;
        const rate = stats.total_tickets ? ((stats.checked_in / stats.total_tickets) * 100).toFixed(1) : 0;
        document.getElementById('checkinRate').innerText = rate + '%';
        document.getElementById('recentCheckins').innerText = stats.recent_checkins || 0;
    } catch(e) { console.error(e); }
}

async function loadTickets() {
    try {
        const filters = {};
        const eventId = document.getElementById('eventFilter').value;
        if (eventId) filters.event_id = eventId;
        const data = await OrganizerAPI.tickets.getAll(ticketPage, 20, filters);
        const tbody = document.getElementById('ticketsTableBody');
        const rows = data.results || [];
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5">No tickets found</td></tr>'; return; }
        tbody.innerHTML = rows.map(t => {
            const checkedIn = isCheckedIn(t.status);
            return `
            <tr>
                <td><code>${escapeHtml(t.ticket_number)}</code></td>
                <td>${escapeHtml(t.event_title)}</td>
                <td>${escapeHtml(t.attendee_name || t.customer_name || 'Guest')}</td>
                <td><span class="status-badge ${checkedIn ? 'used' : 'valid'}">${checkedIn ? 'Checked In' : 'Valid'}</span></td>
                <td>${!checkedIn && t.status !== 'cancelled' ? `<button class="btn btn-sm btn-success checkin-btn" data-ticket="${t.ticket_number}">Check In</button>` : (checkedIn ? 'Completed' : 'Cancelled')}</td>
            </tr>
        `;
        }).join('');
        if (typeof renderPagination === 'function' && data.total_pages > 1) {
            renderPagination(data, ticketPage, (p) => { ticketPage = p; loadTickets(); }, 'ticketsPagination');
        }
        attachCheckinEvents();
    } catch(e) { console.error(e); }
}

async function verifyTicket(ticketNumber) {
    try {
        const result = await OrganizerAPI.tickets.verify(ticketNumber);
        const div = document.getElementById('scanResult');
        const ticket = result.ticket || {};
        const name = ticket.customer_name || ticket.attendee_name || 'Guest';
        if (result.success) {
            div.innerHTML = `<div class="alert alert-success">✓ Valid: ${escapeHtml(name)}</div>`;
            await checkinTicket(ticketNumber, true);
        } else {
            div.innerHTML = `<div class="alert alert-danger">✗ ${escapeHtml(result.message || 'Invalid ticket')}</div>`;
        }
    } catch(e) { document.getElementById('scanResult').innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`; }
}

async function checkinTicket(ticketNumber, refresh = false) {
    try {
        const result = await OrganizerAPI.tickets.checkin(ticketNumber);
        const name = result.ticket?.customer_name || result.attendee_name || 'Attendee';
        if (window.showToast) window.showToast(`Checked in: ${name}`, 'success');
        if (refresh) { loadTickets(); loadTicketStats(); }
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function loadEventsForFilter() {
    try {
        const events = await OrganizerAPI.events.getAll(1, 100);
        const list = events.results || [];
        const filter = document.getElementById('eventFilter');
        filter.innerHTML = '<option value="">All Events</option>' + list.map(e => `<option value="${e.id}">${escapeHtml(e.title || e.name)}</option>`).join('');
    } catch(e) { console.error(e); }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
        stream = s;
        const video = document.getElementById('cameraPreview');
        video.srcObject = s;
        document.getElementById('startScannerBtn').style.display = 'none';
        document.getElementById('stopScannerBtn').style.display = 'inline-block';
        startQRScanning();
    }).catch(() => alert('Camera access denied'));
}

function stopCamera() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); document.getElementById('cameraPreview').srcObject = null; }
    document.getElementById('startScannerBtn').style.display = 'inline-block';
    document.getElementById('stopScannerBtn').style.display = 'none';
}

function startQRScanning() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (scanInterval) clearInterval(scanInterval);
    scanInterval = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);
            if (code) verifyTicket(code.data);
        }
    }, 500);
}

function attachCheckinEvents() {
    document.querySelectorAll('.checkin-btn').forEach(btn => btn.addEventListener('click', () => checkinTicket(btn.dataset.ticket, true)));
}

document.getElementById('verifyBtn')?.addEventListener('click', () => {
    const tn = document.getElementById('ticketNumberInput').value.trim();
    if (tn) verifyTicket(tn);
});
document.getElementById('startScannerBtn')?.addEventListener('click', startCamera);
document.getElementById('stopScannerBtn')?.addEventListener('click', stopCamera);
document.getElementById('exportBtn')?.addEventListener('click', () => {
    if (window.showToast) window.showToast('Export is not available yet.', 'info');
});
document.getElementById('eventFilter')?.addEventListener('change', () => { ticketPage = 1; loadTickets(); loadTicketStats(); });

document.addEventListener('DOMContentLoaded', () => { loadTicketStats(); loadTickets(); loadEventsForFilter(); });
