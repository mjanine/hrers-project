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

    // 4. Action Cell Logic (View & Download)
    const actionCells = document.querySelectorAll('.action-cell');

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

    // 5. Load employee data when `employee_id` query param is present
    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    async function loadEmployeeDetail(employeeId) {
        if (!employeeId) return;
        try {
            let resp = await fetch(`/api/users/${encodeURIComponent(employeeId)}`);
            if (resp.ok) {
                const data = await resp.json();
                populateEmployeeView(data);
                return;
            }

            // Fallback: try admin users list (if permitted)
            try {
                const respUsers = await fetch('/accounts/users');
                if (respUsers.ok) {
                    const payload = await respUsers.json();
                    const items = payload.items || [];
                    const match = items.find(u => String(u.id) === String(employeeId));
                    if (match) {
                        populateEmployeeView(match);
                        return;
                    }
                }
            } catch (e) {}

            // Fallback: try department-head candidates (non-employees)
            try {
                const respHeads = await fetch('/accounts/department-head-candidates');
                if (respHeads.ok) {
                    const payload = await respHeads.json();
                    const items = payload.items || [];
                    const match = items.find(u => String(u.id) === String(employeeId));
                    if (match) {
                        // normalize fields
                        const normalized = {
                            id: match.id,
                            employeeNo: match.employeeNo || '',
                            fullName: match.name || match.fullName || match.full_name || '',
                            department: match.department || '',
                            position: match.role || match.roleLabel || '',
                            isActive: typeof match.isActive !== 'undefined' ? match.isActive : true,
                            email: match.email || ''
                        };
                        populateEmployeeView(normalized);
                        return;
                    }
                }
            } catch (e) {}
        } catch (e) {
            // ignore for now
        }
    }

    function populateEmployeeView(data) {
        if (!data) return;
        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value ?? '-'; };

        setText('employeeName', data.fullName || data.full_name || data.name || '-');
        setText('employeeRole', data.roleLabel || data.role || '-');
        setText('employeeId', `Employee ID: ${data.employeeNo || data.employee_no || data.id || '-'}`);
        const statusDot = document.getElementById('statusDot');
        if (statusDot) statusDot.style.background = data.isActive ? '#8ddf9b' : '#e2e8f0';
        setText('employeeStatus', data.isActive ? 'Active' : 'Inactive');
        setText('employeePosition', data.position || data.currentPosition || '-');
        setText('employeeDepartment', data.department || '-');
        setText('employeeType', data.employmentType || '-');
        setText('employeeDateHired', data.dateHired || data.date_hired || '-');
        setText('contactEmail', data.email || '-');
        setText('contactPhone', data.contactNumber || data.contact_number || '-');
        setText('contactLocation', data.address || '-');

        // Documents
        const docsBody = document.getElementById('docsTableBody');
        const docsCount = document.getElementById('docsCount');
        if (docsBody) {
            docsBody.innerHTML = '';
            const docs = data.documents || [];
            if (!docs.length) {
                docsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#666; padding:20px 0;">No documents available.</td></tr>';
                if (docsCount) docsCount.textContent = '0 documents';
            } else {
                if (docsCount) docsCount.textContent = `${docs.length} document(s)`;
                docs.forEach(d => {
                    const tr = document.createElement('tr');
                    const nameTd = document.createElement('td'); nameTd.textContent = d.name || d.fileName || 'Document';
                    const typeTd = document.createElement('td'); typeTd.textContent = d.type || (d.fileName && d.fileName.split('.').pop().toUpperCase()) || '—';
                    const statusTd = document.createElement('td'); statusTd.className = 'doc-status'; statusTd.textContent = d.status || '—';
                    const dateTd = document.createElement('td'); dateTd.textContent = d.uploadedAt || d.dateUploaded || '—';
                    const actionsTd = document.createElement('td'); actionsTd.className = 'action-cell';
                    if (d.url) {
                        const viewA = document.createElement('a'); viewA.href = d.url; viewA.target = '_blank'; viewA.title = 'View Document'; viewA.innerHTML = '<i class="fas fa-eye"></i>';
                        const dlA = document.createElement('a'); dlA.href = d.url; dlA.download = '' ; dlA.title = 'Download Document'; dlA.style.marginLeft = '8px'; dlA.innerHTML = '<i class="fas fa-download"></i>';
                        actionsTd.appendChild(viewA); actionsTd.appendChild(dlA);
                    } else {
                        actionsTd.textContent = '---';
                    }
                    tr.appendChild(nameTd); tr.appendChild(typeTd); tr.appendChild(statusTd); tr.appendChild(dateTd); tr.appendChild(actionsTd);
                    docsBody.appendChild(tr);
                });
            }
        }

        // Timeline / History
        const timelineContainer = document.getElementById('timelineContainer');
        const timelineTpl = document.getElementById('timelineItemTemplate');
        if (timelineContainer) {
            timelineContainer.innerHTML = '';
            const history = data.history || [];
            if (!history.length) {
                timelineContainer.innerHTML = '<div style="text-align:center; padding:20px 0; color:#666;">No history available.</div>';
            } else {
                history.forEach(h => {
                    const item = timelineTpl.content.cloneNode(true);
                    const node = item.querySelector('.timeline-item');
                    node.querySelector('.timeline-date').textContent = h.year || h.date || '';
                    node.querySelector('.timeline-title').textContent = h.title || h.event || '';
                    node.querySelector('.timeline-desc').textContent = h.description || h.desc || '';
                    timelineContainer.appendChild(node);
                });
            }
        }
    }

    const employeeId = getQueryParam('employee_id') || getQueryParam('id');
    if (employeeId) loadEmployeeDetail(employeeId);
});