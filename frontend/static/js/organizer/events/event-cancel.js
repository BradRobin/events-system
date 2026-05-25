async function cancelEvent(eventId) {
    const reason = prompt('Please provide a reason for cancellation (will be sent to attendees):');
    if (!reason) return;
    
    if (!confirm(`Cancel this event?\nReason: ${reason}\n\nAll ticket holders will be notified and refunds processed.`)) return;
    
    showLoading(eventId);
    
    const result = await EventAPI.Organizer.cancelEvent(eventId, reason);
    if (result) {
        showToast('Event cancelled and attendees notified', 'warning');
        
        const row = document.querySelector(`tr[data-event-id="${eventId}"]`);
        if (row) {
            const statusCell = row.querySelector('.status-badge');
            statusCell.className = 'status-badge cancelled';
            statusCell.innerText = 'Cancelled';
        }
        
        if (typeof loadMyEvents === 'function') loadMyEvents();
    }
    
    hideLoading(eventId);
}

function showLoading(eventId) {
    const row = document.querySelector(`tr button[onclick="cancelEvent(${eventId})"]`);
    if (row) row.disabled = true;
}

function hideLoading(eventId) {
    const row = document.querySelector(`tr button[onclick="cancelEvent(${eventId})"]`);
    if (row) row.disabled = false;
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
