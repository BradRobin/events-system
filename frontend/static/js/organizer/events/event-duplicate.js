async function duplicateEvent(eventId) {
    showLoading(eventId);
    
    const result = await EventAPI.Organizer.duplicateEvent(eventId);
    if (result) {
        showToast('Event duplicated successfully', 'success');
        window.location.href = `/organizer/events/${result.event_id}/edit/`;
    }
    
    hideLoading(eventId);
}

function showLoading(eventId) {
    const row = document.querySelector(`tr button[onclick="duplicateEvent(${eventId})"]`);
    if (row) {
        row.disabled = true;
        row.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
}

function hideLoading(eventId) {
    const row = document.querySelector(`tr button[onclick="duplicateEvent(${eventId})"]`);
    if (row) {
        row.disabled = false;
        row.innerHTML = '<i class="fas fa-copy"></i>';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
