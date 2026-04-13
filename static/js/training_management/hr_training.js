/* hr_training.js — layout aligned with hr_appmanagement.js */

const coordinatorName = 'HR Training';

let activeTrainingId = null;

let trainingData = [
    {
        id: '001',
        name: 'Outcomes-Based Education Workshop',
        category: 'Teaching',
        date: '03/12/2026',
        mode: 'Onsite',
        slotsText: '25 / 30',
        filled: 25,
        total: 30,
        progress: 'Enrollment open',
        status: 'open',
        statusLabel: 'Open',
        remarks: 'Workshop on OBE implementation for faculty.',
        venue: 'Main building, 2nd floor',
        trainer: 'CCS Training Team'
    },
    {
        id: '002',
        name: 'Research Writing Seminar',
        category: 'Research',
        date: '03/20/2026',
        mode: 'Online',
        slotsText: '30 / 30',
        filled: 30,
        total: 30,
        progress: 'At capacity',
        status: 'full',
        statusLabel: 'Full',
        remarks: 'Publication skills and grant writing basics.',
        venue: 'Zoom',
        trainer: 'Dr. Santos'
    },
    {
        id: '003',
        name: 'Faculty Development Program',
        category: 'Development',
        date: '02/28/2026',
        mode: 'Onsite',
        slotsText: '20 / 20',
        filled: 20,
        total: 20,
        progress: 'Completed',
        status: 'completed',
        statusLabel: 'Completed',
        remarks: 'Annual faculty development seminar concluded.',
        venue: 'Auditorium',
        trainer: 'External Agency'
    },
    {
        id: '004',
        name: 'Safety & Emergency Response Training',
        category: 'Safety',
        date: '03/05/2026',
        mode: 'Onsite',
        slotsText: '15 / 25',
        filled: 15,
        total: 25,
        progress: 'Session cancelled',
        status: 'cancelled',
        statusLabel: 'Cancelled',
        remarks: 'Cancelled due to venue unavailability.',
        venue: 'Gymnasium',
        trainer: 'Safety Officer'
    }
];

function isFinalTrainingStatus(status) {
    return status === 'completed' || status === 'cancelled';
}

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        approved: 'fas fa-check-circle',
        rejected: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML =
        '<i class="' + icons[type] + ' toast-icon"></i>' +
        '<div class="toast-body">' +
            '<div class="toast-title">' + title + '</div>' +
            '<div class="toast-msg">' + message + '</div>' +
        '</div>' +
        '<button class="toast-close" type="button"><i class="fas fa-times"></i></button>' +
        '<div class="toast-progress"></div>';

    toast.querySelector('.toast-close').addEventListener('click', function () {
        removeToast(toast);
    });

    container.appendChild(toast);
    setTimeout(function () { removeToast(toast); }, 4000);
}

function removeToast(el) {
    if (!el || !el.parentElement) return;
    el.style.animation = 'toastOut 0.35s ease forwards';
    setTimeout(function () { el.remove(); }, 340);
}

