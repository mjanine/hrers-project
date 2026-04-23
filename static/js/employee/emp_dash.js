/* =================================
   Employee Dashboard JavaScript
   ================================= */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
});

let attendanceChartInstance = null;

async function initializeDashboard() {
    await Promise.all([
        loadProfileSummary(),
        loadDashboardNotifications(),
        loadDashboardData(),
    ]);
    await initializeAttendanceChart();
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
    
    // Evaluation card click
    setupEvaluationCard();
    
    // Notification clear button
    setupNotificationPanel();
}

/* =================================
   EVALUATION CARD
   ================================= */

function setupEvaluationCard() {
    const evaluationCard = document.getElementById('evaluationCard');
    
    if (evaluationCard) {
        evaluationCard.addEventListener('click', (e) => {
            e.preventDefault();
            // Navigate to evaluation page
            window.location.href = evaluationCard.getAttribute('href');
        });
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

    notificationsList.innerHTML = '';

    try {
        const response = await fetch('/api/dashboard/notifications');
        if (!response.ok) {
            clearAllNotifications();
            return;
        }

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
                    <p class="notification-message" style="margin: 0; font-weight: bold;">${item.message || 'Notification'}</p>
                    <p class="notification-time" style="margin: 0; font-size: 0.8rem; color: #888;">${item.time || 'Unknown'}</p>
                </div>
            `;
            notificationsList.appendChild(node);
        });
    } catch (error) {
        clearAllNotifications();
    }
}

/* =================================
   ATTENDANCE CHART (EMPLOYEE-SPECIFIC)
   ================================= */

async function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    const labels = getLast7Days();
    const workedHours = await loadAttendanceHours();

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Hours Worked',
                data: workedHours,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderColor: '#2563eb',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }
        ]
    };
    
    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }

    attendanceChartInstance = new Chart(ctx, {
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
                    max: 10,
                    ticks: {
                        callback: function(value) {
                            return value + 'h';
                        },
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

async function loadAttendanceHours() {
    try {
        const response = await fetch('/api/attendance/history');
        if (!response.ok) return [0, 0, 0, 0, 0, 0, 0];

        const payload = await response.json();
        const items = payload.items || [];
        const byDate = {};

        items.forEach(function (item) {
            if (!item.recordDate) return;
            byDate[item.recordDate] = Number(item.workedSeconds || 0) / 3600;
        });

        const values = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            values.push(Number((byDate[key] || 0).toFixed(2)));
        }

        return values;
    } catch (error) {
        return [0, 0, 0, 0, 0, 0, 0];
    }
}

/* =================================
    DATE UTILITIES
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

/* =================================
   DASHBOARD DATA
   ================================= */

async function loadDashboardData() {
    await Promise.all([
        loadEmployeeSummary(),
        loadEvaluationData(),
    ]);
}

async function loadProfileSummary() {
    try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) return;

        const profile = await response.json();
        const welcomeHeading = document.querySelector('.welcome-section h1');
        const roleDepartmentRow = document.querySelector('.welcome-section p');
        const quoteEl = document.getElementById('dailyQuote');

        if (welcomeHeading) {
            welcomeHeading.textContent = `Welcome back, ${profile.firstName || profile.fullName || 'Employee'}!`;
        }

        if (roleDepartmentRow) {
            roleDepartmentRow.innerHTML = `<strong>Role:</strong> ${profile.roleLabel || '--'} | <strong>Department:</strong> ${profile.department || '--'}`;
        }

        if (quoteEl) {
            quoteEl.textContent = `Current position: ${profile.position || profile.roleLabel || '--'}`;
        }
    } catch (error) {
    }
}

async function loadEvaluationData() {
    const scoreEl = document.getElementById('evaluationScore');
    const starsEl = document.getElementById('evaluationStars');
    const dateEl = document.getElementById('evaluationDate');

    let score = 4.0;
    let evaluatedDate = new Date().toLocaleDateString();

    try {
        const response = await fetch('/api/attendance/history');
        if (response.ok) {
            const payload = await response.json();
            const items = payload.items || [];
            const counted = items.filter(function (item) {
                return Number(item.workedSeconds || 0) > 0;
            });
            const totalHours = counted.reduce(function (acc, item) {
                return acc + (Number(item.workedSeconds || 0) / 3600);
            }, 0);
            const avgHours = counted.length ? totalHours / counted.length : 0;
            score = Math.max(3.0, Math.min(5.0, 3.0 + (avgHours / 8) * 2));
            if (items[0] && items[0].recordDate) {
                evaluatedDate = new Date(items[0].recordDate).toLocaleDateString();
            }
        }
    } catch (error) {
    }

    const roundedScore = Number(score.toFixed(1));
    const fullStars = Math.max(1, Math.min(5, Math.round(roundedScore)));
    const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    
    if (scoreEl) {
        animateScore(scoreEl, 0, roundedScore, 800);
    }
    
    if (starsEl) {
        setTimeout(() => {
            starsEl.textContent = stars;
        }, 800);
    }
    
    if (dateEl) {
        dateEl.textContent = `Last evaluated: ${evaluatedDate}`;
    }
}

async function loadEmployeeSummary() {
    const latestTimeInEl = document.getElementById('latestTimeIn');
    const leaveCreditsEl = document.getElementById('leaveCredits');

    let latestTimeInText = 'No recent login';
    let remainingCredits = 0;

    try {
        const todayResponse = await fetch('/api/attendance/today');
        if (todayResponse.ok) {
            const todayPayload = await todayResponse.json();
            if (todayPayload.timeIn) {
                latestTimeInText = new Date(todayPayload.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
    } catch (error) {
    }

    try {
        const leaveResponse = await fetch('/api/leave-credits');
        if (leaveResponse.ok) {
            const leavePayload = await leaveResponse.json();
            remainingCredits = Number(leavePayload.remaining || 0);
        }
    } catch (error) {
    }

    if (latestTimeInEl) {
        latestTimeInEl.textContent = latestTimeInText;
    }
    if (leaveCreditsEl) {
        leaveCreditsEl.textContent = `Remaining: ${remainingCredits} Days`;
    }
}

function animateScore(element, start, end, duration) {
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = (progress * (end - start) + start).toFixed(1);
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    
    requestAnimationFrame(step);
}