// frontend/static/js/organizer/events.js
let currentEventId = null;
let currentPage = 1;
let ticketTypes = [];
let scheduleItems = [];
let analyticsChart = null;

// Load events grid
async function loadEvents(page = 1) {
    try {
        const data = await OrganizerAPI.events.getAll(page, 12);
        const container = document.getElementById('eventsContainer');
        const events = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);

        if (!events.length) {
            container.innerHTML = '<div class="text-center text-muted col-12">No events found</div>';
            return;
        }

        container.innerHTML = events.map(event => {
            const title = escapeHtml(event.name || event.title || 'Untitled Event');
            const dateValue = event.date || event.start_date || '';
            const dateText = dateValue ? new Date(dateValue).toLocaleDateString() : '--';
            const ticketsSold = event.tickets_sold ?? event.sold ?? 0;
            const capacity = event.capacity || 0;
            const status = event.status || 'draft';
            const badgeClass = status === 'published' || status === 'active' ? 'bg-success' : status === 'draft' ? 'bg-secondary' : status === 'approved' ? 'bg-info' : 'bg-danger';
            return `
            <div class="col-md-4 col-lg-3">
                <div class="event-card" onclick="editEvent(${event.id})">
                    <div class="event-image" style="background-image: url('${event.image_url || '/static/images/placeholder.jpg'}')">
                        <div class="event-status"><span class="badge ${badgeClass}">${status}</span></div>
                    </div>
                    <div class="p-3">
                        <h6 class="mb-1">${title}</h6>
                        <small class="text-muted">${dateText}</small>
                        <div class="mt-2"><i class="fas fa-ticket-alt"></i> ${ticketsSold}/${capacity}</div>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        if (typeof renderPagination === 'function' && data && data.total_pages) {
            renderPagination(data, page, (newPage) => { currentPage = newPage; loadEvents(currentPage); }, 'eventsPagination');
        }
    } catch(e) {
        console.error(e);
        if(window.showToast) window.showToast('Failed to load events', 'error');
    }
}

// Edit or create event
async function editEvent(eventId = null) {
    currentEventId = eventId;
    resetEventForm();
    if (eventId) {
        document.getElementById('eventModalTitle').innerText = 'Create New Event';
        document.getElementById('saveEventBtn').innerText = 'Update Event';
        try {
            const event = await OrganizerAPI.events.getDetail(eventId);
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventTitle').value = event.name || event.title || '';
            document.getElementById('eventCategory').value = event.category || 'Music';
            document.getElementById('eventDescription').value = event.description || '';
            const startDate = event.start_date || event.date || '';
            const endDate = event.end_date || '';
            document.getElementById('eventStartDate').value = startDate ? startDate.slice(0,16) : '';
            document.getElementById('eventEndDate').value = endDate ? endDate.slice(0,16) : '';
            document.getElementById('eventVenue').value = event.location || event.venue || '';
            document.getElementById('eventCapacity').value = event.capacity || '';
            document.getElementById('eventStatus').value = event.status || 'published';
            document.getElementById('eventPrice').value = event.price || 0;
            
            if (event.vip_price !== null && event.vip_price !== undefined) {
                document.getElementById('hasVipTicket').checked = true;
                document.getElementById('eventVipPrice').value = event.vip_price;
                document.getElementById('vipPriceContainer').style.display = 'block';
            } else {
                document.getElementById('hasVipTicket').checked = false;
                document.getElementById('eventVipPrice').value = '';
                document.getElementById('vipPriceContainer').style.display = 'none';
            }
            
            if (event.vvip_price !== null && event.vvip_price !== undefined) {
                document.getElementById('hasVvipTicket').checked = true;
                document.getElementById('eventVvipPrice').value = event.vvip_price;
                document.getElementById('vvipPriceContainer').style.display = 'block';
            } else {
                document.getElementById('hasVvipTicket').checked = false;
                document.getElementById('eventVvipPrice').value = '';
                document.getElementById('vvipPriceContainer').style.display = 'none';
            }
            
            await loadTicketTypes(eventId);
            await loadScheduleItems(eventId);
            await loadAnalytics(eventId);
            if (event.image_url) {
                const bannerPreview = document.getElementById('bannerPreview');
                if (bannerPreview) bannerPreview.innerHTML = `<img src="${event.image_url}" class="image-preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px;">`;
            }
        } catch(e) {
            console.error(e);
            if(window.showToast) window.showToast('Error loading event', 'error');
        }
    } else {
        document.getElementById('eventModalTitle').innerText = 'Create New Event';
        document.getElementById('saveEventBtn').innerText = 'Create Event';
        document.getElementById('ticketTypesList').innerHTML = '';
        document.getElementById('scheduleList').innerHTML = '';
    }
    new bootstrap.Modal(document.getElementById('eventModal')).show();
}

async function saveEvent() {
    const startDateValue = document.getElementById('eventStartDate').value;
    const endDateValue = document.getElementById('eventEndDate').value;
    const [startDate, startTime] = startDateValue.split('T');
    const [endDate, endTime] = endDateValue.split('T');
    const data = {
        name: document.getElementById('eventTitle').value,
        category: document.getElementById('eventCategory').value,
        description: document.getElementById('eventDescription')?.value || 'Event description',
        date: startDate || '',
        startTime: startTime || '00:00',
        endTime: endTime || '00:00',
        venue: document.getElementById('eventVenue').value,
        location: document.getElementById('eventVenue').value,
        capacity: parseInt(document.getElementById('eventCapacity').value) || 0,
        status: document.getElementById('eventStatus')?.value || 'published',
        price: parseFloat(document.getElementById('eventPrice').value) || 0,
        vip_price: document.getElementById('hasVipTicket').checked ? (parseFloat(document.getElementById('eventVipPrice').value) || null) : null,
        vvip_price: document.getElementById('hasVvipTicket').checked ? (parseFloat(document.getElementById('eventVvipPrice').value) || null) : null
    };
    const eventId = document.getElementById('eventId').value;
    try {
        let targetId = eventId;
        if (eventId) {
            await OrganizerAPI.events.update(eventId, data);
            if(window.showToast) window.showToast('Event updated successfully', 'success');
        } else {
            const result = await OrganizerAPI.events.create(data);
            targetId = result.id;
            if(window.showToast) window.showToast('Event created successfully', 'success');
        }

        // Upload banner file if one was selected
        const bannerFile = document.getElementById('eventBannerFile').files[0];
        if (bannerFile && targetId) {
            try {
                await OrganizerAPI.events.uploadImage(targetId, bannerFile);
                if(window.showToast) window.showToast('Banner uploaded successfully', 'success');
            } catch(uploadErr) {
                console.error('Banner upload failed:', uploadErr);
                if(window.showToast) window.showToast('Event details saved, but banner image upload failed.', 'warning');
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
        loadEvents(currentPage);
    } catch(e) {
        if(window.showToast) window.showToast(e.message, 'error');
    }
}

// Ticket types
function ensureSavedEvent(action) {
    const eventId = document.getElementById('eventId').value || currentEventId;
    if (!eventId) {
        if (window.showToast) window.showToast(`Please save the event before ${action}.`, 'info');
        return null;
    }
    return eventId;
}

async function loadTicketTypes(eventId) {
    if (!eventId) return;
    try {
        const types = await OrganizerAPI.events.getTicketTypes(eventId);
        ticketTypes = Array.isArray(types) ? types : [];
        const html = ticketTypes.map(t => `
            <div class="ticket-type-row d-flex justify-content-between align-items-center">
                <div><strong>${escapeHtml(t.name)}</strong><br><small>$${t.price} | ${t.quantity} available</small></div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="showTicketTypeModal(${t.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTicketType(${t.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        document.getElementById('ticketTypesList').innerHTML = html || '<p class="text-muted">No ticket types</p>';
    } catch(e) {
        console.error(e);
        document.getElementById('ticketTypesList').innerHTML = '<p class="text-muted">Unable to load ticket types</p>';
    }
}

function showTicketTypeModal(ticketId = null) {
    const eventId = ensureSavedEvent('adding ticket types');
    if (!eventId && !ticketId) return;

    document.getElementById('ticketTypeId').value = ticketId || '';
    if (ticketId) {
        const ticket = ticketTypes.find(t => t.id == ticketId);
        if (ticket) {
            document.getElementById('ticketTypeName').value = ticket.name;
            document.getElementById('ticketTypePrice').value = ticket.price;
            document.getElementById('ticketTypeQuantity').value = ticket.quantity;
            document.getElementById('ticketTypeDesc').value = ticket.description || '';
        }
    } else {
        document.getElementById('ticketTypeName').value = '';
        document.getElementById('ticketTypePrice').value = '';
        document.getElementById('ticketTypeQuantity').value = '';
        document.getElementById('ticketTypeDesc').value = '';
    }
    new bootstrap.Modal(document.getElementById('ticketTypeModal')).show();
}

async function saveTicketType() {
    const eventId = ensureSavedEvent('saving ticket types');
    if (!eventId) return;

    const ticketId = document.getElementById('ticketTypeId').value;
    const data = {
        name: document.getElementById('ticketTypeName').value,
        price: parseFloat(document.getElementById('ticketTypePrice').value),
        quantity: parseInt(document.getElementById('ticketTypeQuantity').value) || 0,
        description: document.getElementById('ticketTypeDesc').value
    };
    try {
        if (ticketId) {
            await OrganizerAPI.events.updateTicketType(eventId, ticketId, data);
        } else {
            await OrganizerAPI.events.addTicketType(eventId, data);
        }
        if(window.showToast) window.showToast('Ticket type saved', 'success');
        bootstrap.Modal.getInstance(document.getElementById('ticketTypeModal')).hide();
        loadTicketTypes(eventId);
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function deleteTicketType(ticketId) {
    const eventId = ensureSavedEvent('deleting ticket types');
    if (!eventId) return;
    if (!confirm('Delete this ticket type?')) return;
    try {
        await OrganizerAPI.events.deleteTicketType(eventId, ticketId);
        if(window.showToast) window.showToast('Deleted', 'success');
        loadTicketTypes(eventId);
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

// Schedule items
async function loadScheduleItems(eventId) {
    if (!eventId) return;
    try {
        const items = await OrganizerAPI.events.getSchedule(eventId);
        scheduleItems = Array.isArray(items) ? items : [];
        const html = scheduleItems.map(s => `
            <div class="schedule-item d-flex justify-content-between align-items-center">
                <div><strong>${escapeHtml(s.title)}</strong><br><small>${new Date(s.start_time).toLocaleString()} - ${new Date(s.end_time).toLocaleString()}</small><br><span class="text-muted">${escapeHtml(s.location)}</span></div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="showScheduleItemModal(${s.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteScheduleItem(${s.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        document.getElementById('scheduleList').innerHTML = html || '<p class="text-muted">No schedule items</p>';
    } catch(e) {
        console.error(e);
        document.getElementById('scheduleList').innerHTML = '<p class="text-muted">Unable to load schedule items</p>';
    }
}

function showScheduleItemModal(itemId = null) {
    const eventId = ensureSavedEvent('adding schedule items');
    if (!eventId && !itemId) return;

    document.getElementById('scheduleItemId').value = itemId || '';
    if (itemId) {
        const item = scheduleItems.find(s => s.id == itemId);
        if (item) {
            document.getElementById('scheduleTitle').value = item.title;
            document.getElementById('scheduleStart').value = item.start_time ? item.start_time.slice(0,16) : '';
            document.getElementById('scheduleEnd').value = item.end_time ? item.end_time.slice(0,16) : '';
            document.getElementById('scheduleLocation').value = item.location || '';
            document.getElementById('scheduleDesc').value = item.description || '';
        }
    } else {
        document.getElementById('scheduleTitle').value = '';
        document.getElementById('scheduleStart').value = '';
        document.getElementById('scheduleEnd').value = '';
        document.getElementById('scheduleLocation').value = '';
        document.getElementById('scheduleDesc').value = '';
    }
    new bootstrap.Modal(document.getElementById('scheduleItemModal')).show();
}

async function saveScheduleItem() {
    const eventId = ensureSavedEvent('saving schedule items');
    if (!eventId) return;

    const itemId = document.getElementById('scheduleItemId').value;
    const data = {
        title: document.getElementById('scheduleTitle').value,
        start_time: document.getElementById('scheduleStart').value,
        end_time: document.getElementById('scheduleEnd').value,
        location: document.getElementById('scheduleLocation').value,
        description: document.getElementById('scheduleDesc').value
    };
    try {
        if (itemId) {
            await OrganizerAPI.events.updateScheduleItem(eventId, itemId, data);
        } else {
            await OrganizerAPI.events.addScheduleItem(eventId, data);
        }
        if(window.showToast) window.showToast('Schedule saved', 'success');
        bootstrap.Modal.getInstance(document.getElementById('scheduleItemModal')).hide();
        loadScheduleItems(eventId);
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function deleteScheduleItem(itemId) {
    const eventId = ensureSavedEvent('deleting schedule items');
    if (!eventId) return;
    if (!confirm('Delete this schedule item?')) return;
    try {
        await OrganizerAPI.events.deleteScheduleItem(eventId, itemId);
        if(window.showToast) window.showToast('Deleted', 'success');
        loadScheduleItems(eventId);
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

// Media uploads helper placeholders removed (handled in saveEvent flow)

// Analytics
async function loadAnalytics(eventId) {
    if (!eventId) {
        document.getElementById('analyticsTotalTickets').innerText = '--';
        document.getElementById('analyticsSold').innerText = '--';
        document.getElementById('analyticsRevenue').innerText = '$--';
        document.getElementById('analyticsAttendance').innerText = '--';
        return;
    }
    try {
        const data = await OrganizerAPI.events.getAnalytics(eventId);
        const stats = data && typeof data === 'object' ? data : {};
        document.getElementById('analyticsTotalTickets').innerText = stats.total_tickets || 0;
        document.getElementById('analyticsSold').innerText = stats.tickets_sold || 0;
        document.getElementById('analyticsRevenue').innerText = '$' + (stats.revenue || 0).toLocaleString();
        document.getElementById('analyticsAttendance').innerText = stats.attendance || 0;
        if (analyticsChart) analyticsChart.destroy();
        const ctx = document.getElementById('analyticsChart').getContext('2d');
        analyticsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.isArray(stats.sales_data) ? stats.sales_data.map(d => d.date) : [],
                datasets: [{
                    label: 'Tickets Sold',
                    data: Array.isArray(stats.sales_data) ? stats.sales_data.map(d => d.sold) : [],
                    borderColor: '#ff6b00',
                    backgroundColor: 'rgba(255,107,0,0.2)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#ff6b00'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { title: { display: true, text: 'Date' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Tickets Sold' }, grid: { color: 'rgba(255,255,255,0.08)' } }
                }
            }
        });
    } catch(e) {
        console.error(e);
        document.getElementById('analyticsTotalTickets').innerText = '--';
        document.getElementById('analyticsSold').innerText = '--';
        document.getElementById('analyticsRevenue').innerText = '$--';
        document.getElementById('analyticsAttendance').innerText = '--';
    }
}

function resetEventForm() {
    currentEventId = null;
    ticketTypes = [];
    scheduleItems = [];
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModalTitle').innerText = 'Create New Event';
    document.getElementById('saveEventBtn').innerText = 'Create Event';
    document.getElementById('eventStatus').value = 'draft';
    
    const bannerPreview = document.getElementById('bannerPreview');
    if (bannerPreview) bannerPreview.innerHTML = '';
    
    const bannerFile = document.getElementById('eventBannerFile');
    if (bannerFile) bannerFile.value = '';
    
    const galleryPreview = document.getElementById('galleryPreview');
    if (galleryPreview) galleryPreview.innerHTML = '';
    
    document.getElementById('ticketTypesList').innerHTML = '<p class="text-muted">No ticket types</p>';
    document.getElementById('scheduleList').innerHTML = '<p class="text-muted">No schedule items</p>';
    document.getElementById('analyticsTotalTickets').innerText = '--';
    document.getElementById('analyticsSold').innerText = '--';
    document.getElementById('analyticsRevenue').innerText = '$--';
    document.getElementById('analyticsAttendance').innerText = '--';
    if (analyticsChart) {
        analyticsChart.destroy();
        analyticsChart = null;
    }
    const vipContainer = document.getElementById('vipPriceContainer');
    if (vipContainer) vipContainer.style.display = 'none';
    const vvipContainer = document.getElementById('vvipPriceContainer');
    if (vvipContainer) vvipContainer.style.display = 'none';
}

function togglePriceInput(type) {
    const checkbox = document.getElementById(`has${type.charAt(0).toUpperCase() + type.slice(1)}Ticket`);
    const container = document.getElementById(`${type}PriceContainer`);
    if (checkbox && container) {
        container.style.display = checkbox.checked ? 'block' : 'none';
        const input = container.querySelector('input');
        if (input && !checkbox.checked) {
            input.value = '';
        }
    }
}
window.togglePriceInput = togglePriceInput;

document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    document.getElementById('saveEventBtn')?.addEventListener('click', saveEvent);
    document.getElementById('saveTicketTypeBtn')?.addEventListener('click', saveTicketType);
    document.getElementById('saveScheduleItemBtn')?.addEventListener('click', saveScheduleItem);
    
    // Live local preview for event banner selection
    document.getElementById('eventBannerFile')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const previewContainer = document.getElementById('bannerPreview');
            if (previewContainer) {
                previewContainer.innerHTML = `<img src="${URL.createObjectURL(file)}" class="image-preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px;">`;
            }
        } else {
            const previewContainer = document.getElementById('bannerPreview');
            if (previewContainer) previewContainer.innerHTML = '';
        }
    });
});