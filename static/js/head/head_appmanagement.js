/* ============================================================
   head_appmanagement.js
   Department Head - New Employee Applications only
   ============================================================ */

const headName = 'Department Head';
const HEAD_STAGE = 'pending-head';
let activeAppId = null;
let activeAppFilter = '';
let activeAppFilterLabel = '';
let activeDocPage = 1;

let appData = [
    {
        id: '001',
        name: 'Dela Cruz, Juan',
        email: 'juan.delacruz@example.com',
        phoneNumber: '+63 912 345 6780',
        dept: 'CCS',
        applyingTo: 'CCS',
        position: 'Instructor',
        applyingFor: 'Instructor',
        submitted: '02/12/2026',
        progress: 'Stage 2 of 4',
        status: 'pending-head',
        statusLabel: 'Pending - Dept. Head',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '02/13/2026',
        headReviewedBy: '---',
        headReviewedAt: '---',
        hrHeadReviewedBy: '---',
        hrHeadReviewedAt: '---',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'Department Head',
        remarks: 'Awaiting department head review.',
        headRemarks: 'Candidate meets qualification baseline.',
        fileName: 'Application_001.pdf'
    },
    {
        id: '002',
        name: 'Santos, Maria',
        email: 'maria.santos@example.com',
        phoneNumber: '+63 917 222 1144',
        dept: 'CBA',
        applyingTo: 'CBA',
        position: 'Professor',
        applyingFor: 'Professor',
        submitted: '02/15/2026',
        progress: 'Stage 3 of 4',
        status: 'pending-hrhead',
        statusLabel: 'Pending - HR Head',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '02/16/2026',
        headReviewedBy: 'Department Head',
        headReviewedAt: '02/17/2026',
        hrHeadReviewedBy: '---',
        hrHeadReviewedAt: '---',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'HR Head',
        remarks: 'Forwarded to HR Head for final HR validation.',
        headRemarks: 'Department endorses application.',
        fileName: 'Application_002.pdf'
    },
    {
        id: '003',
        name: 'Reyes, Ricardo',
        email: 'ricardo.reyes@example.com',
        phoneNumber: '+63 918 303 9901',
        dept: 'COE',
        applyingTo: 'COE',
        position: 'Registrar',
        applyingFor: 'Registrar',
        submitted: '02/10/2026',
        progress: 'Completed',
        status: 'approved',
        statusLabel: 'Approved',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '02/11/2026',
        headReviewedBy: 'Department Head',
        headReviewedAt: '02/12/2026',
        hrHeadReviewedBy: 'HR Head',
        hrHeadReviewedAt: '02/13/2026',
        finalReviewedBy: 'School Director',
        finalReviewedAt: '02/14/2026',
        pendingWith: 'Completed',
        remarks: 'Approved and completed workflow.',
        headRemarks: 'Endorsed by department.',
        fileName: 'Application_003.pdf'
    },
    {
        id: '004',
        name: 'Gomez, Patricia',
        email: 'patricia.gomez@example.com',
        phoneNumber: '+63 919 445 8802',
        dept: 'CAS',
        applyingTo: 'CAS',
        position: 'Assistant Professor',
        applyingFor: 'Assistant Professor',
        submitted: '03/01/2026',
        progress: 'Stage 4 of 4',
        status: 'pending-sd',
        statusLabel: 'Pending - SD',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '03/02/2026',
        headReviewedBy: 'Department Head',
        headReviewedAt: '03/03/2026',
        hrHeadReviewedBy: 'HR Head',
        hrHeadReviewedAt: '03/04/2026',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'School Director',
        remarks: 'Awaiting final SD approval.',
        headRemarks: 'Recommended for final approval.',
        fileName: 'Application_004.pdf'
    },
    {
        id: '005',
        name: 'Torres, Miguel',
        email: 'miguel.torres@example.com',
        phoneNumber: '+63 920 556 2210',
        dept: 'CON',
        applyingTo: 'CON',
        position: 'Clinical Instructor',
        applyingFor: 'Clinical Instructor',
        submitted: '03/05/2026',
        progress: 'Completed',
        status: 'rejected',
        statusLabel: 'Rejected',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '03/06/2026',
        headReviewedBy: 'Department Head',
        headReviewedAt: '03/07/2026',
        hrHeadReviewedBy: 'HR Head',
        hrHeadReviewedAt: '03/08/2026',
        finalReviewedBy: 'School Director',
        finalReviewedAt: '03/09/2026',
        pendingWith: 'Completed',
        remarks: 'Rejected due to incomplete supporting requirements.',
        headRemarks: 'Needs document resubmission before reconsideration.',
        fileName: 'Application_005.pdf'
    }
];

