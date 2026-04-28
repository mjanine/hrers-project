document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const typeButtons = document.querySelectorAll('.type-btn');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const leaveForm = document.getElementById('leaveRequestForm');
    const menuItems = document.querySelectorAll(".menu-item");

    // Initialize Tooltips
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) { item.setAttribute("data-text", span.innerText); }
    });

    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add('collapsed');
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle('collapsed');

    // Leave Type Selection
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // File Upload Handling
    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                dropZone.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #28a745; font-size: 24px;"></i>
                    <p>Selected: <b>${fileName}</b></p>
                    <small style="color: #666;">Click to change file</small>
                `;
            }
        };
    }

    // Load user leave credits from profile or leave-credits endpoint
    let TOTAL_SICK_CREDITS = null;
    (async function loadLeaveCredits() {
        try {
            const resp = await fetch('/api/profile/me');
            if (resp.ok) {
                const p = await resp.json();
                if (p && typeof p.sickLeaveCredits !== 'undefined') {
                    TOTAL_SICK_CREDITS = Number(p.sickLeaveCredits || 0);
                }
            }
        } catch (e) {}

        if (TOTAL_SICK_CREDITS === null) {
            try {
                const resp2 = await fetch('/api/leave-credits');
                if (resp2.ok) {
                    const j = await resp2.json();
                    TOTAL_SICK_CREDITS = Number(j.sick || j.totalSick || 0);
                }
            } catch (e) {}
        }

        if (TOTAL_SICK_CREDITS === null) TOTAL_SICK_CREDITS = 0;
    })();

    // Form Submission
    if (leaveForm) {
        leaveForm.onsubmit = async (e) => {
            e.preventDefault();
            let finalMessage = "Leave request submitted to HR successfully!";
            let finalMessage = "Leave request submitted to HR successfully!";

            const activeBtn = document.querySelector('.type-btn.active');
            const leaveType = activeBtn ? activeBtn.innerText : "";
            
            // Selecting dates by name as per your previous HTML structure
            const startDateEl = document.getElementsByName('start_date')[0];
            const endDateEl = document.getElementsByName('end_date')[0];
            const reasonInput = document.querySelector('.form-textarea');

            if (!activeBtn || !startDateEl?.value || !endDateEl?.value || !reasonInput?.value.trim()) {
                Swal.fire({
                    icon: "error",
                    title: "Missing fields",
                    text: "Please complete all required fields.",
                    confirmButtonColor: '#4a1d1d'
                });
                return;
            }

            const formData = new FormData();
            formData.set('leave_type', activeBtn.innerText.trim());
            formData.set('start_date', startDateEl.value);
            formData.set('end_date', endDateEl.value);
            formData.set('reason', reasonInput.value.trim());
            formData.set('file_name', fileInput?.files?.[0]?.name || 'No Document Attached');

            const response = await fetch('/api/leave-requests', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Request failed.' }));
                Swal.fire({
                    icon: "error",
                    title: "Submission failed",
                    text: err.detail || 'Unable to submit leave request.',
                    confirmButtonColor: '#4a1d1d'
                });
                return;
            }

            if (leaveType.toLowerCase().includes("sick") && startDateEl.value && endDateEl.value) {
                const start = new Date(startDateEl.value);
                const end = new Date(endDateEl.value);
                
                // Calculate days inclusive
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const remaining = (TOTAL_SICK_CREDITS || 0) - diffDays;
                finalMessage = `Success! You have ${remaining} sick leave credits remaining.`;
            }

            // SweetAlert Notification
            Swal.fire({
                icon: "success",
                title: "Request Submitted",
                text: finalMessage,
                confirmButtonColor: '#4a1d1d',
                timer: 3500,
                timerProgressBar: true
            }).then(() => {
                window.location.href = '/templates/sd/sd_leaverequest.html';
            });
        };
    }
});