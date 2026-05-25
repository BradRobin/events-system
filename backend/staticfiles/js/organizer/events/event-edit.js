// ============================================
// ORGANIZER EDIT EVENT
// Handles: Editing existing events
// ============================================

let eventId = window.location.pathname.split('/')[3];
let originalData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadEventData();
    initializeDateTimePickers();
    setupImageUpload();
    setupTicketTypeManager();
    loadCategories();
});

async function loadEventData() {
    showLoading();
    
    const event = await EventAPI.Organizer.getEventForEdit(eventId);
    if (event) {
        populateForm(event);
        originalData = event;
    }
    
    hideLoading();
}

function populateForm(event) {
    document.getElementById('title').value = event.title;
    document.getElementById('description').value = event.description;
    document.getElementById('venue').value = event.venue;
    document.getElementById('address').value = event.address;
    document.getElementById('capacity').value = event.capacity;
    document.getElementById('price').value = event.price;
    document.getElementById('is_published').checked = event.is_published;
    
    if (event.start_date) {
        document.getElementById('start_date').value = formatDateTime(event.start_date);
        document.getElementById('end_date').value = formatDateTime(event.end_date);
    }
    
    if (event.category) {
        document.getElementById('category').value = event.category.id;
    }
    
    if (event.banner_image) {
        const preview = document.getElementById('imagePreview');
        preview.src = event.banner_image;
        preview.style.display = 'block';
        document.getElementById('imagePlaceholder').style.display = 'none';
    }
    
    if (event.ticket_types && event.ticket_types.length) {
        displayTicketTypes(event.ticket_types);
    }
}

function displayTicketTypes(ticketTypes) {
    const container = document.getElementById('ticketTypesContainer');
    container.innerHTML = '';
    ticketTypeIndex = ticketTypes.length;
    
    ticketTypes.forEach((tt, index) => {
        const html = `
            <div class="ticket-type-group" data-index="${index}">
                <div class="ticket-type-header">
                    <h4>Ticket Type ${index + 1}</h4>
                    <button type="button" onclick="removeTicketType(${index})" class="remove-btn">&times;</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ticket Name</label>
                        <input type="text" name="ticket_types[${index}][name]" class="form-control" value="${tt.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Price (KES)</label>
                        <input type="number" name="ticket_types[${index}][price]" class="form-control" step="0.01" value="${tt.price}" required>
                    </div>
                    <div class="form-group">
                        <label>Quantity Available</label>
                        <input type="number" name="ticket_types[${index}][quantity]" class="form-control" value="${tt.quantity_available}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Benefits/Inclusions</label>
                    <textarea name="ticket_types[${index}][benefits]" class="form-control" rows="2">${tt.benefits || ''}</textarea>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

async function updateEvent() {
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        venue: document.getElementById('venue').value,
        address: document.getElementById('address').value,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        capacity: parseInt(document.getElementById('capacity').value),
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value || null,
        is_published: document.getElementById('is_published')?.checked || false,
        ticket_types: getTicketTypes()
    };
    
    if (!validateForm(formData)) return;
    
    showSaving();
    
    const result = await EventAPI.Organizer.updateEvent(eventId, formData);
    if (result) {
        showToast('Event updated successfully!', 'success');
        if (hasChanges(formData)) {
            location.reload();
        }
    }
    
    hideSaving();
}

function hasChanges(newData) {
    return JSON.stringify(originalData) !== JSON.stringify(newData);
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
}

function showLoading() {
    const form = document.getElementById('eventForm');
    if (form) form.style.opacity = '0.5';
}

function hideLoading() {
    const form = document.getElementById('eventForm');
    if (form) form.style.opacity = '1';
}

function showSaving() {
    const btn = document.querySelector('#updateEventBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
}

function hideSaving() {
    const btn = document.querySelector('#updateEventBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Save Changes';
    }
}
