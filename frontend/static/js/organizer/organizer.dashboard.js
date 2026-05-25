// EventHub Dashboard Coordinator - Redesigned for ORGANIZER_API_CONFIG
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const elements = {
        eventsCount: document.getElementById("eventsCount"),
        ticketsCount: document.getElementById("ticketsCount"),
        revenueCount: document.getElementById("revenueCount"),
        attendeesCount: document.getElementById("attendeesCount"),
        eventsTableBody: document.getElementById("eventsTableBody"),
        
        // Modal Elements
        createEventModal: document.getElementById("createEventModal"),
        openModalBtn: document.getElementById("openModalBtn"),
        closeModalBtn: document.getElementById("closeModalBtn"),
        cancelModalBtn: document.getElementById("cancelModalBtn"),
        createEventForm: document.getElementById("createEventForm"),
        
        // Filter Elements
        eventSearch: document.getElementById("eventSearch"),
        statusFilter: document.getElementById("statusFilter"),
        
        toastContainer: document.getElementById("toastContainer")
    };

    // Chart References
    let salesTrendChart = null;
    let categoryDistributionChart = null;

    // Toast Notification System
    function showToast(message, type = 'success') {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const icon = document.createElement("i");
        icon.className = type === 'success' 
            ? 'fa-solid fa-circle-check' 
            : 'fa-solid fa-circle-exclamation';
            
        const text = document.createElement("span");
        text.innerText = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        elements.toastContainer.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'toast-slide-out 0.3s forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    }

    // Numbers animation counter helper
    function animateCounter(element, targetValue, duration = 800, prefix = '') {
        if (!element) return;
        let startTimestamp = null;
        const startValue = 0;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (targetValue - startValue) + startValue);
            
            element.innerText = `${prefix}${currentValue.toLocaleString()}`;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        
        window.requestAnimationFrame(step);
    }

    // Refresh metrics on topbar using window.OrganizerAPI
    async function updateDashboardMetrics() {
        try {
            const stats = await window.OrganizerAPI.dashboard.getStats();
            
            // Animate counter values
            animateCounter(elements.eventsCount, stats.events_count || 0, 800);
            animateCounter(elements.ticketsCount, stats.tickets_sold || 0, 1000);
            animateCounter(elements.revenueCount, stats.revenue || 0, 1200, 'KSh ');
            animateCounter(elements.attendeesCount, stats.attendees || 0, 1000);
        } catch (error) {
            console.error("Error updating metrics:", error);
            showToast("Failed to fetch dashboard statistics.", "error");
        }
    }

    // Build event table rows dynamically using window.OrganizerAPI
    async function renderEventsTable() {
        try {
            const events = await window.OrganizerAPI.events.getAll();
            const searchQuery = elements.eventSearch.value.toLowerCase().trim();
            const selectedStatus = elements.statusFilter.value;
            
            elements.eventsTableBody.innerHTML = "";

            const filteredEvents = events.filter(event => {
                const matchesSearch = event.name.toLowerCase().includes(searchQuery) || 
                                      event.location.toLowerCase().includes(searchQuery);
                const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus;
                return matchesSearch && matchesStatus;
            });

            if (filteredEvents.length === 0) {
                elements.eventsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--gray-muted); padding: 40px 0;">
                            <i class="fa-regular fa-calendar-times" style="font-size: 2.5rem; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                            No events found matching current criteria.
                        </td>
                    </tr>
                `;
                return;
            }

            filteredEvents.forEach(event => {
                const tr = document.createElement("tr");
                
                // Format Date beautifully
                const eventDate = new Date(event.date);
                const formattedDate = eventDate.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                });
                const formattedTime = eventDate.toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit'
                });

                tr.innerHTML = `
                    <td class="event-name-td">${event.name}</td>
                    <td>
                        <div style="font-weight: 500;">${formattedDate}</div>
                        <div style="font-size: 0.8rem; color: var(--gray-muted);">${formattedTime}</div>
                    </td>
                    <td><i class="fa-solid fa-location-dot" style="color: var(--primary); margin-right: 4px;"></i> ${event.location}</td>
                    <td>
                        <div style="font-weight: 500;">${event.sold} / ${event.capacity}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-muted);">Tickets</div>
                    </td>
                    <td style="font-weight: 600; color: var(--dark);">KSh ${(event.revenue || 0).toLocaleString()}</td>
                    <td>
                        <span class="status-badge ${event.status}">${event.status}</span>
                    </td>
                    <td style="text-align: right;">
                        <button class="btn-action-icon delete-event-btn" data-id="${event.id}" title="Cancel Event">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                `;

                elements.eventsTableBody.appendChild(tr);
            });

            // Add Delete Event Handlers
            document.querySelectorAll(".delete-event-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const eventId = e.currentTarget.getAttribute("data-id");
                    if (confirm("Are you sure you want to cancel this event? This will update local analytics databases.")) {
                        await window.OrganizerAPI.events.delete(eventId);
                        showToast("Event successfully removed!", "success");
                        refreshAllData();
                    }
                });
            });
        } catch (error) {
            console.error("Error rendering table:", error);
        }
    }

    // Render / Re-render Chart.js Analytics Graphs
    async function renderCharts() {
        try {
            const events = await window.OrganizerAPI.events.getAll();
            if (events.length === 0) return;
            
            // Destructure contexts
            const salesCtx = document.getElementById("salesTrendChart").getContext("2d");
            const categoryCtx = document.getElementById("categoryDistributionChart").getContext("2d");

            // 1. Line Chart: Ticket Sales Trend
            const recentEvents = [...events].slice(0, 6).reverse();
            const salesLabels = recentEvents.map(e => e.name.length > 18 ? e.name.substring(0, 15) + '...' : e.name);
            const salesData = recentEvents.map(e => e.sold);

            if (salesTrendChart) {
                salesTrendChart.destroy();
            }

            // Beautiful Gradient Accent for Area Chart (Vibrant Orange Theme)
            const primaryGradient = salesCtx.createLinearGradient(0, 0, 0, 300);
            primaryGradient.addColorStop(0, 'rgba(255, 107, 0, 0.4)');
            primaryGradient.addColorStop(1, 'rgba(255, 107, 0, 0.0)');

            salesTrendChart = new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: salesLabels,
                    datasets: [{
                        label: 'Tickets Purchased',
                        data: salesData,
                        borderColor: '#ff6b00',
                        borderWidth: 3,
                        backgroundColor: primaryGradient,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#111111',
                        pointBorderColor: '#ff6b00',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { borderDash: [5, 5], color: '#222222' },
                            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
                        }
                    }
                }
            });

            // 2. Doughnut Chart: Category Distribution
            const categories = {};
            events.forEach(e => {
                categories[e.category] = (categories[e.category] || 0) + (e.revenue || 0);
            });

            const categoryLabels = Object.keys(categories);
            const categoryData = Object.values(categories);

            if (categoryDistributionChart) {
                categoryDistributionChart.destroy();
            }

            categoryDistributionChart = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: [
                            '#ff6b00', // Pure Premium Orange (Tech)
                            '#10b981', // Music
                            '#3b82f6', // Business
                            '#ef4444', // Health
                            '#8b5cf6'  // Education
                        ],
                        borderWidth: 2,
                        borderColor: '#111111'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e2e8f0',
                                font: { family: 'Plus Jakarta Sans', size: 12 },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        } catch (error) {
            console.error("Error drawing charts:", error);
        }
    }

    // Refresh entire Dashboard Data flow
    function refreshAllData() {
        updateDashboardMetrics();
        renderEventsTable();
        renderCharts();
    }

    // Modal Control Handlers
    function toggleModal(show = true) {
        if (show) {
            elements.createEventModal.classList.add("active");
            // Set default date to today plus 1 week
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setMinutes(nextWeek.getMinutes() - nextWeek.getTimezoneOffset());
            document.getElementById("eventDate").value = nextWeek.toISOString().slice(0, 16);
        } else {
            elements.createEventModal.classList.remove("active");
            elements.createEventForm.reset();
        }
    }

    // Listeners
    elements.openModalBtn.addEventListener("click", () => toggleModal(true));
    elements.closeModalBtn.addEventListener("click", () => toggleModal(false));
    elements.cancelModalBtn.addEventListener("click", () => toggleModal(false));
    
    // Close modal when clicking outside elements container
    elements.createEventModal.addEventListener("click", (e) => {
        if (e.target === elements.createEventModal) {
            toggleModal(false);
        }
    });

    // Close on escape key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && elements.createEventModal.classList.contains("active")) {
            toggleModal(false);
        }
    });

    // Handle form submit to add local event using window.OrganizerAPI
    elements.createEventForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("eventName").value.trim();
        const date = document.getElementById("eventDate").value;
        const location = document.getElementById("eventLocation").value.trim();
        const capacity = document.getElementById("ticketCapacity").value;
        const price = document.getElementById("ticketPrice").value;
        const category = document.getElementById("eventCategory").value;
        const status = document.getElementById("eventStatus").value;

        if (!name || !date || !location || !capacity || !price || !category) {
            showToast("Please fill in all mandatory fields.", "error");
            return;
        }

        try {
            const newEvent = await window.OrganizerAPI.events.create({
                name, date, location, capacity, price, category, status
            });

            if (newEvent) {
                showToast(`Event "${name}" published successfully!`, "success");
                toggleModal(false);
                refreshAllData();
            } else {
                showToast("Failed to publish event. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error creating event:", error);
            showToast("Something went wrong while publishing the event.", "error");
        }
    });

    // Handle search input and filters dynamically
    elements.eventSearch.addEventListener("input", renderEventsTable);
    elements.statusFilter.addEventListener("change", renderEventsTable);

    // Initial Load
    refreshAllData();
});
