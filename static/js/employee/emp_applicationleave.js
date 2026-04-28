document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const typeButtons = document.querySelectorAll('.type-btn');
    const leaveTypeHidden = document.getElementById('leave_type');
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
            if (leaveTypeHidden) leaveTypeHidden.value = btn.innerText.trim();
        });
    });

    // ensure hidden input reflects initial active button
    const initialActive = document.querySelector('.type-btn.active');
    if (leaveTypeHidden && initialActive) leaveTypeHidden.value = initialActive.innerText.trim();

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
        leaveForm.onsubmit = async (e) => {
            e.preventDefault();

            let finalMessage = "Leave request submitted successfully";
            
            // Get active button text
            const activeBtn = document.querySelector('.type-btn.active');
            const leaveTypeText = activeBtn ? activeBtn.innerText : "";

            // Select inputs by NAME (matching your HTML)
            const startDateInput = document.querySelector('input[name="start_date"]');
            const endDateInput = document.querySelector('input[name="end_date"]');
            const reasonInput = document.querySelector('.form-textarea');

            if (!activeBtn || !startDateInput?.value || !endDateInput?.value || !reasonInput?.value.trim()) {
                Swal.fire({
                    icon: "error",
                    title: "Missing fields",
                    text: "Please complete all required fields.",
                    confirmButtonColor: '#4a1d1d'
                });
                return;
            }

            const formData = new FormData();
            const hiddenType = document.getElementById('leave_type')?.value || activeBtn?.innerText.trim() || '';
            formData.set('leave_type', hiddenType);
            formData.set('start_date', startDateInput.value);
            formData.set('end_date', endDateInput.value);
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

            if (leaveTypeText.includes("Sick Leave")) {
                try {
                    const creditsResponse = await fetch('/api/leave-credits');
                    if (creditsResponse.ok) {
                        const credits = await creditsResponse.json();
                        finalMessage = `Success! You have ${Number(credits.remaining || 0)} sick leave credits remaining.`;
                    }
                } catch (error) {
                }
            }

            // Notification
            Swal.fire({
                icon: "success",
                title: "Request Submitted",
                text: finalMessage,
                confirmButtonColor: '#4a1d1d' 
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/templates/employee/emp_leaverequest.html';
                }
            });
        };
    }
});