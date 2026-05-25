async function publishEvent(eventId) {
    if (!confirm('Publish this event? It will become visible to the public.')) return;
    
    showLoading(eventId);
    
    const result = await EventAPI.Organizer.publishEvent(eventId);
    if (result) {
        showToast('Event published successfully', 'success');
        
        const row = document.querySelector(`tr button[onclick="publishEvent(${eventId})"]`);
        if (row) {
            const parent = row.parentElement;
            parent.innerHTML = `
                <button class="btn-icon unpublish" onclick="unpublishEvent(${eventId})" title="Unpublish">
                    <i class="fas fa-eye-slash"></i>
                </button>
                ${parent.innerHTML}
            `;
            row.remove();
        }
        
        if (typeof loadMyEvents === 'function') loadMyEvents();
    }
    
    hideLoading(eventId);
}

async function unpublishEvent(eventId) {
    if (!confirm('Unpublish this event? It will be hidden from the public.')) return;
    
    showLoading(eventId);
    
    const result = await EventAPI.Organizer.unpublishEvent(eventId);
    if (result) {
        showToast('Event unpublished', 'info');
        
        const row = document.querySelector(`tr button[onclick="unpublishEvent(${eventId})"]`);
        if (row) {
            const parent = row.parentElement;
            parent.innerHTML = `
                <button class="btn-icon publish" onclick="publishEvent(${eventId})" title="Publish">
                    <i class="fas fa-cloud-upload-alt"></i>
                </button>
                ${parent.innerHTML}
            `;
            row.remove();
        }
        
        if (typeof loadMyEvents === 'function') loadMyEvents();
    }
    
    hideLoading(eventId);
}

function showLoading(eventId) {
    const row = document.querySelector(`tr button[onclick*="${eventId}"]`);
    if (row) row.disabled = true;
}

function hideLoading(eventId) {
    const row = document.querySelector(`tr button[onclick*="${eventId}"]`);
    if (row) row.disabled = false;
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
