// ============================================
// ORGANIZER CREATE EVENT
// Handles: Creating new events with images, ticket types, etc.
// ============================================

let ticketTypeIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeDateTimePickers();
    setupImageUpload();
    setupTicketTypeManager();
    loadCategories();
});

function initializeDateTimePickers() {
    flatpickr("#start_date", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        onChange: updateEndDateMin
    });
    
    flatpickr("#end_date", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today"
    });
}

function updateEndDateMin(selectedDates) {
    const endPicker = flatpickr("#end_date", {});
    if (selectedDates[0]) {
        endPicker.set('minDate', selectedDates[0]);
    }
}

function setupImageUpload() {
    const imageInput = document.getElementById('banner_image');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('imagePreview');
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    document.getElementById('imagePlaceholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function setupTicketTypeManager() {
    document.getElementById('addTicketType')?.addEventListener('click', () => {
        addTicketTypeField();
    });
}

function addTicketTypeField() {
    const container = document.getElementById('ticketTypesContainer');
    const index = ticketTypeIndex++;
    
    const html = `
        <div class="ticket-type-group" data-index="${index}">
            <div class="ticket-type-header">
                <h4>Ticket Type ${index + 1}</h4>
                <button type="button" onclick="removeTicketType(${index})" class="remove-btn">&times;</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ticket Name</label>
                    <input type="text" name="ticket_types[${index}][name]" class="form-control" placeholder="e.g., VIP, Regular" required>
                </div>
                <div class="form-group">
                    <label>Price (KES)</label>
                    <input type="number" name="ticket_types[${index}][price]" class="form-control" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Quantity Available</label>
                    <input type="number" name="ticket_types[${index}][quantity]" class="form-control" required>
                </div>
            </div>
            <div class="form-group">
                <label>Benefits/Inclusions</label>
                <textarea name="ticket_types[${index}][benefits]" class="form-control" rows="2" placeholder="What's included with this ticket?"></textarea>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
}

window.removeTicketType = function(index) {
    const group = document.querySelector(`.ticket-type-group[data-index="${index}"]`);
    if (group) group.remove();
};

async function loadCategories() {
    const categories = await EventAPI.Attendee.getCategories();
    const select = document.getElementById('category');
    if (categories && select) {
        select.innerHTML = '<option value="">Select Category</option>' + 
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
}

async function createEvent() {
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
    
    showLoading();
    
    const result = await EventAPI.Organizer.createEvent(formData);
    if (result) {
        showToast('Event created successfully!', 'success');
        window.location.href = `/organizer/events/${result.event_id}/edit/`;
    }
    
    hideLoading();
}

function getTicketTypes() {
    const types = [];
    const groups = document.querySelectorAll('.ticket-type-group');
    groups.forEach(group => {
        const index = group.dataset.index;
        types.push({
            name: document.querySelector(`input[name="ticket_types[${index}][name]"]`)?.value,
            price: parseFloat(document.querySelector(`input[name="ticket_types[${index}][price]"]`)?.value),
            quantity: parseInt(document.querySelector(`input[name="ticket_types[${index}][quantity]"]`)?.value),
            benefits: document.querySelector(`textarea[name="ticket_types[${index}][benefits]"]`)?.value
        });
    });
    return types;
}

function validateForm(formData) {
    if (!formData.title) { alert('Please enter event title'); return false; }
    if (!formData.description) { alert('Please enter event description'); return false; }
    if (!formData.venue) { alert('Please enter venue'); return false; }
    if (!formData.start_date) { alert('Please select start date/time'); return false; }
    if (!formData.end_date) { alert('Please select end date/time'); return false; }
    if (formData.capacity <= 0) { alert('Please enter valid capacity'); return false; }
    if (formData.price <= 0) { alert('Please enter valid price'); return false; }
    return true;
}

function showLoading() {
    const btn = document.querySelector('#createEventBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
}

function hideLoading() {
    const btn = document.querySelector('#createEventBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Create Event';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
