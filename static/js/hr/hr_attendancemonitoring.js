/* ============================================================
   hr_attendancemonitoring.js
   Path: static/js/attendance/hr_attendancemonitoring.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* ── SIDEBAR ─────────────────────────────────────────── */
    const sidebar    = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn   = document.getElementById("closeBtn");
    const menuItems  = document.querySelectorAll(".menu-item");

    if (closeBtn)   closeBtn.addEventListener("click", () => sidebar.classList.add("collapsed"));
    if (logoToggle) logoToggle.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) item.setAttribute("data-text", span.innerText.trim());
    });

    /* ── ELEMENT REFS ────────────────────────────────────── */
    const searchInput       = document.getElementById("tableSearch");
    const statCards         = Array.from(document.querySelectorAll(".stats-container .stat-card"));
    const activeFiltersWrap = document.querySelector(".active-filters");
    const actionButtons     = Array.from(document.querySelectorAll(".action-buttons .btn-action"));
    const filterBtn         = actionButtons[0] || null;
    const dateBtn           = actionButtons[1] || null;
    const dateInput         = document.getElementById("sampleDateInput");

    const pager      = document.querySelector(".action-buttons .pagination");
    const pagerPrev  = pager ? pager.querySelector(".fa-chevron-left")  : null;
    const pagerNext  = pager ? pager.querySelector(".fa-chevron-right") : null;
    const pagerLabel = pager ? pager.querySelector("span")              : null;

    const table     = document.querySelector(".attendance-table");
    const tbody     = table ? table.querySelector("tbody") : null;
    const tableRows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];

    /* ── STATE ───────────────────────────────────────────── */
    const baseWeekStart = new Date(2026, 1, 2); // Feb 2 2026 (Sunday) = Week 5
    let weekOffset = 0;

    const filterState = { dept: "All", status: "All", date: null };

    /* ── FILTER POPOVER ──────────────────────────────────── */
    const filterPopover = document.createElement("div");
    filterPopover.className   = "head-filter-popover";
    filterPopover.style.display = "none";
    filterPopover.innerHTML = `
        <div class="head-filter-title">Filters</div>
        <div class="head-filter-grid">
            <label class="head-filter-label">Department</label>
            <select id="hfDept" class="head-filter-select">
                <option>All</option>
                <option>CCS</option>
                <option>CBA</option>
                <option>CAS</option>
                <option>COE</option>
                <option>HR</option>
                <option>CON</option>
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
            <button type="button" class="head-filter-btn head-filter-btn-ghost"   id="hfClear">Clear</button>
            <button type="button" class="head-filter-btn head-filter-btn-primary" id="hfApply">Apply</button>
        </div>
    `;

    const controlsRow = document.querySelector(".controls-row");
    if (controlsRow) {
        controlsRow.style.position = "relative";
        controlsRow.appendChild(filterPopover);
    }

    function toggleFilterPopover(forceOpen) {
        const open = typeof forceOpen === "boolean"
            ? forceOpen
            : filterPopover.style.display !== "block";
        filterPopover.style.display = open ? "block" : "none";
    }

    /* ── HELPERS ─────────────────────────────────────────── */
    function stripTime(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    function getWeekStartDate() {
        const d = new Date(baseWeekStart);
        d.setDate(d.getDate() + weekOffset * 7);
        return d;
    }

    function getSelectedColumnIndex(startDate) {
        const basis    = filterState.date || new Date();
        const diffDays = Math.floor(
            (stripTime(basis) - stripTime(startDate)) / (24 * 3600 * 1000)
        );
        // cols: 0 = Employee, 1 = Sun … 7 = Sat
        if (diffDays < 0 || diffDays > 6) return 2; // default Monday
        return 1 + diffDays;
    }

    function getCellStatus(cell) {
        const pill = cell ? cell.querySelector(".pill") : null;
        if (!pill) return "None";
        const text = (pill.textContent || "").trim().toLowerCase();
        if (pill.classList.contains("pill-red")    || text.includes("absent")) return "Absent";
        if (pill.classList.contains("pill-purple") || text.includes("leave"))  return "Leave";
        if (pill.classList.contains("pill-tan")    || /\d+h/.test(text))       return "Late";
        if (text.includes("active"))                                            return "Active";
        return "Present";
    }

    /* ── DATE BUTTON LABEL ───────────────────────────────── */
    function setDateButtonLabel() {
        if (!dateBtn) return;
        if (!filterState.date) {
            dateBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Sample Date';
            return;
        }
        const label = filterState.date.toLocaleDateString("en-US", {
            month: "short", day: "2-digit", year: "numeric"
        });
        dateBtn.innerHTML = `<i class="fas fa-calendar-alt"></i> ${label}`;
    }

    /* ── DAY NUMBERS + WEEK LABEL ────────────────────────── */
    function updateDayNumbers() {
        const start = getWeekStartDate();
        tableRows.forEach(row => {
            const nums = Array.from(row.querySelectorAll(".day-num"));
            nums.forEach((span, idx) => {
                const d = new Date(start);
                d.setDate(d.getDate() + idx);
                span.textContent = String(d.getDate());
            });
        });

        if (pagerLabel) {
            const baseWeekNum = 5;
            pagerLabel.textContent = `Week ${baseWeekNum + weekOffset}`;
        }
    }

    /* ── STATS ───────────────────────────────────────────── */
    function setStatValue(index, value) {
        const card = statCards[index];
        const el   = card ? card.querySelector(".value") : null;
        if (el) el.textContent = String(value);
    }

    function updateStats() {
        if (statCards.length < 5) return;
        const start  = getWeekStartDate();
        const colIdx = getSelectedColumnIndex(start);
        const visible = tableRows.filter(r => r.style.display !== "none");

        let present = 0, absent = 0, leave = 0, late = 0;
        visible.forEach(row => {
            const cells  = Array.from(row.querySelectorAll("td"));
            const status = getCellStatus(cells[colIdx]);
            if      (status === "Absent")                       absent++;
            else if (status === "Leave")                        leave++;
            else if (status === "Late")                         late++;
            else if (status === "Present" || status === "Active") present++;
        });

        setStatValue(0, visible.length);
        setStatValue(1, present);
        setStatValue(2, absent);
        setStatValue(3, leave);
        setStatValue(4, late);
    }

    /* ── FILTER TAGS ─────────────────────────────────────── */
    function createFilterTag(label, onRemove) {
        if (!activeFiltersWrap) return;
        const btn = document.createElement("button");
        btn.type      = "button";
        btn.className = "filter-tag";
        btn.innerHTML = `${label} <i class="fas fa-times"></i>`;
        btn.querySelector(".fa-times")?.addEventListener("click", e => {
            e.preventDefault(); e.stopPropagation(); onRemove();
        });
        activeFiltersWrap.appendChild(btn);
    }

    function syncFilterTags() {
        if (!activeFiltersWrap) return;
        activeFiltersWrap.innerHTML = "";

        if (filterState.dept !== "All") {
            createFilterTag(`Dept: ${filterState.dept}`, () => {
                filterState.dept = "All"; applyFilters();
            });
        }
        if (filterState.status !== "All") {
            createFilterTag(`Status: ${filterState.status}`, () => {
                filterState.status = "All"; applyFilters();
            });
        }
        if (filterState.date) {
            const label = filterState.date.toLocaleDateString("en-US", {
                month: "short", day: "2-digit", year: "numeric"
            });
            createFilterTag(`Date: ${label}`, () => {
                filterState.date = null;
                if (dateInput) dateInput.value = "";
                setDateButtonLabel(); applyFilters();
            });
        }
    }

    /* ── ROW FILTER LOGIC ────────────────────────────────── */
    function rowMatchesFilters(row) {
        const dept  = (row.querySelector(".dept-badge")?.textContent || "").trim();
        const name  = (row.querySelector(".name")?.textContent       || "").trim();
        const title = (row.querySelector(".title")?.textContent      || "").trim();

        const q = (searchInput?.value || "").trim().toLowerCase();
        if (q) {
            const combined = (name + " " + dept + " " + title).toLowerCase();
            if (!combined.includes(q)) return false;
        }

        if (filterState.dept !== "All" && dept !== filterState.dept) return false;

        if (filterState.status !== "All") {
            const start  = getWeekStartDate();
            const colIdx = getSelectedColumnIndex(start);
            const cells  = Array.from(row.querySelectorAll("td"));
            const status = getCellStatus(cells[colIdx]);
            if (status !== filterState.status) return false;
        }

        return true;
    }

    function applyFilters() {
        tableRows.forEach(row => {
            row.style.display = rowMatchesFilters(row) ? "" : "none";
        });
        syncFilterTags();
        updateStats();
    }

    /* ── WIRE: SEARCH ────────────────────────────────────── */
    if (searchInput) searchInput.addEventListener("input", applyFilters);

    /* ── WIRE: FILTER BUTTON ─────────────────────────────── */
    if (filterBtn) {
        filterBtn.addEventListener("click", e => {
            e.preventDefault(); e.stopPropagation();
            const deptSel   = filterPopover.querySelector("#hfDept");
            const statusSel = filterPopover.querySelector("#hfStatus");
            if (deptSel)   deptSel.value   = filterState.dept;
            if (statusSel) statusSel.value = filterState.status;
            toggleFilterPopover();
        });
    }

    document.addEventListener("click", e => {
        if (filterPopover.style.display !== "block") return;
        if (filterPopover.contains(e.target)) return;
        if (filterBtn && filterBtn.contains(e.target)) return;
        toggleFilterPopover(false);
    });

    filterPopover.querySelector("#hfApply")?.addEventListener("click", () => {
        const deptSel   = filterPopover.querySelector("#hfDept");
        const statusSel = filterPopover.querySelector("#hfStatus");
        filterState.dept   = deptSel   ? deptSel.value   : "All";
        filterState.status = statusSel ? statusSel.value : "All";
        toggleFilterPopover(false);
        applyFilters();
    });

    filterPopover.querySelector("#hfClear")?.addEventListener("click", () => {
        filterState.dept   = "All";
        filterState.status = "All";
        filterState.date   = null;

        if (searchInput) searchInput.value = "";
        if (dateInput)   dateInput.value   = "";
        setDateButtonLabel();

        const deptSel   = filterPopover.querySelector("#hfDept");
        const statusSel = filterPopover.querySelector("#hfStatus");
        if (deptSel)   deptSel.value   = "All";
        if (statusSel) statusSel.value = "All";

        toggleFilterPopover(false);
        applyFilters();
    });

    /* ── WIRE: DATE BUTTON ───────────────────────────────── */
    if (dateBtn && dateInput) {
        dateBtn.addEventListener("click", e => {
            e.preventDefault();
            if (filterState.date) {
                const y = filterState.date.getFullYear();
                const m = String(filterState.date.getMonth() + 1).padStart(2, "0");
                const d = String(filterState.date.getDate()).padStart(2, "0");
                dateInput.value = `${y}-${m}-${d}`;
            } else {
                dateInput.value = "";
            }

            if (typeof dateInput.showPicker === "function") {
                dateInput.showPicker();
            } else {
                dateInput.focus({ preventScroll: true });
                dateInput.click();
            }
        });
    }

    if (dateInput) {
        dateInput.addEventListener("change", () => {
            if (!dateInput.value) return;
            const picked = new Date(dateInput.value + "T12:00:00");
            filterState.date = picked;
            setDateButtonLabel();

            // Jump the week pager to the week that contains the picked date
            const diffDays = Math.floor(
                (stripTime(picked) - stripTime(baseWeekStart)) / (24 * 3600 * 1000)
            );
            weekOffset = Math.floor(diffDays / 7);

            updateDayNumbers();
            applyFilters();
        });
    }

    /* ── WIRE: WEEK PAGER ────────────────────────────────── */
    if (pagerPrev) {
        pagerPrev.addEventListener("click", () => {
            weekOffset--;
            updateDayNumbers();
            applyFilters();
        });
    }

    if (pagerNext) {
        pagerNext.addEventListener("click", () => {
            weekOffset++;
            updateDayNumbers();
            applyFilters();
        });
    }

    /* ── MODAL ───────────────────────────────────────────── */
    const modal      = document.getElementById("employeeModal");
    const closeSpan  = document.querySelector(".close-modal");
    const weeklyBtn  = document.getElementById("weeklyViewBtn");
    const monthlyBtn = document.getElementById("monthlyViewBtn");
    const modalPrev  = modal ? modal.querySelector(".date-pager .fa-chevron-left")  : null;
    const modalNext  = modal ? modal.querySelector(".date-pager .fa-chevron-right") : null;

    let modalMode   = "weekly";
    let modalOffset = 0;

    function formatWeekRange(startDate) {
        const end = new Date(startDate);
        end.setDate(end.getDate() + 6);
        const left  = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
        const right = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        return `${left} - ${right}`;
    }

    function renderModal() {
        const rangeText  = document.getElementById("dateRangeText");
        const periodText = document.getElementById("periodText");
        const totalValue = document.getElementById("totalHoursValue");
        const tbodyEl    = document.getElementById("modalTableBody");
        if (!tbodyEl) return;

        tbodyEl.innerHTML = "";

        if (modalMode === "weekly") {
            const start = getWeekStartDate();
            start.setDate(start.getDate() + modalOffset * 7);

            if (rangeText)  rangeText.textContent  = formatWeekRange(start);
            if (periodText) periodText.textContent = "Week";
            if (totalValue) totalValue.textContent = "42h 15m";

            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                const dateText = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                const dayText  = d.toLocaleDateString("en-US", { weekday: "long" });
                tbodyEl.insertAdjacentHTML("beforeend", `
                    <tr>
                        <td>${dateText}</td>
                        <td>${dayText}</td>
                        <td>8:03 AM</td>
                        <td>5:02 PM</td>
                        <td>8h 59m</td>
                        <td><span class="pill pill-green">Present</span></td>
                    </tr>
                `);
            }
        } else {
            const monthBase = new Date(2026, 1, 1);
            monthBase.setMonth(monthBase.getMonth() + modalOffset);
            const monthLabel = monthBase.toLocaleDateString("en-US", { month: "long", year: "numeric" });

            if (rangeText)  rangeText.textContent  = monthLabel;
            if (periodText) periodText.textContent = "Month";
            if (totalValue) totalValue.textContent = "160h 00m";

            for (let i = 1; i <= 20; i++) {
                const d = new Date(monthBase);
                d.setDate(i);
                const dateText = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                const dayText  = d.toLocaleDateString("en-US", { weekday: "long" });
                tbodyEl.insertAdjacentHTML("beforeend", `
                    <tr>
                        <td>${dateText}</td>
                        <td>${dayText}</td>
                        <td>8:10 AM</td>
                        <td>5:00 PM</td>
                        <td>8h 50m</td>
                        <td><span class="pill pill-green">Present</span></td>
                    </tr>
                `);
            }
        }
    }

    function setModalView(type) {
        modalMode   = type;
        modalOffset = 0;
        weeklyBtn?.classList.toggle("active", type === "weekly");
        monthlyBtn?.classList.toggle("active", type === "monthly");
        renderModal();
    }

    function openModalForRow(row) {
        if (!modal) return;
        const name     = row.querySelector(".name")?.innerText      || "Employee Name";
        const position = row.querySelector(".title")?.innerText     || "—";
        const dept     = row.querySelector(".dept-badge")?.innerText || "—";

        document.getElementById("modalEmployeeName").innerText = name;
        document.getElementById("detPos").innerText            = position;
        document.getElementById("detDept").innerText           = dept;

        modal.style.display = "block";
        setModalView("weekly");
    }

    tableRows.forEach(row => {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => openModalForRow(row));
    });

    if (closeSpan) closeSpan.addEventListener("click", () => (modal.style.display = "none"));
    window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

    weeklyBtn?.addEventListener("click",  e => { e.stopPropagation(); setModalView("weekly"); });
    monthlyBtn?.addEventListener("click", e => { e.stopPropagation(); setModalView("monthly"); });
    modalPrev?.addEventListener("click",  e => { e.stopPropagation(); modalOffset--; renderModal(); });
    modalNext?.addEventListener("click",  e => { e.stopPropagation(); modalOffset++; renderModal(); });

    /* ── RESPONSIVE SIDEBAR ──────────────────────────────── */
    const handleResize = () => {
        if (!sidebar) return;
        if (window.innerWidth <= 1100) sidebar.classList.add("collapsed");
        else sidebar.classList.remove("collapsed");
    };
    window.addEventListener("resize", handleResize);

    /* ── INIT ────────────────────────────────────────────── */
    setDateButtonLabel();
    updateDayNumbers();
    applyFilters();
    handleResize();
});