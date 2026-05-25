// ============================================
// ATTENDEE REMOVE REMINDER
// Handles: Removing event reminders
// ============================================

async function removeReminder(reminderId) {
    if (!confirm('Remove this reminder? You will no longer be notified.')) return;
    
    showLoading(reminderId);
    
    const result = await EventAPI.Attendee.removeReminder(reminderId);
    if (result) {
        showToast('Reminder removed successfully', 'info');
        
        // Remove card from UI
        const card = document.querySelector(`.reminder-card[data-reminder-id="${reminderId}"]`);
        if (card) card.remove();
        
        // Update reminder count
        const remainingCards = document.querySelectorAll('.reminder-card').length;
        updateReminderCount(remainingCards);
        
        // Check if empty
        if (remainingCards === 0) {
            displayEmptyState();
        }
        
        // Also update reminder button on event page if open
        updateEventPageReminderButton(reminderId);
    }
    
    hideLoading(reminderId);
}

function updateEventPageReminderButton(reminderId) {
    const reminderBtn = document.getElementById('setReminderBtn');
    if (reminderBtn) {
        reminderBtn.innerHTML = '<i class="fas fa-bell"></i> Set Reminder';
        reminderBtn.classList.remove('active');
        reminderBtn.disabled = false;
    }
}

async function removeAllReminders() {
    const reminders = document.querySelectorAll('.reminder-card');
    if (!reminders.length) return;
    
    if (!confirm(`Remove all ${reminders.length} reminders?`)) return;
    
    showGlobalLoading();
    
    for (const card of reminders) {
        const reminderId = parseInt(card.dataset.reminderId);
        await EventAPI.Attendee.removeReminder(reminderId);
        card.remove();
    }
    
    showToast('All reminders removed', 'info');
    displayEmptyState();
    
    hideGlobalLoading();
}

function updateReminderCount(count) {
    const badge = document.getElementById('reminderCount');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function displayEmptyState() {
    const container = document.getElementById('remindersContainer');
    if (container && !document.querySelector('.reminder-card')) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash fa-4x"></i>
                <h3>No Reminders Set</h3>
                <p>You haven't set any event reminders yet.</p>
                <a href="/events/" class="btn-browse">Browse Events</a>
            </div>
        `;
    }
}

function showLoading(reminderId) {
    const card = document.querySelector(`.reminder-card[data-reminder-id="${reminderId}"]`);
    if (card) {
        const actions = card.querySelector('.reminder-actions');
        actions.style.opacity = '0.5';
        actions.style.pointerEvents = 'none';
    }
}

function hideLoading(reminderId) {
    const card = document.querySelector(`.reminder-card[data-reminder-id="${reminderId}"]`);
    if (card) {
        const actions = card.querySelector('.reminder-actions');
        actions.style.opacity = '1';
        actions.style.pointerEvents = 'auto';
    }
}

function showGlobalLoading() {
    const btn = document.getElementById('removeAllBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    }
}

function hideGlobalLoading() {
    const btn = document.getElementById('removeAllBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Remove All';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-bell-slash'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
