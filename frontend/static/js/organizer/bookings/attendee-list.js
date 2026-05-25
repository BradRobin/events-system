// ============================================
// ORGANIZER ATTENDEE LIST
// Handles: Displaying attendees for check-in
// ============================================

let currentEventId = null;
let attendees = [];
let currentFilter = 'all';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    const eventId = getEventIdFromUrl();
    if (eventId) {
        currentEventId = eventId;
        loadAttendees();
        setupFilters();
        initCheckinStats();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/attendees/);
    return match ? match[1] : null;
}

async function loadAttendees() {
    showLoading();
    
    const data = await EventAPI.Organizer.getAttendeeList(currentEventId);
    if (data) {
        attendees = data;
        filterAndDisplayAttendees();
        updateCheckinStats(data);
    }
    
    hideLoading();
}

function filterAndDisplayAttendees() {
    let filtered = [...attendees];
    
    // Filter by check-in status
    if (currentFilter === 'checked_in') {
        filtered = filtered.filter(a => a.checked_in);
    } else if (currentFilter === 'pending') {
        filtered = filtered.filter(a => !a.checked_in);
    }
    
    // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(a => 
            a.name.toLowerCase().includes(term) ||
            a.email.toLowerCase().includes(term) ||
            a.booking_id.toLowerCase().includes(term)
        );
    }
    
    displayAttendees(filtered);
    updateFilteredCount(filtered.length);
}

