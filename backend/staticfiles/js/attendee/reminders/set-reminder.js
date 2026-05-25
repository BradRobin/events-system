// ============================================
// ATTENDEE SET REMINDER
// Handles: Setting reminders for events
// ============================================

let selectedEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        selectedEventId = eventId;
        checkReminderStatus(eventId);
    }
    setupReminderModal();
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
}

async function checkReminderStatus(eventId) {
    const reminders = await EventAPI.Attendee.getReminders();
    const reminderExists = reminders?.some(r => r.event_id == eventId);
    
    const reminderBtn = document.getElementById('setReminderBtn');
    if (reminderBtn && reminderExists) {
        reminderBtn.innerHTML = '<i class="fas fa-bell"></i> Reminder Set';
        reminderBtn.classList.add('active');
        reminderBtn.disabled = true;
    }
}

function setupReminderModal() {
    const modal = document.getElementById('reminderModal');
    if (!modal) return;
    
    const options = document.querySelectorAll('.reminder-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            document.getElementById('selectedReminderTime').value = option.dataset.time;
        });
    });
}

async function setReminder(eventId = selectedEventId) {
    if (!eventId) {
        showToast('Event not found', 'error');
        return;
    }
    
    const reminderTime = document.getElementById('selectedReminderTime')?.value || '1_hour';
    
    showLoading();
    
    const result = await EventAPI.Attendee.setReminder(eventId, reminderTime);
    if (result) {
        showToast(`Reminder set successfully! You'll be notified ${formatReminderTime(reminderTime)} before the event.`, 'success');
        
        const modal = document.getElementById('reminderModal');
        if (modal) modal.style.display = 'none';
        
        const reminderBtn = document.getElementById('setReminderBtn');
        if (reminderBtn) {
            reminderBtn.innerHTML = '<i class="fas fa-bell"></i> Reminder Set';
            reminderBtn.classList.add('active');
            reminderBtn.disabled = true;
        }
    }
    
    hideLoading();
}

function formatReminderTime(time) {
    const formats = {
        '15_minutes': '15 minutes',
        '1_hour': '1 hour',
        '2_hours': '2 hours',
        '1_day': '1 day',
        '1_week': '1 week'
    };
    return formats[time] || time;
}

function showReminderModal() {
    const modal = document.getElementById('reminderModal');
    if (modal) modal.style.display = 'flex';
}

function closeReminderModal() {
    const modal = document.getElementById('reminderModal');
    if (modal) modal.style.display = 'none';
}

function showLoading() {
    const btn = document.getElementById('confirmReminderBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting...';
    }
}

function hideLoading() {
    const btn = document.getElementById('confirmReminderBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Set Reminder';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-bell' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
