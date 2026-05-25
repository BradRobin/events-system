// QR Scanner JavaScript
let html5QrCode = null;
let isScanning = false;
let currentEventId = null;
let currentEventStats = null;

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    setupEventListeners();
});

function setupEventListeners() {
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startScanner);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopScanner);
    }
}

async function loadEvents() {
    try {
        const data = await apiRequest('/api/admin/events/upcoming/');
        const select = document.getElementById('eventSelect');
        
        if (select && data.events) {
            select.innerHTML = '<option value="">Select Event</option>' + 
                data.events.map(e => `<option value="${e.id}">${escapeHtml(e.title)} (${formatDate(e.date)})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('Failed to load events', 'error');
    }
}

async function loadEventStats() {
    const eventId = document.getElementById('eventSelect').value;
    currentEventId = eventId;
    
    if (!eventId) {
        document.getElementById('statsSummary').style.display = 'none';
        return;
    }
    
    try {
        const data = await apiRequest(`/api/admin/events/${eventId}/stats/`);
        currentEventStats = data.stats;
        
        document.getElementById('totalTickets').textContent = data.stats.total_tickets || 0;
        document.getElementById('checkedInCount').textContent = data.stats.checked_in || 0;
        document.getElementById('remainingCount').textContent = data.stats.remaining || 0;
        
        const rate = data.stats.total_tickets > 0 
            ? ((data.stats.checked_in / data.stats.total_tickets) * 100).toFixed(1)
            : 0;
        document.getElementById('checkinRate').textContent = `${rate}%`;
        
        document.getElementById('statsSummary').style.display = 'block';
        
        // Load recent check-ins
        loadRecentCheckins(eventId);
    } catch (error) {
        console.error('Error loading event stats:', error);
        showToast('Failed to load event statistics', 'error');
    }
}

async function loadRecentCheckins(eventId) {
    try {
        const data = await apiRequest(`/api/admin/events/${eventId}/recent-checkins/`);
        const container = document.getElementById('recentCheckins');
        
        if (data.checkins && data.checkins.length > 0) {
            container.innerHTML = data.checkins.map(checkin => `
                <div class="checkin-item">
                    <div class="checkin-info">
                        <h4>${escapeHtml(checkin.attendee_name)}</h4>
                        <p>
                            <span>Ticket: ${checkin.ticket_number}</span>
                            <span class="checkin-badge checked">Checked In</span>
                        </p>
                    </div>
                    <div class="checkin-time">${formatTime(checkin.checkin_time)}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No check-ins yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent check-ins:', error);
    }
}

async function startScanner() {
    if (!currentEventId) {
        showToast('Please select an event first', 'warning');
        return;
    }
    
    const scannerViewport = document.getElementById('scannerViewport');
    
    html5QrCode = new Html5Qrcode("scannerViewport");
    
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        processScannedTicket(decodedText);
    };
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback
        );
        
        isScanning = true;
        document.getElementById('startScannerBtn').style.display = 'none';
        document.getElementById('stopScannerBtn').style.display = 'inline-flex';
        showToast('Scanner started. Point camera at QR code.', 'success');
    } catch (error) {
        console.error('Error starting scanner:', error);
        showToast('Failed to start camera. Please check permissions.', 'error');
    }
}

function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            document.getElementById('startScannerBtn').style.display = 'inline-flex';
            document.getElementById('stopScannerBtn').style.display = 'none';
            showToast('Scanner stopped.', 'info');
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
}

async function processScannedTicket(ticketNumber) {
    // Stop scanner while processing
    if (isScanning) {
        stopScanner();
    }
    
    Loader.show('Verifying ticket...');
    
    try {
        const data = await apiRequest(`/api/admin/tickets/${ticketNumber}/verify/`, 'POST', {
            event_id: currentEventId
        });
        
        if (data.success) {
            showScanResult('success', 'Check-in Successful!', data.message, data.ticket);
            loadEventStats();
            loadRecentCheckins(currentEventId);
        } else {
            showScanResult('error', 'Check-in Failed', data.message, null);
        }
    } catch (error) {
        console.error('Error processing ticket:', error);
        showScanResult('error', 'Error', 'Failed to verify ticket. Please try again.', null);
    } finally {
        Loader.hide();
    }
}

async function manualCheckIn() {
    const ticketNumber = document.getElementById('manualTicketCode').value.trim();
    
    if (!ticketNumber) {
        showToast('Please enter a ticket number', 'warning');
        return;
    }
    
    if (!currentEventId) {
        showToast('Please select an event first', 'warning');
        return;
    }
    
    Loader.show('Processing manual check-in...');
    
    try {
        const data = await apiRequest(`/api/admin/tickets/${ticketNumber}/verify/`, 'POST', {
            event_id: currentEventId
        });
        
        if (data.success) {
            showScanResult('success', 'Check-in Successful!', data.message, data.ticket);
            document.getElementById('manualTicketCode').value = '';
            loadEventStats();
            loadRecentCheckins(currentEventId);
        } else {
            showScanResult('error', 'Check-in Failed', data.message, null);
        }
    } catch (error) {
        console.error('Error processing manual check-in:', error);
        showScanResult('error', 'Error', 'Failed to verify ticket. Please try again.', null);
    } finally {
        Loader.hide();
    }
}

function showScanResult(type, title, message, ticket) {
    const modal = document.getElementById('scanResultModal');
    const content = document.getElementById('scanResultContent');
    const icon = document.getElementById('scanIcon');
    const titleEl = document.getElementById('scanTitle');
    const messageEl = document.getElementById('scanMessage');
    const ticketDetails = document.getElementById('ticketDetails');
    
    // Reset classes
    content.className = 'scan-result-content';
    content.classList.add(type);
    
    // Set icon
    if (type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon.innerHTML = '<i class="fas fa-times-circle"></i>';
    } else {
        icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Show ticket details if available
    if (ticket && type === 'success') {
        ticketDetails.style.display = 'block';
        ticketDetails.innerHTML = `
            <p><strong>Attendee:</strong> ${escapeHtml(ticket.attendee_name)}</p>
            <p><strong>Ticket Number:</strong> ${escapeHtml(ticket.ticket_number)}</p>
            <p><strong>Event:</strong> ${escapeHtml(ticket.event_title)}</p>
            <p><strong>Checked In:</strong> ${formatDateTime(new Date())}</p>
        `;
    } else {
        ticketDetails.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    
    // Auto close after 3 seconds on success
    if (type === 'success') {
        setTimeout(() => {
            closeScanResult();
            if (isScanning) {
                startScanner();
            }
        }, 3000);
    }
}

function closeScanResult() {
    document.getElementById('scanResultModal').style.display = 'none';
    
    // Restart scanner if it was scanning
    if (!isScanning && document.getElementById('startScannerBtn').style.display === 'none') {
        startScanner();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.loadEventStats = loadEventStats;
window.manualCheckIn = manualCheckIn;
window.closeScanResult = closeScanResult;