function displayAttendees(attendeesList) {
    const container = document.getElementById('attendeesTableBody');
    if (!attendeesList.length) {
        container.innerHTML = `
            <tr><td colspan="7" class="no-data">
                <i class="fas fa-users fa-3x"></i>
                <h3>No Attendees Found</h3>
                <p>No attendees match your filters.</p>
            </td></tr>
        `;
        return;
    }
    
    container.innerHTML = attendeesList.map(attendee => `
        <tr data-booking-id="${attendee.booking_id}" data-checked-in="${attendee.checked_in}">
            <td class="checkbox-cell">
                <input type="checkbox" class="attendee-select" value="${attendee.booking_id}" onchange="updateBulkCheckin()">
            </td>
            <td>
                <div class="attendee-info">
                    <strong>${attendee.name}</strong>
                    <div class="attendee-contact">${attendee.email}</div>
                    <div class="attendee-contact">${attendee.phone || 'No phone'}</div>
                </div>
            </td>
            <td>${attendee.quantity}</td>
            <td>${attendee.ticket_type}</td>
            <td class="booking-id">${attendee.booking_id}</td>
            <td>
                <span class="checkin-status ${attendee.checked_in ? 'checked-in' : 'pending'}">
                    ${attendee.checked_in ? '✓ Checked In' : '⏳ Pending'}
                </span>
            </td>
            <td class="action-buttons">
                ${!attendee.checked_in ? `
                    <button class="btn-icon checkin" onclick="checkinAttendee('${attendee.booking_id}')" title="Check In">
                        <i class="fas fa-qrcode"></i>
                    </button>
                ` : `
                    <button class="btn-icon view" onclick="viewAttendeeDetails('${attendee.booking_id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `}
            </td>
        </tr>
    `).join('');
}

function updateCheckinStats(attendeesList) {
    const total = attendeesList.length;
    const checkedIn = attendeesList.filter(a => a.checked_in).length;
    const pending = total - checkedIn;
    const checkinRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    
    document.getElementById('statTotalAttendees').innerText = total;
    document.getElementById('statCheckedIn').innerText = checkedIn;
    document.getElementById('statPending').innerText = pending;
    document.getElementById('statCheckinRate').innerText = `${checkinRate}%`;
    
    // Update progress bar
    const progressFill = document.getElementById('checkinProgressFill');
    if (progressFill) progressFill.style.width = `${checkinRate}%`;
}

function updateFilteredCount(count) {
    const countSpan = document.getElementById('filteredCount');
    if (countSpan) countSpan.innerText = count;
}

function setupFilters() {
    const filterSelect = document.getElementById('checkinFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            filterAndDisplayAttendees();
        });
    }
    
    const searchInput = document.getElementById('searchAttendees');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchTerm = e.target.value;
                filterAndDisplayAttendees();
            }, 300);
        });
    }
}

async function checkinAttendee(bookingId) {
    showButtonLoading(bookingId);
    
    const result = await EventAPI.Organizer.checkinAttendee(currentEventId, bookingId);
    if (result && result.success) {
        showToast(`${result.attendee_name} checked in successfully!`, 'success');
        
        // Update attendee in list
        const attendee = attendees.find(a => a.booking_id === bookingId);
        if (attendee) {
            attendee.checked_in = true;
            filterAndDisplayAttendees();
            updateCheckinStats(attendees);
            
            // Play success sound
            playCheckinSound();
        }
    } else {
        showToast(result?.message || 'Check-in failed', 'error');
    }
    
    hideButtonLoading(bookingId);
}

async function bulkCheckin() {
    const selectedBookings = getSelectedBookingIds();
    if (!selectedBookings.length) {
        showToast('No attendees selected', 'error');
        return;
    }
    
    if (!confirm(`Check in ${selectedBookings.length} attendees?`)) return;
    
    showGlobalLoading();
    
    let successCount = 0;
    for (const bookingId of selectedBookings) {
        const result = await EventAPI.Organizer.checkinAttendee(currentEventId, bookingId);
        if (result?.success) successCount++;
        
        // Update attendee in list
        const attendee = attendees.find(a => a.booking_id === bookingId);
        if (attendee) attendee.checked_in = true;
    }
    
    showToast(`${successCount} attendees checked in`, 'success');
    filterAndDisplayAttendees();
    updateCheckinStats(attendees);
    
    hideGlobalLoading();
}

function getSelectedBookingIds() {
    const checkboxes = document.querySelectorAll('.attendee-select:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateBulkCheckin() {
    const selectedCount = getSelectedBookingIds().length;
    const bulkBar = document.getElementById('bulkCheckinBar');
    const countSpan = document.getElementById('bulkCheckinCount');
    
    if (selectedCount > 0) {
        bulkBar.style.display = 'flex';
        countSpan.innerText = selectedCount;
    } else {
        bulkBar.style.display = 'none';
    }
}

function selectAllAttendees() {
    const checkboxes = document.querySelectorAll('.attendee-select');
    checkboxes.forEach(cb => cb.checked = true);
    updateBulkCheckin();
}

function deselectAllAttendees() {
    const checkboxes = document.querySelectorAll('.attendee-select');
    checkboxes.forEach(cb => cb.checked = false);
    updateBulkCheckin();
}

function exportAttendeeList() {
    window.open(`/organizer/events/${currentEventId}/attendees/export/`, '_blank');
}

function initCheckinStats() {
    // Create chart for check-in timeline
    const ctx = document.getElementById('checkinTimeline')?.getContext('2d');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'],
                datasets: [{
                    label: 'Check-ins',
                    data: [0, 5, 15, 25, 40, 55, 70],
                    borderColor: '#ec6408',
                    backgroundColor: 'rgba(236, 100, 8, 0.1)',
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function playCheckinSound() {
    const audio = new Audio('/static/sounds/checkin.mp3');
    audio.play().catch(e => console.log('Audio play failed'));
}

function viewAttendeeDetails(bookingId) {
    window.open(`/organizer/bookings/${bookingId}/`, '_blank');
}

function showButtonLoading(bookingId) {
    const row = document.querySelector(`tr[data-booking-id="${bookingId}"]`);
    if (row) {
        const btn = row.querySelector('.btn-icon.checkin');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }
}

function hideButtonLoading(bookingId) {
    const row = document.querySelector(`tr[data-booking-id="${bookingId}"]`);
    if (row) {
        const btn = row.querySelector('.btn-icon.checkin');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-qrcode"></i>';
        }
    }
}

function showGlobalLoading() {
    const btn = document.getElementById('bulkCheckinBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking in...';
    }
}

function hideGlobalLoading() {
    const btn = document.getElementById('bulkCheckinBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-double"></i> Check In Selected';
    }
}

function showLoading() {
    const container = document.getElementById('attendeesTableBody');
    if (container) {
        container.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading attendees...</td></tr>';
    }
}

function hideLoading() {
    // Hidden by displayAttendees
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
