document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const typeButtons = document.querySelectorAll('.type-btn');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const leaveForm = document.getElementById('leaveRequestForm');
    const menuItems = document.querySelectorAll(".menu-item");

    // --- Sidebar Logic ---
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) item.setAttribute("data-text", span.innerText);
    });

    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add('collapsed');
    if (logoToggle) logoToggle.onclick = () => sidebar.classList.toggle('collapsed');

    // --- Leave Type Selection ---
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- File Upload ---
    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                dropZone.innerHTML = `
                    <i class="fas fa-file-alt" style="color: #4a1d1d; font-size: 24px;"></i>
                    <p>Selected: <b>${fileInput.files[0].name}</b></p>
                `;
            }
        };
    }

    // --- Submit & Credits Calculation ---
    if (leaveForm) {
        leaveForm.onsubmit = (e) => {
            e.preventDefault();

            const TOTAL_SICK_CREDITS = 15;
            let finalMessage = "Leave request submitted successfully";
            
            // Get active button text
            const activeBtn = document.querySelector('.type-btn.active');
            const leaveTypeText = activeBtn ? activeBtn.innerText : "";

            // Select inputs by NAME (matching your HTML)
            const startDateInput = document.querySelector('input[name="start_date"]');
            const endDateInput = document.querySelector('input[name="end_date"]');

            if (leaveTypeText.includes("Sick Leave") && startDateInput.value && endDateInput.value) {
                const start = new Date(startDateInput.value);
                const end = new Date(endDateInput.value);
                
                // Calculate days inclusive
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const remaining = TOTAL_SICK_CREDITS - diffDays;
                finalMessage = `Success! You have ${remaining} sick leave credits remaining.`;
            }

            // Notification
            Swal.fire({
                icon: "success",
                title: "Request Submitted",
                text: finalMessage,
                confirmButtonColor: '#4a1d1d' 
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'emp_leaverequest.html';
                }
            });
        };
    }
});