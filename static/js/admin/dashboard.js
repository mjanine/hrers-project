/* =================================
   Admin Dashboard JavaScript
   ================================= */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Initialize charts
    initializeLoginChart();
    initializeRoleChart();
    
    // Add event listeners
    addEventListeners();
}

// Initialize Login Activity Chart
function initializeLoginChart() {
    const ctx = document.getElementById('loginChart');
    if (!ctx) return;

    const labels = getLast7Days();
    const data = {
        labels: labels,
        datasets: [{
            label: 'Logins',
            data: [12, 19, 8, 14, 11, 16, 18],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
        }]
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
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Initialize Role Distribution Chart
function initializeRoleChart() {
    const ctx = document.getElementById('roleChart');
    if (!ctx) return;

    const data = {
        labels: ['Admin', 'HR', 'Department Head', 'Employee'],
        datasets: [{
            data: [2, 5, 8, 120],
            backgroundColor: [
                '#2563eb',
                '#8b5cf6',
                '#06b6d4',
                '#64748b'
            ],
            borderColor: '#fff',
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Get last 7 days
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

function addEventListeners() {
    // Add any additional event listeners for dashboard interactions
    console.log('Dashboard initialized');
}
