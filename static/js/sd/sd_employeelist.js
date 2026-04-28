document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn = document.getElementById("closeBtn");
    const menuItems = document.querySelectorAll(".menu-item");

    // 1. Tooltip Logic: Set data-text attribute automatically
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) {
            item.setAttribute("data-text", span.textContent.trim());
        }
    });

    // 2. Sidebar Toggle Logic
    if (closeBtn) {
        closeBtn.onclick = () => sidebar.classList.add("collapsed");
    }
    if (logoToggle) {
        logoToggle.onclick = () => sidebar.classList.toggle("collapsed");
    }

    // 3. Search and Filter Logic (Existing)
    const searchInput = document.getElementById('searchInput');
    const filterPosition = document.getElementById('filterPosition');
    const filterStatus = document.getElementById('filterStatus');
    const tableBody = document.getElementById('employeeTableBody');
    const rowTemplate = document.getElementById('employeeRowTemplate');

    async function loadEmployees() {
        if (!tableBody) return;
        try {
            // Try to fetch multiple sources and merge: employees + admin user list + department-head-candidates
            const results = await Promise.allSettled([
                fetch('/api/users'),
                fetch('/accounts/users'),
            ]);

            let records = [];

            if (results[0] && results[0].status === 'fulfilled' && results[0].value.ok) {
                const payload = await results[0].value.json();
                records = Array.isArray(payload.items) ? payload.items : [];
            } else if (results[1] && results[1].status === 'fulfilled' && results[1].value.ok) {
                const payload = await results[1].value.json();
                records = Array.isArray(payload.items) ? payload.items : [];
            }

            const finalList = records.map((u) => ({
                id: u.id,
                employeeNo: u.employeeNo || u.employee_no || '',
                fullName: u.fullName || u.full_name || u.name || '',
                department: u.department || '',
                position: u.position || u.currentPosition || u.roleLabel || u.role || '',
                isActive: typeof u.isActive !== 'undefined' ? u.isActive : (u.is_active || false),
            })).sort((a,b) => (a.fullName || '').localeCompare(b.fullName || ''));

            if (!finalList.length) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:20px 0;">No records found.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            finalList.forEach(emp => {
                const tpl = rowTemplate.content.cloneNode(true);
                const tr = tpl.querySelector('tr');
                tr.querySelector('.emp-id').textContent = emp.employeeNo || '';
                tr.querySelector('.emp-name').textContent = emp.fullName || '';
                tr.querySelector('.emp-dept').textContent = emp.department || '';
                tr.querySelector('.emp-position').textContent = emp.position || '';
                tr.querySelector('.emp-status').textContent = (emp.isActive ? 'Active' : 'Inactive');

                const viewLink = tr.querySelector('.view-link');
                if (viewLink) {
                    viewLink.setAttribute('href', `sd_employee_view.html?employee_id=${encodeURIComponent(emp.id)}&id=${encodeURIComponent(emp.id)}&employeeId=${encodeURIComponent(emp.id)}`);
                }

                tableBody.appendChild(tr);
            });
        } catch (err) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#d00; padding:20px 0;">Error loading records.</td></tr>';
        }
    }

    function filterTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedPosition = filterPosition.value;
        const selectedStatus = filterStatus.value;

        Array.from(tableBody.rows).forEach(row => {
            const cells = row.cells;
            const rowText = row.textContent.toLowerCase();
            const rowPosition = cells[3].textContent.trim();
            const rowStatus = cells[4].textContent.trim();

            const matchesSearch = rowText.includes(searchTerm);
            const matchesPosition = selectedPosition === "" || rowPosition === selectedPosition;
            const matchesStatus = selectedStatus === "" || rowStatus === selectedStatus;

            row.style.display = (matchesSearch && matchesPosition && matchesStatus) ? "" : "none";
        });
    }

    searchInput.addEventListener('input', filterTable);
    filterPosition.addEventListener('change', filterTable);
    filterStatus.addEventListener('change', filterTable);

    // Initial load
    loadEmployees();
});