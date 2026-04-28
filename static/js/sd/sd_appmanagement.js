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

let appData = [];
let positionChangeData = [];

function getEmailDecisionIntent() {
    var params = new URLSearchParams(window.location.search);
    var requestIdRaw = params.get('positionRequestId') || '';
    var decisionRaw = (params.get('emailDecision') || '').toLowerCase();
    var requestId = parseInt(requestIdRaw, 10);

    if (!requestId || !Number.isFinite(requestId)) {
        return null;
    }

    if (decisionRaw !== 'approve' && decisionRaw !== 'reject') {
        return null;
    }

    return {
        requestId: requestId,
        decision: decisionRaw === 'approve' ? 'Approved' : 'Rejected'
    };
}

async function applyEmailDecisionIntent() {
    var intent = getEmailDecisionIntent();
    if (!intent) {
        return;
    }

    try {
        var formData = new FormData();
        formData.append('decision', intent.decision.toLowerCase());
        formData.append('remarks', 'Decision submitted via SD email review link.');

        var response = await fetch('/api/position-requests/' + intent.requestId + '/decision', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Unable to process the requested action from email link.');
        }

        await refreshAppManagementData();
        setMainTab('position');
        renderCurrentTab();

        showToast(
            intent.decision === 'Approved' ? 'approved' : 'rejected',
            intent.decision === 'Approved' ? 'Position Request Approved' : 'Position Request Rejected',
            'Email review action has been recorded successfully.'
        );
    } catch (error) {
        showToast('info', 'Action Not Completed', error.message || 'Unable to process the requested action.');
    } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function mapStatusForSd(status) {
    if (status === 'approved' || status === 'rejected') {
        return status;
    }
    return 'pending-sd';
}

function mapLeaveToApp(item) {
    var normalizedStatus = mapStatusForSd((item.status || '').toLowerCase());
    return {
        id: 'LR-' + item.id,
        sourceType: 'leave',
        sourceId: item.id,
        name: item.name || '--',
        email: '--',
        phoneNumber: '--',
        dept: (item.role || '').replace(/_/g, ' ') || '--',
        applyingTo: (item.role || '').replace(/_/g, ' ') || '--',
        position: item.leaveType || 'Leave Request',
        applyingFor: item.leaveType || 'Leave Request',
        submitted: item.dateFiled || '---',
        progress: normalizedStatus === 'pending-sd' ? 'In Review' : 'Completed',
        status: normalizedStatus,
        statusLabel: normalizedStatus === 'pending-sd' ? 'Pending - SD' : (normalizedStatus === 'approved' ? 'Approved' : 'Rejected'),
        reviewedBy: item.reviewedBy || '---',
        headReviewedBy: item.reviewedBy || '---',
        headReviewedAt: item.submitTime || '---',
        finalReviewedBy: item.reviewedBy || '---',
        finalReviewedAt: item.submitTime || '---',
        pendingWith: normalizedStatus === 'pending-sd' ? 'School Director' : 'Completed',
        remarks: item.reviewRemarks || 'Awaiting review.',
        headRemarks: item.reason || '---',
        fileName: item.fileName || 'No Document Attached'
    };
}

function mapPositionToApp(item) {
    var normalizedStatus = mapStatusForSd((item.status || '').toLowerCase());
    return {
        id: 'PCR-' + item.id,
        sourceType: 'position',
        sourceId: item.id,
        name: item.employeeName || '--',
        empId: item.employeeId || '--',
        dept: item.currentDepartment || '--',
        position: item.currentPosition || '--',
        requestedPos: item.requestedPosition || '--',
        reason: item.reason || '--',
        submitted: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '---',
        progress: normalizedStatus === 'pending-sd' ? 'In Review' : 'Completed',
        status: normalizedStatus,
        statusLabel: normalizedStatus === 'pending-sd' ? 'Pending - SD' : (normalizedStatus === 'approved' ? 'Approved' : 'Rejected'),
        reviewedBy: item.reviewedBy || '---',
        hrReviewedBy: item.reviewedBy || '---',
        hrReviewedAt: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '---',
        remarks: item.reviewRemarks || 'Awaiting review.',
        headRemarks: item.reviewRemarks || '---',
        fileName: 'Position_Change_' + item.id + '.pdf'
    };
}

async function refreshAppManagementData() {
    try {
        var leaveResponse = await fetch('/api/leave-requests?mode=all');
        if (leaveResponse.ok) {
            var leavePayload = await leaveResponse.json();
            appData = (leavePayload.items || []).map(mapLeaveToApp);
        }
    } catch (error) {
        appData = [];
    }

    try {
        var positionResponse = await fetch('/api/position-requests?mode=all');
        if (positionResponse.ok) {
            var positionPayload = await positionResponse.json();
            positionChangeData = (positionPayload.items || []).map(mapPositionToApp);
        }
    } catch (error) {
        positionChangeData = [];
    }
}

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

async function autoFillEmployee(name) {
    const key    = name.trim().toLowerCase();
    const idEl   = document.getElementById('pcEmpId');
    const posEl  = document.getElementById('pcCurrentPos');
    const deptEl = document.getElementById('pcDept');

    if (!key) {
        idEl.value = '';
        posEl.value = '';
        deptEl.value = '';
        return;
    }

    try {
        const response = await fetch(`/api/employees/search?q=${encodeURIComponent(name)}&limit=1`);
        if (response.ok) {
            const payload = await response.json();
            const first = (payload.items || [])[0];
            if (first) {
                idEl.value = first.employeeNo || '';
                posEl.value = first.currentPosition || '';
                deptEl.value = first.currentDepartment || '';
                return;
            }
        }
    } catch (error) {
    }

    idEl.value   = '';
    posEl.value  = '';
    deptEl.value = '';
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
async function processApp(id, decision) {
    const app = findRecordById(id);
    if (!app) return;

    // Guard: only allow action if it's SD's stage
    if (!canActOnApp(app.status)) {
        showToast('info', 'Action Not Allowed',
            'This application is not at the School Director stage.');
        return;
    }

    var formData = new FormData();
    formData.append('decision', decision.toLowerCase());
    formData.append('remarks', document.getElementById('modalAddRemarks').value.trim());

    var endpoint = app.sourceType === 'position'
        ? '/api/position-requests/' + app.sourceId + '/decision'
        : '/api/leave-requests/' + app.sourceId + '/decision';

    try {
        var response = await fetch(endpoint, { method: 'POST', body: formData });
        if (!response.ok) {
            throw new Error('Failed to update request');
        }

        await refreshAppManagementData();
        renderCurrentTab();

        showToast(
            decision === 'Approved' ? 'approved' : 'rejected',
            decision === 'Approved' ? 'Application Approved' : 'Application Rejected',
            app.name + (decision === 'Approved' ? "'s request has been approved." : "'s request has been rejected.")
        );
    } catch (error) {
        showToast('info', 'Update Failed', 'Unable to process this request right now.');
    }
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
    document.getElementById('saveRequest').addEventListener('click', async function () {
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

        var currentPos = document.getElementById('pcCurrentPos').value.trim() || '';
        var dept       = document.getElementById('pcDept').value.trim()       || '';

        var payload = new FormData();
        payload.append('employee_name', empName);
        payload.append('employee_no', empId);
        payload.append('current_position', currentPos);
        payload.append('current_department', dept);
        payload.append('requested_position', requestedPos);
        payload.append('effective_date', effectDate);
        payload.append('reason', reason);

        try {
            var response = await fetch('/api/position-requests', { method: 'POST', body: payload });
            if (!response.ok) {
                throw new Error('Failed to save request');
            }

            await refreshAppManagementData();
            posModal.style.display = 'none';
            resetPositionForm();
            renderCurrentTab();

            showToast('info', 'Request Saved',
                'Position change request for ' + empName + ' has been logged successfully.');
        } catch (error) {
            showToast('info', 'Save Failed', 'Unable to save request right now.');
        }
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
    refreshAppManagementData().then(function () {
        renderCurrentTab();
        applyEmailDecisionIntent();
    });
});