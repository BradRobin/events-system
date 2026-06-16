(function () {
    'use strict';

    const SCAN_INTERVAL_MS = 250;
    const SCAN_COOLDOWN_MS = 3500;

    let mediaStream = null;
    let scanTimer = null;
    let isProcessing = false;
    let lastScannedCode = '';
    let lastScanTime = 0;
    let sessionCheckins = 0;
    const recentScans = [];

    function parseCode(raw) {
        if (typeof window.parseTicketNumberFromScan === 'function') {
            return window.parseTicketNumberFromScan(raw);
        }
        return String(raw || '').trim();
    }

    function shouldProcessCode(ticketNumber) {
        if (!ticketNumber) return false;
        const now = Date.now();
        if (ticketNumber === lastScannedCode && now - lastScanTime < SCAN_COOLDOWN_MS) {
            return false;
        }
        lastScannedCode = ticketNumber;
        lastScanTime = now;
        return true;
    }

    function setResult(state, title, message, ticket) {
        const card = document.getElementById('scanResultCard');
        if (!card) return;

        const icons = {
            idle: 'fa-ticket-alt',
            loading: 'fa-circle-notch fa-spin',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-circle',
            error: 'fa-times-circle',
        };

        card.className = 'scan-result-card scan-result-card--' + state;
        let metaHtml = '';
        if (ticket) {
            metaHtml =
                '<div class="scan-result-meta">' +
                (ticket.customer_name || ticket.attendee_name
                    ? '<div><strong>Attendee:</strong> ' + escapeHtml(ticket.customer_name || ticket.attendee_name) + '</div>'
                    : '') +
                (ticket.event_title ? '<div><strong>Event:</strong> ' + escapeHtml(ticket.event_title) + '</div>' : '') +
                (ticket.ticket_number ? '<div><strong>Ticket:</strong> <code>' + escapeHtml(ticket.ticket_number) + '</code></div>' : '') +
                '</div>';
        }

        card.innerHTML =
            '<div class="scan-result-icon"><i class="fas ' + icons[state] + '"></i></div>' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            '<p>' + escapeHtml(message) + '</p>' +
            metaHtml;
    }

    function addRecentScan(ticket, statusLabel) {
        recentScans.unshift({
            name: ticket.customer_name || ticket.attendee_name || 'Guest',
            event: ticket.event_title || 'Event',
            ticket: ticket.ticket_number || '',
            status: statusLabel,
            time: new Date(),
        });
        if (recentScans.length > 8) recentScans.pop();
        renderRecentScans();
    }

    function renderRecentScans() {
        const list = document.getElementById('recentScansList');
        if (!list) return;
        if (!recentScans.length) {
            list.innerHTML = '<li class="scanner-recent-empty text-muted">No check-ins yet this session</li>';
            return;
        }
        list.innerHTML = recentScans.map(function (item) {
            return (
                '<li>' +
                '<strong>' + escapeHtml(item.name) + '</strong>' +
                '<span>' + escapeHtml(item.event) + ' · ' + escapeHtml(item.ticket) + ' · ' + escapeHtml(item.status) + '</span>' +
                '</li>'
            );
        }).join('');
    }

    async function loadStats() {
        try {
            const stats = await OrganizerAPI.tickets.getStats();
            const totalEl = document.getElementById('scannerStatTotal');
            const checkedEl = document.getElementById('scannerStatCheckedIn');
            if (totalEl) totalEl.textContent = stats.total_tickets || stats.total || 0;
            if (checkedEl) checkedEl.textContent = stats.checked_in || 0;
        } catch (e) {
            console.error('[Scanner] stats failed:', e);
        }
    }

    function updateSessionStat() {
        const el = document.getElementById('scannerStatSession');
        if (el) el.textContent = String(sessionCheckins);
    }

    async function processTicket(rawInput) {
        const ticketNumber = parseCode(rawInput);
        if (!ticketNumber) {
            setResult('error', 'Invalid code', 'Could not read a ticket number from that scan.');
            return;
        }
        if (!shouldProcessCode(ticketNumber)) return;
        if (isProcessing) return;

        isProcessing = true;
        setResult('loading', 'Verifying ticket…', 'Checking ticket ' + ticketNumber + ' against your events.');

        try {
            const verify = await OrganizerAPI.tickets.verify(ticketNumber);
            const ticket = verify.ticket || {};

            if (!verify.success) {
                if (ticket.status === 'checked_in') {
                    setResult('warning', 'Already checked in', verify.message || 'This ticket was already used.', ticket);
                    addRecentScan(ticket, 'Already checked in');
                } else {
                    setResult('error', 'Ticket rejected', verify.message || 'This ticket cannot be checked in.', ticket);
                }
                return;
            }

            const checkin = await OrganizerAPI.tickets.checkin(ticketNumber);
            const checkedTicket = checkin.ticket || ticket;
            const name = checkedTicket.customer_name || checkedTicket.attendee_name || 'Attendee';
            setResult(
                'success',
                'Check-in successful',
                'Welcome, ' + name + '! Ticket has been marked as checked in.',
                checkedTicket
            );
            sessionCheckins += 1;
            updateSessionStat();
            addRecentScan(checkedTicket, 'Checked in');
            if (window.showToast) window.showToast('Checked in: ' + name, 'success');
            await loadStats();
        } catch (e) {
            setResult('error', 'Check-in failed', e.message || 'Something went wrong. Try again.');
            if (window.showToast) window.showToast(e.message || 'Check-in failed', 'error');
        } finally {
            isProcessing = false;
        }
    }

    function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setResult('error', 'Camera unavailable', 'Your browser does not support camera access. Use manual entry instead.');
            return;
        }

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
        }).then(function (stream) {
            mediaStream = stream;
            const video = document.getElementById('scannerVideo');
            const placeholder = document.getElementById('scannerPlaceholder');
            if (!video) return;

            video.srcObject = stream;
            video.classList.add('is-active');
            if (placeholder) placeholder.classList.add('is-hidden');

            document.getElementById('startScannerBtn').style.display = 'none';
            document.getElementById('stopScannerBtn').style.display = 'inline-flex';
            startQrLoop();
        }).catch(function () {
            setResult('error', 'Camera permission denied', 'Allow camera access in your browser settings, or enter the ticket number manually.');
        });
    }

    function stopCamera() {
        if (scanTimer) {
            clearInterval(scanTimer);
            scanTimer = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(function (track) { track.stop(); });
            mediaStream = null;
        }
        const video = document.getElementById('scannerVideo');
        const placeholder = document.getElementById('scannerPlaceholder');
        if (video) {
            video.srcObject = null;
            video.classList.remove('is-active');
        }
        if (placeholder) placeholder.classList.remove('is-hidden');
        document.getElementById('startScannerBtn').style.display = 'inline-flex';
        document.getElementById('stopScannerBtn').style.display = 'none';
    }

    function startQrLoop() {
        const video = document.getElementById('scannerVideo');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (scanTimer) clearInterval(scanTimer);
        scanTimer = setInterval(function () {
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || typeof jsQR !== 'function') return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (result && result.data) {
                processTicket(result.data);
            }
        }, SCAN_INTERVAL_MS);
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadStats();
        updateSessionStat();
        renderRecentScans();

        document.getElementById('startScannerBtn')?.addEventListener('click', startCamera);
        document.getElementById('stopScannerBtn')?.addEventListener('click', stopCamera);

        document.getElementById('manualCheckinBtn')?.addEventListener('click', function () {
            const input = document.getElementById('manualTicketInput');
            const value = input?.value?.trim();
            if (!value) {
                if (window.showToast) window.showToast('Enter a ticket number', 'error');
                return;
            }
            lastScannedCode = '';
            processTicket(value);
            if (input) input.value = '';
        });

        document.getElementById('manualTicketInput')?.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('manualCheckinBtn')?.click();
            }
        });

        window.addEventListener('beforeunload', stopCamera);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') stopCamera();
        });
    });
})();
