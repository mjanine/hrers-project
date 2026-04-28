/* =================================
   School Director Dashboard JavaScript
   ================================= */

// Daily quote will be loaded from the server if available.

// Initialize Dashboard on DOM Load
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDailyQuote();
});

let attendanceChartInstance = null;

function initializeDashboard() {
    // Initialize charts
    initializeAttendanceChart();
    
    // Load dynamic data
    loadDashboardData();
    loadDashboardNotifications();
    
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
            window.location.href = '/templates/sd/sd_employeelist.html';
            break;
        case 'Approve Leave':
            window.location.href = '/templates/sd/sd_leaverequest.html';
            break;
        case 'Generate Report':
            window.location.href = '/templates/sd/sd_reports.html';
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

async function loadDashboardNotifications() {
    const notificationsList = document.querySelector('.notifications-list');
    if (!notificationsList) return;

    try {
        const response = await fetch('/api/dashboard/notifications');
        if (!response.ok) return;

        const payload = await response.json();
        const items = payload.items || [];

        if (!items.length) {
            clearAllNotifications();
            return;
        }

        notificationsList.innerHTML = '';
        items.forEach(function (item) {
            const node = document.createElement('div');
            node.className = 'notification-item';
            node.innerHTML = `
                <div class="notification-icon ${item.type || 'info'}">
                    <i class="fas ${item.type === 'success' ? 'fa-check-circle' : (item.type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${item.message || 'Notification'}</p>
                    <p class="notification-time">${item.time || 'Unknown'}</p>
                </div>
            `;
            notificationsList.appendChild(node);
        });
    } catch (error) {
    }
}

/* =================================
   ATTENDANCE CHART
   ================================= */

function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLast7Days(),
            datasets: [
                {
                    label: 'Attendance Rate (%)',
                    data: [],
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }
            ]
        },
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
                    max: 100,
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
        // Try loading quote from server; fall back to empty string
        quoteElement.textContent = '';
        fetch('/api/reports/quote').then(r => {
            if (!r.ok) return null;
            return r.json();
        }).then(payload => {
            if (payload && payload.quote) quoteElement.textContent = payload.quote;
        }).catch(() => {});
    }
}

function loadDailyQuote() {
    setDailyQuote();
    // Refresh quote daily
    setInterval(setDailyQuote, 24 * 60 * 60 * 1000);
}

/* =================================
   DASHBOARD DATA
   ================================= */

async function loadDashboardData() {
    const totalEmployeesEl = document.getElementById('totalEmployees');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const onLeaveEl = document.getElementById('onLeave');

    let totalEmployees = 0;
    let onLeaveCount = 0;

    try {
        const [kpiResponse, chartResponse] = await Promise.all([
            fetch('/api/reports/kpi'),
            fetch('/api/reports/charts'),
        ]);

        if (kpiResponse.ok) {
            const payload = await kpiResponse.json();
            totalEmployees = Number(payload.totalEmployees || totalEmployees);
        }

        if (chartResponse.ok) {
            const chartPayload = await chartResponse.json();
            const statusData = (chartPayload.statusBreakdown && chartPayload.statusBreakdown.data) || [];
            onLeaveCount = Number(statusData[1] || onLeaveCount);

            if (attendanceChartInstance && chartPayload.attendanceTrend) {
                attendanceChartInstance.data.labels = chartPayload.attendanceTrend.labels || getLast7Days();
                attendanceChartInstance.data.datasets[0].data = chartPayload.attendanceTrend.data || [];
                attendanceChartInstance.update();
            }
        }
    } catch (error) {
    }

    const activeEmployees = Math.max(totalEmployees - onLeaveCount, 0);

    if (totalEmployeesEl) {
        animateNumber(totalEmployeesEl, 0, totalEmployees, 1000);
    }
    if (activeEmployeesEl) {
        animateNumber(activeEmployeesEl, 0, activeEmployees, 1000);
    }
    if (onLeaveEl) {
        animateNumber(onLeaveEl, 0, onLeaveCount, 800);
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