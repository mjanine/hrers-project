/**

 * emp_attendance.js

 * Place at: static/js/attendance/emp_attendance.js

 * ============================================================

 * Sections:

 *   1. Element Selectors

 *   2. Sidebar Navigation

 *   3. Real-Time Clock Logic

 *   4. Header Date/Time Updater

 *   5. History Modal – Data

 *   6. History Modal – Render Weekly

 *   7. History Modal – Render Monthly

 *   8. History Modal – View Switcher

 *   9. History Modal – Navigation

 *  10. History Modal – Open / Close

 *  11. Init

 * ============================================================

 */





/* ── 1. ELEMENT SELECTORS ────────────────────────────────── */



// Sidebar

const sidebar    = document.getElementById("sidebar");

const logoToggle = document.getElementById("logoToggle");

const closeBtn   = document.getElementById("closeBtn");

const menuItems  = document.querySelectorAll(".menu-item");



// Attendance clock

const clockBtn           = document.getElementById("clockBtn");

const workingTimeDisplay = document.getElementById("workingTime");

const timeInDisplay      = document.getElementById("timeInDisplay");



// History modal

const historyModal     = document.getElementById("historyModal");

const openHistoryBtn   = document.getElementById("openHistory");

const closeHistoryBtn  = document.getElementById("closeHistory");

const weeklyViewBtn    = document.getElementById("weeklyViewBtn");

const monthlyViewBtn   = document.getElementById("monthlyViewBtn");

const historyDateRange = document.getElementById("historyDateRange");

const weeklyTable      = document.getElementById("weeklyTable");

const weeklyTableBody  = document.getElementById("weeklyTableBody");

const monthlyGrid      = document.getElementById("monthlyGrid");

const totalHoursCount  = document.getElementById("totalHoursCount");

const prevPeriodBtn    = document.getElementById("prevPeriod");

const nextPeriodBtn    = document.getElementById("nextPeriod");



const clockOutOverlay      = document.getElementById("clockOutOverlay");

const clockOutConfirmStep  = document.getElementById("clockOutConfirmStep");

const clockOutSuccessStep  = document.getElementById("clockOutSuccessStep");

const clockOutCancelBtn    = document.getElementById("clockOutCancel");

const clockOutConfirmBtn   = document.getElementById("clockOutConfirmBtn");

const clockOutDismissBtn   = document.getElementById("clockOutDismiss");

const clockOutDurationText = document.getElementById("clockOutDurationText");





/* ── 2. SIDEBAR NAVIGATION ───────────────────────────────── */



closeBtn.addEventListener("click", () => {

    sidebar.classList.add("collapsed");

});



logoToggle.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

});



// Active state + tooltip data-text

menuItems.forEach(item => {

    const spanEl = item.querySelector("span");

    if (spanEl) item.setAttribute("data-text", spanEl.innerText);



    item.addEventListener("click", () => {

        document.querySelector(".menu-item.active")?.classList.remove("active");

        item.classList.add("active");

    });

});





/* ── 3. REAL-TIME ATTENDANCE CLOCK ───────────────────────── */



let timerInterval = null;

let totalSeconds  = 0;

let isClockedIn   = false;


