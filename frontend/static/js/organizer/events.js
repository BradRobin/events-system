// frontend/static/js/organizer/events.js
let currentEventId = null;
let currentPage = 1;
let ticketTypes = [];
let scheduleItems = [];
let analyticsChart = null;
let selectionMode = false;
let selectedEventIds = new Set();
let lastLoadedEvents = [];

function updateSelectionUI() {
    const bulkBar = document.getElementById('eventsBulkActions');
    const countEl = document.getElementById('eventsSelectedCount');
    const bulkDeleteBtn = document.getElementById('bulkDeleteEventsBtn');
    const toggleBtn = document.getElementById('toggleEventSelectionBtn');
    const count = selectedEventIds.size;

    if (bulkBar) bulkBar.classList.toggle('d-none', !selectionMode);
    if (countEl) countEl.textContent = `${count} selected`;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = count === 0;
    if (toggleBtn) {
        toggleBtn.innerHTML = selectionMode
            ? '<i class="fas fa-times me-2"></i>Cancel selection'
            : '<i class="fas fa-check-square me-2"></i>Select events';
        toggleBtn.classList.toggle('btn-outline-secondary', !selectionMode);
        toggleBtn.classList.toggle('btn-secondary', selectionMode);
    }

    document.querySelectorAll('.event-select-wrap').forEach((wrap) => {
        wrap.classList.toggle('d-none', !selectionMode);
    });
    document.getElementById('eventsContainer')?.classList.toggle('selection-mode', selectionMode);
    document.querySelectorAll('.event-select-checkbox').forEach((cb) => {
        cb.checked = selectedEventIds.has(String(cb.value));
    });
}

function toggleEventSelection(eventId, checked) {
    const id = String(eventId);
    if (checked) selectedEventIds.add(id);
    else selectedEventIds.delete(id);
    updateSelectionUI();
}

function clearEventSelection() {
    selectedEventIds.clear();
    updateSelectionUI();
}

function setSelectionMode(enabled) {
    selectionMode = enabled;
    if (!selectionMode) clearEventSelection();
    updateSelectionUI();
}

