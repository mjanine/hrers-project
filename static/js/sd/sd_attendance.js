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
        isClockedIn = true;
        clockBtn.innerText = "Clock out";
        clockBtn.classList.add("is-clocked-in");
        const now = new Date();
        timeInDisplay.innerText = `Time In: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        startTimer();
    } else {
        showClockOutOverlay();
    }
});

clockOutCancelBtn.addEventListener("click", hideClockOutOverlay);
clockOutConfirmBtn.addEventListener("click", () => { completeClockOut(); });
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

const weeklyData = {
    0: {
        label: "February 4 – 10, 2026",
        rows: [
            { date: "February 4, 2026",  day: "Tuesday",   timeIn: "8:03 AM", timeOut: "5:02 PM", hours: "8h 59m", status: "present" },
            { date: "February 5, 2026",  day: "Wednesday", timeIn: "8:15 AM", timeOut: "5:10 PM", hours: "8h 55m", status: "present" },
            { date: "February 6, 2026",  day: "Thursday",  timeIn: "8:00 AM", timeOut: "5:00 PM", hours: "9h 00m", status: "present" },
            { date: "February 7, 2026",  day: "Friday",    timeIn: "8:45 AM", timeOut: "5:00 PM", hours: "8h 15m", status: "late"    },
            { date: "February 8, 2026",  day: "Saturday",  timeIn: "--",      timeOut: "--",       hours: "--",     status: "leave"   },
            { date: "February 9, 2026",  day: "Sunday",    timeIn: "--",      timeOut: "--",       hours: "--",     status: "holiday" },
            { date: "February 10, 2026", day: "Monday",    timeIn: "8:03 AM", timeOut: "5:02 PM", hours: "8h 59m", status: "present" },
        ],
        total: "42h 15m"
    }
};

const monthlyData = {
    0: {
        label: "February 2026",
        firstDayOfWeek: 0,
        daysInMonth: 28,
        attendance: {
            3:  { status: "present", hours: "8h 59m" },
            4:  { status: "present", hours: "8h 55m" },
        },
        total: "152h 30m"
    }
};

let currentView = "weekly";
let weekOffset  = 0;
let monthOffset = 0;


/* ── 6. HISTORY MODAL – RENDER WEEKLY ───────────────────── */

function renderWeekly() {
    const data = weeklyData[weekOffset] ?? weeklyData[0];
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
    const data = monthlyData[monthOffset] ?? monthlyData[0];
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

function switchView(view) {
    currentView = view;
    if (view === "weekly") {
        weeklyViewBtn.classList.add("active");
        monthlyViewBtn.classList.remove("active");
        weeklyTable.style.display = "table";
        monthlyGrid.classList.remove("active");
        renderWeekly();
    } else {
        monthlyViewBtn.classList.add("active");
        weeklyViewBtn.classList.remove("active");
        weeklyTable.style.display = "none";
        monthlyGrid.classList.add("active");
        renderMonthly();
    }
}

weeklyViewBtn.addEventListener("click",  () => switchView("weekly"));
monthlyViewBtn.addEventListener("click", () => switchView("monthly"));


/* ── 9. HISTORY MODAL – NAVIGATION ──────────────────────── */

prevPeriodBtn.addEventListener("click", () => {
    if (currentView === "weekly") { weekOffset++; renderWeekly(); } 
    else { monthOffset++; renderMonthly(); }
});

nextPeriodBtn.addEventListener("click", () => {
    if (currentView === "weekly") { weekOffset--; renderWeekly(); } 
    else { monthOffset--; renderMonthly(); }
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

        console.log("Switching to Attendance Log");
    });

    tabMonit.addEventListener('click', function () {
        tabMonit.classList.add('active');
        tabLog.classList.remove('active');
        
        // Show Monitoring, Hide Log (if elements exist)
        if(monitContent) monitContent.style.display = 'block';
        if(logContent) logContent.style.display = 'none';

        console.log("Switching to Attendance Monitoring");
    });
}


/* ── 11. HELPERS & INIT ──────────────────────────────────── */

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// Initialize
switchView("weekly");