async function refreshAttendanceState() {

    try {

        const response = await fetch('/api/attendance/today');

        if (!response.ok) return;

        const payload = await response.json();

        isClockedIn = !!payload.clockedIn;

        totalSeconds = Number(payload.workedSeconds || 0);



        if (clockBtn) {

            clockBtn.innerText = isClockedIn ? 'Clock out' : 'Clock in';

            clockBtn.classList.toggle('is-clocked-in', isClockedIn);

        }



        if (timeInDisplay) {

            timeInDisplay.innerText = payload.timeIn

                ? `Time In: ${new Date(payload.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

                : 'Time In: --';

        }



        if (workingTimeDisplay) {

            workingTimeDisplay.innerText = `Working for: ${formatDuration(totalSeconds)}`;

        }

    } catch (error) {

        // Keep the current UI state if the backend is temporarily unavailable.

    }
}



function formatDuration(seconds) {

    const hrs  = Math.floor(seconds / 3600);

    const mins = Math.floor((seconds % 3600) / 60);

    return `${hrs}h ${mins.toString().padStart(2, "0")}m`;

}



function startTimer() {

    timerInterval = setInterval(() => {

        totalSeconds++;

        workingTimeDisplay.innerText = `Working for: ${formatDuration(totalSeconds)}`;

    }, 1000);

}


async function clockIn() {

    const response = await fetch('/api/attendance/clock-in', { method: 'POST' });

    if (!response.ok) return false;



    isClockedIn = true;

    clockBtn.innerText = 'Clock out';

    clockBtn.classList.add('is-clocked-in');



    const now = new Date();

    timeInDisplay.innerText = `Time In: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;



    startTimer();

    return true;
}


async function clockOut() {

    const response = await fetch('/api/attendance/clock-out', { method: 'POST' });

    if (!response.ok) return false;



    const payload = await response.json();

    const durationLabel = formatDuration(Number(payload.attendance?.workedSeconds || totalSeconds));



    isClockedIn = false;

    clearInterval(timerInterval);

    timerInterval = null;

    totalSeconds = 0;

    clockBtn.innerText = 'Clock in';

    clockBtn.classList.remove('is-clocked-in');

    workingTimeDisplay.innerText = 'Working for: 0h 00m';

    timeInDisplay.innerText = 'Time In: --';

    showClockOutSuccess(durationLabel);

    return true;
}



function showClockOutOverlay() {

    clockOutConfirmStep.classList.remove("clock-out-step--hidden");

    clockOutSuccessStep.classList.add("clock-out-step--hidden");

    clockOutSuccessStep.setAttribute("hidden", "");

    clockOutOverlay.classList.add("clock-out-overlay--visible");

    clockOutOverlay.setAttribute("aria-hidden", "false");

    clockOutConfirmBtn.focus();

}



function hideClockOutOverlay() {

    clockOutOverlay.classList.remove("clock-out-overlay--visible");

    clockOutOverlay.setAttribute("aria-hidden", "true");

    clockOutConfirmStep.classList.remove("clock-out-step--hidden");

    clockOutSuccessStep.classList.add("clock-out-step--hidden");

    clockOutSuccessStep.setAttribute("hidden", "");

}



function showClockOutSuccess(durationLabel) {

    clockOutDurationText.innerText = `Total time: ${durationLabel}`;

    clockOutConfirmStep.classList.add("clock-out-step--hidden");

    clockOutSuccessStep.classList.remove("clock-out-step--hidden");

    clockOutSuccessStep.removeAttribute("hidden");

    clockOutDismissBtn.focus();

}



function completeClockOut() {

    const durationLabel = formatDuration(totalSeconds);

    isClockedIn = false;

    clearInterval(timerInterval);

    timerInterval = null;

    totalSeconds = 0;

    clockBtn.innerText = "Clock in";

    clockBtn.classList.remove("is-clocked-in");

    workingTimeDisplay.innerText = "Working for: 0h 00m";

    timeInDisplay.innerText = "Time In: --";

    showClockOutSuccess(durationLabel);

}



clockBtn.addEventListener("click", () => {

    if (!isClockedIn) {

        clockIn();

    } else {

        showClockOutOverlay();

    }

});



clockOutCancelBtn.addEventListener("click", hideClockOutOverlay);



clockOutConfirmBtn.addEventListener("click", () => {

    clockOut();

});



clockOutDismissBtn.addEventListener("click", hideClockOutOverlay);



clockOutOverlay.addEventListener("click", (e) => {

    if (e.target === clockOutOverlay) {

        hideClockOutOverlay();

    }

});



document.addEventListener("keydown", (e) => {

    if (e.key === "Escape" && clockOutOverlay.classList.contains("clock-out-overlay--visible")) {

        hideClockOutOverlay();

    }

});





/* ── 4. HEADER DATE/TIME UPDATER ─────────────────────────── */



function updateHeader() {

    const dateElement = document.querySelector(".date-now");

    if (dateElement) {

        const now     = new Date();

        const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        dateElement.innerText = `${dateStr} | ${timeStr}`;

    }

}



setInterval(updateHeader, 60000);

updateHeader();





/* ── 5. HISTORY MODAL – DATA ─────────────────────────────── */



const weeklyData = {};
const monthlyData = {};



// State

let currentView = "weekly";

let weekOffset  = 0;

let monthOffset = 0;

let weeklySummaryData = null;

let monthlySummaryData = null;


async function loadAttendanceSummary(view, offset) {

    const response = await fetch(`/api/attendance/summary?view=${encodeURIComponent(view)}&offset=${encodeURIComponent(offset)}`);

    if (!response.ok) return null;

    return await response.json();
}





/* ── 6. HISTORY MODAL – RENDER WEEKLY ───────────────────── */



function renderWeekly() {
    const data = weeklySummaryData;
    if (!data) {
        historyDateRange.textContent = "No data";
        totalHoursCount.textContent = "0h 00m";
        weeklyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">No attendance records found for this period.</td></tr>';
        return;
    }

    historyDateRange.textContent = data.label;

    totalHoursCount.textContent  = data.total;



    const rows = data.rows.map(r => `

        <tr>

            <td>${r.date}</td>

            <td>${r.day}</td>

            <td>${r.timeIn}</td>

            <td>${r.timeOut}</td>

            <td>${r.hours}</td>

            <td><span class="status-badge ${r.status}">${capitalize(r.status)}</span></td>

        </tr>

    `).join("");



    const totalRow = `

        <tr class="total-row">

            <td colspan="4">Total Hours This Week</td>

            <td colspan="2">${data.total}</td>

        </tr>

    `;



    weeklyTableBody.innerHTML = rows + totalRow;

}





/* ── 7. HISTORY MODAL – RENDER MONTHLY ──────────────────── */



function renderMonthly() {
    const data = monthlySummaryData;
    if (!data) {
        historyDateRange.textContent = "No data";
        totalHoursCount.textContent = "0h 00m";
        monthlyGrid.innerHTML = '<div class="month-day-cell empty">No records found for this period.</div>';
        return;
    }

    historyDateRange.textContent = data.label;

    totalHoursCount.textContent  = data.total;



    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let html = dayNames.map(d => `<div class="month-day-header">${d}</div>`).join("");



    // Leading empty cells

    for (let i = 0; i < data.firstDayOfWeek; i++) {

        html += `<div class="month-day-cell empty"></div>`;

    }



    for (let d = 1; d <= data.daysInMonth; d++) {

        const dayOfWeek  = (data.firstDayOfWeek + d - 1) % 7;

        const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;

        const att        = data.attendance[d];



        const statusClass = att ? att.status : (isWeekend ? "weekend" : "");

        const statusLabel = att ? capitalize(att.status) : (isWeekend ? "Off" : "");

        const hoursLabel  = att ? att.hours : "";



        html += `

            <div class="month-day-cell">

                <span class="day-num">${d}</span>

                ${statusClass ? `<span class="day-status ${statusClass}">${statusLabel}</span>` : ""}

                ${hoursLabel  ? `<span class="day-hours">${hoursLabel}</span>` : ""}

            </div>

        `;

    }



    monthlyGrid.innerHTML = html;

}





/* ── 8. HISTORY MODAL – VIEW SWITCHER ───────────────────── */



async function switchView(view) {

    currentView = view;



    if (view === "weekly") {

        weeklyViewBtn.classList.add("active");

        monthlyViewBtn.classList.remove("active");

        weeklyTable.style.display = "table";

        monthlyGrid.classList.remove("active");

        weeklySummaryData = await loadAttendanceSummary('weekly', weekOffset);

        renderWeekly();

    } else {

        monthlyViewBtn.classList.add("active");

        weeklyViewBtn.classList.remove("active");

        weeklyTable.style.display = "none";

        monthlyGrid.classList.add("active");

        monthlySummaryData = await loadAttendanceSummary('monthly', monthOffset);

        renderMonthly();

    }

}



weeklyViewBtn.addEventListener("click",  () => switchView("weekly"));

monthlyViewBtn.addEventListener("click", () => switchView("monthly"));





/* ── 9. HISTORY MODAL – NAVIGATION ──────────────────────── */



prevPeriodBtn.addEventListener("click", () => {

    if (currentView === "weekly") {

        weekOffset++;

        loadAttendanceSummary('weekly', weekOffset).then(function (data) {
            weeklySummaryData = data;
            renderWeekly();
        });

    } else {

        monthOffset++;

        loadAttendanceSummary('monthly', monthOffset).then(function (data) {
            monthlySummaryData = data;
            renderMonthly();
        });

    }

});



nextPeriodBtn.addEventListener("click", () => {

    if (currentView === "weekly") {
        if (weekOffset === 0) return;
        weekOffset--;

        loadAttendanceSummary('weekly', weekOffset).then(function (data) {
            weeklySummaryData = data;
            renderWeekly();
        });

    } else {
        if (monthOffset === 0) return;
        monthOffset--;

        loadAttendanceSummary('monthly', monthOffset).then(function (data) {
            monthlySummaryData = data;
            renderMonthly();
        });

    }

});





/* ── 10. HISTORY MODAL – OPEN / CLOSE ───────────────────── */



openHistoryBtn.addEventListener("click", () => {

    historyModal.classList.add("open");

});



closeHistoryBtn.addEventListener("click", () => {

    historyModal.classList.remove("open");

});



// Close on overlay click

historyModal.addEventListener("click", (e) => {

    if (e.target === historyModal) {

        historyModal.classList.remove("open");

    }

});





/* ── 11. HELPERS & INIT ──────────────────────────────────── */



function capitalize(str) {

    return str.charAt(0).toUpperCase() + str.slice(1);

}



// Boot the modal in weekly view
function loadEmployeeDetails() {
    fetch('/api/profile/me')
        .then((response) => (response.ok ? response.json() : null))
        .then((profile) => {
            if (!profile) return;
            const employeeTab = document.querySelector('.employee-tab');
            const detailItems = document.querySelectorAll('.details-rows .detail-item');

            if (employeeTab) {
                employeeTab.textContent = profile.fullName || 'Employee';
            }

            if (detailItems[0]) detailItems[0].querySelector('span').textContent = profile.employeeNo || profile.id || '--';
            if (detailItems[1]) detailItems[1].querySelector('span').textContent = profile.position || profile.roleLabel || '--';
            if (detailItems[2]) detailItems[2].querySelector('span').textContent = profile.department || '--';
            if (detailItems[3]) detailItems[3].querySelector('span').textContent = profile.employmentType || '--';
        })
        .catch(() => {
        });
}

refreshAttendanceState().then(() => switchView("weekly"));
loadEmployeeDetails();


