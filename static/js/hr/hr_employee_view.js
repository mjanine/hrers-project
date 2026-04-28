document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');

    // 1. Tooltip Fix: Automatically set labels
    menuItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            item.setAttribute('data-text', span.innerText.trim());
        }
    });

    // 2. Sidebar Toggle Logic
    if (logoToggle) {
        logoToggle.onclick = () => sidebar.classList.toggle('close');
    }
    if (closeBtn) {
        closeBtn.onclick = () => sidebar.classList.add('close');
    }

    // 3. Tabs Logic
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    const params = new URLSearchParams(window.location.search);
    const employeeId = params.get('employee_id') || params.get('id');

    async function loadEmployeeDetail() {
        if (!employeeId) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${encodeURIComponent(employeeId)}`);
            if (!response.ok) return;

            const profile = await response.json();
            const nameEl = document.querySelector('.profile-info h2');
            const roleEl = document.querySelector('.profile-info .role');
            const employeeIdEl = document.querySelector('.profile-info .employee-id');

            if (nameEl) nameEl.textContent = profile.fullName || '--';
            if (roleEl) roleEl.textContent = profile.position || profile.roleLabel || '--';
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

            const departmentRows = document.querySelectorAll('.info-row');
            if (departmentRows[0]) departmentRows[0].querySelectorAll('span')[1].textContent = profile.department || '--';
            if (departmentRows[1]) departmentRows[1].querySelectorAll('span')[1].textContent = profile.departmentCode || '--';
            if (departmentRows[2]) departmentRows[2].querySelectorAll('span')[1].textContent = profile.departmentLocation || '--';
            if (departmentRows[3]) departmentRows[3].querySelectorAll('span')[1].textContent = profile.departmentEmail || '--';
            if (departmentRows[4]) departmentRows[4].querySelectorAll('span')[1].textContent = profile.departmentContact || '--';

            const timeline = document.getElementById('timelineContainer');
            if (timeline) {
                const history = Array.isArray(profile.history) ? profile.history : [];
                timeline.innerHTML = history.length ? history.map((item) => `
                    <div class="timeline-item">
                        <div class="timeline-date">${item.date || '--'}</div>
                        <div class="timeline-content">
                            <h4>${item.title || 'History Event'}</h4>
                            <p>${item.description || '--'}</p>
                        </div>
                    </div>
                `).join('') : '<div class="timeline-item"><div class="timeline-date">--</div><div class="timeline-content"><h4>No history available</h4><p>Employment history has not been recorded yet.</p></div></div>';
            }

            const docTable = document.querySelector('.doc-table tbody');
            if (docTable) {
                const documents = Array.isArray(profile.documents) ? profile.documents : [];
                docTable.innerHTML = documents.length ? documents.map((doc) => `
                    <tr data-doc-id="${doc.id}">
                        <td>${doc.name || 'Document'}</td>
                        <td>${doc.type || 'FILE'}</td>
                        <td>${doc.status || 'Submitted'}</td>
                        <td>${doc.dateUploaded || '--'}</td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:8px; min-width:190px;">
                                <select class="doc-status-select">
                                    <option value="Approved" ${String(doc.status || '').toLowerCase() === 'approved' ? 'selected' : ''}>Approved</option>
                                    <option value="Outdated" ${String(doc.status || '').toLowerCase() === 'outdated' ? 'selected' : ''}>Outdated</option>
                                    <option value="Renew Required" ${String(doc.status || '').toLowerCase().includes('renew') ? 'selected' : ''}>Renew Required</option>
                                    <option value="Request More Info" ${String(doc.status || '').toLowerCase().includes('request') ? 'selected' : ''}>Request More Info</option>
                                </select>
                                <input type="text" class="doc-review-notes" placeholder="Review notes" value="${(doc.reviewNotes || '').replace(/"/g, '&quot;')}">
                                <button type="button" class="save-doc-status-btn">Save</button>
                            </div>
                        </td>
                    </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center; padding:2rem;">No document records in database.</td></tr>';

                docTable.querySelectorAll('.save-doc-status-btn').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const row = btn.closest('tr');
                        if (!row) return;
                        const docId = row.getAttribute('data-doc-id');
                        const statusSelect = row.querySelector('.doc-status-select');
                        const notesInput = row.querySelector('.doc-review-notes');
                        const payload = new FormData();
                        payload.set('status', statusSelect ? statusSelect.value : 'Approved');
                        payload.set('review_notes', notesInput ? notesInput.value.trim() : '');
                        const reviewResponse = await fetch(`/api/profile/documents/${encodeURIComponent(docId)}`, { method: 'PATCH', body: payload });
                        if (reviewResponse.ok) {
                            loadEmployeeDetail();
                        }
                    });
                });
            }

            const profileImg = document.querySelector('.profile-img');
            if (profileImg) profileImg.alt = profile.fullName || 'Employee photo';

            const editBtn = document.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.onclick = function () {
                    window.location.href = `hr_employee_edit.html?employee_id=${encodeURIComponent(profile.id)}`;
                };
            }
        } catch (error) {
        }
    }

    function isPlaceholderHref(hrefValue) {
        if (!hrefValue) return true;
        const normalized = hrefValue.trim().toLowerCase();
        return normalized === '#' || normalized === 'javascript:void(0)' || normalized === 'javascript:;';
    }

    function showFileUnavailableMessage(docName) {
        const message = `No uploaded file is available yet for "${docName}".`;
        if (window.Swal && typeof window.Swal.fire === 'function') {
            window.Swal.fire({
                icon: 'info',
                title: 'File Unavailable',
                text: message,
                confirmButtonColor: '#4a1d1d',
            });
            return;
        }
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.style.background = '#4a1d1d';
        toast.style.color = '#fff';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '0.9rem';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.remove();
        }, 2200);
    }

    const actionCells = document.querySelectorAll('.action-cell');
    actionCells.forEach(cell => {
        const links = cell.querySelectorAll('a');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const isDownload = link.hasAttribute('download') || link.querySelector('.fa-download');
                const isView = link.querySelector('.fa-eye');
                
                // Get document details from the current row.
                const row = link.closest('tr');
                const docName = row ? row.cells[0].innerText.trim() : "Document";
                const href = link.getAttribute('href') || '';
                const isPlaceholderLink = isPlaceholderHref(href);

                if (isDownload) {
                    if (isPlaceholderLink) {
                        e.preventDefault();
                        showFileUnavailableMessage(docName);
                    }
                } 
                
                else if (isView) {
                    if (isPlaceholderLink) {
                        e.preventDefault();
                        showFileUnavailableMessage(docName);
                    }
                }
            });
        });
    });

    loadEmployeeDetail();
});