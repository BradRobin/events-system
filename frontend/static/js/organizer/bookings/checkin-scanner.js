// ============================================
// ORGANIZER CHECK-IN SCANNER
// Handles: QR code scanning for event check-in
// ============================================

let scanner = null;
let currentEventId = null;
let scanHistory = [];
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        currentEventId = eventId;
        loadEventInfo();
        initializeScanner();
        loadScanHistory();
        setupManualCheckin();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/scanner/);
    return match ? match[1] : null;
}

async function loadEventInfo() {
    const event = await EventAPI.Organizer.getEventForEdit(currentEventId);
    if (event) {
        document.getElementById('eventTitle').innerText = event.title;
        document.getElementById('eventVenue').innerText = event.venue;
        document.getElementById('eventDate').innerText = new Date(event.start_date).toLocaleString();
    }
}

function initializeScanner() {
    const scannerElement = document.getElementById('qrScanner');
    if (!scannerElement || typeof Html5Qrcode === 'undefined') {
        console.warn('QR Scanner not available');
        document.getElementById('scannerFallback').style.display = 'block';
        return;
    }
    
    scanner = new Html5Qrcode("qrScanner");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    startScanner();
}

async function startScanner() {
    if (!scanner || isScanning) return;
    
    try {
        await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            onScanError
        );
        isScanning = true;
        document.getElementById('scannerStatus').innerHTML = '<span class="active"><i class="fas fa-camera"></i> Scanner Active</span>';
    } catch (err) {
        console.error('Scanner start error:', err);
        document.getElementById('scannerStatus').innerHTML = '<span class="error"><i class="fas fa-exclamation-triangle"></i> Camera access denied</span>';
    }
}

function stopScanner() {
    if (scanner && isScanning) {
        scanner.stop();
        isScanning = false;
        document.getElementById('scannerStatus').innerHTML = '<span><i class="fas fa-pause"></i> Scanner Stopped</span>';
    }
}

async function onScanSuccess(decodedText) {
    // Play beep sound
    playBeep();
    
    // Pause scanner briefly
    stopScanner();
    
    // Process the ticket
    await processTicket(decodedText);
    
    // Restart scanner after delay
    setTimeout(() => startScanner(), 2000);
}

function onScanError(error) {
    // Silent fail - scanner keeps looking
    console.debug('Scan error:', error);
}

async function processTicket(ticketCode) {
    showProcessing();
    
    // Check if already scanned recently
    const existingScan = scanHistory.find(s => s.ticket_code === ticketCode);
    if (existingScan && existingScan.timestamp > Date.now() - 60000) {
        showScanResult(existingScan, true);
        hideProcessing();
        return;
    }
    
    const result = await EventAPI.Organizer.checkinAttendee(currentEventId, ticketCode);
    
    if (result && result.success) {
        // Add to scan history
        scanHistory.unshift({
            ticket_code: ticketCode,
            attendee_name: result.attendee_name,
            ticket_type: result.ticket_type,
            timestamp: Date.now(),
            success: true
        });
        
        showScanResult(result, false);
        updateScanHistory();
        updateCheckinStats();
        
        // Play success sound
        playSuccessSound();
    } else {
        scanHistory.unshift({
            ticket_code: ticketCode,
            timestamp: Date.now(),
            success: false,
            error: result?.message || 'Invalid ticket'
        });
        
        showScanResult({ success: false, message: result?.message || 'Invalid ticket' }, false);
        updateScanHistory();
        
        // Play error sound
        playErrorSound();
    }
    
    hideProcessing();
}

function showScanResult(result, isDuplicate = false) {
    const container = document.getElementById('scanResult');
    const isSuccess = result.success !== false;
    
    container.style.display = 'block';
    container.className = `scan-result ${isSuccess ? 'success' : 'error'}`;
    
    if (isDuplicate) {
        container.innerHTML = `
            <div class="result-icon"><i class="fas fa-check-circle"></i></div>
            <div class="result-content">
                <h4>Already Checked In</h4>
                <p>${result.attendee_name} was already checked in at ${new Date(result.timestamp).toLocaleTimeString()}</p>
                <button onclick="closeScanResult()">Close</button>
            </div>
        `;
    } else if (isSuccess) {
        container.innerHTML = `
            <div class="result-icon"><i class="fas fa-check-circle"></i></div>
            <div class="result-content">
                <h4>Check-in Successful!</h4>
                <p><strong>${result.attendee_name}</strong></p>
                <p>Ticket: ${result.ticket_type}</p>
                <p>Time: ${new Date().toLocaleTimeString()}</p>
                <button onclick="closeScanResult()">Close</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="result-icon"><i class="fas fa-times-circle"></i></div>
            <div class="result-content">
                <h4>Check-in Failed</h4>
                <p>${result.message || 'Invalid or already used ticket'}</p>
                <button onclick="closeScanResult()">Try Again</button>
            </div>
        `;
    }
    
    // Auto-close after 3 seconds
    setTimeout(() => closeScanResult(), 3000);
}

function closeScanResult() {
    const container = document.getElementById('scanResult');
    container.style.display = 'none';
}

async function loadScanHistory() {
    // Load recent scans from API
    const stats = await EventAPI.Organizer.getCheckinStats(currentEventId);
    if (stats && stats.recent_checkins) {
        scanHistory = stats.recent_checkins;
        updateScanHistory();
    }
}

function updateScanHistory() {
    const container = document.getElementById('scanHistory');
    if (!scanHistory.length) {
        container.innerHTML = '<div class="no-history"><i class="fas fa-history"></i> No recent scans</div>';
        return;
    }
    
    container.innerHTML = scanHistory.slice(0, 10).map(scan => `
        <div class="history-item ${scan.success ? 'success' : 'error'}">
            <div class="history-time">${new Date(scan.timestamp).toLocaleTimeString()}</div>
            <div class="history-details">
                ${scan.success ? `
                    <strong>${scan.attendee_name}</strong>
                    <span>${scan.ticket_type}</span>
                ` : `
                    <span class="error-text">Failed: ${scan.error || 'Invalid ticket'}</span>
                `}
            </div>
            <div class="history-status">
                ${scan.success ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>'}
            </div>
        </div>
    `).join('');
}

async function updateCheckinStats() {
    const stats = await EventAPI.Organizer.getCheckinStats(currentEventId);
    if (stats) {
        document.getElementById('statTotalTickets').innerText = stats.total_tickets || 0;
        document.getElementById('statCheckedIn').innerText = stats.checked_in || 0;
        document.getElementById('statRemaining').innerText = stats.remaining || 0;
        document.getElementById('statCheckinRate').innerText = `${stats.checkin_rate || 0}%`;
        
        const progressFill = document.getElementById('checkinProgressFill');
        if (progressFill) progressFill.style.width = `${stats.checkin_rate || 0}%`;
    }
}

function setupManualCheckin() {
    const form = document.getElementById('manualCheckinForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = document.getElementById('manualBookingId').value;
            if (bookingId) {
                await processTicket(bookingId);
                document.getElementById('manualBookingId').value = '';
            }
        });
    }
}

function toggleScanner() {
    if (isScanning) {
        stopScanner();
    } else {
        startScanner();
    }
}

function playBeep() {
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play().catch(e => console.log('Audio play failed'));
}

function playSuccessSound() {
    const audio = new Audio('/static/sounds/success.mp3');
    audio.play().catch(e => console.log('Audio play failed'));
}

function playErrorSound() {
    const audio = new Audio('/static/sounds/error.mp3');
    audio.play().catch(e => console.log('Audio play failed'));
}

function showProcessing() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) overlay.style.display = 'none';
}
