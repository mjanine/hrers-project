/* =================================
   Reports and Analytics JavaScript
   ================================= */

// Initialize Dashboard on DOM Load
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    setupModalListeners();
});

function initializeDashboard() {
    // Initialize all charts
    initializeAttendanceChart();
    initializeStatusChart();
    initializeDepartmentChart();
    
    // Load dynamic data
    loadDashboardData();
    
    // Setup menu items
    setupMenuItems();
}

/* =================================
   SIDEBAR FUNCTIONALITY
   ================================= */

function setupMenuItems() {
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
    });
}

/* =================================
   EVENT LISTENERS
   ================================= */

function setupEventListeners() {
    // Filter controls
    const dateRangeSelect = document.getElementById('dateRange');
    const schoolSelect = document.getElementById('school');
    
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', () => {
            handleDateRangeChange(dateRangeSelect.value);
        });
    }
    
    if (schoolSelect) {
        schoolSelect.addEventListener('change', () => {
            handleSchoolChange(schoolSelect.value);
        });
    }
}

/* =================================
   MODAL LISTENERS
   ================================= */

function setupModalListeners() {
    // Custom Report Modal
    const customReportBtn = document.getElementById('customReportBtn');
    const customReportModal = document.getElementById('customReportModal');
    const closeCustomReportModal = document.getElementById('closeCustomReportModal');
    const cancelCustomReportBtn = document.getElementById('cancelCustomReportBtn');
    const customReportOverlay = document.getElementById('customReportOverlay');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const previewExportBtn = document.getElementById('previewExportBtn');
    
    // Export Modal
    const exportBtn = document.getElementById('exportBtn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const cancelExportBtn = document.getElementById('cancelExportBtn');
    const exportOverlay = document.getElementById('exportOverlay');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    
    // Custom Report Modal Functions
    if (customReportBtn) {
        customReportBtn.addEventListener('click', () => {
            openModal(customReportModal);
        });
    }
    
    if (closeCustomReportModal) {
        closeCustomReportModal.addEventListener('click', () => {
            closeModal(customReportModal);
        });
    }
    
    if (cancelCustomReportBtn) {
        cancelCustomReportBtn.addEventListener('click', () => {
            closeModal(customReportModal);
        });
    }
    
    if (customReportOverlay) {
        customReportOverlay.addEventListener('click', () => {
            closeModal(customReportModal);
        });
    }
    
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
            handleGenerateReport();
        });
    }
    
    if (previewExportBtn) {
        previewExportBtn.addEventListener('click', () => {
            handlePreviewExport();
        });
    }
    
    // Export Modal Functions
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            openModal(exportModal);
        });
    }
    
    if (closeExportModal) {
        closeExportModal.addEventListener('click', () => {
            closeModal(exportModal);
        });
    }
    
    if (cancelExportBtn) {
        cancelExportBtn.addEventListener('click', () => {
            closeModal(exportModal);
        });
    }
    
    if (exportOverlay) {
        exportOverlay.addEventListener('click', () => {
            closeModal(exportModal);
        });
    }
    
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', () => {
            handleExport();
        });
    }
    
    // Report Type Selection
    const reportTypeOptions = document.querySelectorAll('.report-type-option');
    reportTypeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            updateReportPreview();
        });
    });
    
    // Report Form Fields
    const reportFormInputs = document.querySelectorAll('#customSchool, #customDateStart, #customDateEnd');
    reportFormInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateReportPreview();
        });
    });
    
    const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateReportPreview();
        });
    });
}

/* =================================
   MODAL FUNCTIONS
   ================================= */

function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
}

/* =================================
   CUSTOM REPORT PREVIEW
   ================================= */