function isFinalStatus(status) {
    return status === 'approved' || status === 'rejected';
}

function canActOnApp(status) {
    return status === HEAD_STAGE;
}

function getStatusFilterLabel(status) {
    const labels = {
        'pending-hr': 'Status: Pending - HR Evaluator',
        'pending-head': 'Status: Pending - Dept. Head',
        'pending-hrhead': 'Status: Pending - HR Head',
        'pending-sd': 'Status: Pending - SD',
        approved: 'Status: Approved',
        rejected: 'Status: Rejected'
    };
    return labels[status] || '';
}

function matchesSearch(app, query) {
    if (!query) return true;
    const haystack = [
        app.id,
        app.name,
        app.dept,
        app.position,
        app.progress,
        app.statusLabel,
        app.pendingWith,
        app.remarks
    ].join(' ').toLowerCase();
    return haystack.indexOf(query) !== -1;
}

function syncFilterChip() {
    const row = document.getElementById('activeFilterRow');
    const label = document.getElementById('activeFilterLabel');
    if (!row || !label) return;

    if (!activeAppFilter) {
        row.hidden = true;
        row.style.display = 'none';
        label.innerText = '';
        return;
    }

    label.innerText = activeAppFilterLabel;
    row.hidden = false;
    row.style.display = 'flex';
}

function closeFilterMenu() {
    const menu = document.getElementById('filterMenu');
    const btn = document.getElementById('filterBtn');
    if (!menu || !btn) return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
}

function toggleFilterMenu() {
    const menu = document.getElementById('filterMenu');
    const btn = document.getElementById('filterBtn');
    if (!menu || !btn) return;

    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    menu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

function applyAppFilter(filterValue, filterLabel) {
    activeAppFilter = filterValue;
    activeAppFilterLabel = filterLabel || '';
    syncFilterChip();
    closeFilterMenu();
    renderTable();
}

function clearAppFilter() {
    activeAppFilter = '';
    activeAppFilterLabel = '';
    syncFilterChip();
    closeFilterMenu();
    renderTable();
}

function renderTable() {
    const body = document.getElementById('applicationTableBody');
    const template = document.getElementById('appRowTemplate');
    const query = document.getElementById('tableSearch').value.trim().toLowerCase();

    let filtered = appData.slice();

    if (activeAppFilter) {
        filtered = filtered.filter(function (app) { return app.status === activeAppFilter; });
    }

    if (query) {
        filtered = filtered.filter(function (app) { return matchesSearch(app, query); });
    }

    body.innerHTML = '';

    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="8" class="no-records">No records found.</td></tr>';
        return;
    }

    filtered.forEach(function (app) {
        const clone = template.content.cloneNode(true);
        const isFinal = isFinalStatus(app.status);
        const canAct = canActOnApp(app.status);

        clone.querySelector('.col-id').innerText = app.id;
        clone.querySelector('.col-name').innerText = app.name;
        clone.querySelector('.col-dept').innerText = app.dept;
        clone.querySelector('.col-position').innerText = app.position;
        clone.querySelector('.col-submitted').innerText = app.submitted;
        clone.querySelector('.col-progress').innerText = app.progress;
        clone.querySelector('.col-status').innerHTML = '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';

        const actionsCell = clone.querySelector('.col-actions');

        if (isFinal || !canAct) {
            actionsCell.innerHTML = '<span class="action-link view-link-btn">View Details</span>';
            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(app.id);
            });
        } else {
            actionsCell.innerHTML =
                '<div class="actions-cell">' +
                    '<span class="action-link view-link-btn">View Details</span>' +
                    '<div class="dropdown">' +
                        '<button class="update-link">Update <i class="fas fa-caret-down"></i></button>' +
                        '<div class="dropdown-content">' +
                            '<a href="#" class="approve-option">Approve</a>' +
                            '<a href="#" class="reject-option">Reject</a>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(app.id);
            });
            actionsCell.querySelector('.approve-option').addEventListener('click', function (e) {
                e.preventDefault();
                processApp(app.id, 'Approved');
            });
            actionsCell.querySelector('.reject-option').addEventListener('click', function (e) {
                e.preventDefault();
                processApp(app.id, 'Rejected');
            });
        }

        body.appendChild(clone);
    });
}

