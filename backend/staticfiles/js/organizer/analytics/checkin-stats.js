// ============================================
// ORGANIZER CHECK-IN STATISTICS
// Handles: Real-time check-in analytics dashboard
// ============================================

let eventId = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    eventId = getEventIdFromUrl();
    if (eventId) {
        loadCheckinStats();
        startAutoRefresh();
        setupCheckinChart();
    }
});

function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizer\/events\/(\d+)\/checkin-stats/);
    return match ? match[1] : null;
}

async function loadCheckinStats() {
    const stats = await EventAPI.Organizer.getCheckinStats(eventId);
    if (stats) {
        displayCheckinStats(stats);
        updateCheckinChart(stats);
        updateCheckinTimeline(stats);
    }
}

function displayCheckinStats(stats) {
    const total = stats.total_tickets || 0;
    const checkedIn = stats.checked_in || 0;
    const remaining = stats.remaining || 0;
    const rate = stats.checkin_rate || 0;
    
    document.getElementById('statTotalTickets').innerText = total.toLocaleString();
    document.getElementById('statCheckedIn').innerText = checkedIn.toLocaleString();
    document.getElementById('statRemaining').innerText = remaining.toLocaleString();
    document.getElementById('statCheckinRate').innerText = `${rate}%`;
    
    // Update circular progress
    updateCircularProgress(rate);
    
    // Update progress bar
    const progressFill = document.getElementById('checkinProgressFill');
    if (progressFill) progressFill.style.width = `${rate}%`;
    
    // Update gauge needle
    updateGaugeNeedle(rate);
}

function updateCircularProgress(percent) {
    const circle = document.querySelector('.circular-progress-ring');
    if (!circle) return;
    
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
    document.getElementById('circularProgressPercent').innerText = `${percent}%`;
}

function updateGaugeNeedle(percent) {
    const needle = document.getElementById('gaugeNeedle');
    if (!needle) return;
    
    const rotation = -90 + (percent / 100) * 180;
    needle.style.transform = `rotate(${rotation}deg)`;
}

function setupCheckinChart() {
    const ctx = document.getElementById('checkinTimeline')?.getContext('2d');
    if (!ctx) return;
    
    window.checkinChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'],
            datasets: [{
                label: 'Check-ins',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                borderColor: '#ec6408',
                backgroundColor: 'rgba(236, 100, 8, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw} check-ins` } } } }
    });
}

function updateCheckinChart(stats) {
    if (!window.checkinChart || !stats.hourly_checkins) return;
    window.checkinChart.data.datasets[0].data = stats.hourly_checkins;
    window.checkinChart.update();
}

function updateCheckinTimeline(stats) {
    const container = document.getElementById('checkinTimelineList');
    if (!container || !stats.recent_checkins) return;
    
    container.innerHTML = stats.recent_checkins.map(checkin => `
        <div class="timeline-item">
            <div class="timeline-time">${new Date(checkin.time).toLocaleTimeString()}</div>
            <div class="timeline-details">
                <strong>${checkin.attendee_name}</strong>
                <span>${checkin.ticket_type}</span>
            </div>
            <div class="timeline-status"><i class="fas fa-check-circle"></i></div>
        </div>
    `).join('');
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => loadCheckinStats(), 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function refreshStats() {
    loadCheckinStats();
}
