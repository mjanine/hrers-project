/* head_leaverequest.js */
const loggedHeadName = "Jose Brian Dela Peña"; 
let activeRowId = null; 

let headSampleData = [
    {
        id: 201,
        name: "Jose Brian Dela Peña",
        role: "Department Head",
        dateFiled: "March 25, 2026",
        submitTime: "08:30 AM",
        leaveType: "Sick Leave",
        startDate: "2026-03-26",
        endDate: "2026-03-27",
        numDays: 2,
        status: "Approved",
        reviewedBy: "Ricardo G. Dela Cruz (SD)",
        reason: "Severe Migraine",
        fileName: "Medical_Cert.pdf",
        reviewRemarks: "Approved by School Director. Get well soon."
    },
    {
        id: 204,
        name: "Jose Brian Dela Peña",
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
        reviewRemarks: "Awaiting review from School Director."
    },
    {
        id: 202,
        name: "Alice Johnson",
        role: "Senior Instructor",
        dateFiled: "March 29, 2026",
        submitTime: "10:15 AM",
        leaveType: "Vacation Leave",
        startDate: "2026-04-10",
        endDate: "2026-04-15",
        numDays: 6,
        status: "Pending",
        reviewedBy: "---",
        reason: "Personal family event out of town.",
        fileName: "Travel_Itinerary.pdf",
        reviewRemarks: "Awaiting review from Department Head."
    },
    {
        id: 203,
        name: "Bob Williams",
        role: "Junior Instructor",
        dateFiled: "March 20, 2026",
        submitTime: "01:45 PM",
        leaveType: "Emergency Leave",
        startDate: "2026-03-21",
        endDate: "2026-03-21",
        numDays: 1,
        status: "Rejected",
        reviewedBy: "Jose Brian Dela Peña",
        reason: "Sudden home repairs.",
        fileName: "No Document Attached",
        reviewRemarks: "Rejected: Excessive leaves taken this month without prior notice."
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const tabRequests = document.getElementById('tab-requests');
    const tabHistory = document.getElementById('tab-history');
    const menuItems = document.querySelectorAll('.menu-item');

    // --- TOOLTIP LABEL INITIALIZATION ---
    menuItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            item.setAttribute('data-text', span.innerText);
        }
    });

    // Sidebar Toggles
    document.getElementById('closeBtn').onclick = () => document.getElementById('sidebar').classList.add("collapsed");
    document.getElementById('logoToggle').onclick = () => document.getElementById('sidebar').classList.toggle("collapsed");

    tabRequests.onclick = () => {
        tabRequests.classList.add('active'); tabHistory.classList.remove('active');
        renderHeadTable("Active");
    };
    tabHistory.onclick = () => {
        tabHistory.classList.add('active'); tabRequests.classList.remove('active');
        renderHeadTable("History");
    };

    renderHeadTable("Active");
});

function renderHeadTable(mode) {
    const body = document.getElementById('leaveTableBody');
    const template = document.getElementById('headRowTemplate');
    body.innerHTML = "";

    headSampleData.forEach((leave) => {
        const isFinal = (leave.status === "Approved" || leave.status === "Rejected");
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
            
            clone.querySelector('.action-link').onclick = () => openHeadModal(leave.id);
            body.appendChild(clone);
        }
    });
}

function openHeadModal(id) {
    activeRowId = id; 
    const data = headSampleData.find(l => l.id === id);
    if (!data) return;

    const isOwnRequest = (data.name === loggedHeadName);
    const isFinal = (data.status === "Approved" || data.status === "Rejected");
    
    document.getElementById('modalFileName').innerText = data.fileName;
    document.getElementById('modalSubmitDate').innerText = `${data.dateFiled} at ${data.submitTime}`;
    document.getElementById('modalReason').innerText = data.reason;
    document.getElementById('modalRemarks').innerText = data.reviewRemarks;
    
    const statusClass = data.status.toLowerCase().replace(/\s+/g, '-');
    document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${data.status}</span>`;
    document.getElementById('modalReviewerText').innerHTML = `<small>Reviewed by: ${data.reviewedBy}</small>`;

    // Reset visibility
    document.getElementById('modalActions').style.display = (!isOwnRequest && !isFinal) ? "flex" : "none";
    document.getElementById('viewModal').style.display = 'flex';
}

function processHeadRequest(decision) {
    const leaveIndex = headSampleData.findIndex(l => l.id === activeRowId);

    if (leaveIndex !== -1) {
        // 1. Update Data
        headSampleData[leaveIndex].status = decision;
        headSampleData[leaveIndex].reviewedBy = loggedHeadName;
        headSampleData[leaveIndex].reviewRemarks = `${decision} by Head on ${new Date().toLocaleDateString()}`;

        // 2. INSTANT MODAL UPDATE (Visual Feedback)
        const statusClass = decision.toLowerCase();
        document.getElementById('modalStatusContainer').innerHTML = `<span class="status-pill ${statusClass}">${decision}</span>`;
        document.getElementById('modalRemarks').innerText = headSampleData[leaveIndex].reviewRemarks;
        document.getElementById('modalActions').style.display = "none"; 

        // 3. INSTANT TABLE UPDATE
        const currentTab = document.getElementById('tab-requests').classList.contains('active') ? "Active" : "History";
        renderHeadTable(currentTab);

        // 4. Success Notification
        Swal.fire({
            icon: 'success',
            title: `Request ${decision}`,
            text: `The status was updated and recorded.`,
            confirmButtonColor: '#4a1d1d',
            timer: 2000 
        });
    }
}

function closeViewModal() { 
    document.getElementById('viewModal').style.display = 'none'; 
}