document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const typeButtons = document.querySelectorAll('.type-btn');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const leaveForm = document.getElementById('leaveRequestForm');

    // --- Sidebar Logic ---
    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add('collapsed');
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.remove('collapsed');

    document.querySelectorAll('.menu-item').forEach(item => {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.innerText);
    });

    // --- Leave Type Selection ---
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- File Upload UI ---
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                dropZone.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #28a745; font-size: 24px;"></i>
                    <p>Selected: <b>${fileName}</b></p>
                    <small style="color: #666; cursor: pointer;">Click to change file</small>
                `;
            }
        });
    }

    // --- Submit Logic (Notification with Credits) ---
    if (leaveForm) {
        leaveForm.onsubmit = (e) => {
            e.preventDefault();

            const TOTAL_SICK_CREDITS = 15;
            let finalMessage = "Leave request submitted successfully";

            // 1. Get Selected Leave Type
            const activeBtn = document.querySelector('.type-btn.active');
            const leaveTypeText = activeBtn ? activeBtn.innerText : "";

            // 2. Get Dates using Name attributes (from your HTML)
            const startDateInput = document.querySelector('input[name="start_date"]');
            const endDateInput = document.querySelector('input[name="end_date"]');

            // 3. Calculate Credits if Sick Leave
            if (leaveTypeText.includes("Sick Leave") && startDateInput.value && endDateInput.value) {
                const start = new Date(startDateInput.value);
                const end = new Date(endDateInput.value);
                
                // Difference in days (inclusive)
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const remaining = TOTAL_SICK_CREDITS - diffDays;
                finalMessage = `Success! You have ${remaining} sick leave credits remaining.`;
            }

            // 4. Trigger SweetAlert (Matching Employee style)
            // Note: Ensure SweetAlert CDN is in your Head HTML
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: "success",
                    title: "Request Sent",
                    text: finalMessage,
                    confirmButtonColor: '#4a1d1d'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'head_leaverequest.html';
                    }
                });
            } else {
                // Fallback if Swal is not loaded
                alert(finalMessage);
                window.location.href = 'head_leaverequest.html';
            }
        };
    }
});