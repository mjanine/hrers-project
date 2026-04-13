/* =================================
   Employee Dashboard JavaScript
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

/* =================================
   ATTENDANCE CHART (EMPLOYEE-SPECIFIC)
   ================================= */

function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    // Get last 7 days
    const labels = getLast7Days();
    
    // Employee-specific attendance data (simulated)
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Hours Worked',
                data: [8, 8.5, 8, 7.5, 8, 8.5, 0],
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
                    max: 10,
                    ticks: {
                        callback: function(value) {
                            return value + 'h';
                        }
                    },
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
    // Load evaluation data
    loadEvaluationData();
}

function loadEvaluationData() {
    // Simulate loading employee evaluation data
    const scoreEl = document.getElementById('evaluationScore');
    const starsEl = document.getElementById('evaluationStars');
    const dateEl = document.getElementById('evaluationDate');
    
    // Simulated employee evaluation data
    const evaluationData = {
        score: 4.2,
        stars: '⭐⭐⭐⭐',
        date: 'March 15, 2026'
    };
    
    if (scoreEl) {
        animateScore(scoreEl, 0, evaluationData.score, 800);
    }
    
    if (starsEl) {
        setTimeout(() => {
            starsEl.textContent = evaluationData.stars;
        }, 800);
    }
    
    if (dateEl) {
        dateEl.textContent = `Last evaluated: ${evaluationData.date}`;
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