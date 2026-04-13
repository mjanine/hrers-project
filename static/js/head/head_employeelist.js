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
});