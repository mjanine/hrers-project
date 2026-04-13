/* ============================================================
   hr_appmanagement.js
   Path: static/js/application_management/hr_appmanagement.js
   ============================================================ */

const sdName = 'School Director';
const SD_STAGE = 'pending-sd';
let activeAppId = null;
let activeAppFilter = '';
let activeAppFilterLabel = '';
let activeDocPage = 1;
let activeMainTab = 'new';

// ── Sample Data ───────────────────────────────────────────────────────
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
        status: 'pending-hr',
        statusLabel: 'Pending - HR Evaluator',
        reviewedBy: '---',
        headReviewedBy: 'Department Head',
        headReviewedAt: '03/10/2026',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'HR Evaluator',
        remarks: 'Awaiting HR evaluation.',
        headRemarks: 'Recommended for HR review.',
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
        progress: 'Stage 1 of 4',
        status: 'pending-head',
        statusLabel: 'Pending - Dept. Head',
        reviewedBy: '---',
        headReviewedBy: '---',
        headReviewedAt: '---',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'Department Head',
        remarks: 'Awaiting department head review.',
        headRemarks: 'Complete requirements attached.',
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
        reviewedBy: 'HR Manager',
        headReviewedBy: 'Department Head',
        headReviewedAt: '02/11/2026',
        finalReviewedBy: 'HR Manager',
        finalReviewedAt: '02/12/2026',
        pendingWith: 'Completed',
        remarks: 'Approved on ' + new Date().toLocaleDateString() + '.',
        headRemarks: 'Endorsed by department head.',
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
        progress: 'Stage 3 of 4',
        status: 'pending-hr-head',
        statusLabel: 'Pending - HR Head',
        reviewedBy: '---',
        headReviewedBy: 'Department Head',
        headReviewedAt: '03/02/2026',
        hrHeadReviewedBy: '---',
        hrHeadReviewedAt: '---',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'HR Head',
        remarks: 'Documents under review by HR.',
        headRemarks: 'Cleared by department head.',
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
        progress: 'Stage 4 of 4',
        status: 'pending-sd',
        statusLabel: 'Pending - SD',
        reviewedBy: '---',
        headReviewedBy: 'Department Head',
        headReviewedAt: '03/06/2026',
        hrHeadReviewedBy: 'HR Head',
        hrHeadReviewedAt: '03/08/2026',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'School Director',
        remarks: 'Awaiting School Director review.',
        headRemarks: 'For resubmission after missing documents are completed.',
        fileName: 'Application_005.pdf'
    }
];

// ── Position Change Request Data ──────────────────────────────────────
let positionChangeData = [
    {
        id: 'PCR-001',
        name: 'Dela Cruz, Juan',
        empId: 'EMP-001',
        dept: 'CCS',
        position: 'Instructor',
        requestedPos: 'Senior Instructor',
        reason: 'Completed leadership training and recommended for higher teaching load.',
        submitted: '03/12/2026',
        progress: 'Stage 1 of 2',
        status: 'pending-hr',
        statusLabel: 'Pending - HR Evaluator',
        reviewedBy: '---',
        hrReviewedBy: '---',
        hrReviewedAt: '---',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'HR Evaluator',
        remarks: 'Position change request logged by HR Manager.',
        headRemarks: '---',
        fileName: 'PCR_001.pdf'
    },
    {
        id: 'PCR-002',
        name: 'Santos, Maria',
        empId: 'EMP-002',
        dept: 'CBA',
        position: 'Professor',
        requestedPos: 'Dean',
        reason: 'Designated as incoming college administrator for the next academic year.',
        submitted: '03/15/2026',
        progress: 'Stage 2 of 2',
        status: 'pending-sd',
        statusLabel: 'Pending - SD',
        reviewedBy: '---',
        hrReviewedBy: 'HR Evaluator',
        hrReviewedAt: '03/16/2026',
        finalReviewedBy: '---',
        finalReviewedAt: '---',
        pendingWith: 'School Director',
        remarks: 'Awaiting final HR validation.',
        headRemarks: 'Endorsed for administrative transition.',
        fileName: 'PCR_002.pdf'
    }
];

