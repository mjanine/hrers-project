/* sd_leaverequest.js */
const sdInfo = { name: "Ricardo G. Dela Cruz" };
let activeRowId = null; 

// HARDCODED SAMPLE DATA
let sdSampleData = [
    {
        id: 401,
        name: "Ricardo G. Dela Cruz", // OWN LEAVE - PENDING
        role: "School Director",
        dateFiled: "March 30, 2026",
        submitTime: "08:00 AM",
        leaveType: "Sick Leave",
        startDate: "2026-03-31",
        endDate: "2026-04-01",
        numDays: 2,
        status: "Pending",
        reviewedBy: "---",
        reason: "Severe back pain, advised to rest.",
        fileName: "SD_Medical_Cert.pdf",
        reviewRemarks: "Awaiting review from Board of Trustees."
    },
    {
        id: 402,
        name: "Jose Brian Dela Peña", // FROM HEAD - PENDING
        role: "Department Head",
        dateFiled: "March 30, 2026",
        submitTime: "09:00 AM",
        leaveType: "Vacation Leave",
        startDate: "2026-04-05",
        endDate: "2026-04-05",
        numDays: 1,
        status: "Pending",
        reviewedBy: "---",
        reason: "Personal errands and rest.",
        fileName: "No Document Attached",
        reviewRemarks: "Awaiting final review from School Director."
    },
    {
        id: 403,
        name: "Tatsu", // FROM HR - PENDING
        role: "HR Manager",
        dateFiled: "March 30, 2026",
        submitTime: "10:30 AM",
        leaveType: "Vacation Leave",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        numDays: 3,
        status: "Pending",
        reviewedBy: "---",
        reason: "Family outing and recreation.",
        fileName: "Flight_Booking.pdf",
        reviewRemarks: "Awaiting final review from School Director."
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn = document.getElementById("closeBtn");
    const tabRequests = document.getElementById('tab-requests');
    const tabHistory = document.getElementById('tab-history');

    // Sidebar Tooltips Initialization
    document.querySelectorAll(".menu-item").forEach(item => {
        const span = item.querySelector("span");
        if (span) item.setAttribute("data-text", span.innerText);
    });

    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add("collapsed");
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle("collapsed");

    // Tab Switching Logic
    tabRequests.onclick = () => {
        tabRequests.classList.add('active'); tabHistory.classList.remove('active');
        renderLeaveTable("Active");
    };
    tabHistory.onclick = () => {
        tabHistory.classList.add('active'); tabRequests.classList.remove('active');
        renderLeaveTable("History");
    };

    renderLeaveTable("Active");

    // Real-time Search
    document.getElementById('tableSearch').addEventListener('keyup', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
        });
    });
});

function renderLeaveTable(filter) {
    const body = document.getElementById('leaveTableBody');
    const template = document.getElementById('sdRowTemplate');
    if (!body || !template) return;
    body.innerHTML = "";

    sdSampleData.forEach((leave) => {
        const isFinal = leave.status === "Approved" || leave.status === "Rejected";
        let shouldShow = (filter === "Active") ? !isFinal : isFinal;
        
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
            
            clone.querySelector('.action-link').onclick = () => openViewModalByID(leave.id);
            body.appendChild(clone);
        }
    });

    if (body.innerHTML === "") {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:40px;">No leave records found.</td></tr>`;
    }
}

function openViewModalByID(id) {
    activeRowId = id;
    const data = sdSampleData.find(l => l.id === id);
    if (!data) return;

    const isOwnRequest = (data.name === sdInfo.name);
    const isFinal = (data.status === "Approved" || data.status === "Rejected");
    const statusClass = data.status.toLowerCase().replace(/\s+/g, '-');

    // Fill Modal Data
    document.getElementById('modalFileName').innerText = data.fileName;
    document.getElementById('modalSubmitDate').innerText = `${data.dateFiled} at ${data.submitTime}`;
    document.getElementById('modalReason').innerText = data.reason;
    document.getElementById('modalRemarks').innerText = data.reviewRemarks;
    document.getElementById('modalReviewerText').innerText = `Reviewed by: ${data.reviewedBy}`;
    document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${data.status}</span>`;

    // Toggle Action Buttons: Hide if viewing own request or already finalized
    const actions = document.getElementById('modalActions');
    if (!isOwnRequest && !isFinal) {
        actions.style.display = "flex";
    } else {
        actions.style.display = "none";
    }

    // PDF Placeholder Preview
    const preview = document.querySelector('.pdf-placeholder');
    preview.innerHTML = `<i class="fas fa-file-pdf"></i><p>Preview for ${data.fileName}</p>`;

    document.getElementById('viewModal').style.display = 'flex';
}

// --- INSTANT UPDATE LOGIC ---
function processSDDecision(decision) {
    const index = sdSampleData.findIndex(l => l.id === activeRowId);
    
    if (index !== -1) {
        // 1. Instant Memory Update
        sdSampleData[index].status = decision; 
        sdSampleData[index].reviewedBy = sdInfo.name;
        sdSampleData[index].reviewRemarks = `Final decision: ${decision} by School Director on ${new Date().toLocaleDateString()}.`;

        // 2. Instant Modal Visual Update
        const statusClass = decision.toLowerCase();
        document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${decision}</span>`;
        document.getElementById('modalRemarks').innerText = sdSampleData[index].reviewRemarks;
        document.getElementById('modalActions').style.display = "none";

        // 3. Instant Table Refresh (Background)
        const currentMode = document.getElementById('tab-requests').classList.contains('active') ? "Active" : "History";
        renderLeaveTable(currentMode);

        // 4. Success Alert
        Swal.fire({
            icon: 'success',
            title: `Request ${decision}`,
            text: `Decision finalized and recorded instantly.`,
            confirmButtonColor: '#4a1d1d',
            timer: 2000
        });
    }
}

function closeViewModal() { 
    document.getElementById('viewModal').style.display = 'none'; 
}