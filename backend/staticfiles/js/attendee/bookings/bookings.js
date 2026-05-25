// ============================================
// BOOKINGS SHARED FUNCTIONS
// Handles: Common booking operations
// ============================================

// Cancel booking
async function cancelBooking(bookingId, reason = '') {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return false;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ reason: reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking cancelled successfully', 'success');
            setTimeout(() => {
                window.location.href = '/my-tickets/';
            }, 1500);
            return true;
        } else {
            showToast(data.message || 'Cancellation failed', 'error');
            return false;
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// Download ticket
async function downloadTicket(ticketId) {
    showLoading();
    
    try {
        window.open(`/api/tickets/${ticketId}/download/`, '_blank');
        showToast('Download started', 'success');
    } catch (error) {
        showToast('Download failed', 'error');
    } finally {
        hideLoading();
    }
}

// Print ticket
function printTicket() {
    window.print();
}

// Add to Apple Wallet / Google Pay
async function addToWallet(ticketId) {
    showLoading();
    
    try {
        const response = await fetch(`/api/tickets/${ticketId}/wallet/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.pass_url) {
            window.location.href = data.pass_url;
        } else {
            showToast('Failed to add to wallet', 'error');
        }
    } catch (error) {
        showToast('Error adding to wallet', 'error');
    } finally {
        hideLoading();
    }
}

// Share ticket
function shareTicket(ticketId) {
    const url = `${window.location.origin}/ticket/${ticketId}/`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Event Ticket',
            text: 'Check out my ticket for this event!',
            url: url
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
    }
}

// Helper functions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
