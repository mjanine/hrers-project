/* hr_leaverequest.js */
const hrName = "Tatsu"; 
let activeRowId = null;

// HARDCODED SAMPLE DATA
let leaveData = [
    {
        id: 301,
        name: "Tatsu", 
        role: "HR Manager",
        dateFiled: "March 30, 2026",
        submitTime: "09:00 AM",
        leaveType: "Vacation Leave",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        numDays: 3,
        status: "Pending",
        reviewedBy: "---",
        reason: "Personal rest and recreation.",
        fileName: "No Document Attached",
        reviewRemarks: "Awaiting review from School Director."
    },
    {
        id: 302,
        name: "Jose Brian Dela Peña", // FROM HEAD - HISTORY
        role: "Department Head",
        dateFiled: "March 25, 2026",
        submitTime: "08:30 AM",
        leaveType: "Sick Leave",
        startDate: "2026-03-26",
        endDate: "2026-03-27",
        numDays: 2, // 2 DAYS
        status: "Approved",
        reviewedBy: "Tatsu (HR)",
        reason: "Severe Migraine",
        fileName: "Medical_Cert.pdf",
        reviewRemarks: "Final approval granted by HR Department."
    },
    {
        id: 303,
        name: "Alice Johnson", 
        role: "Senior Instructor",
        dateFiled: "March 29, 2026",
        submitTime: "10:15 AM",
        leaveType: "Maternity Leave",
        startDate: "2026-05-01",
        endDate: "2026-07-30",
        numDays: 90,
        status: "Pending",
        reviewedBy: "---",
        reason: "Maternity leave application.",
        fileName: "Doctor_Note.pdf",
        reviewRemarks: "Awaiting HR validation of documents."
    },
    {
        id: 304,
        name: "Ricardo G. Dela Cruz", 
        role: "School Director",
        dateFiled: "March 20, 2026",
        submitTime: "01:00 PM",
        leaveType: "Emergency Leave",
        startDate: "2026-03-21",
        endDate: "2026-03-21",
        numDays: 1,
        status: "Rejected",
        reviewedBy: "Board of Trustees",
        reason: "Urgent family matter.",
        fileName: "No Document Attached",
        reviewRemarks: "Rejected due to conflict with the Annual Board Meeting."
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn = document.getElementById("closeBtn");
    const tabRequests = document.getElementById('tab-requests');
    const tabHistory = document.getElementById('tab-history');

    // Sidebar Tooltips Initialization
    document.querySelectorAll('.menu-item').forEach(item => {
        const span = item.querySelector("span");
        if (span) item.setAttribute("data-text", span.textContent.trim());
    });

    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add("collapsed");
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle("collapsed");

    // Tab Navigation
    tabRequests.onclick = () => {
        tabRequests.classList.add('active'); tabHistory.classList.remove('active');
        renderHRTable("Active");
    };
    tabHistory.onclick = () => {
        tabHistory.classList.add('active'); tabRequests.classList.remove('active');
        renderHRTable("History");
    };

    renderHRTable("Active");

    // Real-time Search
    document.getElementById('tableSearch').addEventListener('keyup', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
        });
    });
});

function renderHRTable(mode) {
    const body = document.getElementById('leaveTableBody');
    const template = document.getElementById('hrRowTemplate');
    if (!body || !template) return;
    body.innerHTML = "";

    leaveData.forEach((leave) => {
        const isFinal = leave.status === "Approved" || leave.status === "Rejected";
        let shouldShow = (mode === "Active") ? !isFinal : isFinal;

        if (shouldShow) {
            const clone = template.content.cloneNode(true);
            const statusClass = leave.status.toLowerCase().replace(/\s+/g, '-');
            
            clone.querySelector('.col-emp').innerHTML = `<strong>${leave.name}</strong><br><small>${leave.role}</small>`;
            clone.querySelector('.col-type').innerText = leave.leaveType;
            clone.querySelector('.col-start').innerText = leave.startDate;
            clone.querySelector('.col-end').innerText = leave.endDate;
            clone.querySelector('.col-days').innerText = leave.numDays;
            clone.querySelector('.col-status').innerHTML = `<span class="status-pill ${statusClass}">${leave.status}</span>`;
            clone.querySelector('.col-reviewer').innerText = leave.reviewedBy || '---';
            
            clone.querySelector('.action-link').onclick = () => openHRModal(leave.id);
            body.appendChild(clone);
        }
    });

    if (body.innerHTML === "") {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:40px;">No records found.</td></tr>`;
    }
}

function openHRModal(id) {
    activeRowId = id;
    const data = leaveData.find(l => l.id === id);
    if (!data) return;

    const isOwnRequest = (data.name === hrName);
    const isSDRequest = (data.role === "School Director");
    const isFinal = (data.status === "Approved" || data.status === "Rejected");
    const statusClass = data.status.toLowerCase().replace(/\s+/g, '-');

    document.getElementById('modalFileName').innerText = data.fileName;
    document.getElementById('modalSubmitDate').innerText = `${data.dateFiled} at ${data.submitTime}`;
    document.getElementById('modalReason').innerText = data.reason;
    document.getElementById('modalRemarks').innerText = data.reviewRemarks;
    document.getElementById('modalReviewerText').innerHTML = `<small>Reviewed by: ${data.reviewedBy}</small>`;
    document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${data.status}</span>`;

    // --- UPDATED CREDITS LOGIC ---
    const creditsBlock = document.getElementById('creditsBlock');
    if (data.leaveType === "Sick Leave") {
        creditsBlock.style.display = "block";
        // Dynamically calculate based on the 15 baseline
        const remaining = 15 - data.numDays;
        document.getElementById('modalCredits').innerText = `${remaining} Days Remaining`;
    } else {
        creditsBlock.style.display = "none";
    }

    // Toggle Action Buttons
    const actions = document.getElementById('modalActions');
    if (isFinal || isOwnRequest || isSDRequest) {
        actions.style.display = "none";
    } else {
        actions.style.display = "flex";
    }

    const preview = document.querySelector('.pdf-placeholder');
    preview.innerHTML = `<i class="fas fa-file-pdf"></i><p>Preview for ${data.fileName}</p>`;

    document.getElementById('viewModal').style.display = 'flex';
}

function processRequest(status) {
    const index = leaveData.findIndex(l => l.id === activeRowId);
    if (index !== -1) {
        // Instant Data Update
        leaveData[index].status = status;
        leaveData[index].reviewedBy = hrName;
        leaveData[index].reviewRemarks = `Processed by HR Manager on ${new Date().toLocaleDateString()}`;

        // Instant Modal Update
        const statusClass = status.toLowerCase();
        document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${status}</span>`;
        document.getElementById('modalRemarks').innerText = leaveData[index].reviewRemarks;
        document.getElementById('modalActions').style.display = "none";

        // Instant Table Update
        const currentTab = document.getElementById('tab-requests').classList.contains('active') ? "Active" : "History";
        renderHRTable(currentTab);

        Swal.fire({
            icon: 'success',
            title: `Request ${status}`,
            text: `Data updated and moved to history instantly.`,
            confirmButtonColor: '#4a1d1d',
            timer: 2000
        });
    }
}

function closeViewModal() { 
    document.getElementById('viewModal').style.display = 'none'; 
}