// Mock employee lookup
const employeeDirectory = {
    'dela cruz, juan':   { id: 'EMP-001', position: 'Instructor',         dept: 'CCS' },
    'santos, maria':     { id: 'EMP-002', position: 'Professor',           dept: 'CBA' },
    'reyes, ricardo':    { id: 'EMP-003', position: 'Registrar',           dept: 'COE' },
    'gomez, patricia':   { id: 'EMP-004', position: 'Assistant Professor', dept: 'CAS' },
    'torres, miguel':    { id: 'EMP-005', position: 'Clinical Instructor', dept: 'CON' },
    'johnson, alice':    { id: 'EMP-006', position: 'Senior Instructor',   dept: 'CAS' }
};

// ── Helpers ───────────────────────────────────────────────────────────
function isFinalStatus(status) {
    return status === 'approved' || status === 'rejected';
}

function canActOnApp(status) {
    return status === SD_STAGE;
}

function findRecordById(id) {
    var fromNew = appData.find(function (a) { return a.id === id; });
    if (fromNew) return fromNew;
    return positionChangeData.find(function (a) { return a.id === id; }) || null;
}

function isPositionChangeRecord(app) {
    return !!(app && (app.empId || app.requestedPos || app.reason || String(app.id).indexOf('PCR-') === 0));
}

function resetPositionForm() {
    document.getElementById('pcEmpName').value       = '';
    document.getElementById('pcEmpId').value         = '';
    document.getElementById('pcCurrentPos').value    = '';
    document.getElementById('pcDept').value          = '';
    document.getElementById('pcRequestedPos').value  = '';
    document.getElementById('pcEffectiveDate').value = '';
    document.getElementById('pcReason').value        = '';

    ['pcEmpName', 'pcRequestedPos', 'pcEffectiveDate', 'pcReason'].forEach(function (id) {
        document.getElementById(id).style.borderColor = '';
    });
}

function autoFillEmployee(name) {
    const key    = name.trim().toLowerCase();
    const emp    = employeeDirectory[key];
    const idEl   = document.getElementById('pcEmpId');
    const posEl  = document.getElementById('pcCurrentPos');
    const deptEl = document.getElementById('pcDept');

    if (emp) {
        idEl.value   = emp.id;
        posEl.value  = emp.position;
        deptEl.value = emp.dept;
    } else {
        idEl.value   = '';
        posEl.value  = '';
        deptEl.value = '';
    }
}

function generatePCRId() {
    return 'PCR-' + String(positionChangeData.length + 1).padStart(3, '0');
}

function getStatusFilterLabel(status) {
    var labels = {
        'pending-hr': 'Status: Pending - HR Evaluator',
        'pending-head': 'Status: Pending - Dept. Head',
        'pending-hr-head': 'Status: Pending - HR Head',
        'pending-sd': 'Status: Pending - SD',
        approved: 'Status: Approved',
        rejected: 'Status: Rejected'
    };

    return labels[status] || '';
}

function getCurrentTableMode() {
    return activeMainTab === 'position' ? 'Position' : 'Active';
}

function matchesSearch(app, query) {
    if (!query) return true;

    var haystack = [
        app.id,
        app.name,
        app.dept,
        app.position,
        app.progress,
        app.statusLabel,
        app.reviewedBy,
        app.remarks
    ].join(' ').toLowerCase();

    return haystack.indexOf(query) !== -1;
}

function syncFilterChip() {
    var row   = document.getElementById('activeFilterRow');
    var label = document.getElementById('activeFilterLabel');

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
    var menu = document.getElementById('filterMenu');
    var btn  = document.getElementById('filterBtn');

    if (!menu || !btn) return;

    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
}

function openFilterMenu() {
    var menu = document.getElementById('filterMenu');
    var btn  = document.getElementById('filterBtn');

    if (!menu || !btn) return;

    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
}

function toggleFilterMenu() {
    var menu = document.getElementById('filterMenu');

    if (!menu) return;

    if (menu.classList.contains('open')) {
        closeFilterMenu();
    } else {
        openFilterMenu();
    }
}

function applyAppFilter(filterValue, filterLabel) {
    activeAppFilter = filterValue;
    activeAppFilterLabel = filterLabel || '';
    syncFilterChip();
    closeFilterMenu();
    renderCurrentTab();
}