function renderTable() {
    const body = document.getElementById('trainingTableBody');
    const template = document.getElementById('trainingRowTemplate');
    body.innerHTML = '';

    if (trainingData.length === 0) {
        body.innerHTML =
            '<tr><td colspan="9" class="no-records">No records found.</td></tr>';
        return;
    }

    trainingData.forEach(function (t) {
        const clone = template.content.cloneNode(true);
        const isFinal = isFinalTrainingStatus(t.status);

        clone.querySelector('.col-id').innerText = t.id;
        clone.querySelector('.col-tname').innerText = t.name;
        clone.querySelector('.col-category').innerText = t.category;
        clone.querySelector('.col-date').innerText = t.date;
        clone.querySelector('.col-mode').innerText = t.mode;
        clone.querySelector('.col-slots').innerText = t.slotsText;
        clone.querySelector('.col-progress').innerText = t.progress;
        clone.querySelector('.col-status').innerHTML =
            '<span class="status-pill ' + t.status + '">' + t.statusLabel + '</span>';

        const actionsCell = clone.querySelector('.col-actions');

        if (isFinal) {
            actionsCell.innerHTML = '<span class="action-link view-link-btn">View Details</span>';
            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(t.id);
            });
        } else {
            actionsCell.innerHTML =
                '<div class="actions-cell">' +
                    '<span class="action-link view-link-btn">View Details</span>' +
                    '<div class="dropdown">' +
                        '<button type="button" class="update-link">Update <i class="fas fa-caret-down"></i></button>' +
                        '<div class="dropdown-content">' +
                            '<a href="#" class="complete-option" data-id="' + t.id + '">Mark Completed</a>' +
                            '<a href="#" class="cancel-option" data-id="' + t.id + '">Cancel Training</a>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(t.id);
            });
            actionsCell.querySelector('.complete-option').addEventListener('click', function (e) {
                e.preventDefault();
                processTraining(t.id, 'Completed');
            });
            actionsCell.querySelector('.cancel-option').addEventListener('click', function (e) {
                e.preventDefault();
                processTraining(t.id, 'Cancelled');
            });
        }

        body.appendChild(clone);
    });
}

function openModal(id) {
    activeTrainingId = id;
    const t = trainingData.find(function (x) { return x.id === id; });
    if (!t) return;

    document.getElementById('modalTrainingTitle').innerText = t.name;
    document.getElementById('trainingPlaceholder').innerHTML =
        '<i class="fas fa-chalkboard-teacher"></i><p>' + t.name + '</p>';
    document.getElementById('modalDate').innerText = t.date;
    document.getElementById('modalCategory').innerText = t.category;
    document.getElementById('modalMode').innerText = t.mode;
    document.getElementById('modalSlots').innerText = t.slotsText;
    document.getElementById('modalProgress').innerText = t.progress;
    document.getElementById('modalRemarks').innerText = t.remarks;
    document.getElementById('modalCoordinatorText').innerHTML =
        '<small>Coordinator: ' + coordinatorName + '</small>';
    document.getElementById('modalStatusContainer').innerHTML =
        '<span class="status-pill ' + t.status + '">' + t.statusLabel + '</span>';

    document.getElementById('modalActions').style.display =
        isFinalTrainingStatus(t.status) ? 'none' : 'flex';

    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function processTraining(id, decision) {
    const idx = trainingData.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return;

    const t = trainingData[idx];
    const dateStr = new Date().toLocaleDateString();

    if (decision === 'Completed') {
        t.status = 'completed';
        t.statusLabel = 'Completed';
        t.progress = 'Completed';
        t.remarks = 'Marked completed on ' + dateStr + '.';
        showToast('approved', 'Training Completed', '"' + t.name + '" has been marked completed.');
    } else {
        t.status = 'cancelled';
        t.statusLabel = 'Cancelled';
        t.progress = 'Session cancelled';
        t.remarks = 'Cancelled on ' + dateStr + '.';
        showToast('rejected', 'Training Cancelled', '"' + t.name + '" has been cancelled.');
    }

    document.getElementById('modalStatusContainer').innerHTML =
        '<span class="status-pill ' + t.status + '">' + t.statusLabel + '</span>';
    document.getElementById('modalProgress').innerText = t.progress;
    document.getElementById('modalRemarks').innerText = t.remarks;
    document.getElementById('modalActions').style.display = 'none';

    renderTable();
}

function resetAddTrainingForm() {
    document.getElementById('tName').value = '';
    document.getElementById('tCategory').selectedIndex = 0;
    document.getElementById('tMode').selectedIndex = 0;
    document.getElementById('tDate').value = '';
    document.getElementById('tTotalSlots').value = '';
    document.getElementById('tVenue').value = '';
    document.getElementById('tTrainer').value = '';
    document.getElementById('tRemarks').value = '';

    ['tName', 'tCategory', 'tMode', 'tDate', 'tTotalSlots'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.borderColor = '';
    });
}

