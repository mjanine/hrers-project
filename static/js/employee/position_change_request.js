/* position_change_request.js */
const empInfo = { name: "John Smith" };

// ── Mock employee directory ──
const employeeDirectory = {
    'dela cruz, juan': { id: 'EMP-001', position: 'Instructor',          dept: 'CCS' },
    'santos, maria':   { id: 'EMP-002', position: 'Professor',            dept: 'CBA' },
    'reyes, ricardo':  { id: 'EMP-003', position: 'Registrar',            dept: 'COE' },
    'gomez, patricia': { id: 'EMP-004', position: 'Assistant Professor',  dept: 'CAS' },
    'torres, miguel':  { id: 'EMP-005', position: 'Clinical Instructor',  dept: 'CON' },
    'johnson, alice':  { id: 'EMP-006', position: 'Senior Instructor',    dept: 'CAS' }
};

document.addEventListener('DOMContentLoaded', () => {
    const recordsPageUrl = '../history/timeline.html';
    const sidebar        = document.getElementById('sidebar');
    const logoToggle     = document.getElementById('logoToggle');
    const closeBtn       = document.getElementById('closeBtn');
    const menuItems      = document.querySelectorAll('.menu-item');
    const positionForm   = document.getElementById('positionForm');
    const empNameInput   = document.getElementById('empName');
    const cancelBtn      = document.getElementById('cancelBtn');
    const submitBtn      = document.getElementById('submitBtn');
    const recordsBtn     = document.getElementById('recordsBtn');

    // ── Static modal elements (defined in HTML) ──
    const cancelModal      = document.getElementById('cancelModal');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const stayBtn          = document.getElementById('stayBtn');

    // Initialize tooltip labels for collapsed sidebar
    menuItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.innerText);
    });

    // Sidebar toggle
    if (closeBtn)   closeBtn.onclick   = () => sidebar.classList.add('collapsed');
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle('collapsed');

    // Auto-fill employee details on blur
    empNameInput.addEventListener('blur', () => {
        const key = empNameInput.value.trim().toLowerCase();
        const emp = employeeDirectory[key];

        document.getElementById('empId').value      = emp ? emp.id       : '';
        document.getElementById('currentPos').value = emp ? emp.position : '';
        document.getElementById('currentDept').value = emp ? emp.dept    : '';
    });

    // ── Cancel button → show static modal ──
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            cancelModal.classList.add('active');
        });
    }

    // "YES, CANCEL" → reset form and close modal
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            cancelModal.classList.remove('active');
            resetForm();
        });
    }

    // "NO, STAY" → just close modal
    if (stayBtn) {
        stayBtn.addEventListener('click', () => {
            cancelModal.classList.remove('active');
        });
    }

    if (recordsBtn) {
        recordsBtn.addEventListener('click', () => {
            const employeeName = empNameInput.value.trim();
            const recordsUrl = employeeName
                ? `${recordsPageUrl}?employee=${encodeURIComponent(employeeName)}`
                : recordsPageUrl;

            window.location.href = recordsUrl;
        });
    }

    // Close modal on backdrop click
    cancelModal.addEventListener('click', (e) => {
        if (e.target === cancelModal) {
            cancelModal.classList.remove('active');
        }
    });

    // ── Submit form ──
    if (positionForm) {
        positionForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const empName = document.getElementById('empName').value.trim();
            const empId = document.getElementById('empId').value.trim();
            const currentPos = document.getElementById('currentPos').value.trim();
            const currentDept = document.getElementById('currentDept').value.trim();
            const requestedPos = document.getElementById('requestedPos').value;
            const effectiveDate = document.getElementById('effectiveDate').value;
            const reason = document.getElementById('reason').value.trim();

            if (!empName || !requestedPos || !effectiveDate || !reason) {
                showToast('Please fill in all required fields.');
                return;
            }

            const requestRecord = {
                employeeName: empName,
                employeeId: empId,
                currentPosition: currentPos,
                currentDepartment: currentDept,
                requestedPosition: requestedPos,
                effectiveDate,
                reason,
                submittedAt: new Date().toISOString(),
                status: 'Pending'
            };

            try {
                const existingRecords = JSON.parse(localStorage.getItem('positionChangeRequests') || '[]');
                existingRecords.unshift(requestRecord);
                localStorage.setItem('positionChangeRequests', JSON.stringify(existingRecords));
            } catch (error) {
                console.warn('Unable to persist position change request locally.', error);
            }

            showSuccessNotification(`${empName}'s position change request has been successfully submitted.`);

            setTimeout(() => {
                window.location.href = `${recordsPageUrl}?employee=${encodeURIComponent(empName)}`;
            }, 1200);
        });
    }

    function resetForm() {
        document.getElementById('positionForm').reset();
        document.getElementById('empId').value       = '';
        document.getElementById('currentPos').value  = '';
        document.getElementById('currentDept').value = '';
    }
});

// ── Success Notification (toast) ──
function showSuccessNotification(message) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
        <i class="fas fa-check-circle toast-icon"></i>
        <div class="toast-content">
            <h4>Position Change Request Submitted</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    attachToastClose(toast);
    container.appendChild(toast);
    autoRemoveToast(toast);
}

// ── Error Toast ──
function showToast(message) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = '#ef4444';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle toast-icon" style="color:#ef4444;"></i>
        <div class="toast-content">
            <h4>Validation Error</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    attachToastClose(toast);
    container.appendChild(toast);
    autoRemoveToast(toast);
}

function getToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function attachToastClose(toast) {
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'toastExit 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
}

function autoRemoveToast(toast) {
    setTimeout(() => {
        toast.style.animation = 'toastExit 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}