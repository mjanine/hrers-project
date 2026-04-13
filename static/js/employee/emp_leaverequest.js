/* emp_leaverequest.js */
const empInfo = { name: "John Smith" };

// HARDCODED SAMPLE DATA
const sampleLeaveData = [
    {
        id: 101,
        name: "John Smith",
        dateFiled: "March 28, 2026",
        submitTime: "09:15 AM",
        leaveType: "Sick Leave",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
        numDays: 2,
        status: "Pending",
        reviewedBy: "---",
        reason: "Having a severe fever and need to rest.",
        fileName: "Medical_Certificate.pdf",
        fileData: null, // Placeholder
        reviewRemarks: "Awaiting initial review from Department Head."
    },
    {
        id: 102,
        name: "John Smith",
        dateFiled: "February 10, 2026",
        submitTime: "02:30 PM",
        leaveType: "Vacation Leave",
        startDate: "2026-02-15",
        endDate: "2026-02-20",
        numDays: 6,
        status: "Approved",
        reviewedBy: "HR Manager",
        reason: "Family vacation to Palawan.",
        fileName: "Flight_Itinerary.pdf",
        fileData: null,
        reviewRemarks: "Enjoy your vacation! Approved by HR."
    },
    {
        id: 103,
        name: "John Smith",
        dateFiled: "January 05, 2026",
        submitTime: "11:00 AM",
        leaveType: "Personal Leave",
        startDate: "2026-01-10",
        endDate: "2026-01-10",
        numDays: 1,
        status: "Rejected",
        reviewedBy: "Dept. Head",
        reason: "Personal errands.",
        fileName: "No Document Attached",
        fileData: null,
        reviewRemarks: "Requested date conflicts with a major department meeting."
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn = document.getElementById("closeBtn");
    const tabRequests = document.getElementById('tab-requests');
    const tabHistory = document.getElementById('tab-history');
    const menuItems = document.querySelectorAll(".menu-item");

    // Initialize Tooltip Labels
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) { item.setAttribute("data-text", span.innerText); }
    });

    // Initial Render
    renderLeaveTable("Active");

    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add("collapsed");
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle("collapsed");

    // Tab Switching
    tabRequests.onclick = () => {
        tabRequests.classList.add('active'); 
        tabHistory.classList.remove('active');
        renderLeaveTable("Active");
    };
    tabHistory.onclick = () => {
        tabHistory.classList.add('active'); 
        tabRequests.classList.remove('active');
        renderLeaveTable("History");
    };

    // Search Logic
    document.getElementById('tableSearch').addEventListener('keyup', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
        });
    });
});

function renderLeaveTable(filter) {
    const body = document.getElementById('leaveTableBody');
    const template = document.getElementById('leaveRowTemplate');
    body.innerHTML = "";
    
    // Filter sample data instead of LocalStorage
    sampleLeaveData.forEach((leave) => {
        const isFinal = leave.status === "Approved" || leave.status === "Rejected";
        
        // Logic: Active tab shows Pending. History tab shows Approved/Rejected.
        if ((filter === "Active" && !isFinal) || (filter === "History" && isFinal)) {
            const clone = template.content.cloneNode(true);
            const statusClass = leave.status.toLowerCase();

            clone.querySelector('.col-filed').innerText = leave.dateFiled;
            clone.querySelector('.col-type').innerHTML = `<strong>${leave.leaveType}</strong>`;
            clone.querySelector('.col-start').innerText = leave.startDate;
            clone.querySelector('.col-end').innerText = leave.endDate;
            clone.querySelector('.col-days').innerText = leave.numDays;
            clone.querySelector('.col-status').innerHTML = `<span class="status-pill ${statusClass}">${leave.status}</span>`;
            clone.querySelector('.col-reviewer').innerText = leave.reviewedBy;
            
            // Set action click
            clone.querySelector('.action-link').onclick = () => openViewModalByID(leave.id);

            body.appendChild(clone);
        }
    });

    if (body.innerHTML === "") {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:40px;">No leave records found.</td></tr>`;
    }
}

function openViewModalByID(id) {
    const data = sampleLeaveData.find(l => l.id === id);
    if (!data) return;
    
    // Fill Modal Data
    document.getElementById('modalFileName').innerText = data.fileName;
    document.getElementById('modalSubmitDate').innerText = `${data.dateFiled} at ${data.submitTime}`;
    document.getElementById('modalReason').innerText = data.reason;
    document.getElementById('modalRemarks').innerText = data.reviewRemarks;
    
    const statusClass = data.status.toLowerCase();
    document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${data.status}</span>`;
    
    // Preview Placeholder Logic
    const preview = document.querySelector('.pdf-placeholder');
    preview.innerHTML = `<i class="fas fa-file-pdf"></i><p>Preview for ${data.fileName}</p>`;

    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() { 
    document.getElementById('viewModal').style.display = 'none'; 
}