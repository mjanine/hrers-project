/**
 * emp_attendance.js
 * Place at: static/js/attendance/emp_attendance.js
 * ============================================================
 */

/* ── 1. ELEMENT SELECTORS ────────────────────────────────── */

// Sidebar
const sidebar    = document.getElementById("sidebar");
const logoToggle = document.getElementById("logoToggle");
const closeBtn   = document.getElementById("closeBtn");
const menuItems  = document.querySelectorAll(".menu-item");

// Tab Switcher (Attendance Log vs Monitoring)
const tabLog     = document.getElementById('tab-log');
const tabMonit   = document.getElementById('tab-monitoring');
// Content Areas (Ensure these IDs exist in your HTML)
const logContent   = document.getElementById('logContent'); 
const monitContent = document.getElementById('monitoringContent');

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
clockOutConfirmBtn.addEventListener("click", () => { clockOut(); });
clockOutDismissBtn.addEventListener("click", hideClockOutOverlay);

clockOutOverlay.addEventListener("click", (e) => {
    if (e.target === clockOutOverlay) hideClockOutOverlay();
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
        historyDateRange.textContent = '--';
        totalHoursCount.textContent = '0h 00m';
        weeklyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">No attendance records found.</td></tr>';
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
    weeklyTableBody.innerHTML = rows + `<tr class="total-row"><td colspan="4">Total</td><td colspan="2">${data.total}</td></tr>`;
}


/* ── 7. HISTORY MODAL – RENDER MONTHLY ──────────────────── */

function renderMonthly() {
    const data = monthlySummaryData;
    if (!data) {
        historyDateRange.textContent = '--';
        totalHoursCount.textContent = '0h 00m';
        monthlyGrid.innerHTML = '<div class="month-day-cell empty">No attendance records found.</div>';
        return;
    }
    historyDateRange.textContent = data.label;
    totalHoursCount.textContent  = data.total;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let html = dayNames.map(d => `<div class="month-day-header">${d}</div>`).join("");
    for (let i = 0; i < data.firstDayOfWeek; i++) html += `<div class="month-day-cell empty"></div>`;
    for (let d = 1; d <= data.daysInMonth; d++) {
        const att = data.attendance[d];
        html += `<div class="month-day-cell"><span class="day-num">${d}</span>${att ? `<span class="day-status ${att.status}">${capitalize(att.status)}</span>` : ""}</div>`;
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
        weekOffset--;
        loadAttendanceSummary('weekly', weekOffset).then(function (data) {
            weeklySummaryData = data;
            renderWeekly();
        });
    } else {
        monthOffset--;
        loadAttendanceSummary('monthly', monthOffset).then(function (data) {
            monthlySummaryData = data;
            renderMonthly();
        });
    }
});


/* ── 10. HISTORY MODAL – OPEN / CLOSE ───────────────────── */

openHistoryBtn.addEventListener("click", () => historyModal.classList.add("open"));
closeHistoryBtn.addEventListener("click", () => historyModal.classList.remove("open"));
historyModal.addEventListener("click", (e) => { if (e.target === historyModal) historyModal.classList.remove("open"); });


/* ── 12. TAB SWITCHER (LOG VS MONITORING) ────────────────── */

// This implements the specific request to toggle between Attendance Log and Monitoring
if (tabLog && tabMonit) {
    tabLog.addEventListener('click', function () {
        tabLog.classList.add('active');
        tabMonit.classList.remove('active');
        
        // Show Log, Hide Monitoring (if elements exist)
        if(logContent) logContent.style.display = 'block';
        if(monitContent) monitContent.style.display = 'none';

    });

    tabMonit.addEventListener('click', function () {
        tabMonit.classList.add('active');
        tabLog.classList.remove('active');
        
        // Show Monitoring, Hide Log (if elements exist)
        if(monitContent) monitContent.style.display = 'block';
        if(logContent) logContent.style.display = 'none';

        window.location.href = '/templates/head/head_attendancemonitoring.html';
    });
}


/* ── 11. HELPERS & INIT ──────────────────────────────────── */

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// Initialize
refreshAttendanceState().then(() => switchView("weekly"));