function clearAppFilter() {
    activeAppFilter = '';
    activeAppFilterLabel = '';
    syncFilterChip();
    closeFilterMenu();
    renderCurrentTab();
}

function setMainTab(tabName) {
    var tabNew = document.getElementById('tab-new');
    var tabPosition = document.getElementById('tab-position');

    activeMainTab = tabName === 'position' ? 'position' : 'new';

    if (activeMainTab === 'position') {
        tabPosition.classList.add('active');
        tabNew.classList.remove('active');
    } else {
        tabNew.classList.add('active');
        tabPosition.classList.remove('active');
    }

    updateTableHeaders();
}

function updateTableHeaders() {
    var hId = document.getElementById('hdr-col-id');
    var hName = document.getElementById('hdr-col-name');
    var hDept = document.getElementById('hdr-col-dept');
    var hPosition = document.getElementById('hdr-col-position');
    var hSubmitted = document.getElementById('hdr-col-submitted');
    var hProgress = document.getElementById('hdr-col-progress');
    var hStatus = document.getElementById('hdr-col-status');
    var hActions = document.getElementById('hdr-col-actions');

    if (!hId || !hName || !hDept || !hPosition || !hSubmitted || !hProgress || !hStatus || !hActions) {
        return;
    }

    if (activeMainTab === 'position') {
        hId.innerText = 'Request ID';
        hName.innerText = 'Full Name';
        hDept.innerText = 'Current Position';
        hPosition.innerText = 'Requested Position';
        hSubmitted.innerText = 'Department';
        hProgress.innerText = 'Submitted';
        hStatus.innerText = 'Status';
        hActions.innerText = 'Actions';
        return;
    }

    hId.innerText = 'Application ID';
    hName.innerText = 'Full Name';
    hDept.innerText = 'Department';
    hPosition.innerText = 'Position';
    hSubmitted.innerText = 'Submitted';
    hProgress.innerText = 'Progress';
    hStatus.innerText = 'Status';
    hActions.innerText = 'Actions';
}

function renderRows(rows) {
    const body     = document.getElementById('applicationTableBody');
    const template = document.getElementById('appRowTemplate');
    body.innerHTML = '';

    if (rows.length === 0) {
        body.innerHTML = '<tr><td colspan="8" class="no-records">No records found.</td></tr>';
        return;
    }

    rows.forEach(function (app) {
        const clone   = template.content.cloneNode(true);
        const isFinal = isFinalStatus(app.status);
        const canAct  = canActOnApp(app.status);

        clone.querySelector('.col-id').innerText   = app.id;
        clone.querySelector('.col-name').innerText = app.name;

        if (activeMainTab === 'position') {
            clone.querySelector('.col-dept').innerText      = app.position || '---';
            clone.querySelector('.col-position').innerText  = app.requestedPos || '---';
            clone.querySelector('.col-submitted').innerText = app.dept || '---';
            clone.querySelector('.col-progress').innerText  = app.submitted || '---';
        } else {
            clone.querySelector('.col-dept').innerText      = app.dept;
            clone.querySelector('.col-position').innerText  = app.position;
            clone.querySelector('.col-submitted').innerText = app.submitted;
            clone.querySelector('.col-progress').innerText  = app.progress;
        }

        clone.querySelector('.col-status').innerHTML    =
            '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';

        const actionsCell = clone.querySelector('.col-actions');

        if (isFinal) {
            actionsCell.innerHTML = '<span class="action-link view-link-btn">View Details</span>';
            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(app.id);
            });
        } else if (canAct) {
            actionsCell.innerHTML =
                '<div class="actions-cell">' +
                    '<span class="action-link view-link-btn">View Details</span>' +
                    '<div class="dropdown">' +
                        '<button class="update-link">Update <i class="fas fa-caret-down"></i></button>' +
                        '<div class="dropdown-content">' +
                            '<a href="#" class="approve-option" data-id="' + app.id + '">Approve</a>' +
                            '<a href="#" class="reject-option"  data-id="' + app.id + '">Reject</a>' +
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
        } else {
            actionsCell.innerHTML = '<div class="actions-cell"><span class="action-link view-link-btn">View Details</span></div>';
            actionsCell.querySelector('.view-link-btn').addEventListener('click', function () {
                openModal(app.id);
            });
        }

        body.appendChild(clone);
    });
}

