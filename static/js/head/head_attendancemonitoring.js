(function () {
    function stripTime(value) {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function formatDateLabel(value) {
        return value.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    function getSelectedColumnIndex(weekStartDate, selectedDate) {
        const basis = selectedDate || new Date();
        const diffDays = Math.floor((stripTime(basis) - stripTime(weekStartDate)) / (24 * 3600 * 1000));
        if (diffDays < 0 || diffDays > 6) return 2;
        return 1 + diffDays;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const sidebar = document.getElementById('sidebar');
        const logoToggle = document.getElementById('logoToggle');
        const closeBtn = document.getElementById('closeBtn');
        const menuItems = document.querySelectorAll('.menu-item');

        if (closeBtn) closeBtn.addEventListener('click', function () { sidebar.classList.add('collapsed'); });
        if (logoToggle) logoToggle.addEventListener('click', function () { sidebar.classList.toggle('collapsed'); });
        menuItems.forEach(function (item) {
            const span = item.querySelector('span');
            if (span) item.setAttribute('data-text', span.innerText.trim());
        });

        const searchInput = document.getElementById('tableSearch');
        const statCards = Array.from(document.querySelectorAll('.stats-container .stat-card'));
        const activeFiltersWrap = document.querySelector('.active-filters');
        const actionButtons = Array.from(document.querySelectorAll('.action-buttons .btn-action'));
        const filterBtn = actionButtons[0] || null;
        const dateBtn = actionButtons[1] || null;
        const dateInput = document.getElementById('sampleDateInput');

        const pager = document.querySelector('.action-buttons .pagination');
        const pagerPrev = pager ? pager.querySelector('.fa-chevron-left') : null;
        const pagerNext = pager ? pager.querySelector('.fa-chevron-right') : null;
        const pagerLabel = pager ? pager.querySelector('span') : null;

        const table = document.querySelector('.attendance-table');
        const tbody = table ? table.querySelector('tbody') : null;

        let weekOffset = 0;
        let weekStartDate = new Date();
        let monitoringRows = [];
        const filterState = { dept: 'All', status: 'All', date: null };

        const filterPopover = document.createElement('div');
        filterPopover.className = 'head-filter-popover';
        filterPopover.style.display = 'none';
        filterPopover.innerHTML = `
            <div class="head-filter-title">Filters</div>
            <div class="head-filter-grid">
                <label class="head-filter-label">Department</label>
                <select id="hfDept" class="head-filter-select">
                    <option>All</option>
                </select>
                <label class="head-filter-label">Status (Selected day)</label>
                <select id="hfStatus" class="head-filter-select">
                    <option>All</option>
                    <option>Present</option>
                    <option>Late</option>
                    <option>Absent</option>
                    <option>Leave</option>
                    <option>Active</option>
                </select>
            </div>
            <div class="head-filter-actions">
                <button type="button" class="head-filter-btn head-filter-btn-ghost" id="hfClear">Clear</button>
                <button type="button" class="head-filter-btn head-filter-btn-primary" id="hfApply">Apply</button>
            </div>
        `;

        const controlsRow = document.querySelector('.controls-row');
        if (controlsRow) {
            controlsRow.style.position = 'relative';
            controlsRow.appendChild(filterPopover);
        }

        function toggleFilterPopover(forceOpen) {
            const open = typeof forceOpen === 'boolean' ? forceOpen : filterPopover.style.display !== 'block';
            filterPopover.style.display = open ? 'block' : 'none';
        }

        function setDateButtonLabel() {
            if (!dateBtn) return;
            if (!filterState.date) {
                dateBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Select Date';
                return;
            }
            dateBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> ' + formatDateLabel(filterState.date);
        }

        function createFilterTag(label, onRemove) {
            if (!activeFiltersWrap) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-tag';
            btn.innerHTML = label + ' <i class="fas fa-times"></i>';
            btn.querySelector('.fa-times').addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
            });
            activeFiltersWrap.appendChild(btn);
        }

        function syncFilterTags() {
            if (!activeFiltersWrap) return;
            activeFiltersWrap.innerHTML = '';

            if (filterState.dept !== 'All') {
                createFilterTag('Dept: ' + filterState.dept, function () {
                    filterState.dept = 'All';
                    applyFilters();
                });
            }
            if (filterState.status !== 'All') {
                createFilterTag('Status: ' + filterState.status, function () {
                    filterState.status = 'All';
                    applyFilters();
                });
            }
            if (filterState.date) {
                createFilterTag('Date: ' + formatDateLabel(filterState.date), function () {
                    filterState.date = null;
                    if (dateInput) dateInput.value = '';
                    setDateButtonLabel();
                    applyFilters();
                });
            }
        }

        function rowMatchesFilters(row) {
            const dept = row.dataset.dept || '';
            const name = row.dataset.name || '';
            const title = row.dataset.title || '';
            const q = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();

            if (q) {
                const combined = (name + ' ' + dept + ' ' + title).toLowerCase();
                if (combined.indexOf(q) === -1) return false;
            }

            if (filterState.dept !== 'All' && dept !== filterState.dept) return false;

            if (filterState.status !== 'All') {
                const selectedCol = getSelectedColumnIndex(weekStartDate, filterState.date);
                const dayStatuses = (row.dataset.dayStatuses || '').split(',');
                const dayStatus = dayStatuses[selectedCol - 1] || 'none';
                const normalized = dayStatus.toLowerCase();
                if (normalized !== filterState.status.toLowerCase()) return false;
            }

            return true;
        }

        function setStatValue(index, value) {
            const card = statCards[index];
            const el = card ? card.querySelector('.value') : null;
            if (el) el.textContent = String(value);
        }

        function updateStats() {
            const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
            const visible = rows.filter(function (row) { return row.style.display !== 'none'; });
            const selectedCol = getSelectedColumnIndex(weekStartDate, filterState.date);

            let present = 0;
            let absent = 0;
            let leave = 0;
            let late = 0;

            visible.forEach(function (row) {
                const statuses = (row.dataset.dayStatuses || '').split(',');
                const status = (statuses[selectedCol - 1] || 'none').toLowerCase();
                if (status === 'present' || status === 'active') present++;
                else if (status === 'absent') absent++;
                else if (status === 'leave' || status === 'holiday') leave++;
                else if (status === 'late') late++;
            });

            setStatValue(0, visible.length);
            setStatValue(1, present);
            setStatValue(2, absent);
            setStatValue(3, leave);
            setStatValue(4, late);
        }

        function applyFilters() {
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr'));
            rows.forEach(function (row) {
                row.style.display = rowMatchesFilters(row) ? '' : 'none';
            });
            syncFilterTags();
            updateStats();
        }

        function renderRows() {
            if (!tbody) return;
            tbody.innerHTML = '';

            monitoringRows.forEach(function (item) {
                const tr = document.createElement('tr');
                tr.dataset.dept = item.department || 'General';
                tr.dataset.name = item.name || '';
                tr.dataset.title = item.title || '';
                tr.dataset.dayStatuses = (item.days || []).map(function (d) { return d.status || 'none'; }).join(',');

                const employeeCell = document.createElement('td');
                employeeCell.innerHTML = `
                    <div class="user-cell">
                        <div class="avatar"><i class="fas fa-user"></i></div>
                        <div class="user-info">
                            <span class="name">${item.name || '--'}</span>
                            <span class="title">${item.title || 'Employee'}</span>
                            <span class="dept-badge">${item.department || 'General'}</span>
                        </div>
                    </div>
                `;
                tr.appendChild(employeeCell);

                (item.days || []).forEach(function (day) {
                    const td = document.createElement('td');
                    const dayNum = document.createElement('span');
                    dayNum.className = 'day-num';
                    dayNum.textContent = String(day.dayNum || '');
                    td.appendChild(dayNum);

                    if (day.label) {
                        const pill = document.createElement('div');
                        pill.className = 'pill ' + (day.pillClass || 'pill-green');
                        pill.textContent = day.label;
                        td.appendChild(pill);
                    }

                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            applyFilters();
        }

        function populateDepartmentOptions() {
            const deptSel = filterPopover.querySelector('#hfDept');
            if (!deptSel) return;

            const existing = new Set();
            deptSel.innerHTML = '<option>All</option>';

            monitoringRows.forEach(function (item) {
                const dept = item.department || 'General';
                if (existing.has(dept)) return;
                existing.add(dept);
                const opt = document.createElement('option');
                opt.value = dept;
                opt.textContent = dept;
                deptSel.appendChild(opt);
            });
        }

        async function loadWeekData() {
            try {
                const response = await fetch('/api/attendance/monitoring?offset=' + encodeURIComponent(weekOffset));
                if (!response.ok) {
                    monitoringRows = [];
                    renderRows();
                    return;
                }

                const payload = await response.json();
                monitoringRows = payload.rows || [];
                weekStartDate = payload.weekStart ? new Date(payload.weekStart) : new Date();
                if (pagerLabel) pagerLabel.textContent = payload.weekLabel || 'Week';

                populateDepartmentOptions();
                renderRows();
            } catch (error) {
                monitoringRows = [];
                renderRows();
            }
        }

        if (searchInput) searchInput.addEventListener('input', applyFilters);

        if (filterBtn) {
            filterBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const deptSel = filterPopover.querySelector('#hfDept');
                const statusSel = filterPopover.querySelector('#hfStatus');
                if (deptSel) deptSel.value = filterState.dept;
                if (statusSel) statusSel.value = filterState.status;
                toggleFilterPopover();
            });
        }

        document.addEventListener('click', function (e) {
            if (filterPopover.style.display !== 'block') return;
            if (filterPopover.contains(e.target)) return;
            if (filterBtn && filterBtn.contains(e.target)) return;
            toggleFilterPopover(false);
        });

        const applyBtn = filterPopover.querySelector('#hfApply');
        const clearBtnPopover = filterPopover.querySelector('#hfClear');
        if (applyBtn) {
            applyBtn.addEventListener('click', function () {
                const deptSel = filterPopover.querySelector('#hfDept');
                const statusSel = filterPopover.querySelector('#hfStatus');
                filterState.dept = deptSel ? deptSel.value : 'All';
                filterState.status = statusSel ? statusSel.value : 'All';
                toggleFilterPopover(false);
                applyFilters();
            });
        }
        if (clearBtnPopover) {
            clearBtnPopover.addEventListener('click', function () {
                filterState.dept = 'All';
                filterState.status = 'All';
                filterState.date = null;
                if (searchInput) searchInput.value = '';
                if (dateInput) dateInput.value = '';
                setDateButtonLabel();
                toggleFilterPopover(false);
                applyFilters();
            });
        }

        if (dateBtn && dateInput) {
            dateBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (filterState.date) {
                    const y = filterState.date.getFullYear();
                    const m = String(filterState.date.getMonth() + 1).padStart(2, '0');
                    const d = String(filterState.date.getDate()).padStart(2, '0');
                    dateInput.value = y + '-' + m + '-' + d;
                } else {
                    dateInput.value = '';
                }
                dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
            });

            dateInput.addEventListener('change', function () {
                filterState.date = dateInput.value ? stripTime(new Date(dateInput.value)) : null;
                setDateButtonLabel();
                applyFilters();
            });
        }

        if (pagerPrev) {
            pagerPrev.addEventListener('click', function () {
                weekOffset += 1;
                loadWeekData();
            });
        }

        if (pagerNext) {
            pagerNext.addEventListener('click', function () {
                weekOffset -= 1;
                loadWeekData();
            });
        }

        setDateButtonLabel();
        loadWeekData();
    });
})();
