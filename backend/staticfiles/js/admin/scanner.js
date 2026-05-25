let html5QrCode = null;
let currentEvent = null;

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    document.getElementById('scannerEventSelect')?.addEventListener('change', function() {
        currentEvent = this.value;
        loadCheckinStats();
    });
    document.getElementById('manualTicketCode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') verifyTicket();
    });
});

async function loadEvents() {
    try {
        const data = await apiRequest('/api/admin/events/list/');
        const select = document.getElementById('scannerEventSelect');
        if (data.events) {
            select.innerHTML = '<option value="">Select Event</option>' + 
                data.events.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadCheckinStats() {
    if (!currentEvent) return;
    try {
        const data = await apiRequest(`/api/admin/events/${currentEvent}/checkin-stats/`);
        document.getElementById('checkedInCount').textContent = data.checked_in || 0;
        document.getElementById('remainingCount').textContent = data.remaining || 0;
    } catch (error) {
        console.error(error);
    }
}

function startScanner() {
    if (!currentEvent) {
        showToast('Select an event first', 'error');
        return;
    }
    if (html5QrCode) {
        html5QrCode.stop().then(() => startScannerInstance()).catch(() => startScannerInstance());
    } else {
        startScannerInstance();
    }
}

function startScannerInstance() {
    html5QrCode = new Html5Qrcode("scannerViewport");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => { verifyTicket(decodedText); stopScanner(); },
        (error) => {}
    ).catch(err => showToast('Camera access failed', 'error'));
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().catch(console.error);
        html5QrCode = null;
    }
}

async function verifyTicket(code = null) {
    const ticketCode = code || document.getElementById('manualTicketCode').value;
    if (!ticketCode) return;
    if (!currentEvent) {
        showToast('Select an event first', 'error');
        return;
    }
    try {
        const data = await apiRequest('/api/admin/tickets/verify/', 'POST', {
            ticket_code: ticketCode,
            event_id: currentEvent
        });
        if (data.valid) {
            await apiRequest('/api/admin/tickets/checkin/', 'POST', {
                ticket_code: ticketCode,
                event_id: currentEvent
            });
            showScanResult('✓ Ticket checked in successfully!', 'success');
            loadCheckinStats();
            document.getElementById('manualTicketCode').value = '';
        } else {
            showScanResult(data.message || 'Invalid ticket', 'error');
        }
    } catch (error) {
        showScanResult(error.message || 'Verification failed', 'error');
    }
}

function showScanResult(message, type) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.className = `scan-result ${type}`;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
    setTimeout(() => { resultDiv.style.display = 'none'; }, 3000);
}