function padId(num) {
    return String(num).padStart(3, '0');
}

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const openAddTrainingModal = document.getElementById('openAddTrainingModal');
    const addModal = document.getElementById('addTrainingModal');
    const viewModal = document.getElementById('viewModal');

    document.querySelectorAll('.menu-item').forEach(function (item) {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.textContent.trim());
    });

    if (closeBtn) closeBtn.onclick = function () { sidebar.classList.add('collapsed'); };
    if (logoToggle) logoToggle.onclick = function () { sidebar.classList.toggle('collapsed'); };

    if (openAddTrainingModal) {
        openAddTrainingModal.addEventListener('click', function () {
        addModal.style.display = 'flex';
        });
    }

    document.getElementById('modalCompleteBtn').addEventListener('click', function () {
        processTraining(activeTrainingId, 'Completed');
    });
    document.getElementById('modalCancelBtn').addEventListener('click', function () {
        processTraining(activeTrainingId, 'Cancelled');
    });
    document.getElementById('modalCloseBtn').addEventListener('click', closeViewModal);

    document.getElementById('cancelAddTraining').addEventListener('click', function () {
        addModal.style.display = 'none';
        resetAddTrainingForm();
        renderTable();
    });

    document.getElementById('saveTraining').addEventListener('click', function () {
        var name = document.getElementById('tName').value.trim();
        var category = document.getElementById('tCategory').value;
        var mode = document.getElementById('tMode').value;
        var dateVal = document.getElementById('tDate').value;
        var totalSlots = parseInt(document.getElementById('tTotalSlots').value, 10);
        var venue = document.getElementById('tVenue').value.trim();
        var trainer = document.getElementById('tTrainer').value.trim();
        var remarks = document.getElementById('tRemarks').value.trim();

        var valid = true;
        [
            { id: 'tName', val: name },
            { id: 'tCategory', val: category },
            { id: 'tMode', val: mode },
            { id: 'tDate', val: dateVal },
            { id: 'tTotalSlots', val: totalSlots > 0 ? String(totalSlots) : '' }
        ].forEach(function (field) {
            var el = document.getElementById(field.id);
            if (!field.val) {
                el.style.borderColor = '#dc3545';
                valid = false;
            } else if (el) {
                el.style.borderColor = '';
            }
        });

        if (!valid) {
            showToast('info', 'Incomplete Form', 'Please fill in all required fields.');
            return;
        }

        var d = new Date(dateVal + 'T12:00:00');
        var dateDisplay = (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
            d.getDate().toString().padStart(2, '0') + '/' + d.getFullYear();

        var nextNum = trainingData.reduce(function (max, x) {
            var n = parseInt(x.id, 10);
            return n > max ? n : max;
        }, 0) + 1;

        trainingData.push({
            id: padId(nextNum),
            name: name,
            category: category,
            date: dateDisplay,
            mode: mode,
            slotsText: '0 / ' + totalSlots,
            filled: 0,
            total: totalSlots,
            progress: 'Enrollment open',
            status: 'open',
            statusLabel: 'Open',
            remarks: remarks || 'New training session created.',
            venue: venue || '—',
            trainer: trainer || '—'
        });

        addModal.style.display = 'none';
        resetAddTrainingForm();
        renderTable();
        showToast('info', 'Training Added', '"' + name + '" has been scheduled.');
    });

    window.addEventListener('click', function (e) {
        if (e.target === viewModal) closeViewModal();
        if (e.target === addModal) {
            addModal.style.display = 'none';
            resetAddTrainingForm();
            renderTable();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeViewModal();
            addModal.style.display = 'none';
            resetAddTrainingForm();
            renderTable();
        }
    });

    document.getElementById('tableSearch').addEventListener('keyup', function (e) {
        var val = e.target.value.toLowerCase();
        document.querySelectorAll('#trainingTableBody tr').forEach(function (row) {
            row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
        });
    });

    renderTable();
});
