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
    if (nameEl) nameEl.textContent = profile.fullName || 'Department Head';
    if (roleEl) roleEl.textContent = profile.position || profile.roleLabel || 'Department Head';
    if (employeeIdEl) employeeIdEl.textContent = `Employee ID: ${profile.employeeNo || profile.id || '--'}`;

    const details = document.querySelectorAll('.employment-details p');
    if (details[0]) details[0].innerHTML = `<strong>Status</strong> <span class="status-dot" style="background:${profile.isActive ? '#8ddf9b' : '#f08d8d'}"></span> ${profile.isActive ? 'Active' : 'Inactive'}`;
    if (details[1]) details[1].innerHTML = `<strong>Position</strong> ${profile.position || '--'}`;
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

    const docBody = document.querySelector('.doc-table tbody');
    if (docBody) {
        docBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">No document records in database.</td></tr>';
    }

    const timeline = document.querySelector('.timeline');
    if (timeline) {
        timeline.innerHTML = '<div class="timeline-item"><div class="timeline-date">--</div><div class="timeline-content"><h4>No history available</h4><p>Employment history has not been recorded yet.</p></div></div>';
    }
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