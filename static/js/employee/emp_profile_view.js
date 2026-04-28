function setupProfileViewPage() {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach((item) => {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.innerText);
    });

    if (sidebar && closeBtn) closeBtn.onclick = () => sidebar.classList.toggle('close');
    if (sidebar && logoToggle) logoToggle.onclick = () => sidebar.classList.toggle('close');

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content-item');
    tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (!targetContent) return;

            tabs.forEach((t) => t.classList.remove('active'));
            tabContents.forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            targetContent.classList.add('active');
        });
    });
}

function setInfoRowValue(labelNeedle, value) {
    const rows = document.querySelectorAll('.info-row');
    rows.forEach((row) => {
        const spans = row.querySelectorAll('span');
        if (spans.length < 2) return;
        if ((spans[0].textContent || '').toLowerCase().includes(labelNeedle.toLowerCase())) {
            spans[1].textContent = value || '--';
        }
    });
}

function applyProfileToView(profile) {
    const nameEl = document.querySelector('.profile-info h2');
    const roleEl = document.querySelector('.profile-info .role');
    const employeeIdEl = document.querySelector('.profile-info .employee-id');
    if (nameEl) nameEl.textContent = profile.fullName || 'Employee';
    if (roleEl) roleEl.textContent = profile.position || profile.roleLabel || 'Employee';
    if (employeeIdEl) employeeIdEl.textContent = `Employee ID: ${profile.employeeNo || profile.id || '--'}`;

    const details = document.querySelectorAll('.employment-details p');
    if (details[0]) {
        details[0].innerHTML = `<strong>Status</strong> <span class="status-dot" style="background:${profile.isActive ? '#8ddf9b' : '#f08d8d'}"></span> ${profile.isActive ? 'Active' : 'Inactive'}`;
    }
    if (details[1]) details[1].innerHTML = `<strong>Position</strong> ${profile.position || profile.roleLabel || '--'}`;
    if (details[2]) details[2].innerHTML = `<strong>Department</strong> ${profile.department || '--'}`;
    if (details[3]) details[3].innerHTML = `<strong>Employment Type</strong> ${profile.employmentType || '--'}`;
    if (details[4]) details[4].innerHTML = `<strong>Date Hired</strong> ${profile.dateHired || '--'}`;

    const contactLines = document.querySelectorAll('.contact-info p');
    if (contactLines[0]) contactLines[0].innerHTML = `<i class="fas fa-envelope"></i> ${profile.email || '--'}`;
    if (contactLines[1]) contactLines[1].innerHTML = `<i class="fas fa-phone"></i> ${profile.contactNumber || '--'}`;
    if (contactLines[2]) contactLines[2].innerHTML = `<i class="fas fa-location-dot"></i> ${profile.address || '--'}`;

    setInfoRowValue('Department', profile.department || '--');
    setInfoRowValue('Email', profile.email || '--');
    setInfoRowValue('Contact', profile.contactNumber || '--');

    renderDocumentAlerts(profile.documentAlerts || []);
    renderProfileDocuments(profile.documents || []);
    renderProfileHistory(profile.history || []);
}

function renderDocumentAlerts(alerts) {
    const docsTab = document.getElementById('docs');
    if (!docsTab) return;

    let banner = document.getElementById('documentAlertBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'documentAlertBanner';
        banner.style.cssText = 'margin:0 0 14px 0; padding:12px 14px; border-radius:8px; background:#fff7e6; color:#8a5a00; border:1px solid #ffd28a;';
        docsTab.insertBefore(banner, docsTab.firstChild);
    }

    if (!Array.isArray(alerts) || alerts.length === 0) {
        banner.style.display = 'none';
        banner.textContent = '';
        return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `<strong>Document reminder:</strong> ${alerts[0].message || 'One or more documents need attention.'}`;
}

function renderProfileDocuments(documents) {
    const docsTab = document.getElementById('docs');
    if (!docsTab) return;

    const headerSpan = docsTab.querySelector('.doc-header span');
    const tbody = docsTab.querySelector('tbody');
    if (!tbody) return;

    if (!Array.isArray(documents) || documents.length === 0) {
        if (headerSpan) headerSpan.textContent = '0 documents uploaded';
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:#666; padding:16px 0;">No uploaded documents found.</td>
            </tr>
        `;
        return;
    }

    if (headerSpan) headerSpan.textContent = `${documents.length} document(s) uploaded`;
    tbody.innerHTML = documents.map((doc) => {
        const name = doc.name || doc.fileName || 'Document';
        const type = doc.type || 'FILE';
        const status = doc.status || 'Submitted';
        const date = doc.dateUploaded || doc.uploadedAt || '--';
        const url = doc.url || '';
        const statusClass = status.toLowerCase() === 'approved' ? 'valid' : (status.toLowerCase() === 'rejected' ? 'missing' : 'update');

        if (!url) {
            return `
                <tr>
                    <td>${name}</td>
                    <td>${type}</td>
                    <td class="${statusClass}">${status}</td>
                    <td>${date}</td>
                    <td class="actions">---</td>
                </tr>
            `;
        }

        return `
            <tr>
                <td>${name}</td>
                <td>${type}</td>
                <td class="${statusClass}">${status}</td>
                <td>${date}</td>
                <td class="actions">
                    <a href="${url}" target="_blank"><i class="fas fa-eye action-icon"></i></a>
                    <a href="${url}" download><i class="fas fa-download action-icon"></i></a>
                </td>
            </tr>
        `;
    }).join('');
}

function renderProfileHistory(history) {
    const historyTab = document.getElementById('history');
    if (!historyTab) return;
    const timeline = historyTab.querySelector('.timeline');
    if (!timeline) return;

    if (!Array.isArray(history) || history.length === 0) {
        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-date">--</div>
                <div class="timeline-content">
                    <h4>No history yet</h4>
                    <p>No employment history records found.</p>
                </div>
            </div>
        `;
        return;
    }

    timeline.innerHTML = history.map((item) => {
        const date = item.date || item.year || '--';
        const title = item.title || item.event || 'History Event';
        const desc = item.description || item.desc || '--';
        return `
            <div class="timeline-item">
                <div class="timeline-date">${date}</div>
                <div class="timeline-content">
                    <h4>${title}</h4>
                    <p>${desc}</p>
                </div>
            </div>
        `;
    }).join('');
}

async function loadProfileViewData() {
    try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) return;
        const profile = await response.json();
        applyProfileToView(profile);
    } catch (error) {
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupProfileViewPage();
    loadProfileViewData();
});