// File: frontend/static/js/attendee/sections/stats-counter.js

let hasAnimated = false;

function animateNumber(element, target, isPercentage) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = isPercentage ? target + '%' : target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 30);
}

function startCounters() {
    if (hasAnimated) return;
    hasAnimated = true;
    
    const events = document.getElementById('countEvents');
    const tickets = document.getElementById('countTickets');
    const organizers = document.getElementById('countOrganizers');
    const satisfaction = document.getElementById('countSatisfaction');
    
    if (events) animateNumber(events, 1248, false);
    if (tickets) animateNumber(tickets, 15842, false);
    if (organizers) animateNumber(organizers, 326, false);
    if (satisfaction) animateNumber(satisfaction, 98, true);
}

function resetCounters() {
    if (!hasAnimated) return;
    hasAnimated = false;
    
    const events = document.getElementById('countEvents');
    const tickets = document.getElementById('countTickets');
    const organizers = document.getElementById('countOrganizers');
    const satisfaction = document.getElementById('countSatisfaction');
    
    if (events) events.textContent = '0';
    if (tickets) tickets.textContent = '0';
    if (organizers) organizers.textContent = '0';
    if (satisfaction) satisfaction.textContent = '0';
}

// Check when stats section is visible
const statsSection = document.getElementById('statsSection');

function checkVisibility() {
    if (!statsSection) return;
    const rect = statsSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight - 100 && rect.bottom > 100;
    
    if (isVisible) {
        startCounters();
    } else {
        resetCounters();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkVisibility();
    window.addEventListener('scroll', checkVisibility);
});
