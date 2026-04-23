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

    // 3. Directory data from backend
    const searchInput = document.getElementById('searchInput');
    const filterPosition = document.getElementById('filterPosition');
    const filterStatus = document.getElementById('filterStatus');
    const tableBody = document.getElementById('employeeTableBody');
    let employees = [];

    function renderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedPosition = filterPosition.value;
        const selectedStatus = filterStatus.value;

        const filtered = employees.filter(function (employee) {
            const haystack = [employee.employeeNo, employee.fullName, employee.department, employee.position, employee.roleLabel].join(' ').toLowerCase();
            if (searchTerm && haystack.indexOf(searchTerm) === -1) return false;
            if (selectedPosition && employee.position !== selectedPosition && employee.roleLabel !== selectedPosition) return false;
            if (selectedStatus && ((employee.isActive ? 'Active' : 'Inactive') !== selectedStatus)) return false;
            return true;
        });

        tableBody.innerHTML = '';

        if (!filtered.length) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">No employee records found.</td></tr>';
            return;
        }

        filtered.forEach(function (employee) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.employeeNo || '--'}</td>
                <td>${employee.fullName || '--'}</td>
                <td>${employee.department || '--'}</td>
                <td>${employee.position || '--'}</td>
                <td>${employee.isActive ? 'Active' : 'Inactive'}</td>
                <td class="action-cell">
                    <a href="head_employee_view.html?employee_id=${employee.id}" class="action-link" title="View"><i class="fas fa-eye"></i></a>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function loadEmployees() {
        try {
            const response = await fetch('/api/employees');
            if (!response.ok) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">Failed to load employee records.</td></tr>';
                return;
            }

            const payload = await response.json();
            employees = payload.items || [];
            renderTable();
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">Failed to load employee records.</td></tr>';
        }
    }

    searchInput.addEventListener('input', renderTable);
    filterPosition.addEventListener('change', renderTable);
    filterStatus.addEventListener('change', renderTable);

    loadEmployees();
});