// Load events grid
async function loadEvents(page = 1) {
    try {
        const data = await OrganizerAPI.events.getAll(page, 12);
        const container = document.getElementById('eventsContainer');
        const events = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
        lastLoadedEvents = events;

        if (!events.length) {
            container.innerHTML = '<div class="text-center text-muted col-12">No events found</div>';
            updateSelectionUI();
            return;
        }

        container.innerHTML = events.map(event => {
            const title = escapeHtml(event.name || event.title || 'Untitled Event');
            const titleAttr = escapeHtml(event.name || event.title || 'Untitled Event');
            const dateValue = event.date || event.start_date || '';
            const dateText = dateValue ? new Date(dateValue).toLocaleDateString() : '--';
            const ticketsSold = event.tickets_sold ?? event.sold ?? 0;
            const capacity = event.capacity || 0;
            const status = event.status || 'draft';
            const badgeClass = status === 'published' || status === 'active' ? 'bg-success' : status === 'draft' ? 'bg-secondary' : status === 'approved' ? 'bg-info' : 'bg-danger';
            const isSelected = selectedEventIds.has(String(event.id));
            const selectHidden = selectionMode ? '' : 'd-none';
            return `
            <div class="col-md-4 col-lg-3">
                <div class="event-card${isSelected ? ' event-card-selected' : ''}" data-event-id="${event.id}">
                    <div class="event-image" style="background-image: url('${event.image_url || '/static/images/placeholder.jpg'}')">
                        <label class="event-select-wrap ${selectHidden}" onclick="event.stopPropagation()">
                            <input type="checkbox" class="event-select-checkbox" value="${event.id}" ${isSelected ? 'checked' : ''} aria-label="Select ${titleAttr}">
                        </label>
                        <div class="event-status"><span class="badge ${badgeClass}">${status}</span></div>
                        <div class="event-card-menu dropdown">
                            <button type="button" class="event-card-menu-btn" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" aria-label="Event options">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end event-card-dropdown">
                                <li>
                                    <button type="button" class="dropdown-item text-danger delete-event-btn" data-id="${event.id}" data-title="${titleAttr}">
                                        <i class="fas fa-trash me-2"></i>Delete Event
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="p-3 event-card-body">
                        <h6 class="mb-1">${title}</h6>
                        <small class="text-muted">${dateText}</small>
                        <div class="mt-2"><i class="fas fa-ticket-alt"></i> ${ticketsSold}/${capacity}</div>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        attachEventCardMenus();
        updateSelectionUI();

        if (typeof renderPagination === 'function' && data && data.total_pages) {
            renderPagination(data, page, (newPage) => { currentPage = newPage; loadEvents(currentPage); }, 'eventsPagination');
        }
    } catch(e) {
        console.error(e);
        if(window.showToast) window.showToast('Failed to load events', 'error');
    }
}

function attachEventCardMenus() {
    document.querySelectorAll('.event-card-menu, .event-card-menu-btn, .event-card-dropdown').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.delete-event-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = btn.closest('.dropdown');
            if (dropdown) {
                const toggle = dropdown.querySelector('[data-bs-toggle="dropdown"]');
                const instance = toggle ? bootstrap.Dropdown.getInstance(toggle) : null;
                if (instance) instance.hide();
            }
            await deleteEvent(btn.dataset.id, btn.dataset.title);
        });
    });

    document.querySelectorAll('.event-select-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleEventSelection(cb.value, cb.checked);
            const card = cb.closest('.event-card');
            if (card) card.classList.toggle('event-card-selected', cb.checked);
        });
    });
}

async function deleteEvents(eventIds, label = 'these events') {
    const ids = [...new Set(eventIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)))];
    if (!ids.length) return false;

    const message = ids.length === 1
        ? `Are you sure you want to permanently delete ${label}? This action cannot be undone.`
        : `Are you sure you want to permanently delete ${ids.length} events? This action cannot be undone.`;

    if (!confirm(message)) return false;

    try {
        let result;
        if (ids.length === 1) {
            result = await OrganizerAPI.events.delete(ids[0]);
        } else {
            result = await OrganizerAPI.events.bulkDelete(ids);
        }

        if (result && result.success === false) {
            throw new Error(result.message || 'Failed to delete event(s)');
        }

        ids.forEach((id) => selectedEventIds.delete(String(id)));
        if (window.showToast) {
            window.showToast(
                result?.message || (ids.length === 1 ? 'Event deleted successfully' : `${ids.length} events deleted successfully`),
                'success'
            );
        }
        await loadEvents(currentPage);
        return true;
    } catch (e) {
        if (window.showToast) window.showToast(e.message || 'Failed to delete event(s)', 'error');
        return false;
    }
}

async function deleteEvent(eventId, eventTitle = '') {
    const label = eventTitle ? `"${eventTitle}"` : 'this event';
    return deleteEvents([eventId], label);
}

async function deleteSelectedEvents() {
    if (!selectedEventIds.size) return;
    await deleteEvents([...selectedEventIds]);
}

// Edit or create event
async function editEvent(eventId = null) {
    currentEventId = eventId;
    resetEventForm();
    if (eventId) {
        document.getElementById('eventModalTitle').innerText = 'Edit Event';
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
        if (e.upgrade_required) {
            if (typeof window.showOrganizerUpgradeModal === 'function') {
                window.showOrganizerUpgradeModal(e.message);
            } else {
                if (window.confirm((e.message || 'Upgrade required') + '\n\nGo to Plans & Billing now?')) {
                    window.location.href = '/organizer/billing/';
                }
            }
            return;
        }
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
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;

document.addEventListener('DOMContentLoaded', () => {
    loadEvents();

    document.getElementById('eventsContainer')?.addEventListener('click', (e) => {
        if (e.target.closest('.event-card-menu, .event-select-wrap, .dropdown-menu, .delete-event-btn')) {
            return;
        }
        const card = e.target.closest('.event-card[data-event-id]');
        if (!card) return;

        const eventId = parseInt(card.dataset.eventId, 10);
        if (Number.isNaN(eventId)) return;

        if (selectionMode) {
            const cb = card.querySelector('.event-select-checkbox');
            if (!cb) return;
            cb.checked = !cb.checked;
            toggleEventSelection(cb.value, cb.checked);
            card.classList.toggle('event-card-selected', cb.checked);
            return;
        }

        if (e.target.closest('.event-card-body, .event-image')) {
            editEvent(eventId);
        }
    });

    document.getElementById('toggleEventSelectionBtn')?.addEventListener('click', () => {
        setSelectionMode(!selectionMode);
    });
    document.getElementById('clearEventSelectionBtn')?.addEventListener('click', () => {
        clearEventSelection();
    });
    document.getElementById('selectAllEventsBtn')?.addEventListener('click', () => {
        lastLoadedEvents.forEach((event) => selectedEventIds.add(String(event.id)));
        updateSelectionUI();
        document.querySelectorAll('.event-select-checkbox').forEach((cb) => {
            cb.checked = true;
            cb.closest('.event-card')?.classList.add('event-card-selected');
        });
    });
    document.getElementById('bulkDeleteEventsBtn')?.addEventListener('click', () => {
        deleteSelectedEvents();
    });

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        editEvent(parseInt(editId, 10));
    } else if (window.location.pathname.includes('/create') || params.get('create') === '1') {
        resetEventForm();
        document.getElementById('eventModalTitle').innerText = 'Create New Event';
        document.getElementById('saveEventBtn').innerText = 'Create Event';
        new bootstrap.Modal(document.getElementById('eventModal')).show();
    }
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