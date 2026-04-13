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

    // Form Submission
    if (leaveForm) {
        leaveForm.onsubmit = (e) => {
            e.preventDefault();

            const TOTAL_SICK_CREDITS = 15;
            let finalMessage = "Leave request submitted to HR successfully!";

            const activeBtn = document.querySelector('.type-btn.active');
            const leaveType = activeBtn ? activeBtn.innerText : "";
            
            // Selecting dates by name as per your previous HTML structure
            const startDateEl = document.getElementsByName('start_date')[0];
            const endDateEl = document.getElementsByName('end_date')[0];

            if (leaveType.toLowerCase().includes("sick") && startDateEl.value && endDateEl.value) {
                const start = new Date(startDateEl.value);
                const end = new Date(endDateEl.value);
                
                // Calculate days inclusive
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const remaining = TOTAL_SICK_CREDITS - diffDays;
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
                window.location.href = 'sd_leaverequest.html';
            });
        };
    }
});