async function deleteEvent(eventId) {
    if (!confirm('Delete this event? This action can be undone (moves to trash).')) return;
    
    const result = await EventAPI.Organizer.deleteEvent(eventId, false);
    if (result) {
        showToast('Event moved to trash', 'info');
        if (typeof loadMyEvents === 'function') loadMyEvents();
    }
}

async function permanentDeleteEvent(eventId) {
    if (!confirm('Permanently delete this event? This cannot be undone!')) return;
    
    const result = await EventAPI.Organizer.deleteEvent(eventId, true);
    if (result) {
        showToast('Event permanently deleted', 'error');
        if (typeof loadMyEvents === 'function') loadMyEvents();
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-trash-alt' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