function updateModalDocPage() {
    const page1 = document.getElementById('modalDocPage1');
    const page2 = document.getElementById('modalDocPage2');
    const pageName = document.getElementById('docPageName');
    const prevBtn = document.getElementById('docPrevBtn');
    const nextBtn = document.getElementById('docNextBtn');

    page1.hidden = activeDocPage !== 1;
    page2.hidden = activeDocPage !== 2;
    pageName.innerText = activeDocPage === 1 ? 'Page 1 - Application Details' : 'Page 2 - PDF View';
    prevBtn.disabled = activeDocPage === 1;
    nextBtn.disabled = activeDocPage === 2;
}

function setModalDocPage(pageNumber) {
    activeDocPage = pageNumber === 2 ? 2 : 1;
    updateModalDocPage();
}

function renderStatusHistory(app) {
    const container = document.getElementById('modalStatusHistory');
    const entries = [
        { title: 'Submitted', meta: app.name + ' on ' + (app.submitted || '---') }
    ];

    if (app.hrReviewedBy && app.hrReviewedBy !== '---') {
        entries.push({ title: 'Approved', meta: 'by ' + app.hrReviewedBy + ' on ' + (app.hrReviewedAt || '---') });
    }

    if (app.status === 'pending-head') {
        entries.push({ title: 'Pending', meta: 'with Department Head' });
    } else if (app.headReviewedBy && app.headReviewedBy !== '---') {
        entries.push({ title: 'Approved', meta: 'by ' + app.headReviewedBy + ' on ' + (app.headReviewedAt || '---') });
    }

    if (app.status === 'pending-hrhead') {
        entries.push({ title: 'Pending', meta: 'with HR Head' });
    } else if (app.hrHeadReviewedBy && app.hrHeadReviewedBy !== '---') {
        entries.push({ title: 'Approved', meta: 'by ' + app.hrHeadReviewedBy + ' on ' + (app.hrHeadReviewedAt || '---') });
    }

    if (app.status === 'pending-sd') {
        entries.push({ title: 'Pending', meta: 'with School Director' });
    } else if (app.status === 'approved') {
        entries.push({ title: 'Approved', meta: 'by ' + (app.finalReviewedBy || 'School Director') + ' on ' + (app.finalReviewedAt || '---') });
    } else if (app.status === 'rejected') {
        entries.push({ title: 'Rejected', meta: 'by ' + (app.finalReviewedBy || 'School Director') + ' on ' + (app.finalReviewedAt || '---') });
    }

    container.innerHTML = entries.map(function (entry, index) {
        const markerClass = index === entries.length - 1 ? ' current' : '';
        return '<div class="status-history-entry' + markerClass + '">' +
            '<span class="status-history-dot"></span>' +
            '<div class="status-history-copy">' +
                '<div class="status-history-title">' + entry.title + '</div>' +
                '<div class="status-history-meta">' + entry.meta + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function openModal(id) {
    activeAppId = id;
    activeDocPage = 1;

    const app = appData.find(function (a) { return a.id === id; });
    if (!app) return;

    document.getElementById('modalApplicantName').innerText = app.name || 'Application Detail';
    document.getElementById('modalApplicationId').innerText = app.id || '---';
    document.getElementById('modalApplicantEmail').innerText = app.email || '---';
    document.getElementById('modalApplicantPhone').innerText = app.phoneNumber || '---';
    document.getElementById('modalApplyingDepartment').innerText = app.applyingTo || app.dept || '---';
    document.getElementById('modalApplyingPosition').innerText = app.applyingFor || app.position || '---';
    document.getElementById('modalHeadRemarks').innerText = app.headRemarks || '---';
    document.getElementById('modalAddRemarks').value = app.remarks || '';
    document.getElementById('modalFileName').innerText = app.fileName || 'Document.pdf';
    document.getElementById('modalSubmitDate').innerText = app.submitted || '---';
    document.getElementById('modalDepartment').innerText = app.dept || '---';
    document.getElementById('modalPosition').innerText = app.position || '---';
    document.getElementById('modalProgress').innerText = app.progress || '---';
    document.getElementById('modalRemarks').innerText = app.remarks || 'Awaiting review.';
    document.getElementById('modalStatusContainer').innerHTML = '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';
    document.getElementById('pdfPlaceholder').innerHTML = '<i class="fas fa-file-pdf"></i><p>Preview for ' + (app.fileName || 'Document.pdf') + '</p>';

    renderStatusHistory(app);
    updateModalDocPage();

    document.getElementById('modalActions').style.display = (!isFinalStatus(app.status) && canActOnApp(app.status)) ? 'flex' : 'none';
    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function processApp(id, decision) {
    const app = appData.find(function (a) { return a.id === id; });
    if (!app) return;

    if (!canActOnApp(app.status)) {
        return;
    }

    const dateStr = new Date().toLocaleDateString();
    app.headReviewedBy = headName;
    app.headReviewedAt = dateStr;

    if (decision === 'Approved') {
        app.status = 'pending-hrhead';
        app.statusLabel = 'Pending - HR Head';
        app.progress = 'Stage 3 of 4';
        app.pendingWith = 'HR Head';
        app.remarks = 'Endorsed by Department Head on ' + dateStr + '.';
    } else {
        app.status = 'rejected';
        app.statusLabel = 'Rejected';
        app.progress = 'Completed';
        app.pendingWith = 'Completed';
        app.finalReviewedBy = headName;
        app.finalReviewedAt = dateStr;
        app.remarks = 'Rejected by Department Head on ' + dateStr + '.';
    }

    document.getElementById('modalStatusContainer').innerHTML = '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';
    document.getElementById('modalRemarks').innerText = app.remarks;
    document.getElementById('modalAddRemarks').value = app.remarks;
    document.getElementById('modalProgress').innerText = app.progress;
    renderStatusHistory(app);
    document.getElementById('modalActions').style.display = 'none';

    renderTable();
}

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const viewModal = document.getElementById('viewModal');
    const filterBtn = document.getElementById('filterBtn');
    const filterMenu = document.getElementById('filterMenu');
    const clearBtn = document.getElementById('clearFilterBtn');
    const prevDocBtn = document.getElementById('docPrevBtn');
    const nextDocBtn = document.getElementById('docNextBtn');

    document.querySelectorAll('.menu-item').forEach(function (item) {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.textContent.trim());
    });

    if (closeBtn) closeBtn.onclick = function () { sidebar.classList.add('collapsed'); };
    if (logoToggle) logoToggle.onclick = function () { sidebar.classList.toggle('collapsed'); };

    if (filterBtn) {
        filterBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleFilterMenu();
        });
    }

    if (filterMenu) {
        filterMenu.querySelectorAll('.filter-option').forEach(function (option) {
            option.addEventListener('click', function () {
                if (option.dataset.filterClear === 'true') {
                    clearAppFilter();
                    return;
                }
                applyAppFilter(option.dataset.filterValue, getStatusFilterLabel(option.dataset.filterValue));
            });
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            clearAppFilter();
        });
    }

    if (prevDocBtn) {
        prevDocBtn.addEventListener('click', function () {
            setModalDocPage(activeDocPage - 1);
        });
    }

    if (nextDocBtn) {
        nextDocBtn.addEventListener('click', function () {
            setModalDocPage(activeDocPage + 1);
        });
    }

    document.getElementById('tableSearch').addEventListener('input', renderTable);

    document.getElementById('modalApproveBtn').addEventListener('click', function () {
        processApp(activeAppId, 'Approved');
    });

    document.getElementById('modalRejectBtn').addEventListener('click', function () {
        processApp(activeAppId, 'Rejected');
    });

    document.getElementById('modalCloseBtn').addEventListener('click', closeViewModal);

    window.addEventListener('click', function (e) {
        if (!e.target.closest('.filter-dropdown')) {
            closeFilterMenu();
        }
        if (e.target === viewModal) {
            closeViewModal();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeFilterMenu();
            closeViewModal();
        }
    });

    syncFilterChip();
    renderTable();
});
