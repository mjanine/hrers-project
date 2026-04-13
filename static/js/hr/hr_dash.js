/* =================================
   HR Dashboard JavaScript
   ================================= */

// Daily Quotes Array
const inspirationalQuotes = [
    "Success is the sum of small efforts repeated day in and day out.",
    "The only way to do great work is to love what you do.",
    "Your work is going to fill a large part of your life.",
    "Great things never come from comfort zones.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "Success doesn't just find you. You have to go out and get it.",
    "Opportunities don't happen. You create them.",
    "Believe you can and you're halfway there.",
    "Excellence is not a skill, it's an attitude."
];

// Initialize Dashboard on DOM Load
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDailyQuote();
});

function initializeDashboard() {
    // Initialize charts
    initializeAttendanceChart();
    
    // Load dynamic data
    loadDashboardData();
    
    // Setup quote rotation
    setDailyQuote();
}

/* =================================
   SIDEBAR FUNCTIONALITY
   ================================= */

function setupEventListeners() {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');
    
    // Close button (only when expanded)
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('collapsed');
        });
    }
    
    // Open via logo click
    if (logoToggle) {
        logoToggle.addEventListener('click', () => {
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }
        });
    }
    
    // Set menu item attributes for tooltips
    menuItems.forEach(item => {
        const text = item.querySelector('span');
        if (text) {
            item.setAttribute('data-text', text.innerText);
        }
        
        item.addEventListener('click', () => {
            document.querySelector('.menu-item.active')?.classList.remove('active');
            item.classList.add('active');
        });
    });
    
    // Quick action buttons
    setupQuickActionButtons();
    
    // Notification clear button
    setupNotificationPanel();
}

/* =================================
   QUICK ACTIONS
   ================================= */

function setupQuickActionButtons() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach((card) => {
        card.addEventListener('click', () => {
            const actionText = card.innerText.trim();
            handleQuickAction(actionText);
        });
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'Add Employee':
            console.log('Opening Add Employee dialog...');
            // TODO: Navigate to add employee page or open modal
            break;
        case 'Approve Leave':
            console.log('Opening Approve Leave dialog...');
            // TODO: Navigate to leave approval page
            break;
        case 'Generate Report':
            console.log('Opening Generate Report dialog...');
            // TODO: Navigate to report generation page
            break;
    }
}

/* =================================
   NOTIFICATION PANEL
   ================================= */

function setupNotificationPanel() {
    const clearBtn = document.querySelector('.notification-clear');
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearAllNotifications();
        });
    }
}

function clearAllNotifications() {
    const notificationsList = document.querySelector('.notifications-list');
    if (notificationsList) {
        notificationsList.innerHTML = '';
        const emptyMessage = document.createElement('div');
        emptyMessage.style.cssText = 'padding: 2rem 1.5rem; text-align: center; color: var(--hr-text-light); font-size: 0.9rem;';
        emptyMessage.innerText = 'No notifications';
        notificationsList.appendChild(emptyMessage);
    }
}

/* =================================
   ATTENDANCE CHART
   ================================= */

function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    // Get last 7 days
    const labels = getLast7Days();
    
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Present',
                data: [420, 415, 425, 428, 420, 422, 428],
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            },
            {
                label: 'Absent',
                data: [30, 35, 25, 22, 30, 28, 22],
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#ef4444',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }
        ]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12, weight: '500' },
                        color: '#1e293b'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 450,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    }
                },
                x: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

/* =================================
   DATE & QUOTE UTILITIES
   ================================= */

function getLast7Days() {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayIndex = date.getDay();
        const day = dayNames[dayIndex];
        const dateNum = date.getDate();
        days.push(`${day} ${dateNum}`);
    }
    
    return days;
}

function setDailyQuote() {
    const quoteElement = document.getElementById('dailyQuote');
    if (quoteElement) {
        // Get quote based on day of year for consistency
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const quoteIndex = dayOfYear % inspirationalQuotes.length;
        
        quoteElement.textContent = inspirationalQuotes[quoteIndex];
    }
}

function loadDailyQuote() {
    setDailyQuote();
    
    // Refresh quote at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
        setDailyQuote();
        // Then refresh every 24 hours
        setInterval(setDailyQuote, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
}

/* =================================
   DASHBOARD DATA
   ================================= */

function loadDashboardData() {
    // Simulate loading KPI data
    // In a real application, this would be fetched from the backend
    
    const totalEmployeesEl = document.getElementById('totalEmployees');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const onLeaveEl = document.getElementById('onLeave');
    
    // Animate numbers
    if (totalEmployeesEl) {
        animateNumber(totalEmployeesEl, 0, 450, 1000);
    }
    if (activeEmployeesEl) {
        animateNumber(activeEmployeesEl, 0, 428, 1000);
    }
    if (onLeaveEl) {
        animateNumber(onLeaveEl, 0, 22, 800);
    }
}

function animateNumber(element, start, end, duration) {
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    
    requestAnimationFrame(step);
}