function updateReportPreview() {
    const reportType = document.querySelector('input[name="reportType"]:checked');
    const school = document.getElementById('customSchool').value;
    const startDate = document.getElementById('customDateStart').value;
    const endDate = document.getElementById('customDateEnd').value;
    const checkedFields = Array.from(document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked'))
        .map(cb => cb.nextElementSibling.innerText);
    
    const previewContainer = document.getElementById('reportPreview');
    
    if (!reportType) {
        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-eye"></i>
                <p>Select report options to see preview</p>
            </div>
        `;
        return;
    }
    
    const reportData = generateMockReportData(reportType.value, school, checkedFields);
    
    previewContainer.innerHTML = `
        <div class="preview-content">
            <h4>${reportType.nextElementSibling.innerText} Report</h4>
            <p style="color: #64748b; font-size: 0.85rem; margin: 0.5rem 0 1rem 0;">
                ${school !== 'all' ? `School: ${getSchoolName(school)} | ` : ''}
                ${startDate ? `From: ${startDate} | ` : ''}
                ${endDate ? `To: ${endDate}` : ''}
            </p>
            <table class="preview-table">
                <thead>
                    <tr>
                        ${checkedFields.map(field => `<th>${field}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map(row => `
                        <tr>
                            ${checkedFields.map(field => {
                                const key = field.toLowerCase().replace(/\s+/g, '-');
                                return `<td>${row[key] || 'N/A'}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getSchoolName(schoolCode) {
    const schools = {
        'cs': 'Computer Science',
        'engineering': 'Engineering',
        'nursing': 'Nursing',
        'criminology': 'Criminology',
        'education': 'Education'
    };
    return schools[schoolCode] || 'All Schools';
}

function generateMockReportData(reportType, school, fields) {
    const mockData = [
        {
            'employee-id': 'EMP001',
            'name': 'John Doe',
            'school': 'Computer Science',
            'email': 'john.doe@company.com',
            'phone': '+1-555-0101',
            'salary': '$75,000',
            'attendance': '98%',
            'days-used': '5',
            'rating': '8.5/10'
        },
        {
            'employee-id': 'EMP002',
            'name': 'Jane Smith',
            'school': 'Engineering',
            'email': 'jane.smith@company.com',
            'phone': '+1-555-0102',
            'salary': '$85,000',
            'attendance': '96%',
            'days-used': '3',
            'rating': '9.0/10'
        },
        {
            'employee-id': 'EMP003',
            'name': 'Mike Johnson',
            'school': 'Nursing',
            'email': 'mike.j@company.com',
            'phone': '+1-555-0103',
            'salary': '$80,000',
            'attendance': '97%',
            'days-used': '4',
            'rating': '8.2/10'
        },
        {
            'employee-id': 'EMP004',
            'name': 'Sarah Williams',
            'school': 'Criminology',
            'email': 'sarah.w@company.com',
            'phone': '+1-555-0104',
            'salary': '$70,000',
            'attendance': '95%',
            'days-used': '6',
            'rating': '7.8/10'
        },
        {
            'employee-id': 'EMP005',
            'name': 'Emma Brown',
            'school': 'Education',
            'email': 'emma.b@company.com',
            'phone': '+1-555-0105',
            'salary': '$72,000',
            'attendance': '99%',
            'days-used': '2',
            'rating': '8.9/10'
        }
    ];
    
    return mockData.filter(item => 
        school === 'all' || item['school'].toLowerCase().replace(/\s+/g, '-') === school
    ).slice(0, 5);
}

function handleGenerateReport() {
    const reportType = document.querySelector('input[name="reportType"]:checked');
    if (!reportType) {
        showToast('warning', 'Please select a report type', 'No report type selected');
        return;
    }
    
    // Show loading toast
    const toastId = showToast('info', 'Generating report...', 'Please wait while we generate your report', true);
    
    // Simulate report generation
    setTimeout(() => {
        removeToast(toastId);
        showToast('success', 'Report generated successfully!', `Your ${reportType.nextElementSibling.innerText} report is ready`, false, 3000);
    }, 2000);
}

function handlePreviewExport() {
    const reportType = document.querySelector('input[name="reportType"]:checked');
    if (!reportType) {
        showToast('warning', 'Please select a report type', 'No report type selected');
        return;
    }
    
    // Show loading toast
    const toastId = showToast('info', 'Downloading report...', 'Your report is being prepared for download', true);
    
    // Simulate export
    setTimeout(() => {
        removeToast(toastId);
        showToast('success', 'Report downloaded!', 'Your report has been saved to downloads', false, 3000);
    }, 2500);
}

/* =================================
   EXPORT FUNCTIONALITY
   ================================= */

function handleExport() {
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    const includeCharts = document.getElementById('includeCharts').checked;
    const includeSummary = document.getElementById('includeSummary').checked;
    
    // Show loading toast
    const toastId = showToast('info', 'Exporting report...', `Preparing ${format.toUpperCase()} file`, true);
    
    // Simulate file export
    setTimeout(() => {
        removeToast(toastId);
        showToast('success', 'Export complete!', `Report exported as ${format.toUpperCase()}`, false, 3000);
        closeModal(document.getElementById('exportModal'));
    }, 2500);
}

/* =================================
   FILTER HANDLERS
   ================================= */

function handleDateRangeChange(range) {
    console.log(`Date range changed to: ${range}`);
    // Update charts and data based on date range
    updateChartsWithDateRange(range);
}

function handleSchoolChange(school) {
    console.log(`School changed to: ${school}`);
    // Update charts and data based on school
    updateChartsWithSchool(school);
}

/* =================================
   CHART INITIALIZATION
   ================================= */

function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Attendance Rate (%)',
                    data: [94, 96, 93, 97, 95, 92, 91],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, weight: 600 },
                        color: '#1e293b',
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    }
                },
                x: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    }
                }
            }
        }
    });
}

function initializeStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'On Leave', 'Remote', 'Probation'],
            datasets: [{
                data: [348, 62, 35, 5],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#06b6d4',
                    '#ef4444'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: 600 },
                        color: '#1e293b',
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        }
    });
}

function initializeDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['HR', 'IT', 'Finance', 'Operations', 'Sales'],
            datasets: [{
                label: 'Number of Employees',
                data: [65, 145, 78, 92, 70],
                backgroundColor: [
                    '#2563eb',
                    '#8b5cf6',
                    '#10b981',
                    '#f59e0b',
                    '#06b6d4'
                ],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, weight: 600 },
                        color: '#1e293b',
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    }
                },
                x: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    }
                }
            }
        }
    });
}

/* =================================
   CHART UPDATE HANDLERS
   ================================= */

function updateChartsWithDateRange(range) {
    // This function would update chart data based on selected date range
    console.log('Charts updated for date range:', range);
}

function updateChartsWithSchool(school) {
    // This function would update chart data based on selected school
    console.log('Charts updated for school:', school);
}

/* =================================
   DATA LOADING
   ================================= */

function loadDashboardData() {
    // Load KPI data
    loadKPIData();
}

function loadKPIData() {
    // Simulate API call to load KPI data
    const totalEmployees = document.getElementById('totalEmployees');
    const attendanceRate = document.getElementById('attendanceRate');
    const turnoverRate = document.getElementById('turnoverRate');
    const avgPerformance = document.getElementById('avgPerformance');
    
    if (totalEmployees) totalEmployees.textContent = '450';
    if (attendanceRate) attendanceRate.textContent = '94.5%';
    if (turnoverRate) turnoverRate.textContent = '3.2%';
    if (avgPerformance) avgPerformance.textContent = '8.2/10';
}

/* =================================
   TOAST NOTIFICATIONS
   ================================= */

function showToast(type, title, message, showSpinner = false, duration = 3000) {
    // Create or get toast container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Generate unique toast ID
    const toastId = `toast-${Date.now()}`;
    
    // Determine icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    
    // Build HTML content
    let iconContent = icon;
    if (showSpinner) {
        iconContent = '<div class="toast-spinner"></div>';
    }
    
    toast.innerHTML = `
        <div class="toast-icon">
            ${iconContent}
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Auto-dismiss if duration is specified (0 = no auto-dismiss)
    if (duration > 0 && !showSpinner) {
        setTimeout(() => {
            removeToast(toastId);
        }, duration);
    }
    
    return toastId;
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    // Add hide animation class
    toast.classList.add('hide');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        toast.remove();
    }, 300);
}