function renderCurrentTab() {
    if (activeMainTab === 'position') {
        renderPositionChangeTable();
        return;
    }
    renderTable('Active');
}

function updateModalDocPage() {
    var page1 = document.getElementById('modalDocPage1');
    var page2 = document.getElementById('modalDocPage2');
    var pageName = document.getElementById('docPageName');
    var prevBtn = document.getElementById('docPrevBtn');
    var nextBtn = document.getElementById('docNextBtn');

    if (!page1 || !page2 || !pageName || !prevBtn || !nextBtn) return;

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
    var container = document.getElementById('modalStatusHistory');
    if (!container || !app) return;

    var entries = [];

    entries.push({
        title: 'Submitted',
        meta: app.name + ' on ' + (app.submitted || '---')
    });

    if (isPositionChangeRecord(app)) {
        if (app.status === 'pending-hr') {
            entries.push({
                title: 'Pending',
                meta: 'with ' + (app.pendingWith || 'HR Evaluator')
            });
        } else if (app.status === 'pending-sd') {
            entries.push({
                title: 'Approved',
                meta: 'by ' + (app.hrReviewedBy || 'HR Evaluator') + ' on ' + (app.hrReviewedAt || '---')
            });
            entries.push({
                title: 'Pending',
                meta: 'with ' + (app.pendingWith || 'School Director')
            });
        } else if (app.status === 'approved') {
            entries.push({
                title: 'Approved',
                meta: 'by ' + (app.hrReviewedBy || 'HR Evaluator') + ' on ' + (app.hrReviewedAt || '---')
            });
            entries.push({
                title: 'Approved',
                meta: 'by ' + (app.finalReviewedBy || sdName) + ' on ' + (app.finalReviewedAt || '---')
            });
        } else if (app.status === 'rejected') {
            entries.push({
                title: 'Approved',
                meta: 'by ' + (app.hrReviewedBy || 'HR Evaluator') + ' on ' + (app.hrReviewedAt || '---')
            });
            entries.push({
                title: 'Rejected',
                meta: 'by ' + (app.finalReviewedBy || sdName) + ' on ' + (app.finalReviewedAt || '---')
            });
        }

        container.innerHTML = entries.map(function (entry, index) {
            var markerClass = index === entries.length - 1 ? ' current' : '';
            return '<div class="status-history-entry' + markerClass + '">' +
                '<span class="status-history-dot"></span>' +
                '<div class="status-history-copy">' +
                    '<div class="status-history-title">' + entry.title + '</div>' +
                    '<div class="status-history-meta">' + entry.meta + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
        return;
    }

    if (app.status === 'pending-head') {
        entries.push({
            title: 'Pending',
            meta: 'with ' + (app.pendingWith || 'Department Head')
        });
    } else if (app.status === 'pending-hr') {
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.headReviewedBy || 'Department Head') + ' on ' + (app.headReviewedAt || '---')
        });
        entries.push({
            title: 'Pending',
            meta: 'with ' + (app.pendingWith || 'HR Evaluator')
        });
    } else if (app.status === 'pending-hr-head') {
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.headReviewedBy || 'Department Head') + ' on ' + (app.headReviewedAt || '---')
        });
        entries.push({
            title: 'Pending',
            meta: 'with ' + (app.pendingWith || 'HR Head')
        });
    } else if (app.status === 'pending-sd') {
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.headReviewedBy || 'Department Head') + ' on ' + (app.headReviewedAt || '---')
        });
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.hrHeadReviewedBy || 'HR Head') + ' on ' + (app.hrHeadReviewedAt || '---')
        });
        entries.push({
            title: 'Pending',
            meta: 'with ' + (app.pendingWith || 'School Director')
        });
    } else if (app.status === 'approved') {
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.headReviewedBy || 'Department Head') + ' on ' + (app.headReviewedAt || '---')
        });
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.hrHeadReviewedBy || 'HR Head') + ' on ' + (app.hrHeadReviewedAt || '---')
        });
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.finalReviewedBy || sdName) + ' on ' + (app.finalReviewedAt || '---')
        });
    } else if (app.status === 'rejected') {
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.headReviewedBy || 'Department Head') + ' on ' + (app.headReviewedAt || '---')
        });
        entries.push({
            title: 'Approved',
            meta: 'by ' + (app.hrHeadReviewedBy || 'HR Head') + ' on ' + (app.hrHeadReviewedAt || '---')
        });
        entries.push({
            title: 'Rejected',
            meta: 'by ' + (app.finalReviewedBy || sdName) + ' on ' + (app.finalReviewedAt || '---')
        });
    }

    container.innerHTML = entries.map(function (entry, index) {
        var markerClass = index === entries.length - 1 ? ' current' : '';
        return '<div class="status-history-entry' + markerClass + '">' +
            '<span class="status-history-dot"></span>' +
            '<div class="status-history-copy">' +
                '<div class="status-history-title">' + entry.title + '</div>' +
                '<div class="status-history-meta">' + entry.meta + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function populateModalDetailFields(app) {
    var label1 = document.getElementById('modalDetailLabel1');
    var label2 = document.getElementById('modalDetailLabel2');
    var label3 = document.getElementById('modalDetailLabel3');
    var label4 = document.getElementById('modalDetailLabel4');
    var label5 = document.getElementById('modalDetailLabel5');
    var label6 = document.getElementById('modalDetailLabel6');
    var item6  = document.getElementById('modalDetailItem6');

    if (isPositionChangeRecord(app)) {
        label1.innerText = 'Request ID';
        label2.innerText = 'Department';
        label3.innerText = 'Current Position';
        label4.innerText = 'Request Position';
        label5.innerText = 'Reason for Request';
        if (item6) item6.hidden = true;

        document.getElementById('modalApplicationId').innerText = app.id || '---';
        document.getElementById('modalApplicantEmail').innerText = app.dept || '---';
        document.getElementById('modalApplicantPhone').innerText = app.position || '---';
        document.getElementById('modalApplyingDepartment').innerText = app.requestedPos || '---';
        document.getElementById('modalApplyingPosition').innerText = app.reason || '---';
        document.getElementById('modalHeadRemarks').innerText = app.headRemarks || '---';
        if (label6) label6.innerText = 'Remarks from Head';
        return;
    }

    label1.innerText = 'Application ID';
    label2.innerText = 'Email';
    label3.innerText = 'Phone Number';
    label4.innerText = 'Department Applying To';
    label5.innerText = 'Position Applying For';
    if (label6) label6.innerText = 'Remarks from Head';
    if (item6) item6.hidden = false;

    document.getElementById('modalApplicationId').innerText = app.id || '---';
    document.getElementById('modalApplicantEmail').innerText = app.email || '---';
    document.getElementById('modalApplicantPhone').innerText = app.phoneNumber || '---';
    document.getElementById('modalApplyingDepartment').innerText = app.applyingTo || app.dept || '---';
    document.getElementById('modalApplyingPosition').innerText = app.applyingFor || app.position || '---';
    document.getElementById('modalHeadRemarks').innerText = app.headRemarks || '---';
}

// ── Toast System ──────────────────────────────────────────────────────
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const icons = {
        approved: 'fas fa-check-circle',
        rejected: 'fas fa-times-circle',
        info:     'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML =
        '<i class="' + icons[type] + ' toast-icon"></i>' +
        '<div class="toast-body">' +
            '<div class="toast-title">' + title + '</div>' +
            '<div class="toast-msg">' + message + '</div>' +
        '</div>' +
        '<button class="toast-close"><i class="fas fa-times"></i></button>' +
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

// ── Render Table ──────────────────────────────────────────────────────
function renderTable(mode) {
    const query    = document.getElementById('tableSearch').value.trim().toLowerCase();

    let filtered = mode === 'Active'
        ? appData.filter(function (a) { return !isFinalStatus(a.status); })
        : appData.filter(function (a) { return  isFinalStatus(a.status); });

    if (activeAppFilter) {
        filtered = filtered.filter(function (app) {
            return app.status === activeAppFilter;
        });
    }

    if (query) {
        filtered = filtered.filter(function (app) {
            return matchesSearch(app, query);
        });
    }

    renderRows(filtered);
}

function renderPositionChangeTable() {
    const query = document.getElementById('tableSearch').value.trim().toLowerCase();

    let filtered = positionChangeData.slice();

    if (activeAppFilter) {
        filtered = filtered.filter(function (app) {
            return app.status === activeAppFilter;
        });
    }

    if (query) {
        filtered = filtered.filter(function (app) {
            return matchesSearch(app, query);
        });
    }

    renderRows(filtered);
}

// ── Open Modal ────────────────────────────────────────────────────────
function openModal(id) {
    activeAppId = id;
    activeDocPage = 1;
    const app = findRecordById(id);
    if (!app) return;

    if (isPositionChangeRecord(app)) {
        document.getElementById('modalApplicantName').innerText = (app.name || 'Application Detail') + (app.empId ? ' (' + app.empId + ')' : '');
    } else {
        document.getElementById('modalApplicantName').innerText = app.name || 'Application Detail';
    }
    populateModalDetailFields(app);
    document.getElementById('modalAddRemarks').value            = app.remarks || '';
    document.getElementById('modalFileName').innerText        = app.fileName;
    document.getElementById('modalSubmitDate').innerText      = app.submitted;
    document.getElementById('modalDepartment').innerText      = app.dept;
    document.getElementById('modalPosition').innerText        = app.position;
    document.getElementById('modalProgress').innerText        = app.progress;
    document.getElementById('modalRemarks').innerText         = app.remarks;
    document.getElementById('modalStatusContainer').innerHTML =
        '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';
    document.getElementById('pdfPlaceholder').innerHTML       =
        '<i class="fas fa-file-pdf"></i><p>Preview for ' + app.fileName + '</p>';
    renderStatusHistory(app);
    updateModalDocPage();

    // Only show Approve/Reject if it's SD's stage
    document.getElementById('modalActions').style.display =
        (!isFinalStatus(app.status) && canActOnApp(app.status)) ? 'flex' : 'none';

    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// ── Process Application ───────────────────────────────────────────────
function processApp(id, decision) {
    const app = findRecordById(id);
    if (!app) return;

    const dateStr = new Date().toLocaleDateString();

    // Guard: only allow action if it's SD's stage
    if (!canActOnApp(app.status)) {
        showToast('info', 'Action Not Allowed',
            'This application is not at the School Director stage.');
        return;
    }

    if (decision === 'Approved') {
        app.status      = 'approved';
        app.statusLabel = 'Approved';
        app.progress    = 'Completed';
        app.reviewedBy  = sdName;
        app.finalReviewedBy = sdName;
        app.finalReviewedAt = dateStr;
        app.pendingWith  = 'Completed';
        app.remarks     = 'Approved on ' + dateStr + '.';
        showToast('approved', 'Application Approved',
            app.name + "'s application has been successfully approved.");
    } else {
        app.status      = 'rejected';
        app.statusLabel = 'Rejected';
        app.progress    = 'Completed';
        app.reviewedBy  = sdName;
        app.finalReviewedBy = sdName;
        app.finalReviewedAt = dateStr;
        app.pendingWith  = 'Completed';
        app.remarks     = 'Rejected on ' + dateStr + '.';
        showToast('rejected', 'Application Rejected',
            app.name + "'s application has been rejected.");
    }

    // Update modal live
    document.getElementById('modalStatusContainer').innerHTML =
        '<span class="status-pill ' + app.status + '">' + app.statusLabel + '</span>';
    document.getElementById('modalRemarks').innerText      = app.remarks;
    document.getElementById('modalAddRemarks').value       = app.remarks;
    renderStatusHistory(app);
    document.getElementById('modalActions').style.display  = 'none';

    renderCurrentTab();
}

// ── DOM Ready ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const sidebar     = document.getElementById('sidebar');
    const logoToggle  = document.getElementById('logoToggle');
    const closeBtn    = document.getElementById('closeBtn');
    const tabNew      = document.getElementById('tab-new');
    const tabPosition = document.getElementById('tab-position');
    const posModal    = document.getElementById('positionChangeModal');
    const viewModal   = document.getElementById('viewModal');
    const filterBtn   = document.getElementById('filterBtn');
    const filterMenu  = document.getElementById('filterMenu');
    const clearBtn    = document.getElementById('clearFilterBtn');
    const prevDocBtn  = document.getElementById('docPrevBtn');
    const nextDocBtn  = document.getElementById('docNextBtn');

    // Sidebar tooltips
    document.querySelectorAll('.menu-item').forEach(function (item) {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.textContent.trim());
    });

    // Sidebar toggle
    if (closeBtn)   closeBtn.onclick   = function () { sidebar.classList.add('collapsed'); };
    if (logoToggle) logoToggle.onclick = function () { sidebar.classList.toggle('collapsed'); };

    // Tab — Records
    tabNew.addEventListener('click', function () {
        setMainTab('new');
        renderCurrentTab();
    });

    // Tab — Position Change Requests
    tabPosition.addEventListener('click', function () {
        setMainTab('position');
        renderCurrentTab();
    });

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

    // Auto-fill employee details
    document.getElementById('pcEmpName').addEventListener('blur', function () {
        autoFillEmployee(this.value);
    });

    // Save position change request
    document.getElementById('saveRequest').addEventListener('click', function () {
        var empName      = document.getElementById('pcEmpName').value.trim();
        var empId        = document.getElementById('pcEmpId').value.trim();
        var requestedPos = document.getElementById('pcRequestedPos').value;
        var effectDate   = document.getElementById('pcEffectiveDate').value;
        var reason       = document.getElementById('pcReason').value.trim();

        var valid = true;
        [
            { id: 'pcEmpName',       val: empName      },
            { id: 'pcRequestedPos',  val: requestedPos },
            { id: 'pcEffectiveDate', val: effectDate   },
            { id: 'pcReason',        val: reason       }
        ].forEach(function (field) {
            var el = document.getElementById(field.id);
            if (!field.val) {
                el.style.borderColor = '#dc3545';
                valid = false;
            } else {
                el.style.borderColor = '';
            }
        });

        if (!valid) {
            showToast('info', 'Incomplete Form', 'Please fill in all required fields.');
            return;
        }

        var currentPos = document.getElementById('pcCurrentPos').value.trim() || 'N/A';
        var dept       = document.getElementById('pcDept').value.trim()       || 'N/A';

        var newEntry = {
            id:           generatePCRId(),
            name:         empName,
            empId:        empId || 'N/A',
            dept:         dept,
            position:     currentPos,
            requestedPos: requestedPos,
            effectiveDate: effectDate,
            reason:       reason,
            submitted:    new Date().toLocaleDateString(),
            progress:     'Stage 1 of 2',
            status:       'pending-hr',
            statusLabel:  'Pending - HR Evaluator',
            reviewedBy:   '---',
            hrReviewedBy: '---',
            hrReviewedAt: '---',
            remarks:      'Position change request logged by ' + sdName + '.',
            fileName:     'PCR_' + (positionChangeData.length + 1) + '.pdf'
        };

        positionChangeData.push(newEntry);

        posModal.style.display = 'none';
        resetPositionForm();
        renderCurrentTab();

        showToast('info', 'Request Saved',
            'Position change request for ' + empName + ' has been logged successfully.');
    });

    // Modal approve / reject buttons
    document.getElementById('modalApproveBtn').addEventListener('click', function () {
        processApp(activeAppId, 'Approved');
    });
    document.getElementById('modalRejectBtn').addEventListener('click', function () {
        processApp(activeAppId, 'Rejected');
    });

    // Modal close
    document.getElementById('modalCloseBtn').addEventListener('click', closeViewModal);

    // Cancel position-change modal
    document.getElementById('cancelRequest').addEventListener('click', function () {
        posModal.style.display = 'none';
        resetPositionForm();
        renderCurrentTab();
    });

    // Click outside modal to close
    window.addEventListener('click', function (e) {
        if (!e.target.closest('.filter-dropdown')) {
            closeFilterMenu();
        }
        if (e.target === viewModal) closeViewModal();
        if (e.target === posModal) {
            posModal.style.display = 'none';
            resetPositionForm();
            renderCurrentTab();
        }
    });

    // ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeFilterMenu();
            closeViewModal();
            posModal.style.display = 'none';
            resetPositionForm();
            renderCurrentTab();
        }
    });

    // Live search
    document.getElementById('tableSearch').addEventListener('input', function () {
        renderCurrentTab();
    });

    // Initial render
    setMainTab('new');
    syncFilterChip();
    renderCurrentTab();
});